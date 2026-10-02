/**
 * @jest-environment node
 *
 * The participants read model derives things the raw rows don't hold: faithful
 * language tracking (start/end + mid-dialogue switches), quote-interview reply
 * counts, an active-time figure that caps idle gaps so quit/resume time isn't
 * counted, and (in the per-participant journey) the finale NPS, the results
 * email opt-in, and the closing quote paired with the interview that made it.
 */

process.env.DATABASE_URL ??=
  "postgresql://postgres:postgres@localhost:5433/dialogue_test";

import path from "node:path";

import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { Pool } from "pg";

import { db } from "@/db";
import {
  snadChats,
  snadContributions,
  snadResponses,
  snadSessions,
} from "@/deliberations/swiss-national-ai-dialogue/server/db-schema";
import {
  SNAD_CLOSING_TOPIC_KEY,
  SNAD_EMAIL_STEP_ID,
  SNAD_NPS_STEP_ID,
  SNAD_SKIP_TOPIC_MESSAGE,
} from "@/deliberations/swiss-national-ai-dialogue/server/constants";
import {
  listParticipants,
  loadParticipantJourney,
  type ParticipantJourney,
  type ParticipantSummary,
} from "@/deliberations/swiss-national-ai-dialogue/server/participants";
import { wrapUpSpecsOf } from "@/deliberations/swiss-national-ai-dialogue/server/progress";
import {
  buildTopicEvent,
  progressStepId,
} from "@/deliberations/swiss-national-ai-dialogue/server/sessions";
import {
  ensureActiveStudyVersion,
  snadStudyDefinition,
} from "@/deliberations/swiss-national-ai-dialogue/server/study";

const MINUTE = 60_000;
const EPOCH = new Date("2026-01-01T00:00:00.000Z").getTime();
const at = (minutes: number) => new Date(EPOCH + minutes * MINUTE);

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

type SessionOverrides = Partial<typeof snadSessions.$inferInsert>;

async function seedSession(overrides: SessionOverrides): Promise<string> {
  const version = await ensureActiveStudyVersion();
  const [session] = await db
    .insert(snadSessions)
    .values({
      studyVersionId: version.id,
      locale: "de",
      canton: "ZH",
      createdAt: at(0),
      lastActiveAt: at(0),
      ...overrides,
    })
    .returning({ id: snadSessions.id });
  return session!.id;
}

async function onlyParticipant(): Promise<ParticipantSummary> {
  const { participants } = await listParticipants();
  expect(participants).toHaveLength(1);
  return participants[0]!;
}

const seedQuitAndResumedSession = async () => {
  const sessionId = await seedSession({
    status: "completed",
    createdAt: at(0),
    lastActiveAt: at(107),
    completedAt: at(107),
  });
  await db.insert(snadResponses).values([
    {
      sessionId,
      stepId: "topic:ai-in-schools",
      answer: { answers: {} },
      createdAt: at(5),
      updatedAt: at(5),
    },
    {
      sessionId,
      stepId: "topic:ai-at-work",
      answer: { answers: {} },
      createdAt: at(10),
      updatedAt: at(10),
    },
  ]);
  await db.insert(snadChats).values({
    sessionId,
    stepId: "feedback",
    actorId: "actor-1",
    type: "feedback",
    messages: [{ role: "assistant", content: "How was it?" }],
    status: "completed",
    createdAt: at(100),
    updatedAt: at(105),
    completedAt: at(107),
  });
  return sessionId;
};

const seedSessionWithBothChatTypes = async () => {
  const sessionId = await seedSession({});
  await db.insert(snadChats).values([
    {
      sessionId,
      stepId: "topic:ai-in-schools",
      actorId: "actor-1",
      type: "topic",
      messages: [
        { role: "assistant", content: "Tell me more?" },
        { role: "user", content: "Teachers need training." },
        { role: "user", content: SNAD_SKIP_TOPIC_MESSAGE },
      ],
    },
    {
      sessionId,
      stepId: "topic:ai-at-work",
      actorId: "actor-1",
      type: "topic",
      messages: [
        { role: "assistant", content: "Why?" },
        { role: "user", content: "It changes hiring." },
        { role: "assistant", content: "Go on." },
        { role: "user", content: "And pay." },
      ],
    },
    {
      sessionId,
      stepId: "feedback",
      actorId: "actor-1",
      type: "feedback",
      messages: [
        { role: "assistant", content: "Feedback?" },
        { role: "user", content: "It was good." },
      ],
    },
    {
      sessionId,
      stepId: "other:ai-in-schools-q1",
      actorId: "actor-1",
      type: "other",
      messages: [
        { role: "assistant", content: "What did you have in mind?" },
        { role: "user", content: "Teacher-led AI literacy classes." },
      ],
    },
  ]);
  return sessionId;
};

