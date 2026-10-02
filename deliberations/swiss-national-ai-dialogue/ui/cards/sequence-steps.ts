import type {
  AwaitingEventOf,
  CardStepProgress,
  SnadLocale,
} from "../../types";
import { STAGE_TITLES } from "../../i18n";

export type SequenceEvent = AwaitingEventOf<"awaiting_opener_sequence">;
export type SequenceStep = SequenceEvent["steps"][number];
export type AuthoredStep = Exclude<SequenceStep, { kind: "share_more" }>;
export type StepAnswer = Record<string, unknown>;

export function stepValue(
  step: SequenceStep,
  result: StepAnswer | null,
): unknown {
  if (!result) return undefined;
  if (step.kind === "question") {
    const answers = (result as { answers?: unknown }).answers;
    return answers && typeof answers === "object"
      ? (answers as Record<string, unknown>)[step.question]
      : undefined;
  }
  return result;
}

function selectedOptionIds(step: SequenceStep, value: unknown): Set<string> {
  if (!value || typeof value !== "object") return new Set();
  if (step.kind === "binary") {
    const choice = (value as { choice?: unknown }).choice;
    const opt =
      choice === "a" ? step.option_a : choice === "b" ? step.option_b : null;
    return new Set(opt?.id ? [opt.id] : []);
  }
  if (step.kind === "question") {
    const raw = (value as { selected?: unknown }).selected;
    const labels = Array.isArray(raw)
      ? raw.filter((s): s is string => typeof s === "string")
      : [];
    const idByLabel = new Map(
      step.options.map((o) => [o.label, o.id] as const),
    );
    return new Set(
      labels
        .map((label) => idByLabel.get(label))
        .filter((id): id is string => Boolean(id)),
    );
  }
  return new Set();
}

function stepVisibleWhen(step: SequenceStep) {
  return "visibleWhen" in step ? step.visibleWhen : undefined;
}

export function isStepVisible(
  step: SequenceStep,
  steps: readonly SequenceStep[],
  valueByOpenerId: Map<string, unknown>,
): boolean {
  const cond = stepVisibleWhen(step);
  if (!cond) return true;
  const refStep = steps.find(
    (s) => "opener_id" in s && s.opener_id === cond.openerId,
  );
  if (!refStep) return true;
  const ids = selectedOptionIds(refStep, valueByOpenerId.get(cond.openerId));
  const matches = cond.selected.some((id) => ids.has(id));
  return cond.negate ? !matches : matches;
}

export function stepCardAnswer(
  step: AuthoredStep,
  value: unknown,
): StepAnswer | null {
  if (value === undefined || value === null) return null;
  if (step.kind === "question") {
    return { answers: { [step.question]: value } };
  }
  return value as StepAnswer;
}

export function liveValueByOpenerId(
  steps: readonly SequenceStep[],
  stepAnswers: readonly (StepAnswer | null)[],
): Map<string, unknown> {
  const values = new Map<string, unknown>();
  steps.forEach((s, i) => {
    const id = "opener_id" in s ? s.opener_id : undefined;
    if (id) values.set(id, stepValue(s, stepAnswers[i] ?? null));
  });
  return values;
}

export function resolvedSequencePages(
  event: SequenceEvent,
  answer: Record<string, unknown> | null,
): { step: AuthoredStep; index: number; value: unknown }[] {
  const combined =
    answer && typeof answer.answers === "object" && answer.answers !== null
      ? (answer.answers as Record<string, unknown>)
      : null;
  const values = new Map<string, unknown>();
  event.steps.forEach((s) => {
    const id = "opener_id" in s ? s.opener_id : undefined;
    if (id && combined && s.kind !== "share_more") {
      values.set(id, combined[s.question]);
    }
  });
  return event.steps.flatMap((step, index) => {
    if (step.kind === "share_more") return [];
    if (!isStepVisible(step, event.steps, values)) return [];
    return [{ step, index, value: combined?.[step.question] }];
  });
}

export function seededStepAnswers(
  steps: readonly SequenceStep[],
  partial: readonly unknown[] | null,
): (StepAnswer | null)[] {
  return steps.map((step, i) => {
    const value = partial?.[i];
    if (step.kind === "share_more" || value === undefined || value === null) {
      return null;
    }
    return stepCardAnswer(step, value);
  });
}

export function firstUnansweredIndex(
  steps: readonly SequenceStep[],
  stepAnswers: readonly (StepAnswer | null)[],
): number {
  const values = liveValueByOpenerId(steps, stepAnswers);
  const visible = steps
    .map((_, i) => i)
    .filter((i) => isStepVisible(steps[i]!, steps, values));
  return (
    visible.find((i) => stepAnswers[i] === null) ??
    visible.at(-1) ??
    0
  );
}

export function initialSequenceProgress(
  event: SequenceEvent,
  partial: readonly unknown[] | null,
  locale: SnadLocale,
): CardStepProgress | null {
  const steps = event.steps;
  const answers = seededStepAnswers(steps, partial);
  const values = liveValueByOpenerId(steps, answers);
  const visible = steps
    .map((_, i) => i)
    .filter((i) => isStepVisible(steps[i]!, steps, values));
  const introOffset =
    event.theme && STAGE_TITLES[locale]?.[event.theme] ? 1 : 0;
  const total = visible.length + introOffset;
  if (total <= 1) return null;
  const resumed = (partial ?? []).some((value) => value != null);
  const showIntro = introOffset === 1 && !resumed;
  const currentSegIdx = showIntro
    ? 0
    : visible.indexOf(firstUnansweredIndex(steps, answers)) + introOffset;
  return { current: currentSegIdx + 1, total, answered: false };
}
