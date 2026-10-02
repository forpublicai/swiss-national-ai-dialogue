/**
 * @jest-environment node
 *
 * The per-question diagnostics behind the admin/partner dashboard: who was
 * shown a question (draws + visibleWhen), who answered vs skipped it, the
 * thumbs verdicts left on it, and how one-sided its answers are. Cookie auth
 * is mocked; everything else runs against the real test DB.
 */

process.env.DATABASE_URL ??=
  "postgresql://postgres:postgres@localhost:5433/dialogue_test";

jest.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => undefined,
    set: jest.fn(),
    delete: jest.fn(),
  }),
}));

import { randomUUID } from "node:crypto";
import path from "node:path";

import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { Pool } from "pg";

import { db } from "@/db";
import {
  snadResponses,
  snadSessions,
} from "@/deliberations/swiss-national-ai-dialogue/server/db-schema";
import { listQuestionDiagnostics } from "@/deliberations/swiss-national-ai-dialogue/server/question-stats";
import {
  buildTopicEvent,
  questionFeedbackStepId,
  topicStepId,
} from "@/deliberations/swiss-national-ai-dialogue/server/sessions";
import {
  ensureActiveStudyVersion,
  snadStudyDefinition,
} from "@/deliberations/swiss-national-ai-dialogue/server/study";
import type {
  SnadLocale,
  SnadSequenceStep,
  StoredOpenerSpec,
} from "@/deliberations/swiss-national-ai-dialogue/types";

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

type Respondent = { sessionId: string; locale: SnadLocale };

async function seedSession(locale: SnadLocale): Promise<Respondent> {
  const version = await ensureActiveStudyVersion();
  const [session] = await db
    .insert(snadSessions)
    .values({ studyVersionId: version.id, locale, canton: "BE" })
    .returning({ id: snadSessions.id });
  return { sessionId: session!.id, locale };
}

