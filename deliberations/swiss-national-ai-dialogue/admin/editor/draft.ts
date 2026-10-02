import type {
  LocalizedText,
  OpenerStep,
  SnadStudyDefinition,
  StoredOpenerOption,
  StoredOpenerSpec,
} from "../../types";

export function emptyLocalized(): LocalizedText {
  return { en: "", de: "", fr: "", it: "" };
}

export function blankOption(id: string): StoredOpenerOption {
  return { id, label: emptyLocalized() };
}

export function specsOfStep(step: OpenerStep): StoredOpenerSpec[] {
  return step.mode === "always" ? [step.opener] : step.pool;
}

export function allSpecs(definition: SnadStudyDefinition): StoredOpenerSpec[] {
  return [
    ...definition.topics.flatMap((topic) =>
      topic.openers.sequence.flatMap(specsOfStep),
    ),
    ...(definition.wrapUp.questions ?? []),
  ];
}

export function optionsOf(spec: StoredOpenerSpec): StoredOpenerOption[] {
  if (spec.kind === "binary") return [spec.optionA, spec.optionB];
  if (spec.kind === "question" || spec.kind === "ranking") return spec.options;
  return [];
}

export type ConditionSource = {
  openerId: string;
  question: string;
  options: { id: string; label: string }[];
};

export function earlierOptionSources(
  sequence: OpenerStep[],
  stepIndex: number,
): ConditionSource[] {
  return sequence
    .slice(0, stepIndex)
    .flatMap(specsOfStep)
    .map((spec) => ({
      openerId: spec.id,
      question: spec.question.en,
      options: optionsOf(spec).map((option) => ({
        id: option.id,
        label: option.label.en,
      })),
    }))
    .filter((source) => source.options.length > 0);
}

export function earlierWrapUpSources(
  questions: StoredOpenerSpec[],
  index: number,
): ConditionSource[] {
  return questions
    .slice(0, index)
    .map((spec) => ({
      openerId: spec.id,
      question: spec.question.en,
      options: optionsOf(spec).map((option) => ({
        id: option.id,
        label: option.label.en,
      })),
    }))
    .filter((source) => source.options.length > 0);
}

export function uniqueId(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;
  let counter = 2;
  while (taken.has(`${base}-${counter}`)) counter += 1;
  return `${base}-${counter}`;
}