describe("active time", () => {
  it("caps a long idle gap so away time isn't counted as time spent", async () => {
    await seedQuitAndResumedSession();

    const participant = await onlyParticipant();

    expect(participant.elapsedMs).toBe(107 * MINUTE);
    expect(participant.activeMs).toBe(47 * MINUTE);
  });

  it("falls back to last-active for elapsed on a session that never completed", async () => {
    await seedSession({ status: "active", createdAt: at(0), lastActiveAt: at(3) });

    const participant = await onlyParticipant();

    expect(participant.completedAt).toBeNull();
    expect(participant.elapsedMs).toBe(3 * MINUTE);
  });
});

describe("quote-interview engagement", () => {
  it("counts quote-interview replies, ignoring the retired topic chats", async () => {
    await seedSessionWithBothChatTypes();

    const participant = await onlyParticipant();

    expect(participant.quoteInterviewReplies).toBe(1);
  });

  it("counts the MCQ 'Other…' assist chats the participant engaged with", async () => {
    await seedSessionWithBothChatTypes();

    const participant = await onlyParticipant();

    expect(participant.otherChatCount).toBe(1);
  });
});

describe("net promoter score", () => {
  it("surfaces the finale NPS score on the summary row", async () => {
    const sessionId = await seedSession({ status: "completed" });
    await db.insert(snadResponses).values({
      sessionId,
      stepId: SNAD_NPS_STEP_ID,
      answer: { nps: 8, comment: "Loved it" },
    });

    const participant = await onlyParticipant();

    expect(participant.nps).toBe(8);
  });

  it("surfaces the written feedback that goes alongside the score", async () => {
    const sessionId = await seedSession({ status: "completed" });
    await db.insert(snadResponses).values({
      sessionId,
      stepId: SNAD_NPS_STEP_ID,
      answer: { nps: 8, comment: "  Loved the canton map.  " },
    });

    const participant = await onlyParticipant();

    expect(participant.npsComment).toBe("Loved the canton map.");
  });

  it("leaves the written feedback null when only a score was given", async () => {
    const sessionId = await seedSession({ status: "completed" });
    await db.insert(snadResponses).values({
      sessionId,
      stepId: SNAD_NPS_STEP_ID,
      answer: { nps: 8, comment: "   " },
    });

    const participant = await onlyParticipant();

    expect(participant.nps).toBe(8);
    expect(participant.npsComment).toBeNull();
  });

  it("leaves NPS null when the participant never submitted it", async () => {
    await seedSession({ status: "completed" });

    const participant = await onlyParticipant();

    expect(participant.nps).toBeNull();
    expect(participant.npsComment).toBeNull();
  });
});

const seedFinishedSessionWithClosing = async () => {
  const sessionId = await seedSession({
    status: "completed",
    completedAt: at(20),
    lastActiveAt: at(20),
    archetype: "the-pragmatist",
  });
  await db.insert(snadResponses).values([
    {
      sessionId,
      stepId: SNAD_NPS_STEP_ID,
      answer: { nps: 9, comment: "Genuinely thoughtful." },
    },
    {
      sessionId,
      stepId: SNAD_EMAIL_STEP_ID,
      answer: { email: "voter@example.ch" },
    },
  ]);
  await db.insert(snadChats).values({
    sessionId,
    stepId: "feedback",
    actorId: "actor-1",
    type: "feedback",
    messages: [
      { role: "assistant", content: "What would you tell Switzerland?" },
      { role: "user", content: "Invest in public AI." },
    ],
    status: "completed",
  });
  await db.insert(snadContributions).values({
    sessionId,
    topicKey: SNAD_CLOSING_TOPIC_KEY,
    text: "Switzerland should build public AI it can trust.",
    locale: "de",
    canton: "ZH",
    source: "chat",
    status: "approved",
    featured: true,
  });
  return sessionId;
};