async function seedSessionWhoseDraw(
  topicKey: string,
  openerId: string,
  drawn: boolean,
): Promise<Respondent> {
  const version = await ensureActiveStudyVersion();
  const shows = (sessionId: string) =>
    buildTopicEvent(snadStudyDefinition, sessionId, topicKey, "en").steps.some(
      (step) => step.kind !== "share_more" && step.opener_id === openerId,
    );
  const sessionId = Array.from({ length: 200 }, () => randomUUID()).find(
    (candidate) => shows(candidate) === drawn,
  );
  if (!sessionId) {
    throw new Error(
      `found no session id whose draw ${drawn ? "shows" : "hides"} ${openerId}`,
    );
  }
  await db
    .insert(snadSessions)
    .values({ id: sessionId, studyVersionId: version.id, locale: "en", canton: "BE" });
  return { sessionId, locale: "en" };
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

function alwaysShownOpener(kind: StoredOpenerSpec["kind"]): {
  topicKey: string;
  openerId: string;
} {
  const found = snadStudyDefinition.topics.flatMap((topic) =>
    topic.openers.sequence.flatMap((step) =>
      step.mode === "always" &&
      step.opener.kind === kind &&
      !step.opener.visibleWhen
        ? [{ topicKey: topic.key, openerId: step.opener.id }]
        : [],
    ),
  );
  if (!found[0]) throw new Error(`no unconditional always-shown ${kind} opener`);
  return found[0];
}

function pooledQuestionOpener(): { topicKey: string; openerId: string } {
  const found = snadStudyDefinition.topics.flatMap((topic) =>
    topic.openers.sequence.flatMap((step) => {
      if (step.mode === "always") return [];
      const spec = step.pool.find(
        (candidate) => candidate.kind === "question" && !candidate.visibleWhen,
      );
      return spec ? [{ topicKey: topic.key, openerId: spec.id }] : [];
    }),
  );
  if (!found[0]) throw new Error("no pooled question opener in the study");
  return found[0];
}

async function diagnosticFor(openerId: string) {
  const diagnostics = await listQuestionDiagnostics();
  const found = diagnostics.find(
    (candidate) => candidate.openerId === openerId,
  );
  if (!found) throw new Error(`no diagnostic for ${openerId}`);
  return found;
}

describe("listQuestionDiagnostics", () => {
  it("splits a question's eligible crowd into answered and skipped", async () => {
    const { topicKey, openerId } = alwaysShownOpener("binary");
    const [answering, skipping] = await Promise.all(
      (["en", "de"] as const).map(seedSession),
    );
    await recordAnswers(answering!, topicKey, { [openerId]: { choice: "a" } });
    await recordAnswers(skipping!, topicKey, { [openerId]: { skipped: true } });

    const diagnostic = await diagnosticFor(openerId);

    expect(diagnostic).toMatchObject({
      kind: "binary",
      eligible: 2,
      answered: 1,
      skipped: 1,
      skipRate: 0.5,
    });
  });

  it("counts only sessions whose draw showed a pooled question as eligible", async () => {
    const { topicKey, openerId } = pooledQuestionOpener();
    const drawer = await seedSessionWhoseDraw(topicKey, openerId, true);
    const bystander = await seedSessionWhoseDraw(topicKey, openerId, false);
    const [firstLabel] = optionLabels(drawer, topicKey, openerId);
    await recordAnswers(drawer, topicKey, {
      [openerId]: { selected: [firstLabel] },
    });
    await recordAnswers(bystander, topicKey, {});

    const diagnostic = await diagnosticFor(openerId);

    expect(diagnostic).toMatchObject({
      eligible: 1,
      answered: 1,
      skipped: 0,
      skipRate: 0,
    });
  });

  it("aggregates thumbs verdicts and keeps non-empty notes", async () => {
    const { topicKey, openerId } = alwaysShownOpener("binary");
    const [praising, complaining] = await Promise.all(
      (["en", "fr"] as const).map(seedSession),
    );
    await recordAnswers(praising!, topicKey, { [openerId]: { choice: "b" } });
    await db.insert(snadResponses).values([
      {
        sessionId: praising!.sessionId,
        stepId: questionFeedbackStepId(openerId),
        answer: { rating: "up", note: "" },
        locale: "en",
      },
      {
        sessionId: complaining!.sessionId,
        stepId: questionFeedbackStepId(openerId),
        answer: { rating: "down", note: "  The options overlap.  " },
        locale: "fr",
      },
    ]);

    const diagnostic = await diagnosticFor(openerId);

    expect(diagnostic).toMatchObject({
      thumbsUp: 1,
      thumbsDown: 1,
      notes: [{ rating: "down", note: "The options overlap." }],
    });
  });

  it("scores binary consensus as the leading side's share of answers", async () => {
    const { topicKey, openerId } = alwaysShownOpener("binary");
    const respondents = await Promise.all(
      (["en", "de", "fr", "it"] as const).map(seedSession),
    );
    await Promise.all(
      respondents.map((respondent, position) =>
        recordAnswers(respondent, topicKey, {
          [openerId]: { choice: position < 3 ? "a" : "b" },
        }),
      ),
    );

    const diagnostic = await diagnosticFor(openerId);

    expect(diagnostic).toMatchObject({
      eligible: 4,
      answered: 4,
      consensus: 0.75,
    });
  });

  it("scores MCQ consensus as the top option's share of respondents, not selections", async () => {
    const { topicKey, openerId } = alwaysShownOpener("question");
    const respondents = await Promise.all(
      (["en", "en", "en", "en"] as const).map(seedSession),
    );
    const [top, second, third] = optionLabels(
      respondents[0]!,
      topicKey,
      openerId,
    );
    await recordAnswers(respondents[0]!, topicKey, {
      [openerId]: { selected: [top] },
    });
    await recordAnswers(respondents[1]!, topicKey, {
      [openerId]: { selected: [top], other: "Something else too" },
    });
    await recordAnswers(respondents[2]!, topicKey, {
      [openerId]: { selected: [second] },
    });
    await recordAnswers(respondents[3]!, topicKey, {
      [openerId]: { selected: [third] },
    });

    const diagnostic = await diagnosticFor(openerId);

    expect(diagnostic).toMatchObject({
      kind: "mcq",
      answered: 4,
      consensus: 0.5,
    });
  });

  it("leaves ranking consensus undefined", async () => {
    const { topicKey, openerId } = alwaysShownOpener("ranking");
    const respondent = await seedSession("en");
    await recordAnswers(respondent, topicKey, {
      [openerId]: { order: optionLabels(respondent, topicKey, openerId) },
    });

    const diagnostic = await diagnosticFor(openerId);

    expect(diagnostic).toMatchObject({
      kind: "ranking",
      eligible: 1,
      answered: 1,
      consensus: null,
    });
  });
});
