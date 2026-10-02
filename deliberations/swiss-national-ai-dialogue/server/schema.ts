import { z } from "zod";

import type {
  SnadLocale,
  SnadStudyDefinition,
  TopicOpenersConfig,
} from "../types";

const ID = /^[a-z0-9][a-z0-9_-]*$/i;

const localizedTextSchema = z.record(
  z.string().max(16),
  z.string().trim().min(1).max(1000),
);

const optionSchema = z.object({
  id: z.string().regex(ID),
  label: localizedTextSchema,
  description: localizedTextSchema.optional(),
  exclusive: z.boolean().optional(),
  freeText: z.boolean().optional(),
});

const visibleWhenSchema = z.object({
  openerId: z.string().regex(ID),
  selected: z.array(z.string().regex(ID)).min(1).max(8),
  negate: z.boolean().optional(),
});

const specBase = {
  id: z.string().regex(ID),
  visibleWhen: visibleWhenSchema.optional(),
};

const specSchema = z.discriminatedUnion("kind", [
  z.object({
    ...specBase,
    kind: z.literal("binary"),
    question: localizedTextSchema,
    optionA: optionSchema,
    optionB: optionSchema,
  }),
  z.object({
    ...specBase,
    kind: z.literal("question"),
    header: localizedTextSchema,
    question: localizedTextSchema,
    multiSelect: z.boolean(),
    maxSelect: z.number().int().min(1).max(8).optional(),
    otherAssist: z.boolean().optional(),
    shuffleOptions: z.boolean().optional(),
    options: z.array(optionSchema).min(2).max(9),
  }),
  z.object({
    ...specBase,
    kind: z.literal("ranking"),
    header: localizedTextSchema,
    question: localizedTextSchema,
    options: z.array(optionSchema).min(2).max(8),
    followUp: localizedTextSchema.optional(),
  }),
  z.object({
    ...specBase,
    kind: z.literal("slider"),
    question: localizedTextSchema,
    minLabel: localizedTextSchema,
    maxLabel: localizedTextSchema,
  }),
  z.object({
    ...specBase,
    kind: z.literal("budget"),
    question: localizedTextSchema,
    total: z.number().int().min(2).max(100),
    options: z.array(optionSchema).min(2).max(8),
  }),
  z.object({
    ...specBase,
    kind: z.literal("interviewer"),
    question: localizedTextSchema,
    // The full per-topic interview system prompt (English), not a short steer.
    probe: z.string().trim().min(1).max(60000),
  }),
]);

const stepSchema = z.discriminatedUnion("mode", [
  z.object({
    id: z.string().regex(ID),
    mode: z.literal("always"),
    opener: specSchema,
  }),
  z.object({
    id: z.string().regex(ID),
    mode: z.literal("rotate"),
    pool: z.array(specSchema).min(1).max(8),
  }),
  z
    .object({
      id: z.string().regex(ID),
      mode: z.literal("drawN"),
      n: z.number().int().min(1).max(8),
      pool: z.array(specSchema).min(1).max(8),
    })
    .refine((step) => step.n <= step.pool.length, {
      message: "drawN n cannot exceed the pool size",
    }),
]);

export function topicOpenersConfigSchema(locales: string[]) {
  return z
    .object({ sequence: z.array(stepSchema).min(1).max(7) })
    .superRefine((config, ctx) => {
      const requiredLocales = new Set(["en", ...locales]);
      const specs = config.sequence.flatMap((step) =>
        step.mode === "always" ? [step.opener] : step.pool,
      );
      specs.forEach((spec) => {
        const fields = [spec.question];
        if (spec.kind === "binary") {
          fields.push(spec.optionA.label, spec.optionB.label);
        } else if (spec.kind === "question" || spec.kind === "ranking") {
          fields.push(spec.header, ...spec.options.map((option) => option.label));
          if (spec.kind === "ranking" && spec.followUp) {
            fields.push(spec.followUp);
          }
        } else if (spec.kind === "slider") {
          fields.push(spec.minLabel, spec.maxLabel);
        } else if (spec.kind === "budget") {
          fields.push(...spec.options.map((option) => option.label));
        }
        fields.forEach((field) => {
          requiredLocales.forEach((locale) => {
            if (!field[locale]?.trim()) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `missing ${locale} copy for ${spec.id}`,
              });
            }
          });
        });
      });
      const stepIndexByOpenerId = new Map<string, number>();
      const optionIdsByOpenerId = new Map<string, string[]>();
      config.sequence.forEach((step, index) => {
        const stepSpecs = step.mode === "always" ? [step.opener] : step.pool;
        for (const spec of stepSpecs) {
          stepIndexByOpenerId.set(spec.id, index);
          optionIdsByOpenerId.set(
            spec.id,
            spec.kind === "binary"
              ? [spec.optionA.id, spec.optionB.id]
              : spec.kind === "question" || spec.kind === "ranking"
                ? spec.options.map((option) => option.id)
                : [],
          );
        }
      });
      config.sequence.forEach((step, index) => {
        const stepSpecs = step.mode === "always" ? [step.opener] : step.pool;
        for (const spec of stepSpecs) {
          const cond = spec.visibleWhen;
          if (!cond) continue;
          const refIndex = stepIndexByOpenerId.get(cond.openerId);
          if (refIndex === undefined) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `visibleWhen references unknown opener '${cond.openerId}'`,
            });
            continue;
          }
          if (refIndex >= index) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `visibleWhen must reference an earlier step (opener '${cond.openerId}')`,
            });
          }
          const optionIds = optionIdsByOpenerId.get(cond.openerId) ?? [];
          for (const id of cond.selected) {
            if (!optionIds.includes(id)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `visibleWhen '${cond.openerId}' has no option '${id}'`,
              });
            }
          }
        }
      });
    });
}

