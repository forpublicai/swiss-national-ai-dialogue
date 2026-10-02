/**
 * @jest-environment node
 *
 * The "how others answered" aggregates behind the opener reveal cards. The
 * reference tally below is the pre-rewrite algorithm — rebuild every
 * respondent's topic event, look the opener up in it — which the current
 * opener-index implementation must agree with answer for answer. Cookie auth
 * is mocked; everything else runs against the real test DB.
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

import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { Pool } from "pg";

import { db } from "@/db";
import {
  snadResponses,
  snadSessions,
} from "@/deliberations/swiss-national-ai-dialogue/server/db-schema";
import {
  getSnadPoll,
  listSnadPollSummaries,
  type SnadPoll,
  type SnadPollKind,
} from "@/deliberations/swiss-national-ai-dialogue/server/polls";
import {
  buildTopicEvent,
  topicStepId,
} from "@/deliberations/swiss-national-ai-dialogue/server/sessions";
import {
  ensureActiveStudyVersion,
  snadStudyDefinition,
} from "@/deliberations/swiss-national-ai-dialogue/server/study";
import type {
  SnadLocale,
  SnadSequenceStep,
} from "@/deliberations/swiss-national-ai-dialogue/types";

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

type Respondent = { sessionId: string; locale: SnadLocale };

async function seedSession(locale: SnadLocale): Promise<Respondent> {
  const version = await ensureActiveStudyVersion();
  const [session] = await db
    .insert(snadSessions)
    .values({ studyVersionId: version.id, locale, canton: "BE" })
    .returning({ id: snadSessions.id });
  return { sessionId: session!.id, locale };
}

function stepsShownTo(respondent: Respondent, topicKey: string) {
  return buildTopicEvent(
    snadStudyDefinition,
    respondent.sessionId,
    topicKey,
    respondent.locale,
  ).steps;
}

function stepShownTo(
  respondent: Respondent,
  topicKey: string,
  openerId: string,
): Exclude<SnadSequenceStep, { kind: "share_more" }> | null {
  const step = stepsShownTo(respondent, topicKey).find(
    (candidate) => candidate.opener_id === openerId,
  );
  return !step || step.kind === "share_more" ? null : step;
}

function sharedOpener(respondents: Respondent[], kind: SnadSequenceStep["kind"]) {
  const [first, ...rest] = respondents;
  if (!first) throw new Error("no respondents");
  const found = snadStudyDefinition.topics.flatMap((topic) =>
    stepsShownTo(first, topic.key).flatMap((step) =>
      step.kind === kind &&
      step.opener_id &&
      rest.every((other) => stepShownTo(other, topic.key, step.opener_id!))
        ? [{ topicKey: topic.key, openerId: step.opener_id }]
        : [],
    ),
  );
  const opener = found[0];
  if (!opener) throw new Error(`no ${kind} opener shown to every respondent`);
  return opener;
}

async function recordAnswers(
  respondent: Respondent,
  topicKey: string,
  answersByOpenerId: Record<string, unknown>,
): Promise<void> {
  const answers = Object.fromEntries(
    Object.entries(answersByOpenerId).flatMap(([openerId, answer]) => {
      const step = stepShownTo(respondent, topicKey, openerId);
      return step ? [[step.question, answer]] : [];
    }),
  );
  await db.insert(snadResponses).values({
    sessionId: respondent.sessionId,
    stepId: topicStepId(topicKey),
    answer: { answers, share_more: "skip" },
    locale: respondent.locale,
  });
}

function optionLabels(
  respondent: Respondent,
  topicKey: string,
  openerId: string,
): string[] {
  const step = stepShownTo(respondent, topicKey, openerId);
  if (!step || !("options" in step)) throw new Error("opener carries no options");
  return step.options.map((option) => option.label);
}

async function referencePoll(
  openerId: string,
  kind: SnadPollKind,
  excludeSessionId: string | null,
): Promise<SnadPoll> {
  const rows = await db
    .select({
      sessionId: snadResponses.sessionId,
      stepId: snadResponses.stepId,
      answer: snadResponses.answer,
      locale: snadSessions.locale,
    })
    .from(snadResponses)
    .innerJoin(snadSessions, sql`${snadSessions.id} = ${snadResponses.sessionId}`);
  const answered = rows.flatMap((row) => {
    if (row.sessionId === excludeSessionId) return [];
    if (!row.stepId.startsWith("topic:") || !row.answer) return [];
    const step = stepShownTo(
      { sessionId: row.sessionId, locale: row.locale as SnadLocale },
      row.stepId.slice("topic:".length),
      openerId,
    );
    if (!step) return [];
    const answers = row.answer.answers as Record<string, unknown> | undefined;
    return answers ? [{ step, answer: answers[step.question] }] : [];
  });

  if (kind === "binary") {
    const sides: [number, number] = [0, 0];
    answered.forEach(({ step, answer }) => {
      if (step.kind !== "binary" || !answer || typeof answer !== "object") return;
      const choice = (answer as { choice?: unknown }).choice;
      if (choice === "a") sides[0] += 1;
      if (choice === "b") sides[1] += 1;
    });
    return { kind, total: sides[0] + sides[1], sides };
  }
  if (kind === "slider") {
    const bins = Array.from({ length: 10 }, () => 0);
    let total = 0;
    answered.forEach(({ step, answer }) => {
      if (step.kind !== "slider" || !answer || typeof answer !== "object") return;
      const position = (answer as { position?: unknown }).position;
      if (typeof position !== "number") return;
      bins[Math.min(9, Math.max(0, Math.floor(position / 10)))] += 1;
      total += 1;
    });
    return { kind, total, bins };
  }
  if (kind === "ranking") {
    const rankSums: Record<string, number> = {};
    let total = 0;
    answered.forEach(({ step, answer }) => {
      if (step.kind !== "ranking" || !answer || typeof answer !== "object") return;
      const raw = (answer as { order?: unknown }).order;
      if (!Array.isArray(raw)) return;
      const idByLabel = new Map(
        step.options.map((option) => [option.label, option.id ?? option.label]),
      );
      total += 1;
      raw.forEach((entry, index) => {
        if (typeof entry !== "string") return;
        const id = idByLabel.get(entry) ?? entry;
        rankSums[id] = (rankSums[id] ?? 0) + index + 1;
      });
    });
    return {
      kind,
      total,
      meanRank: Object.fromEntries(
        Object.entries(rankSums).map(([id, sum]) => [id, sum / total]),
      ),
    };
  }
  const options: Record<string, number> = {};
  let total = 0;
  if (kind === "budget") throw new Error("no budget openers in the study");
  answered.forEach(({ step, answer }) => {
    if (step.kind !== "question" || !answer || typeof answer !== "object") return;
    const value = answer as { selected?: unknown; other?: unknown };
    const idByLabel = new Map(step.options.map((option) => [option.label, option.id]));
    const selected = Array.isArray(value.selected)
      ? value.selected.flatMap((label) =>
          typeof label === "string" ? [idByLabel.get(label) ?? label] : [],
        )
      : [];
    const ids =
      typeof value.other === "string" && value.other.trim()
        ? [...selected, "__other__"]
        : selected;
    if (ids.length === 0) return;
    total += 1;
    ids.forEach((id) => {
      options[id] = (options[id] ?? 0) + 1;
    });
  });
  return { kind, total, options };
}

describe("getSnadPoll", () => {
  it("counts each side of a binary opener across respondents", async () => {
    const respondents = await Promise.all(
      (["en", "de", "fr"] as const).map(seedSession),
    );
    const { topicKey, openerId } = sharedOpener(respondents, "binary");
    await recordAnswers(respondents[0]!, topicKey, { [openerId]: { choice: "a" } });
    await recordAnswers(respondents[1]!, topicKey, { [openerId]: { choice: "a" } });
    await recordAnswers(respondents[2]!, topicKey, { [openerId]: { choice: "b" } });

    expect(await getSnadPoll(openerId, "binary")).toEqual({
      kind: "binary",
      total: 3,
      sides: [2, 1],
    });
  });

  it("counts an answer given in any of the study's languages", async () => {
    const [english, romansh] = await Promise.all(
      (["en", "rm"] as const).map(seedSession),
    );
    const { topicKey, openerId } = sharedOpener([english!, romansh!], "binary");
    await recordAnswers(english!, topicKey, { [openerId]: { choice: "a" } });
    await recordAnswers(romansh!, topicKey, { [openerId]: { choice: "a" } });

    expect((await getSnadPoll(openerId, "binary")).total).toBe(2);
  });

  it("leaves the requester out of the crowd they are about to join", async () => {
    const respondents = await Promise.all(
      (["en", "de"] as const).map(seedSession),
    );
    const { topicKey, openerId } = sharedOpener(respondents, "binary");
    await recordAnswers(respondents[0]!, topicKey, { [openerId]: { choice: "a" } });
    await recordAnswers(respondents[1]!, topicKey, { [openerId]: { choice: "b" } });

    sessionCookie = respondents[0]!.sessionId;

    expect(await getSnadPoll(openerId, "binary")).toEqual({
      kind: "binary",
      total: 1,
      sides: [0, 1],
    });
  });

  it("ignores a respondent who was never shown the opener", async () => {
    const [answering, silent] = await Promise.all(
      (["en", "de"] as const).map(seedSession),
    );
    const { topicKey, openerId } = sharedOpener([answering!], "binary");
    await recordAnswers(answering!, topicKey, { [openerId]: { choice: "a" } });
    await recordAnswers(silent!, topicKey, {});

    expect((await getSnadPoll(openerId, "binary")).total).toBe(1);
  });

  it("folds a free-text answer into the Other bucket", async () => {
    const respondent = await seedSession("en");
    const { topicKey, openerId } = sharedOpener([respondent], "question");
    const [firstLabel] = optionLabels(respondent, topicKey, openerId);
    await recordAnswers(respondent, topicKey, {
      [openerId]: { selected: [firstLabel], other: "Something else entirely" },
    });

    const poll = await getSnadPoll(openerId, "mcq");

    expect(poll.total).toBe(1);
    expect(poll.kind === "mcq" && poll.options.__other__).toBe(1);
  });

  it("bins slider positions by decile", async () => {
    const respondents = await Promise.all(
      (["en", "de"] as const).map(seedSession),
    );
    const { topicKey, openerId } = sharedOpener(respondents, "slider");
    await recordAnswers(respondents[0]!, topicKey, { [openerId]: { position: 5 } });
    await recordAnswers(respondents[1]!, topicKey, { [openerId]: { position: 95 } });

    const poll = await getSnadPoll(openerId, "slider");

    expect(poll.total).toBe(2);
    expect(poll.kind === "slider" && poll.bins).toEqual([
      1, 0, 0, 0, 0, 0, 0, 0, 0, 1,
    ]);
  });

  it("averages the crowd's rank for each ranked option", async () => {
    const respondents = await Promise.all(
      (["en", "de"] as const).map(seedSession),
    );
    const { topicKey, openerId } = sharedOpener(respondents, "ranking");
    const [first, second] = respondents.map((respondent) =>
      optionLabels(respondent, topicKey, openerId),
    );
    await recordAnswers(respondents[0]!, topicKey, { [openerId]: { order: first } });
    await recordAnswers(respondents[1]!, topicKey, {
      [openerId]: { order: [...second!].reverse() },
    });

    const poll = await getSnadPoll(openerId, "ranking");

    expect(poll.total).toBe(2);
    const mean = (first!.length + 1) / 2;
    expect(
      poll.kind === "ranking" &&
        Object.values(poll.meanRank).every((rank) => rank === mean),
    ).toBe(true);
  });

  it("agrees with rebuilding every respondent's topic event", async () => {
    const respondents = await Promise.all(
      (["en", "de", "fr", "it", "rm"] as const).map(seedSession),
    );
    await Promise.all(
      respondents.map((respondent, position) =>
        Promise.all(
          snadStudyDefinition.topics.map((topic) => {
            const answers = Object.fromEntries(
              stepsShownTo(respondent, topic.key).flatMap<[string, unknown]>((step) => {
                if (step.kind === "share_more" || !step.opener_id) return [];
                if (step.kind === "binary") {
                  return [[step.opener_id, { choice: position % 2 ? "a" : "b" }]];
                }
                if (step.kind === "slider") {
                  return [[step.opener_id, { position: position * 20 }]];
                }
                if (step.kind === "ranking") {
                  const order = step.options.map((option) => option.label);
                  return [
                    [
                      step.opener_id,
                      { order: position % 2 ? order : [...order].reverse() },
                    ],
                  ];
                }
                if (step.kind === "question") {
                  const label = step.options[position % step.options.length]?.label;
                  return label ? [[step.opener_id, { selected: [label] }]] : [];
                }
                return [];
              }),
            );
            return recordAnswers(respondent, topic.key, answers);
          }),
        ),
      ),
    );

    sessionCookie = respondents[0]!.sessionId;
    const summaries = await listSnadPollSummaries();
    expect(summaries.length).toBeGreaterThan(5);

    for (const summary of summaries) {
      expect([summary.openerId, await getSnadPoll(summary.openerId, summary.kind)])
        .toEqual([
          summary.openerId,
          await referencePoll(
            summary.openerId,
            summary.kind,
            respondents[0]!.sessionId,
          ),
        ]);
    }
  });
});

describe("listSnadPollSummaries", () => {
  it("summarises every answered opener without excluding anyone", async () => {
    const respondents = await Promise.all(
      (["en", "de"] as const).map(seedSession),
    );
    const { topicKey, openerId } = sharedOpener(respondents, "binary");
    await recordAnswers(respondents[0]!, topicKey, { [openerId]: { choice: "a" } });
    await recordAnswers(respondents[1]!, topicKey, { [openerId]: { choice: "a" } });

    sessionCookie = respondents[0]!.sessionId;
    const summary = (await listSnadPollSummaries()).find(
      (candidate) => candidate.openerId === openerId,
    );

    expect(summary).toEqual({
      openerId,
      kind: "binary",
      total: 2,
      values: { a: 2 },
    });
  });
});
