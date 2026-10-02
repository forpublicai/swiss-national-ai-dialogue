/**
 * @jest-environment node
 *
 * How long each question took. Nothing recorded it: the mid-topic checkpoint is
 * upserted in place as the participant pages and used to be DELETED when the
 * topic resolved, so a finished topic kept one timestamp for all of its
 * questions. These tests pin the replacement — a server-stamped commit time per
 * page, carried past resolution by renaming the checkpoint row into the timing
 * namespace instead of dropping it.
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
  snadResponses,
  snadSessions,
} from "@/deliberations/swiss-national-ai-dialogue/server/db-schema";
import { studyStepList } from "@/deliberations/swiss-national-ai-dialogue/server/progress";
import {
  progressStepId,
  resolveResponse,
  saveTopicProgress,
  stampedTimes,
  topicStepId,
  topicTimingStepId,
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

const firstTopic = snadStudyDefinition.topics[0]!;

async function seedActiveSession(): Promise<string> {
  const version = await ensureActiveStudyVersion();
  const [session] = await db
    .insert(snadSessions)
    .values({ studyVersionId: version.id, locale: "en", canton: "BE" })
    .returning({ id: snadSessions.id });
  sessionCookie = session!.id;
  return session!.id;
}

function pageCount(topicKey: string): number {
  return studyStepList(snadStudyDefinition).filter(
    (step) => step.groupKey === topicKey,
  ).length;
}

// The values array the card posts after answering the first `answered` pages.
function valuesAfter(answered: number): unknown[] {
  return Array.from({ length: pageCount(firstTopic.key) }, (_unused, index) =>
    index < answered ? { selected: ["whatever"] } : null,
  );
}

async function answerOf(sessionId: string, stepId: string) {
  const [row] = await db
    .select({ answer: snadResponses.answer })
    .from(snadResponses)
    .where(
      and(
        eq(snadResponses.sessionId, sessionId),
        eq(snadResponses.stepId, stepId),
      ),
    )
    .limit(1);
  return row?.answer ?? null;
}

const timesOf = (answer: Record<string, unknown> | null) =>
  (answer?.times ?? null) as (string | null)[] | null;

async function backdateFirstStamp(
  sessionId: string,
  backdated: string,
): Promise<void> {
  await db
    .update(snadResponses)
    .set({
      answer: sql`jsonb_set(${snadResponses.answer}, '{times,0}', ${JSON.stringify(backdated)}::jsonb)`,
    })
    .where(
      and(
        eq(snadResponses.sessionId, sessionId),
        eq(snadResponses.stepId, progressStepId(firstTopic.key)),
      ),
    );
}

describe("stamping a question's commit time", () => {
  it("stamps every answered page and leaves the unanswered ones blank", async () => {
    const sessionId = await seedActiveSession();

    await saveTopicProgress({
      topicKey: firstTopic.key,
      values: valuesAfter(2),
    });

    const times = timesOf(
      await answerOf(sessionId, progressStepId(firstTopic.key)),
    );
    expect(times).toHaveLength(pageCount(firstTopic.key));
    expect(typeof times?.[0]).toBe("string");
    expect(typeof times?.[1]).toBe("string");
    expect(times?.[2]).toBeNull();
  });

  it("keeps an earlier question's stamp when a later one is answered", async () => {
    const sessionId = await seedActiveSession();
    await saveTopicProgress({
      topicKey: firstTopic.key,
      values: valuesAfter(1),
    });
    await backdateFirstStamp(sessionId, "2026-01-01T00:00:00.000Z");

    await saveTopicProgress({
      topicKey: firstTopic.key,
      values: valuesAfter(2),
    });

    const times = timesOf(
      await answerOf(sessionId, progressStepId(firstTopic.key)),
    );
    expect(times?.[0]).toBe("2026-01-01T00:00:00.000Z");
    expect(times?.[1]).not.toBe("2026-01-01T00:00:00.000Z");
  });

  it("keeps the stamp when the participant pages back and changes the answer", async () => {
    const sessionId = await seedActiveSession();
    await saveTopicProgress({
      topicKey: firstTopic.key,
      values: valuesAfter(2),
    });
    await backdateFirstStamp(sessionId, "2026-01-01T00:00:00.000Z");

    const amended = valuesAfter(2);
    amended[0] = { selected: ["changed-my-mind"] };
    await saveTopicProgress({ topicKey: firstTopic.key, values: amended });

    const times = timesOf(
      await answerOf(sessionId, progressStepId(firstTopic.key)),
    );
    expect(times?.[0]).toBe("2026-01-01T00:00:00.000Z");
  });

  it("drops the stamp when a question is cleared back to unanswered", () => {
    const times = stampedTimes({
      values: [null, { selected: ["b"] }],
      priorValues: [{ selected: ["a"] }, { selected: ["b"] }],
      priorTimes: ["2026-01-01T00:00:00.000Z", "2026-01-01T00:00:30.000Z"],
      now: "2026-01-01T00:01:00.000Z",
    });

    expect(times).toEqual([null, "2026-01-01T00:00:30.000Z"]);
  });
});

describe("surviving the topic resolving", () => {
  it("retires the checkpoint into the timing namespace, keeping the stamps", async () => {
    const sessionId = await seedActiveSession();
    await saveTopicProgress({
      topicKey: firstTopic.key,
      values: valuesAfter(2),
    });
    const before = timesOf(
      await answerOf(sessionId, progressStepId(firstTopic.key)),
    );

    await resolveResponse({
      stepId: topicStepId(firstTopic.key),
      answer: { answers: {}, share_more: "skip" },
      skipped: false,
    });

    expect(await answerOf(sessionId, progressStepId(firstTopic.key))).toBeNull();
    const retired = await answerOf(
      sessionId,
      topicTimingStepId(firstTopic.key),
    );
    expect(timesOf(retired)).toEqual(before);
    expect(retired).not.toHaveProperty("values");
  });

  it("leaves the combined answer exactly as the participant posted it", async () => {
    const sessionId = await seedActiveSession();
    await saveTopicProgress({
      topicKey: firstTopic.key,
      values: valuesAfter(1),
    });

    await resolveResponse({
      stepId: topicStepId(firstTopic.key),
      answer: { answers: { "Q?": "A" }, share_more: "skip" },
      skipped: false,
    });

    expect(await answerOf(sessionId, topicStepId(firstTopic.key))).toEqual({
      answers: { "Q?": "A" },
      share_more: "skip",
    });
  });

  it("stays idempotent on a re-posted answer, since nothing server-side was merged in", async () => {
    await seedActiveSession();
    const answer = { answers: { "Q?": "A" }, share_more: "skip" };
    await resolveResponse({
      stepId: topicStepId(firstTopic.key),
      answer,
      skipped: false,
    });

    await expect(
      resolveResponse({
        stepId: topicStepId(firstTopic.key),
        answer,
        skipped: false,
      }),
    ).resolves.toBeDefined();
  });

  it("refuses a checkpoint that arrives after the topic resolved", async () => {
    await seedActiveSession();
    await resolveResponse({
      stepId: topicStepId(firstTopic.key),
      answer: { answers: {}, share_more: "skip" },
      skipped: false,
    });

    await expect(
      saveTopicProgress({ topicKey: firstTopic.key, values: valuesAfter(2) }),
    ).rejects.toThrow("step_already_resolved");
  });
});
