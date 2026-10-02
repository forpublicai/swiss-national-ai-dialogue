import { and, eq, isNotNull, like, sql } from "drizzle-orm";

import { db } from "@/db";
import { snadResponses, snadSessions } from "./db-schema";

import { SNAD_QUESTION_FEEDBACK_PREFIX } from "./constants";
import { pollKindOf, tally, type PollTally, type SnadPollKind } from "./polls";
import { stepIsVisible } from "./progress";
import {
  buildOpenerIndex,
  buildTopicEvent,
  parseQuestionVerdict,
  type SnadOpenerIndex,
  type SnadOpenerStep,
} from "./sessions";
import { getPinnedDefinition } from "./study";
import type { SnadLocale } from "../types";

export type QuestionDiagnostic = {
  openerId: string;
  kind: SnadPollKind;
  eligible: number;
  // Of those, how many actually answered it (skip sentinels don't count).
  answered: number;
  skipped: number;
  skipRate: number;
  thumbsUp: number;
  thumbsDown: number;
  // Non-empty notes only.
  notes: { rating: "up" | "down"; note: string }[];
  consensus: number | null;
};

type TopicAnswerRow = {
  sessionId: string;
  topicKey: string;
  answers: Record<string, unknown>;
  locale: SnadLocale;
  studyVersionId: string;
};

async function resolvedTopicAnswers(): Promise<TopicAnswerRow[]> {
  const rows = await db
    .select({
      sessionId: snadResponses.sessionId,
      stepId: snadResponses.stepId,
      answers: sql<
        Record<string, unknown> | null
      >`${snadResponses.answer} -> 'answers'`,
      locale: snadSessions.locale,
      studyVersionId: snadSessions.studyVersionId,
    })
    .from(snadResponses)
    .innerJoin(snadSessions, eq(snadSessions.id, snadResponses.sessionId))
    .where(
      and(like(snadResponses.stepId, "topic:%"), isNotNull(snadResponses.answer)),
    );
  return rows.flatMap((row) =>
    row.answers && typeof row.answers === "object"
      ? [
          {
            sessionId: row.sessionId,
            topicKey: row.stepId.slice("topic:".length),
            answers: row.answers,
            locale: row.locale as SnadLocale,
            studyVersionId: row.studyVersionId,
          },
        ]
      : [],
  );
}

type FeedbackRow = {
  openerId: string;
  answer: Record<string, unknown> | null;
  studyVersionId: string;
};

async function questionFeedbackRows(): Promise<FeedbackRow[]> {
  const rows = await db
    .select({
      stepId: snadResponses.stepId,
      answer: snadResponses.answer,
      studyVersionId: snadSessions.studyVersionId,
    })
    .from(snadResponses)
    .innerJoin(snadSessions, eq(snadSessions.id, snadResponses.sessionId))
    .where(like(snadResponses.stepId, `${SNAD_QUESTION_FEEDBACK_PREFIX}%`));
  return rows.map((row) => ({
    openerId: row.stepId.slice(SNAD_QUESTION_FEEDBACK_PREFIX.length),
    answer: row.answer,
    studyVersionId: row.studyVersionId,
  }));
}

function storedAnswer(
  index: SnadOpenerIndex,
  openerId: string,
  answers: Record<string, unknown>,
): { step: SnadOpenerStep; value: unknown } | null {
  const variants = index.byOpenerId.get(openerId) ?? [];
  const matched = variants.find(
    (variant) => answers[variant.question] !== undefined,
  );
  return matched ? { step: matched, value: answers[matched.question] } : null;
}

function isRealAnswer(value: unknown): boolean {
  if (value == null) return false;
  return !(
    typeof value === "object" &&
    (value as { skipped?: unknown }).skipped === true
  );
}

function consensusOf(kind: SnadPollKind, tallied: PollTally): number | null {
  if (kind === "ranking") return null;
  if (kind === "binary") {
    const a = tallied.values.a ?? 0;
    const b = tallied.values.b ?? 0;
    return a + b === 0 ? null : Math.max(a, b) / (a + b);
  }
  if (kind === "slider") {
    const bins = Array.from({ length: 10 }, (_, bin) => tallied.values[bin] ?? 0);
    const low = bins.slice(0, 5).reduce((sum, count) => sum + count, 0);
    const high = bins.slice(5).reduce((sum, count) => sum + count, 0);
    return low + high === 0 ? null : Math.max(low, high) / (low + high);
  }
  if (kind === "budget") {
    const units = Object.values(tallied.values);
    const allocated = units.reduce((sum, value) => sum + value, 0);
    return allocated === 0 ? null : Math.max(...units) / allocated;
  }
  if (tallied.total === 0) return null;
  return Math.max(...Object.values(tallied.values)) / tallied.total;
}