export function wrapUpQuestionsSchema(locales: string[]) {
  const questionSpec = z.object({
    ...specBase,
    kind: z.literal("question"),
    header: localizedTextSchema,
    question: localizedTextSchema,
    multiSelect: z.boolean(),
    maxSelect: z.number().int().min(1).max(8).optional(),
    otherAssist: z.boolean().optional(),
    options: z.array(optionSchema).min(2).max(12),
  });
  return z
    .array(questionSpec)
    .max(10)
    .superRefine((specs, ctx) => {
      const requiredLocales = new Set(["en", ...locales]);
      const seen = new Set<string>();
      specs.forEach((spec) => {
        if (seen.has(spec.id)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `duplicate wrap-up question id '${spec.id}'`,
          });
        }
        seen.add(spec.id);
        const fields = [spec.header, spec.question, ...spec.options.map((o) => o.label)];
        fields.forEach((field) => {
          requiredLocales.forEach((locale) => {
            if (!field[locale]?.trim()) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `missing ${locale} copy for wrap-up question ${spec.id}`,
              });
            }
          });
        });
      });
      specs.forEach((spec, index) => {
        const cond = spec.visibleWhen;
        if (!cond) return;
        const refIndex = specs.findIndex((s) => s.id === cond.openerId);
        if (refIndex === -1) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `wrap-up visibleWhen references unknown question '${cond.openerId}'`,
          });
          return;
        }
        if (refIndex >= index) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `wrap-up visibleWhen must reference an earlier question (${cond.openerId})`,
          });
        }
        const optionIds = specs[refIndex]!.options.map((option) => option.id);
        for (const id of cond.selected) {
          if (!optionIds.includes(id)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `wrap-up visibleWhen '${cond.openerId}' has no option '${id}'`,
            });
          }
        }
      });
    });
}

export function closingSchema(locales: string[]) {
  return z
    .object({
      question: localizedTextSchema,
      prompt: z.string().trim().min(1).max(60000),
    })
    .superRefine((closing, ctx) => {
      const requiredLocales = new Set(["en", ...locales]);
      requiredLocales.forEach((locale) => {
        if (!closing.question[locale]?.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `missing ${locale} copy for closing.question`,
          });
        }
      });
    });
}

export function onboardingSchema(locales: string[]) {
  const LOCALIZED_FIELDS = [
    "cantonQuestion",
    "cantonWhy",
    "continueLabel",
  ] as const;
  const shape = Object.fromEntries(
    LOCALIZED_FIELDS.map((key) => [key, localizedTextSchema]),
  ) as Record<(typeof LOCALIZED_FIELDS)[number], typeof localizedTextSchema>;
  return z
    .object(shape)
    .superRefine((onboarding, ctx) => {
      const requiredLocales = new Set(["en", ...locales]);
      LOCALIZED_FIELDS.forEach((key) => {
        const field = onboarding[key];
        requiredLocales.forEach((locale) => {
          if (!field[locale]?.trim()) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `missing ${locale} copy for onboarding.${key}`,
            });
          }
        });
      });
    });
}

export const localeSchema = z.enum(["en", "de", "fr", "it", "rm"]);

export const LAUNCH_OPENER_LOCALES = ["en", "de", "fr", "it"] as const;

export const answerSchema = z.object({
  step_id: z.string().trim().min(1).max(100),
  answer: z.record(z.string(), z.unknown()).nullable(),
  skipped: z.boolean().default(false),
});

export const createSessionSchema = z.object({
  locale: localeSchema.default("en"),
  canton: z.string().trim().max(8).nullable().default(null),
});

