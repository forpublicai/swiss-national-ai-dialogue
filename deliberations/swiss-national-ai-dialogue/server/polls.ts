import { and, eq, isNotNull, like, ne, sql } from "drizzle-orm";

import { db } from "@/db";
import { snadResponses, snadSessions } from "./db-schema";

import {
  getOpenerIndex,
  readSnadSessionCookie,
  type SnadOpenerIndex,
  type SnadOpenerStep,
} from "./sessions";
import type { SnadSequenceStep } from "../types";

export type SnadPollKind = "binary" | "mcq" | "slider" | "budget" | "ranking";

export type SnadPoll =
  | { kind: "binary"; total: number; sides: [number, number] }
  | { kind: "mcq"; total: number; options: Record<string, number> }
  | { kind: "slider"; total: number; bins: number[] }
  | { kind: "budget"; total: number; sums: Record<string, number> }
  | { kind: "ranking"; total: number; meanRank: Record<string, number> };

export function isSnadPollKind(value: string | null): value is SnadPollKind {
  return (
    value === "binary" ||
    value === "mcq" ||
    value === "slider" ||
    value === "budget" ||
    value === "ranking"
  );
}

export type PollTally = { total: number; values: Record<string, number> };

type AnsweredTopic = {
  answers: Record<string, unknown>;
  studyVersionId: string;
};

function rankedIds(
  step: Extract<SnadSequenceStep, { kind: "ranking" }>,
  answer: unknown,
): string[] {
  if (!answer || typeof answer !== "object") return [];
  const raw = (answer as { order?: unknown }).order;
  if (!Array.isArray(raw)) return [];
  const idByLabel = new Map(
    step.options.map((option) => [option.label, option.id ?? option.label]),
  );
  return raw.flatMap((entry) =>
    typeof entry === "string" ? [idByLabel.get(entry) ?? entry] : [],
  );
}

function selectedIds(
  step: Extract<SnadSequenceStep, { kind: "question" }>,
  answer: unknown,
): string[] {
  if (!answer || typeof answer !== "object") return [];
  const value = answer as {
    selected?: unknown;
    other?: unknown;
    skipped?: unknown;
  };
  if (value.skipped === true) return [];
  const idByLabel = new Map(step.options.map((option) => [option.label, option.id]));
  const selected = Array.isArray(value.selected)
    ? value.selected.flatMap((label) =>
        typeof label === "string" ? [idByLabel.get(label) ?? label] : [],
      )
    : [];
  return typeof value.other === "string" && value.other.trim()
    ? [...selected, "__other__"]
    : selected;
}

export function pollKindOf(step: SnadOpenerStep): SnadPollKind {
  return step.kind === "question" ? "mcq" : step.kind;
}

export function tally(
  tallied: PollTally,
  step: SnadOpenerStep,
  answer: unknown,
): void {
  if (!answer || typeof answer !== "object") return;
  if (step.kind === "binary") {
    const choice = (answer as { choice?: unknown }).choice;
    if (choice !== "a" && choice !== "b") return;
    tallied.values[choice] = (tallied.values[choice] ?? 0) + 1;
  } else if (step.kind === "slider") {
    const position = (answer as { position?: unknown }).position;
    if (typeof position !== "number") return;
    const bin = String(Math.min(9, Math.max(0, Math.floor(position / 10))));
    tallied.values[bin] = (tallied.values[bin] ?? 0) + 1;
  } else if (step.kind === "budget") {
    const allocation = (answer as { allocation?: unknown }).allocation;
    if (!allocation || typeof allocation !== "object") return;
    const idByLabel = new Map(
      step.options.map((option) => [option.label, option.id ?? option.label]),
    );
    const allocated = Object.entries(allocation).filter(
      ([, units]) => typeof units === "number" && units > 0,
    );
    if (allocated.length === 0) return;
    allocated.forEach(([label, units]) => {
      const id = idByLabel.get(label) ?? label;
      tallied.values[id] = (tallied.values[id] ?? 0) + (units as number);
    });
  } else if (step.kind === "ranking") {
    const order = rankedIds(step, answer);
    if (order.length === 0) return;
    order.forEach((id, index) => {
      tallied.values[id] = (tallied.values[id] ?? 0) + index + 1;
    });
  } else {
    const ids = selectedIds(step, answer);
    if (ids.length === 0) return;
    ids.forEach((id) => {
      tallied.values[id] = (tallied.values[id] ?? 0) + 1;
    });
  }
  tallied.total += 1;
}