type DiagnosticTally = {
  kind: SnadPollKind;
  eligible: number;
  answered: number;
  thumbsUp: number;
  thumbsDown: number;
  notes: QuestionDiagnostic["notes"];
  tallied: PollTally;
};

export async function listQuestionDiagnostics(): Promise<QuestionDiagnostic[]> {
  const [topicRows, feedbackRows] = await Promise.all([
    resolvedTopicAnswers(),
    questionFeedbackRows(),
  ]);
  const versionIds = [
    ...new Set([...topicRows, ...feedbackRows].map((row) => row.studyVersionId)),
  ];
  const definitions = await Promise.all(
    versionIds.map((id) => getPinnedDefinition(id)),
  );
  const definitionById = new Map(
    versionIds.map((id, position) => [id, definitions[position]!]),
  );
  const indexById = new Map(
    versionIds.map((id) => [id, buildOpenerIndex(definitionById.get(id)!, id)]),
  );

  const entries = new Map<string, DiagnosticTally>();
  indexById.forEach((index) => {
    index.byOpenerId.forEach((variants, openerId) => {
      const first = variants[0];
      if (!first || entries.has(openerId)) return;
      entries.set(openerId, {
        kind: pollKindOf(first),
        eligible: 0,
        answered: 0,
        thumbsUp: 0,
        thumbsDown: 0,
        notes: [],
        tallied: { total: 0, values: {} },
      });
    });
  });

  topicRows.forEach((row) => {
    const definition = definitionById.get(row.studyVersionId);
    const index = indexById.get(row.studyVersionId);
    if (!definition || !index) return;
    if (!definition.topics.some((topic) => topic.key === row.topicKey)) return;
    const steps = buildTopicEvent(
      definition,
      row.sessionId,
      row.topicKey,
      row.locale,
    ).steps;
    const shown = steps.flatMap((step) =>
      step.kind !== "share_more" && step.opener_id
        ? [{ step, openerId: step.opener_id }]
        : [],
    );
    const storedByOpenerId = new Map(
      shown.map(({ openerId }) => [
        openerId,
        storedAnswer(index, openerId, row.answers),
      ]),
    );
    const valueByOpenerId = new Map(
      shown.map(({ openerId }) => [
        openerId,
        storedByOpenerId.get(openerId)?.value,
      ]),
    );
    shown.forEach(({ step, openerId }) => {
      const entry = entries.get(openerId);
      if (!entry || !stepIsVisible(step, steps, valueByOpenerId)) return;
      entry.eligible += 1;
      const stored = storedByOpenerId.get(openerId);
      if (!stored || !isRealAnswer(stored.value)) return;
      entry.answered += 1;
      tally(entry.tallied, stored.step, stored.value);
    });
  });

  feedbackRows.forEach((row) => {
    const entry = entries.get(row.openerId);
    if (!entry) return;
    const verdict = parseQuestionVerdict(row.answer);
    if (verdict.rating === "up") entry.thumbsUp += 1;
    if (verdict.rating === "down") entry.thumbsDown += 1;
    const note = verdict.note.trim();
    if (verdict.rating && note) {
      entry.notes.push({ rating: verdict.rating, note });
    }
  });

  return [...entries.entries()]
    .map(([openerId, entry]) => ({
      openerId,
      kind: entry.kind,
      eligible: entry.eligible,
      answered: entry.answered,
      skipped: entry.eligible - entry.answered,
      skipRate:
        entry.eligible === 0
          ? 0
          : (entry.eligible - entry.answered) / entry.eligible,
      thumbsUp: entry.thumbsUp,
      thumbsDown: entry.thumbsDown,
      notes: entry.notes,
      consensus: consensusOf(entry.kind, entry.tallied),
    }))
    .sort((left, right) => left.openerId.localeCompare(right.openerId));
}
