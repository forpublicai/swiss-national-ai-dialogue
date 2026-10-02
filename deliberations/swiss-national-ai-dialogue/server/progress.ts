import {
  SNAD_SHAPE_QUESTION_EN,
  SNAD_WRAP_UP_CLOSING_MARKER,
  SNAD_WRAP_UP_EMAIL_MARKER,
  SNAD_WRAP_UP_FINALE_MARKER,
  SNAD_WRAP_UP_SHAPE_MARKER,
} from "./constants";
import { snadStudyDefinition } from "./study";
import type {
  LocalizedText,
  SnadSequenceStep,
  SnadStudyDefinition,
  StoredOpenerSpec,
} from "../types";

export type StudyStepPhase = "topic" | "wrap_up";

export type StudyStep = {
  id: string;
  phase: StudyStepPhase;
  // Topic key, or WRAP_UP_GROUP_KEY.
  groupKey: string;
  groupTitle: string;
  // 1-based: the topic's number, or topics.length + 1 for the wrap-up.
  groupIndex: number;
  // 1-based position within the group — the "Q3 of 6" the admin shows.
  number: number;
  groupTotal: number;
  kind: string;
  question: string;
  variants: number;
};

export const WRAP_UP_GROUP_KEY = "wrap_up";
export const WRAP_UP_GROUP_TITLE = "Wrap-up";

export function topicStepPrefix(topicKey: string): string {
  return `t:${topicKey}:`;
}

function topicStepIdAt(topicKey: string, number: number): string {
  return `${topicStepPrefix(topicKey)}${number}`;
}

export function wrapUpStepId(marker: string): string {
  return `w:${marker}`;
}

function englishText(text: LocalizedText | undefined): string {
  return text?.en?.trim() ?? "";
}

export function wrapUpSpecsOf(
  definition: SnadStudyDefinition,
): StoredOpenerSpec[] {
  return definition.wrapUp.questions ?? snadStudyDefinition.wrapUp.questions ?? [];
}

export function studyStepList(definition: SnadStudyDefinition): StudyStep[] {
  const topicSteps = definition.topics.flatMap((topic, topicIndex) => {
    const slots = topic.openers.sequence.flatMap((step) => {
      const pool = step.mode === "always" ? [step.opener] : step.pool;
      const draws = step.mode === "drawN" ? step.n : 1;
      return Array.from({ length: draws }, () => ({
        specs: pool,
        variants: step.mode === "always" ? 1 : pool.length,
      }));
    });
    return slots.map((slot, index) => ({
      id: topicStepIdAt(topic.key, index + 1),
      phase: "topic" as const,
      groupKey: topic.key,
      groupTitle: topic.title,
      groupIndex: topicIndex + 1,
      number: index + 1,
      groupTotal: slots.length,
      kind: slot.specs[0]!.kind,
      question: englishText(slot.specs[0]!.question),
      variants: slot.variants,
    }));
  });

  const wrapUpIndex = definition.topics.length + 1;
  const markers = [
    ...wrapUpSpecsOf(definition).map((spec) => ({
      marker: spec.id,
      kind: spec.kind,
      question: englishText(spec.question),
    })),
    {
      marker: SNAD_WRAP_UP_EMAIL_MARKER,
      kind: "email",
      question: "Results email",
    },
    {
      marker: SNAD_WRAP_UP_SHAPE_MARKER,
      kind: "shape",
      question: SNAD_SHAPE_QUESTION_EN,
    },
    ...(definition.wrapUp.closing
      ? [
          {
            marker: SNAD_WRAP_UP_CLOSING_MARKER,
            kind: "closing",
            question: englishText(definition.wrapUp.closing.question),
          },
        ]
      : []),
    {
      marker: SNAD_WRAP_UP_FINALE_MARKER,
      kind: "finale",
      question: "Archetype, share & feedback",
    },
  ];
  const wrapUpSteps = markers.map((entry, index) => ({
    id: wrapUpStepId(entry.marker),
    phase: "wrap_up" as const,
    groupKey: WRAP_UP_GROUP_KEY,
    groupTitle: WRAP_UP_GROUP_TITLE,
    groupIndex: wrapUpIndex,
    number: index + 1,
    groupTotal: markers.length,
    kind: entry.kind,
    question: entry.question,
    variants: 1,
  }));

  return [...topicSteps, ...wrapUpSteps];
}

export function wrapUpMarkers(definition: SnadStudyDefinition): string[] {
  return studyStepList(definition)
    .filter((step) => step.phase === "wrap_up")
    .map((step) => step.id.slice("w:".length));
}

export type ProgressFacts = {
  // Topic key → its resolved `topic:<key>` row, absent while unresolved.
  topicAnswers: Map<string, { skipped: boolean; shareMore: string | null }>;
  // Topic keys whose end-of-topic conversation reached `completed`.
  completedTopicChats: Set<string>;
  topicPartials: Map<string, unknown[]>;
  // Wrap-up demographic spec ids with a recorded answer.
  answeredWrapUpSpecs: Set<string>;
  // The furthest `progress:wrapup` marker, when the session wrote one.
  wrapUpMarker: string | null;
  reachedEmail: boolean;
  reachedShape: boolean;
  hasClosingChat: boolean;
  closingResolved: boolean;
  answeredNps: boolean;
};