function finalize(kind: SnadPollKind, tallied: PollTally): SnadPoll {
  if (kind === "binary") {
    const sides: [number, number] = [
      tallied.values.a ?? 0,
      tallied.values.b ?? 0,
    ];
    return { kind, total: sides[0] + sides[1], sides };
  }
  if (kind === "slider") {
    return {
      kind,
      total: tallied.total,
      bins: Array.from({ length: 10 }, (_, bin) => tallied.values[bin] ?? 0),
    };
  }
  if (kind === "budget") {
    return { kind, total: tallied.total, sums: tallied.values };
  }
  if (kind === "ranking") {
    return {
      kind,
      total: tallied.total,
      meanRank: Object.fromEntries(
        Object.entries(tallied.values).map(([id, sum]) => [
          id,
          sum / tallied.total,
        ]),
      ),
    };
  }
  return { kind, total: tallied.total, options: tallied.values };
}

async function answeredTopics(
  excludeSessionId: string | null,
): Promise<AnsweredTopic[]> {
  const rows = await db
    .select({
      answers: sql<
        Record<string, unknown> | null
      >`${snadResponses.answer} -> 'answers'`,
      studyVersionId: snadSessions.studyVersionId,
    })
    .from(snadResponses)
    .innerJoin(snadSessions, eq(snadSessions.id, snadResponses.sessionId))
    .where(
      and(
        like(snadResponses.stepId, "topic:%"),
        isNotNull(snadResponses.answer),
        excludeSessionId
          ? ne(snadResponses.sessionId, excludeSessionId)
          : undefined,
      ),
    );
  return rows.flatMap((row) =>
    row.answers && typeof row.answers === "object"
      ? [{ answers: row.answers, studyVersionId: row.studyVersionId }]
      : [],
  );
}

async function indexesByVersion(
  rows: AnsweredTopic[],
): Promise<Map<string, SnadOpenerIndex>> {
  const ids = [...new Set(rows.map((row) => row.studyVersionId))];
  const indexes = await Promise.all(ids.map((id) => getOpenerIndex(id)));
  return new Map(ids.map((id, position) => [id, indexes[position]]));
}

export async function getSnadPoll(
  openerId: string,
  kind: SnadPollKind,
): Promise<SnadPoll> {
  const rows = await answeredTopics((await readSnadSessionCookie()) ?? null);
  const indexes = await indexesByVersion(rows);
  const tallied: PollTally = { total: 0, values: {} };
  rows.forEach((row) => {
    const variants = indexes.get(row.studyVersionId)?.byOpenerId.get(openerId);
    if (!variants) return;
    const shown = variants.find(
      (variant) => row.answers[variant.question] !== undefined,
    );
    if (!shown || pollKindOf(shown) !== kind) return;
    tally(tallied, shown, row.answers[shown.question]);
  });
  return finalize(kind, tallied);
}

export type SnadPollSummary = {
  openerId: string;
  kind: SnadPollKind;
  total: number;
  values: Record<string, number>;
};

export async function listSnadPollSummaries(): Promise<SnadPollSummary[]> {
  const rows = await answeredTopics(null);
  const indexes = await indexesByVersion(rows);
  const tallies = new Map<string, { kind: SnadPollKind; tallied: PollTally }>();

  rows.forEach((row) => {
    const index = indexes.get(row.studyVersionId);
    if (!index) return;
    Object.entries(row.answers).forEach(([question, answer]) => {
      const match = index.byQuestion.get(question);
      if (!match) return;
      const kind = pollKindOf(match.step);
      const entry = tallies.get(match.openerId) ?? {
        kind,
        tallied: { total: 0, values: {} },
      };
      tally(entry.tallied, match.step, answer);
      tallies.set(match.openerId, entry);
    });
  });

  return [...tallies.entries()]
    .map(([openerId, { kind, tallied }]) => ({
      openerId,
      kind,
      total: tallied.total,
      values:
        kind === "ranking" && tallied.total > 0
          ? Object.fromEntries(
              Object.entries(tallied.values).map(([id, sum]) => [
                id,
                Math.round((sum / tallied.total) * 100) / 100,
              ]),
            )
          : tallied.values,
    }))
    .sort((left, right) => left.openerId.localeCompare(right.openerId));
}
