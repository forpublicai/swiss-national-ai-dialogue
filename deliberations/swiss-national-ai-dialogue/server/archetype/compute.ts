import { and, eq, isNotNull, like, not, or } from "drizzle-orm";

import { db } from "@/db";
import { snadResponses, snadSessions } from "../db-schema";

import {
  getOpenerIndex,
  setSessionArchetype,
  type SnadOpenerIndex,
} from "../sessions";
import {
  SNAD_QUESTION_FEEDBACK_PREFIX,
  SNAD_TOPIC_TIMING_PREFIX,
} from "../constants";
import {
  PERSONA_AXES,
  classifyPersona,
  scorePersona,
  type PersonaAnswer,
  type PersonaAxes,
  type PersonaAxis,
  type PersonaKey,
} from "../../archetype";

export type ArchetypeAxisTrack = {
  axis: PersonaAxis;
  you: number;
  ch: number;
};

export type ArchetypeResult = {
  archetype: PersonaKey;
  axes: ArchetypeAxisTrack[];
  rarity: { percent: number } | null;
};

const RARITY_MIN_SESSIONS = 25;

type StoredAnswer = {
  sessionId: string;
  stepId: string;
  answer: Record<string, unknown>;
  studyVersionId: string;
};

function wrapUpPersonaAnswer(
  row: StoredAnswer,
  index: SnadOpenerIndex,
): PersonaAnswer[] {
  if (!index.wrapUpQuestionIds.has(row.stepId)) return [];
  const value = row.answer as { choice?: unknown; selected?: unknown };
  const selected =
    typeof value.choice === "string"
      ? [value.choice]
      : Array.isArray(value.selected)
        ? value.selected.filter((id): id is string => typeof id === "string")
        : [];
  if (selected.length === 0) return [];
  return [{ openerId: row.stepId, position: null, selected, order: null }];
}

function personaAnswers(
  rows: StoredAnswer[],
  indexes: Map<string, SnadOpenerIndex>,
): PersonaAnswer[] {
  return rows.flatMap((row) => {
    const index = indexes.get(row.studyVersionId);
    if (!index) return [];
    if (!row.stepId.startsWith("topic:")) {
      return wrapUpPersonaAnswer(row, index);
    }
    const answers = row.answer.answers;
    if (!answers || typeof answers !== "object") return [];
    return Object.entries(answers as Record<string, unknown>).flatMap(
      ([question, answer]): PersonaAnswer[] => {
        const match = index.byQuestion.get(question);
        if (!match || !answer || typeof answer !== "object") return [];
        const { openerId, step } = match;
        if (step.kind === "binary") {
          const choice = (answer as { choice?: unknown }).choice;
          return choice === "a" || choice === "b"
            ? [
                {
                  openerId,
                  position: choice === "a" ? 0 : 100,
                  selected: null,
                  order: null,
                },
              ]
            : [];
        }
        if (step.kind === "slider") {
          const position = (answer as { position?: unknown }).position;
          return typeof position === "number"
            ? [{ openerId, position, selected: null, order: null }]
            : [];
        }
        if (step.kind === "ranking") {
          const order = (answer as { order?: unknown }).order;
          if (!Array.isArray(order)) return [];
          return [
            {
              openerId,
              position: null,
              selected: null,
              order: order.filter(
                (option): option is string => typeof option === "string",
              ),
            },
          ];
        }
        if (step.kind === "question") {
          const selected = (answer as { selected?: unknown }).selected;
          if (!Array.isArray(selected)) return [];
          const idByLabel = new Map(
            step.options.map((option) => [option.label, option.id ?? option.label]),
          );
          return [
            {
              openerId,
              position: null,
              selected: selected.flatMap((label) =>
                typeof label === "string" ? [idByLabel.get(label) ?? label] : [],
              ),
              order: null,
            },
          ];
        }
        return [];
      },
    );
  });
}

async function storedAnswers(sessionId?: string): Promise<StoredAnswer[]> {
  const rows = await db
    .select({
      sessionId: snadResponses.sessionId,
      stepId: snadResponses.stepId,
      answer: snadResponses.answer,
      studyVersionId: snadSessions.studyVersionId,
    })
    .from(snadResponses)
    .innerJoin(snadSessions, eq(snadSessions.id, snadResponses.sessionId))
    .where(
      and(
        isNotNull(snadResponses.answer),
        not(
          or(
            like(snadResponses.stepId, "progress:%"),
            like(snadResponses.stepId, `${SNAD_QUESTION_FEEDBACK_PREFIX}%`),
            like(snadResponses.stepId, `${SNAD_TOPIC_TIMING_PREFIX}%`),
          )!,
        ),
        sessionId ? eq(snadResponses.sessionId, sessionId) : undefined,
      ),
    );
  return rows.flatMap((row) =>
    row.answer
      ? [
          {
            sessionId: row.sessionId,
            stepId: row.stepId,
            answer: row.answer,
            studyVersionId: row.studyVersionId,
          },
        ]
      : [],
  );
}

async function indexesFor(
  rows: StoredAnswer[],
): Promise<Map<string, SnadOpenerIndex>> {
  const ids = [...new Set(rows.map((row) => row.studyVersionId))];
  const indexes = await Promise.all(ids.map((id) => getOpenerIndex(id)));
  return new Map(ids.map((id, position) => [id, indexes[position]!]));
}

export async function computeAndPersistArchetype(
  sessionId: string,
): Promise<ArchetypeResult | null> {
  const currentRows = await storedAnswers(sessionId);
  const { axes, readings } = scorePersona(
    personaAnswers(currentRows, await indexesFor(currentRows)),
  );
  if (readings === 0) return null;

  const archetype = classifyPersona(axes);
  await setSessionArchetype(sessionId, archetype);

  const allRows = await storedAnswers();
  const indexes = await indexesFor(allRows);
  const bySession = new Map<string, StoredAnswer[]>();
  allRows.forEach((row) => {
    const rows = bySession.get(row.sessionId) ?? [];
    rows.push(row);
    bySession.set(row.sessionId, rows);
  });
  const totals = Object.fromEntries(
    PERSONA_AXES.map((axis) => [axis, 0]),
  ) as PersonaAxes;
  let scoredSessions = 0;
  let sameArchetype = 0;
  bySession.forEach((sessionRows) => {
    const scored = scorePersona(personaAnswers(sessionRows, indexes));
    if (scored.readings === 0) return;
    scoredSessions += 1;
    if (classifyPersona(scored.axes) === archetype) sameArchetype += 1;
    PERSONA_AXES.forEach((axis) => {
      totals[axis] += scored.axes[axis];
    });
  });
  const divisor = Math.max(1, scoredSessions);

  return {
    archetype,
    axes: PERSONA_AXES.map((axis) => ({
      axis,
      you: axes[axis],
      ch: Math.round(totals[axis] / divisor),
    })),
    rarity:
      scoredSessions >= RARITY_MIN_SESSIONS
        ? { percent: Math.max(1, Math.round((100 * sameArchetype) / scoredSessions)) }
        : null,
  };
}
