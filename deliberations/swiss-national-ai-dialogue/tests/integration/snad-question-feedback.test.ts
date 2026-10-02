/**
 * @jest-environment node
 *
 * Per-question feedback: the thumbs a participant leaves ON a question plus the
 * optional note that follows, stored as an editable `qfeedback:<opener_id>` row
 * in `snad.responses`. Covers the editable contract (re-rating replaces, an
 * emptied verdict deletes the row), the note, the fact that the row is never
 * mistaken for an answer to the question, and rejection of unknown opener ids.
 * Cookie auth is mocked; everything else runs against the real test DB.
 */

process.env.DATABASE_URL ??=
  "postgresql://postgres:postgres@localhost:5433/dialogue_test";

let sessionCookie: string | undefined;
jest.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "snad_session" && sessionCookie
        ? { name, value: sessionCookie }
        : undefined,
    set: jest.fn(),
    delete: jest.fn(),
  }),
}));

import path from "node:path";

import { and, eq, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { Pool } from "pg";

import { db } from "@/db";
import {
  snadResponses,
  snadSessions,
} from "@/deliberations/swiss-national-ai-dialogue/server/db-schema";
import { loadParticipantJourney } from "@/deliberations/swiss-national-ai-dialogue/server/participants";
import {
  buildTopicEvent,
  hydrateOwnedSession,
  questionFeedbackStepId,
  saveQuestionFeedback,
} from "@/deliberations/swiss-national-ai-dialogue/server/sessions";
import {
  ensureActiveStudyVersion,
  snadStudyDefinition,
} from "@/deliberations/swiss-national-ai-dialogue/server/study";

beforeAll(async () => {
  await migrate(db, {
    migrationsFolder: path.join(__dirname, "../../../../drizzle"),
  });
});

afterEach(async () => {
  sessionCookie = undefined;
  await db.execute(
    sql`TRUNCATE snad.sessions, snad.study_versions RESTART IDENTITY CASCADE`,
  );
});

afterAll(async () => {
  await (db.$client as Pool).end();
});

async function seedSessionOnItsFirstTopic(): Promise<{
  sessionId: string;
  openerId: string;
}> {
  const version = await ensureActiveStudyVersion();
  const [session] = await db
    .insert(snadSessions)
    .values({ studyVersionId: version.id, locale: "en", canton: "BE" })
    .returning({ id: snadSessions.id });
  const sessionId = session!.id;
  sessionCookie = sessionId;
  const topic = snadStudyDefinition.topics[0]!;
  const event = buildTopicEvent(snadStudyDefinition, sessionId, topic.key, "en");
  const shown = event.steps.find(
    (step) => step.kind !== "share_more" && step.opener_id,
  );
  if (!shown || shown.kind === "share_more" || !shown.opener_id) {
    throw new Error("no authored question on the first topic");
  }
  return { sessionId, openerId: shown.opener_id };
}

async function feedbackRow(sessionId: string, openerId: string) {
  const [row] = await db
    .select()
    .from(snadResponses)
    .where(
      and(
        eq(snadResponses.sessionId, sessionId),
        eq(snadResponses.stepId, questionFeedbackStepId(openerId)),
      ),
    );
  return row;
}

describe("saveQuestionFeedback", () => {
  it("stores the participant's rating against the question", async () => {
    const { sessionId, openerId } = await seedSessionOnItsFirstTopic();

    await saveQuestionFeedback({ openerId, rating: "up", note: "" });

    expect((await feedbackRow(sessionId, openerId))?.answer).toEqual({
      rating: "up",
      note: "",
    });
  });

  it("replaces the rating when the participant changes their mind", async () => {
    const { sessionId, openerId } = await seedSessionOnItsFirstTopic();
    await saveQuestionFeedback({ openerId, rating: "up", note: "" });

    await saveQuestionFeedback({ openerId, rating: "down", note: "" });

    expect((await feedbackRow(sessionId, openerId))?.answer).toEqual({
      rating: "down",
      note: "",
    });
  });

  it("keeps the note when the rating is cleared afterwards", async () => {
    const { sessionId, openerId } = await seedSessionOnItsFirstTopic();
    await saveQuestionFeedback({
      openerId,
      rating: "down",
      note: "Too abstract to answer honestly.",
    });

    await saveQuestionFeedback({
      openerId,
      rating: null,
      note: "Too abstract to answer honestly.",
    });

    expect((await feedbackRow(sessionId, openerId))?.answer).toEqual({
      rating: null,
      note: "Too abstract to answer honestly.",
    });
  });

  it("drops the row once neither a rating nor a note is left", async () => {
    const { sessionId, openerId } = await seedSessionOnItsFirstTopic();
    await saveQuestionFeedback({ openerId, rating: "up", note: "Good one" });

    await saveQuestionFeedback({ openerId, rating: null, note: "" });

    expect(await feedbackRow(sessionId, openerId)).toBeUndefined();
  });

  it("rejects an opener the pinned study never defines", async () => {
    await seedSessionOnItsFirstTopic();

    await expect(
      saveQuestionFeedback({ openerId: "not-a-question", rating: "up", note: "" }),
    ).rejects.toThrow("invalid_step");
  });

  it("refuses to record feedback without a session", async () => {
    sessionCookie = undefined;

    await expect(
      saveQuestionFeedback({ openerId: "anything", rating: "up", note: "" }),
    ).rejects.toThrow("no_session");
  });
});

describe("resuming a rated question", () => {
  it("hands the saved verdict back on the session payload, keyed by opener id", async () => {
    const { openerId } = await seedSessionOnItsFirstTopic();
    await saveQuestionFeedback({ openerId, rating: "up", note: "Sharp question." });

    const payload = await hydrateOwnedSession();

    expect(payload?.questionFeedback[openerId]).toEqual({
      rating: "up",
      note: "Sharp question.",
    });
  });

  it("leaves unrated questions out of the payload entirely", async () => {
    const { openerId } = await seedSessionOnItsFirstTopic();

    const payload = await hydrateOwnedSession();

    expect(payload?.questionFeedback).toEqual({});
    expect(payload?.questionFeedback[openerId]).toBeUndefined();
  });
});

describe("question feedback in the admin journey", () => {
  it("shows the verdict beside the question it judges, without counting as an answer", async () => {
    const { sessionId, openerId } = await seedSessionOnItsFirstTopic();

    await saveQuestionFeedback({
      openerId,
      rating: "down",
      note: "The options all say the same thing.",
    });

    const journey = await loadParticipantJourney(sessionId);
    const judged = journey?.topics[0]?.steps.find(
      (entry) => entry.step.opener_id === openerId,
    );
    expect(judged?.feedback).toEqual({
      rating: "down",
      note: "The options all say the same thing.",
    });
    expect(judged?.answer).toBeNull();
    expect(journey?.topics[0]?.state).not.toBe("answered");
  });
});
