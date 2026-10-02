/**
 * @jest-environment node
 *
 * Where a participant actually stopped. `sessions.status = "completed"` is
 * written the moment the wrap-up mounts, so it labels an abandoned wrap-up
 * exactly like a finished one; these tests pin the replacement — a per-question
 * frontier derived from the rows the runtime already writes, plus the new
 * `progress:wrapup` marker that makes the finale provable.
 *
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
  snadChats,
  snadResponses,
  snadSessions,
} from "@/deliberations/swiss-national-ai-dialogue/server/db-schema";
import {
  SNAD_NPS_STEP_ID,
  SNAD_SHAPE_STEP_ID,
  SNAD_WRAP_UP_CLOSING_MARKER,
  SNAD_WRAP_UP_EMAIL_MARKER,
  SNAD_WRAP_UP_FINALE_MARKER,
  SNAD_WRAP_UP_PROGRESS_STEP_ID,
  SNAD_WRAP_UP_SHAPE_MARKER,
} from "@/deliberations/swiss-national-ai-dialogue/server/constants";
import {
  listParticipants,
  loadParticipantJourney,
} from "@/deliberations/swiss-national-ai-dialogue/server/participants";
import {
  studyStepList,
  wrapUpSpecsOf,
} from "@/deliberations/swiss-national-ai-dialogue/server/progress";
import {
  buildTopicEvent,
  progressStepId,
  saveTopicProgress,
  resolveWrapUpResponse,
  saveWrapUpProgress,
  topicStepId,
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

const definition = snadStudyDefinition;
const topics = definition.topics;

async function seedSession(
  status: "active" | "wrap_up" | "completed" = "active",
): Promise<string> {
  const version = await ensureActiveStudyVersion();
  const [session] = await db
    .insert(snadSessions)
    .values({
      studyVersionId: version.id,
      locale: "en",
      canton: "BE",
      status,
      ...(status === "completed" ? { completedAt: new Date() } : {}),
    })
    .returning({ id: snadSessions.id });
  sessionCookie = session!.id;
  return session!.id;
}

async function answerTopic(sessionId: string, topicKey: string): Promise<void> {
  await db.insert(snadResponses).values({
    sessionId,
    stepId: topicStepId(topicKey),
    answer: { answers: {}, share_more: "skip" },
    skipped: false,
    locale: "en",
  });
}

async function answerEveryTopic(sessionId: string): Promise<void> {
  for (const topic of topics) await answerTopic(sessionId, topic.key);
}

function topicPageCount(topicKey: string): number {
  return studyStepList(definition).filter((step) => step.groupKey === topicKey)
    .length;
}

function checkpoint(topicKey: string, answered: number): unknown[] {
  return Array.from({ length: topicPageCount(topicKey) }, (_unused, index) =>
    index < answered ? { selected: ["whatever"] } : null,
  );
}

async function progressOf(sessionId: string) {
  const { participants } = await listParticipants();
  const found = participants.find(
    (participant) => participant.id === sessionId,
  );
  if (!found) throw new Error("participant not listed");
  return found.progress;
}

describe("drop-off inside a topic", () => {
  it("puts a participant who never answered anything on the first question", async () => {
    const sessionId = await seedSession();

    const progress = await progressOf(sessionId);

    expect(progress.step.groupKey).toBe(topics[0]!.key);
    expect(progress.step.number).toBe(1);
    expect(progress.reachedFinale).toBe(false);
  });

  it("puts them on the question after the last one they acted on", async () => {
    const sessionId = await seedSession();
    await saveTopicProgress({
      topicKey: topics[0]!.key,
      values: checkpoint(topics[0]!.key, 3),
    });

    expect((await progressOf(sessionId)).step.number).toBe(4);
  });

  it("counts a skipped question as acted on — a skip is not a drop-off", async () => {
    const sessionId = await seedSession();
    const values = checkpoint(topics[0]!.key, 1);
    values[1] = { skipped: true };
    await saveTopicProgress({ topicKey: topics[0]!.key, values });

    // Past the skipped page, wherever the conditional pages after it land it.
    expect((await progressOf(sessionId)).step.number).toBeGreaterThan(2);
  });

  it("carries the frontier into the next topic once one is resolved", async () => {
    const sessionId = await seedSession();
    await answerTopic(sessionId, topics[0]!.key);

    const progress = await progressOf(sessionId);

    expect(progress.step.groupKey).toBe(topics[1]!.key);
    expect(progress.step.number).toBe(1);
  });

  it("holds them on the topic's last page while their opt-in chat is unfinished", async () => {
    const sessionId = await seedSession();
    await db.insert(snadResponses).values({
      sessionId,
      stepId: topicStepId(topics[0]!.key),
      answer: { answers: {}, share_more: "talk" },
      skipped: false,
      locale: "en",
    });
    await db.insert(snadChats).values({
      sessionId,
      stepId: topicStepId(topics[0]!.key),
      type: "topic",
      status: "active",
      actorId: topics[0]!.actorId,
      messages: [],
    });

    const progress = await progressOf(sessionId);

    expect(progress.step.groupKey).toBe(topics[0]!.key);
    expect(progress.step.number).toBe(topicPageCount(topics[0]!.key));
  });
});

describe("drop-off inside the wrap-up", () => {
  it("does not call a session finished just because it reached the wrap-up", async () => {
    const sessionId = await seedSession("completed");
    await answerEveryTopic(sessionId);

    const progress = await progressOf(sessionId);

    expect(progress.step.phase).toBe("wrap_up");
    expect(progress.step.number).toBe(1);
    expect(progress.reachedFinale).toBe(false);
  });

  it("advances to the page the checkpoint marker records", async () => {
    const sessionId = await seedSession("completed");
    await answerEveryTopic(sessionId);

    await saveWrapUpProgress({ marker: SNAD_WRAP_UP_EMAIL_MARKER });

    const progress = await progressOf(sessionId);
    expect(progress.step.kind).toBe("email");
    expect(progress.reachedFinale).toBe(false);
  });

  it("puts the shape page between the email page and the closing interview", () => {
    const wrapUp = studyStepList(definition).filter(
      (step) => step.phase === "wrap_up",
    );

    const kinds = wrapUp.map((step) => step.kind);

    expect(kinds.slice(-4)).toEqual(["email", "shape", "closing", "finale"]);
  });

  it("counts a recorded suggestion as having reached the shape page, with no marker written", async () => {
    const sessionId = await seedSession("completed");
    await answerEveryTopic(sessionId);

    await resolveWrapUpResponse({
      stepId: SNAD_SHAPE_STEP_ID,
      answer: { text: "How should schools teach AI?" },
      skipped: false,
    });

    const progress = await progressOf(sessionId);
    expect(progress.step.kind).toBe("shape");
    expect(progress.reachedFinale).toBe(false);
  });

  it("accepts the shape page's marker as a page the study has", async () => {
    const sessionId = await seedSession("completed");
    await answerEveryTopic(sessionId);

    await saveWrapUpProgress({ marker: SNAD_WRAP_UP_SHAPE_MARKER });

    expect((await progressOf(sessionId)).step.kind).toBe("shape");
  });

  it("marks the finale reached once the marker says so", async () => {
    const sessionId = await seedSession("completed");
    await answerEveryTopic(sessionId);

    await saveWrapUpProgress({ marker: SNAD_WRAP_UP_FINALE_MARKER });

    expect((await progressOf(sessionId)).reachedFinale).toBe(true);
  });

  it("never walks the recorded frontier backwards on a back-nav", async () => {
    const sessionId = await seedSession("completed");
    await answerEveryTopic(sessionId);
    await saveWrapUpProgress({ marker: SNAD_WRAP_UP_FINALE_MARKER });

    await saveWrapUpProgress({ marker: SNAD_WRAP_UP_EMAIL_MARKER });

    const [row] = await db
      .select({ answer: snadResponses.answer })
      .from(snadResponses)
      .where(
        and(
          eq(snadResponses.sessionId, sessionId),
          eq(snadResponses.stepId, SNAD_WRAP_UP_PROGRESS_STEP_ID),
        ),
      );
    expect(row?.answer).toEqual({ marker: SNAD_WRAP_UP_FINALE_MARKER });
    expect((await progressOf(sessionId)).reachedFinale).toBe(true);
  });

  it("rejects a marker the pinned study has no page for", async () => {
    const sessionId = await seedSession("completed");
    await answerEveryTopic(sessionId);

    await expect(
      saveWrapUpProgress({ marker: "@nowhere" }),
    ).rejects.toThrow("invalid_step");
  });

  it("infers the page from an answer when no marker was ever written", async () => {
    const sessionId = await seedSession("completed");
    await answerEveryTopic(sessionId);
    const specs = wrapUpSpecsOf(definition);
    const second = specs[1];
    if (!second) throw new Error("study has fewer than two wrap-up questions");
    await db.insert(snadResponses).values({
      sessionId,
      stepId: second.id,
      answer: { choice: "whatever" },
      skipped: false,
      locale: "en",
    });

    expect((await progressOf(sessionId)).step.number).toBe(2);
  });

  it("infers the finale from an NPS answer on a pre-marker session", async () => {
    const sessionId = await seedSession("completed");
    await answerEveryTopic(sessionId);
    await db.insert(snadResponses).values({
      sessionId,
      stepId: SNAD_NPS_STEP_ID,
      answer: { nps: 9 },
      skipped: false,
      locale: "en",
    });

    expect((await progressOf(sessionId)).reachedFinale).toBe(true);
  });

  it("keeps an unfinished closing interview short of the finale", async () => {
    const sessionId = await seedSession("completed");
    await answerEveryTopic(sessionId);
    await db.insert(snadChats).values({
      sessionId,
      stepId: "closing",
      type: "feedback",
      status: "active",
      actorId: definition.wrapUp.feedbackActorId,
      messages: [],
    });

    const progress = await progressOf(sessionId);

    expect(progress.reachedFinale).toBe(false);
    expect(progress.step.kind).toBe(
      definition.wrapUp.closing ? "closing" : "finale",
    );
  });
});

describe("the numbered journey", () => {
  it("numbers every question of a topic and flags the one they stopped on", async () => {
    const sessionId = await seedSession();
    await saveTopicProgress({
      topicKey: topics[0]!.key,
      values: checkpoint(topics[0]!.key, 2),
    });

    const journey = await loadParticipantJourney(sessionId);
    const topic = journey!.topics[0]!;
    const frontier = (await progressOf(sessionId)).step.number;

    expect(topic.steps.map((entry) => entry.number)).toEqual(
      [...topic.steps.map((entry) => entry.number)].sort((a, b) => a - b),
    );
    expect(topic.steps.filter((entry) => entry.droppedHere)).toHaveLength(1);
    expect(topic.steps.find((entry) => entry.droppedHere)?.number).toBe(
      frontier,
    );
  });

  it("numbers a question by its page position, not by how many were shown", async () => {
    const sessionId = await seedSession();
    const event = buildTopicEvent(definition, sessionId, topics[0]!.key, "en");

    const journey = await loadParticipantJourney(sessionId);
    const shown = journey!.topics[0]!.steps;

    expect(shown.length).toBeLessThanOrEqual(event.steps.length);
    shown.forEach((entry) => {
      expect(event.steps[entry.number - 1]).toEqual(entry.step);
    });
  });
});

describe("the funnel's step list", () => {
  it("gives every question a position that is stable across sessions", async () => {
    const first = studyStepList(definition);
    const second = studyStepList(definition);

    expect(first.map((step) => step.id)).toEqual(second.map((step) => step.id));
    expect(new Set(first.map((step) => step.id)).size).toBe(first.length);
  });

  it("ends on the finale, the page that actually means finished", () => {
    const steps = studyStepList(definition);
    const last = steps[steps.length - 1]!;

    expect(last.phase).toBe("wrap_up");
    expect(last.kind).toBe("finale");
  });

  it("places a checkpointed participant behind one who got further", async () => {
    const early = await seedSession();
    await saveTopicProgress({
      topicKey: topics[0]!.key,
      values: checkpoint(topics[0]!.key, 1),
    });
    const late = await seedSession();
    await answerTopic(late, topics[0]!.key);

    const { participants } = await listParticipants();
    const earlyIndex = participants.find((p) => p.id === early)!.progress.index;
    const lateIndex = participants.find((p) => p.id === late)!.progress.index;

    expect(earlyIndex).toBeLessThan(lateIndex);
  });
});

describe("the wrap-up progress row", () => {
  it("is never mistaken for an answer to a wrap-up question", async () => {
    const sessionId = await seedSession("completed");
    await answerEveryTopic(sessionId);
    await saveWrapUpProgress({ marker: SNAD_WRAP_UP_CLOSING_MARKER });

    const journey = await loadParticipantJourney(sessionId);

    expect(
      journey!.wrapUpAnswers.every((entry) => entry.answer === null),
    ).toBe(true);
  });

  it("can never collide with a topic's own checkpoint", async () => {
    expect(
      topics.some(
        (topic) => progressStepId(topic.key) === SNAD_WRAP_UP_PROGRESS_STEP_ID,
      ),
    ).toBe(false);
  });
});
