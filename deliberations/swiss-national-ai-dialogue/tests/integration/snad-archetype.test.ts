/**
 * @jest-environment node
 *
 * The persona archetype scored off a participant's stored answers at the
 * finale. The expectations below build the same PersonaAnswers the
 * pre-rewrite scorer did — straight off the session's own topic event — so
 * the opener-index extraction has to agree with them. Runs against the real
 * test DB; nothing is mocked.
 */

process.env.DATABASE_URL ??=
  "postgresql://postgres:postgres@localhost:5433/dialogue_test";

import path from "node:path";

import { eq, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { Pool } from "pg";

import { db } from "@/db";
import {
  snadResponses,
  snadSessions,
} from "@/deliberations/swiss-national-ai-dialogue/server/db-schema";
import { computeAndPersistArchetype } from "@/deliberations/swiss-national-ai-dialogue/server/archetype/compute";
import { buildTopicEvent } from "@/deliberations/swiss-national-ai-dialogue/server/sessions";
import {
  ensureActiveStudyVersion,
  snadStudyDefinition,
} from "@/deliberations/swiss-national-ai-dialogue/server/study";
import {
  PERSONA_AXES,
  classifyPersona,
  scorePersona,
  type PersonaAnswer,
} from "@/deliberations/swiss-national-ai-dialogue/archetype";

beforeAll(async () => {
  await migrate(db, {
    migrationsFolder: path.join(__dirname, "../../../../drizzle"),
  });
});

afterEach(async () => {
  await db.execute(
    sql`TRUNCATE snad.sessions, snad.study_versions RESTART IDENTITY CASCADE`,
  );
});

afterAll(async () => {
  await (db.$client as Pool).end();
});

async function seedFullyAnsweredSession(): Promise<{
  sessionId: string;
  expected: PersonaAnswer[];
}> {
  const version = await ensureActiveStudyVersion();
  const [session] = await db
    .insert(snadSessions)
    .values({ studyVersionId: version.id, locale: "de", canton: "BE" })
    .returning({ id: snadSessions.id });
  const sessionId = session!.id;
  const expected: PersonaAnswer[] = [];

  for (const topic of snadStudyDefinition.topics) {
    const steps = buildTopicEvent(
      snadStudyDefinition,
      sessionId,
      topic.key,
      "de",
    ).steps;
    const answers: Record<string, unknown> = {};
    steps.forEach((step) => {
      if (step.kind === "share_more" || !step.opener_id) return;
      const openerId = step.opener_id;
      if (step.kind === "binary") {
        answers[step.question] = { choice: "a" };
        expected.push({ openerId, position: 0, selected: null, order: null });
      } else if (step.kind === "slider") {
        answers[step.question] = { position: 70 };
        expected.push({ openerId, position: 70, selected: null, order: null });
      } else if (step.kind === "ranking") {
        const order = step.options.map((option) => option.label);
        answers[step.question] = { order };
        expected.push({ openerId, position: null, selected: null, order });
      } else if (step.kind === "question") {
        const option = step.options[0]!;
        answers[step.question] = { selected: [option.label] };
        expected.push({
          openerId,
          position: null,
          selected: [option.id ?? option.label],
          order: null,
        });
      }
    });
    await db.insert(snadResponses).values({
      sessionId,
      stepId: `topic:${topic.key}`,
      answer: { answers, share_more: "skip" },
      locale: "de",
    });
  }

  return { sessionId, expected };
}

async function seedBookkeepingRows(sessionId: string): Promise<void> {
  await db.insert(snadResponses).values([
    {
      sessionId,
      stepId: "progress:daily-life",
      answer: { values: [1, 2] },
      locale: "de",
    },
    {
      sessionId,
      stepId: "qfeedback:dl-usage",
      answer: { rating: "down", note: "" },
      locale: "de",
    },
    {
      sessionId,
      stepId: "timing:daily-life",
      answer: { values: ["2026-07-26T00:00:00Z"] },
      locale: "de",
    },
  ]);
}

describe("computeAndPersistArchetype", () => {
  it("scores the archetype its stored answers add up to", async () => {
    const { sessionId, expected } = await seedFullyAnsweredSession();

    const result = await computeAndPersistArchetype(sessionId);

    expect(result?.archetype).toBe(classifyPersona(scorePersona(expected).axes));
  });

  it("places the participant on every axis of the comparison radar", async () => {
    const { sessionId, expected } = await seedFullyAnsweredSession();
    const { axes } = scorePersona(expected);

    const result = await computeAndPersistArchetype(sessionId);

    expect(result?.axes).toEqual(
      PERSONA_AXES.map((axis) => ({ axis, you: axes[axis], ch: axes[axis] })),
    );
  });

  it("persists the archetype on the session", async () => {
    const { sessionId } = await seedFullyAnsweredSession();

    const result = await computeAndPersistArchetype(sessionId);

    const [row] = await db
      .select({ archetype: snadSessions.archetype })
      .from(snadSessions)
      .where(eq(snadSessions.id, sessionId));
    expect(row?.archetype).toBe(result?.archetype);
  });

  it("ignores checkpoint, feedback and timing rows", async () => {
    const { sessionId, expected } = await seedFullyAnsweredSession();
    await seedBookkeepingRows(sessionId);

    const result = await computeAndPersistArchetype(sessionId);

    expect(result?.archetype).toBe(classifyPersona(scorePersona(expected).axes));
  });

  it("withholds the rarity line until the pool is big enough to mean anything", async () => {
    const { sessionId } = await seedFullyAnsweredSession();

    const result = await computeAndPersistArchetype(sessionId);

    expect(result?.rarity).toBeNull();
  });

  it("returns nothing when the session answered nothing scorable", async () => {
    const version = await ensureActiveStudyVersion();
    const [session] = await db
      .insert(snadSessions)
      .values({ studyVersionId: version.id, locale: "en", canton: "BE" })
      .returning({ id: snadSessions.id });

    expect(await computeAndPersistArchetype(session!.id)).toBeNull();
  });
});