describe("participant journey", () => {
  it("pairs the closing quote with the interview and surfaces NPS + email", async () => {
    const sessionId = await seedFinishedSessionWithClosing();

    const journey = await loadParticipantJourney(sessionId);

    expect(journey?.nps).toEqual({ score: 9, comment: "Genuinely thoughtful." });
    expect(journey?.email).toBe("voter@example.ch");
    expect(journey?.quoteInterview).toHaveLength(2);
    expect(journey?.closingQuote?.text).toBe(
      "Switzerland should build public AI it can trust.",
    );
    expect(journey?.closingQuote?.featured).toBe(true);
  });
});

const seedTimedSession = async () => {
  const [firstTopic, secondTopic] = snadStudyDefinition.topics;
  const [firstWrapUp, secondWrapUp] = wrapUpSpecsOf(snadStudyDefinition);
  const sessionId = await seedSession({
    status: "wrap_up",
    createdAt: at(0),
    lastActiveAt: at(45.5),
  });
  await db.insert(snadResponses).values([
    {
      sessionId,
      stepId: `topic:${firstTopic!.key}`,
      answer: { answers: {} },
      createdAt: at(3),
      updatedAt: at(3),
    },
    {
      sessionId,
      stepId: `topic:${secondTopic!.key}`,
      answer: { answers: {} },
      createdAt: at(5),
      updatedAt: at(5),
    },
    {
      sessionId,
      stepId: firstWrapUp!.id,
      answer: { choice: "yes" },
      createdAt: at(5.5),
      updatedAt: at(5.5),
    },
    {
      sessionId,
      stepId: secondWrapUp!.id,
      answer: { choice: "no" },
      createdAt: at(45.5),
      updatedAt: at(45.5),
    },
  ]);
  return {
    sessionId,
    firstTopic: firstTopic!,
    secondTopic: secondTopic!,
    firstWrapUp: firstWrapUp!,
    secondWrapUp: secondWrapUp!,
  };
};

describe("time on task", () => {
  it("times each topic as a whole, from the previous recorded step", async () => {
    const { sessionId, firstTopic, secondTopic } = await seedTimedSession();

    const journey = await loadParticipantJourney(sessionId);

    const byKey = new Map(journey!.topics.map((topic) => [topic.key, topic]));
    expect(byKey.get(firstTopic.key)?.durationMs).toBe(3 * MINUTE);
    expect(byKey.get(secondTopic.key)?.durationMs).toBe(2 * MINUTE);
  });

  it("times each wrap-up question on its own, since each owns a row", async () => {
    const { sessionId, firstWrapUp } = await seedTimedSession();

    const journey = await loadParticipantJourney(sessionId);

    const answer = journey!.wrapUpAnswers.find(
      (entry) => entry.step.opener_id === firstWrapUp.id,
    );
    expect(answer?.durationMs).toBe(30_000);
  });

  it("reports no time for a step reached after a break longer than the idle cap", async () => {
    const { sessionId, secondWrapUp } = await seedTimedSession();

    const journey = await loadParticipantJourney(sessionId);

    const answer = journey!.wrapUpAnswers.find(
      (entry) => entry.step.opener_id === secondWrapUp.id,
    );
    expect(answer?.answeredAt).toEqual(at(45.5));
    expect(answer?.durationMs).toBeNull();
  });

  it("reports no time for a topic the participant never resolved", async () => {
    const sessionId = await seedSession({ status: "active" });

    const journey = await loadParticipantJourney(sessionId);

    expect(journey?.topics.every((topic) => topic.durationMs === null)).toBe(
      true,
    );
  });
});