export type ParticipantProgress = {
  step: StudyStep;
  // Index into this definition's studyStepList — the funnel's cutoff.
  index: number;
  total: number;
  reachedFinale: boolean;
};

function lastStepOf(group: StudyStep[]): StudyStep {
  return group[group.length - 1]!;
}

export function selectedOptionIds(
  step: SnadSequenceStep,
  value: unknown,
): string[] {
  if (!value || typeof value !== "object") return [];
  if (step.kind === "binary") {
    const choice = (value as { choice?: unknown }).choice;
    if (choice === "a") return [step.option_a.id ?? step.option_a.label];
    if (choice === "b") return [step.option_b.id ?? step.option_b.label];
    return [];
  }
  if (step.kind === "question") {
    const selected = (value as { selected?: unknown }).selected;
    if (!Array.isArray(selected)) return [];
    const idByLabel = new Map(
      step.options.map((option) => [option.label, option.id ?? option.label]),
    );
    return selected.flatMap((label) =>
      typeof label === "string" ? [idByLabel.get(label) ?? label] : [],
    );
  }
  return [];
}

export function stepIsVisible(
  step: SnadSequenceStep,
  steps: readonly SnadSequenceStep[],
  valueByOpenerId: Map<string, unknown>,
): boolean {
  const condition = "visibleWhen" in step ? step.visibleWhen : undefined;
  if (!condition) return true;
  const source = steps.find(
    (candidate) =>
      "opener_id" in candidate && candidate.opener_id === condition.openerId,
  );
  if (!source) return true;
  const ids = selectedOptionIds(source, valueByOpenerId.get(condition.openerId));
  const match = ids.some((id) => condition.selected.includes(id));
  return condition.negate ? !match : match;
}

export function checkpointValuesByOpenerId(
  steps: readonly SnadSequenceStep[],
  partial: unknown[],
): Map<string, unknown> {
  return steps.reduce((values, step, index) => {
    const id = "opener_id" in step ? step.opener_id : undefined;
    if (id) values.set(id, partial[index] ?? undefined);
    return values;
  }, new Map<string, unknown>());
}

function topicFrontier(
  partial: unknown[],
  groupTotal: number,
  steps: readonly SnadSequenceStep[] | null,
): number {
  const lastActed = partial.reduce<number>(
    (last, value, index) => (value != null ? index : last),
    -1,
  );
  let index = lastActed + 1;
  if (steps) {
    const values = checkpointValuesByOpenerId(steps, partial);
    while (index < groupTotal && steps[index] && !stepIsVisible(steps[index]!, steps, values)) {
      index += 1;
    }
  }
  return Math.min(index, groupTotal - 1);
}

function furthestWrapUpStep(
  group: StudyStep[],
  facts: ProgressFacts,
): StudyStep {
  const indexOfMarker = (marker: string) =>
    group.findIndex((step) => step.id === wrapUpStepId(marker));
  const candidates = [
    0,
    ...[...facts.answeredWrapUpSpecs].map(indexOfMarker),
    facts.reachedEmail ? indexOfMarker(SNAD_WRAP_UP_EMAIL_MARKER) : -1,
    facts.reachedShape ? indexOfMarker(SNAD_WRAP_UP_SHAPE_MARKER) : -1,
    facts.hasClosingChat ? indexOfMarker(SNAD_WRAP_UP_CLOSING_MARKER) : -1,
    facts.answeredNps || facts.closingResolved ? group.length - 1 : -1,
    facts.wrapUpMarker ? indexOfMarker(facts.wrapUpMarker) : -1,
  ];
  return group[Math.min(Math.max(...candidates), group.length - 1)]!;
}

export type TopicStepsResolver = (topicKey: string) => SnadSequenceStep[];

export function deriveProgress(
  definition: SnadStudyDefinition,
  facts: ProgressFacts,
  resolveTopicSteps?: TopicStepsResolver,
): ParticipantProgress {
  const steps = studyStepList(definition);
  const groupOf = (key: string) =>
    steps.filter((step) => step.groupKey === key);

  const furthest = (() => {
    for (const topic of definition.topics) {
      const group = groupOf(topic.key);
      if (group.length === 0) continue;
      const answer = facts.topicAnswers.get(topic.key);
      if (!answer) {
        const partial = facts.topicPartials.get(topic.key) ?? [];
        const pages = resolveTopicSteps?.(topic.key) ?? null;
        return group[topicFrontier(partial, group.length, pages)]!;
      }
      if (
        !answer.skipped &&
        answer.shareMore === "talk" &&
        !facts.completedTopicChats.has(topic.key)
      ) {
        return lastStepOf(group);
      }
    }
    return furthestWrapUpStep(groupOf(WRAP_UP_GROUP_KEY), facts);
  })();

  const index = steps.findIndex((step) => step.id === furthest.id);
  return {
    step: furthest,
    index,
    total: steps.length,
    reachedFinale:
      furthest.id === wrapUpStepId(SNAD_WRAP_UP_FINALE_MARKER),
  };
}

export function progressLabel(progress: ParticipantProgress): string {
  const { step } = progress;
  if (progress.reachedFinale) return "Finished the dialogue";
  const group =
    step.phase === "wrap_up"
      ? WRAP_UP_GROUP_TITLE
      : `${step.groupIndex}. ${step.groupTitle}`;
  return `${group} · Q${step.number} of ${step.groupTotal}`;
}