export const patchSessionSchema = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("answer"), response: answerSchema }),
  // Wrap-up demographic answers, recorded as responses keyed by spec id.
  z.object({ operation: z.literal("wrapup_answer"), response: answerSchema }),
  z.object({
    operation: z.literal("amend"),
    topic_key: z.string().trim().min(1).max(80),
    question: z.string().trim().min(1).max(1000),
    value: z.unknown(),
  }),
  z.object({
    operation: z.literal("progress"),
    topic_key: z.string().trim().min(1).max(80),
    values: z.array(z.unknown()).max(40),
  }),
  z.object({
    operation: z.literal("wrapup_progress"),
    marker: z.string().trim().min(1).max(120),
  }),
  z.object({
    operation: z.literal("question_feedback"),
    opener_id: z.string().trim().min(1).max(120),
    rating: z.enum(["up", "down"]).nullable(),
    note: z.string().trim().max(1000).default(""),
  }),
  z.object({ operation: z.literal("locale"), locale: localeSchema }),
  z.object({ operation: z.literal("complete") }),
]);

export const chatRequestSchema = z.union([
  z.object({
    mode: z.literal("closing").default("closing"),
    message: z.string().trim().max(4000).optional(),
    kickoff: z.boolean().optional(),
    draft: z.string().max(600).optional(),
  }),
  z.object({
    mode: z.literal("other"),
    opener_id: z.string().trim().min(1).max(120),
    message: z.string().trim().min(1).max(4000),
    draft: z.string().max(200).optional(),
  }),
  z.object({
    mode: z.literal("other"),
    opener_id: z.string().trim().min(1).max(120),
    operation: z.literal("load"),
  }),
  z.object({
    mode: z.literal("other"),
    opener_id: z.string().trim().min(1).max(120),
    operation: z.literal("draft"),
    draft: z.string().max(200),
  }),
]);

export const contributionRequestSchema = z.discriminatedUnion("operation", [
  z.object({
    operation: z.literal("submit"),
    topic_key: z.string().trim().min(1).max(80),
    text: z.string().trim().min(1).max(600),
  }),
  z.object({
    operation: z.literal("skip"),
    topic_key: z.string().trim().min(1).max(80),
  }),
  z.object({
    operation: z.literal("draft"),
    topic_key: z.string().trim().min(1).max(80),
    draft: z.string().max(600),
  }),
  z.object({
    operation: z.literal("wall"),
    topic_key: z.string().trim().min(1).max(80),
  }),
]);

export function assertStudyDefinition(definition: SnadStudyDefinition): void {
  const hasAllLaunchLocales = LAUNCH_OPENER_LOCALES.every((locale) =>
    definition.locales.includes(locale),
  );
  if (
    !hasAllLaunchLocales ||
    definition.locales.length < LAUNCH_OPENER_LOCALES.length ||
    definition.locales.length > LAUNCH_OPENER_LOCALES.length + 1
  ) {
    throw new Error(
      "SNAD must define the four launch locales (plus optionally Romansh)",
    );
  }
  definition.topics.forEach((topic) => {
    // Openers are required only in the launch locales; Romansh falls back to en.
    const parsed = topicOpenersConfigSchema([...LAUNCH_OPENER_LOCALES]).safeParse(
      topic.openers,
    );
    if (!parsed.success) {
      throw new Error(
        `invalid SNAD topic ${topic.key}: ${JSON.stringify(parsed.error.flatten())}`,
      );
    }
    if (!definition.aiActors[topic.actorId]) {
      throw new Error(`missing actor ${topic.actorId}`);
    }
  });
  if (!definition.aiActors[definition.wrapUp.feedbackActorId]) {
    throw new Error(`missing actor ${definition.wrapUp.feedbackActorId}`);
  }
  if (definition.wrapUp.questions) {
    const parsed = wrapUpQuestionsSchema([...LAUNCH_OPENER_LOCALES]).safeParse(
      definition.wrapUp.questions,
    );
    if (!parsed.success) {
      throw new Error(
        `invalid SNAD wrap-up questions: ${JSON.stringify(parsed.error.flatten())}`,
      );
    }
  }
  if (definition.wrapUp.closing) {
    const parsed = closingSchema([...LAUNCH_OPENER_LOCALES]).safeParse(
      definition.wrapUp.closing,
    );
    if (!parsed.success) {
      throw new Error(
        `invalid SNAD closing interview: ${JSON.stringify(parsed.error.flatten())}`,
      );
    }
  }
  if (definition.onboarding) {
    const parsed = onboardingSchema([...LAUNCH_OPENER_LOCALES]).safeParse(
      definition.onboarding,
    );
    if (!parsed.success) {
      throw new Error(
        `invalid SNAD onboarding copy: ${JSON.stringify(parsed.error.flatten())}`,
      );
    }
  }
  const rules = definition.wrapUp.archetypeRules;
  if (rules.axes.join(",") !== "candor,protection,boldness") {
    throw new Error("SNAD archetype axes are invalid");
  }
  if (
    rules.scaleLow >= rules.scaleHigh ||
    rules.trackRange.min >= rules.trackRange.max ||
    Object.keys(rules.classification.bySigns).length !== 8
  ) {
    throw new Error("SNAD archetype rules are invalid");
  }
}

export type ParsedTopicOpeners = TopicOpenersConfig;
export type ParsedLocale = SnadLocale;