const seedTopicWithPerQuestionStamps = async () => {
  const topic = snadStudyDefinition.topics[0]!;
  const sessionId = await seedSession({
    status: "active",
    createdAt: at(0),
    lastActiveAt: at(3),
  });
  const pages = buildTopicEvent(
    snadStudyDefinition,
    sessionId,
    topic.key,
    "de",
  ).steps;
  const commits = [at(0.5), at(1), at(3)];
  const stamped = pages
    .flatMap((step, index) =>
      step.kind === "share_more" || "visibleWhen" in step ? [] : [{ step, index }],
    )
    .slice(0, commits.length);
  const times = pages.map(() => null as string | null);
  stamped.forEach(({ index }, order) => {
    times[index] = commits[order]!.toISOString();
  });
  await db.insert(snadResponses).values([
    {
      sessionId,
      stepId: progressStepId(topic.key),
      answer: {
        values: pages.map((_page, index) =>
          times[index] ? { selected: ["whatever"] } : null,
        ),
        times,
      },
      createdAt: at(0.5),
      updatedAt: at(3),
    },
  ]);
  return {
    sessionId,
    topic,
    numbers: stamped.map(({ index }) => index + 1),
  };
};

const stepsOfTopic = (journey: ParticipantJourney, key: string) =>
  journey.topics.find((entry) => entry.key === key)!.steps;

describe("per-question time inside a topic", () => {
  it("times each question from when the one before it was committed", async () => {
    const { sessionId, topic, numbers } =
      await seedTopicWithPerQuestionStamps();

    const journey = await loadParticipantJourney(sessionId);

    const byNumber = new Map(
      stepsOfTopic(journey!, topic.key).map((step) => [step.number, step]),
    );
    expect(byNumber.get(numbers[0]!)?.durationMs).toBe(30_000);
    expect(byNumber.get(numbers[1]!)?.durationMs).toBe(30_000);
    expect(byNumber.get(numbers[2]!)?.durationMs).toBe(2 * MINUTE);
  });

  it("totals the topic from its questions rather than one whole-topic gap", async () => {
    const { sessionId, topic } = await seedTopicWithPerQuestionStamps();

    const journey = await loadParticipantJourney(sessionId);

    expect(
      journey!.topics.find((entry) => entry.key === topic.key)?.durationMs,
    ).toBe(3 * MINUTE);
  });

  it("leaves the questions they never reached untimed", async () => {
    const { sessionId, topic, numbers } =
      await seedTopicWithPerQuestionStamps();

    const journey = await loadParticipantJourney(sessionId);

    const later = stepsOfTopic(journey!, topic.key).filter(
      (step) => !numbers.includes(step.number),
    );
    expect(later.length).toBeGreaterThan(0);
    expect(later.every((step) => step.durationMs === null)).toBe(true);
  });

  it("falls back to the whole-topic gap for sessions from before stamping", async () => {
    const { sessionId, firstTopic } = await seedTimedSession();

    const journey = await loadParticipantJourney(sessionId);

    const topic = journey!.topics.find((entry) => entry.key === firstTopic.key);
    expect(topic?.durationMs).toBe(3 * MINUTE);
    expect(topic?.steps.every((step) => step.durationMs === null)).toBe(true);
  });
});

describe("language tracking", () => {
  it("flags a start→end switch and reports both endpoints", async () => {
    await seedSession({ locale: "fr", startLocale: "de", endLocale: "fr" });

    const participant = await onlyParticipant();

    expect(participant.startLocale).toBe("de");
    expect(participant.endLocale).toBe("fr");
    expect(participant.languageSwitched).toBe(true);
  });

  it("flags a mid-dialogue switch even when the answer lands back on the start language", async () => {
    const sessionId = await seedSession({
      locale: "de",
      startLocale: "de",
      endLocale: "de",
    });
    await db.insert(snadResponses).values({
      sessionId,
      stepId: "topic:ai-in-schools",
      answer: { answers: {} },
      locale: "it",
    });

    const participant = await onlyParticipant();

    expect(participant.languageSwitched).toBe(true);
  });

  it("never implies a switch for pre-migration rows that only captured the current locale", async () => {
    const sessionId = await seedSession({
      locale: "de",
      startLocale: null,
      endLocale: null,
    });
    await db.insert(snadResponses).values({
      sessionId,
      stepId: "topic:ai-in-schools",
      answer: { answers: {} },
      locale: null,
    });

    const participant = await onlyParticipant();

    expect(participant.startLocale).toBeNull();
    expect(participant.languageSwitched).toBe(false);
  });
});
