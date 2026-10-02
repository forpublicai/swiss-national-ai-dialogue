import { count, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { snadResponses, snadSessions, snadStudyVersions } from "./db-schema";

import { PERSONA_ITEMS } from "../archetype";
import {
  assertStudyDefinition,
  localeSchema,
} from "./schema";
import {
  ensureActiveStudyVersion,
  hashStudyDefinition,
  parsePinnedStudyDefinition,
} from "./study";
import { topicStepId } from "./sessions";
import type {
  LocalizedText,
  SnadStudyDefinition,
  SnadStudyVersionSummary,
  SnadStudyWarning,
  StoredOpenerSpec,
} from "../types";

export type StudyEditorActor = "admin" | "partner";

export type StudyVersionSummary = SnadStudyVersionSummary;
export type StudyWarning = SnadStudyWarning;

const EDITOR_LOCALES = ["en", "de", "fr", "it"] as const;

const nonBlank = (max: number) =>
  z
    .string()
    .max(max)
    .refine((value) => value.trim().length > 0, { message: "must not be blank" });

const actorSchema = z.object({
  id: nonBlank(200),
  prompt: z.string().max(60000),
  model: nonBlank(200),
});

const studyDefinitionEnvelopeSchema = z.object({
  id: z.literal("swiss-national-ai-dialogue"),
  label: nonBlank(300),
  locales: z.array(localeSchema).min(4).max(5),
  topics: z
    .array(
      z.object({
        key: z.string().regex(/^[a-z0-9][a-z0-9_-]*$/i),
        title: nonBlank(200),
        blurb: z.string().max(2000),
        rationale: z.string().max(4000),
        plan: z.string().max(20000).optional(),
        actorId: nonBlank(200),
        openers: z.unknown(),
      }),
    )
    .min(1)
    .max(12)
    .refine(
      (topics) => new Set(topics.map((topic) => topic.key)).size === topics.length,
      { message: "topic keys must be unique" },
    ),
  // Legacy shared-prompt fields, optional — see SnadStudyDefinition.
  feedbackPlan: z.string().max(60000).optional(),
  interviewGuidelines: z.string().max(60000).optional(),
  interviewPlan: z.string().max(60000).optional(),
  aiActors: z.record(z.string(), actorSchema),
  wrapUp: z.object({
    feedbackActorId: nonBlank(200),
    // Deep-checked by assertStudyDefinition (wrapUpQuestionsSchema).
    questions: z.array(z.unknown()).optional(),
    // Deep-checked by assertStudyDefinition (closingSchema).
    closing: z.unknown().optional(),
    archetypeRules: z.unknown(),
  }),
  // Deep-checked by assertStudyDefinition (onboardingSchema).
  onboarding: z.unknown().optional(),
  drawHash: z.literal("mixed").optional(),
});

function specsOfTopic(topic: SnadStudyDefinition["topics"][number]): StoredOpenerSpec[] {
  return topic.openers.sequence.flatMap((step) =>
    step.mode === "always" ? [step.opener] : step.pool,
  );
}

function allSpecs(definition: SnadStudyDefinition): StoredOpenerSpec[] {
  return [
    ...definition.topics.flatMap(specsOfTopic),
    ...(definition.wrapUp.questions ?? []),
  ];
}

const ONBOARDING_FIELDS = [
  "cantonQuestion",
  "cantonWhy",
  "continueLabel",
] as const;

function localizedFieldsOf(spec: StoredOpenerSpec): LocalizedText[] {
  const fields: LocalizedText[] = [spec.question];
  if (spec.kind === "binary") {
    for (const option of [spec.optionA, spec.optionB]) {
      fields.push(option.label);
      if (option.description) fields.push(option.description);
    }
  } else if (spec.kind === "question" || spec.kind === "ranking") {
    fields.push(spec.header);
    spec.options.forEach((option) => {
      fields.push(option.label);
      if (option.description) fields.push(option.description);
    });
    if (spec.kind === "ranking" && spec.followUp) fields.push(spec.followUp);
  } else if (spec.kind === "slider") {
    fields.push(spec.minLabel, spec.maxLabel);
  } else if (spec.kind === "budget") {
    spec.options.forEach((option) => {
      fields.push(option.label);
      if (option.description) fields.push(option.description);
    });
  }
  return fields;
}

export function normalizeStudyDefinitionLocales(
  definition: SnadStudyDefinition,
): { definition: SnadStudyDefinition; errors: string[] } {
  const normalized = structuredClone(definition);
  const errors: string[] = [];
  const fillLocalized = (field: LocalizedText, where: string) => {
    const english = field.en?.trim();
    if (!english) {
      errors.push(`${where}: missing en copy — English is required on every field`);
      return;
    }
    EDITOR_LOCALES.forEach((locale) => {
      if (locale === "en") return;
      if (!field[locale]?.trim()) field[locale] = english;
    });
  };
  const fillSpec = (spec: StoredOpenerSpec, where: string) =>
    localizedFieldsOf(spec).forEach((field) => fillLocalized(field, where));

  normalized.topics.forEach((topic) => {
    specsOfTopic(topic).forEach((spec) =>
      fillSpec(spec, `topic '${topic.key}' opener '${spec.id}'`),
    );
  });
  (normalized.wrapUp.questions ?? []).forEach((spec) =>
    fillSpec(spec, `wrap-up question '${spec.id}'`),
  );

  const closing = normalized.wrapUp.closing;
  if (closing) fillLocalized(closing.question, "closing.question");

  const onboarding = normalized.onboarding;
  if (onboarding) {
    ONBOARDING_FIELDS.forEach((key) =>
      fillLocalized(onboarding[key], `onboarding.${key}`),
    );
  }

  return { definition: normalized, errors: [...new Set(errors)] };
}

function archetypeReferences(): {
  openerId: string;
  use: string;
  optionIds?: string[];
}[] {
  return PERSONA_ITEMS.map((item) => ({
    openerId: item.openerId,
    use:
      item.kind === "options"
        ? `${item.axis} (multiple choice)`
        : item.kind === "ranking"
          ? `${item.axis} (ranking of ${item.optionId})`
          : `${item.axis} (scale)`,
    ...(item.kind === "options"
      ? { optionIds: Object.keys(item.scoreByOption) }
      : item.kind === "ranking"
        ? { optionIds: [item.optionId] }
        : {}),
  }));
}

function specIndex(definition: SnadStudyDefinition): Map<string, StoredOpenerSpec> {
  return new Map(allSpecs(definition).map((spec) => [spec.id, spec]));
}

function optionIdsOf(spec: StoredOpenerSpec): string[] {
  if (spec.kind === "binary") return [spec.optionA.id, spec.optionB.id];
  if (spec.kind === "question" || spec.kind === "ranking") {
    return spec.options.map((option) => option.id);
  }
  return [];
}

export async function computeStudyWarnings(
  definition: SnadStudyDefinition,
  baseline: SnadStudyDefinition | null,
): Promise<StudyWarning[]> {
  const warnings: StudyWarning[] = [];
  const specs = specIndex(definition);

  archetypeReferences().forEach((ref) => {
    const spec = specs.get(ref.openerId);
    if (!spec) {
      warnings.push({
        severity: "warning",
        message: `Archetype scoring references opener '${ref.openerId}' (${ref.use}), which no longer exists in this definition — sessions on this version cannot score that item.`,
      });
      return;
    }
    (ref.optionIds ?? []).forEach((optionId) => {
      if (!optionIdsOf(spec).includes(optionId)) {
        warnings.push({
          severity: "warning",
          message: `Archetype scoring references option '${optionId}' of opener '${ref.openerId}', which no longer exists — picks of the renamed option will not score.`,
        });
      }
    });
  });

  if (baseline) {
    const baselineSpecs = specIndex(baseline);
    const removedOpenerIds = [...baselineSpecs.keys()].filter(
      (id) => !specs.has(id),
    );
    removedOpenerIds.forEach((id) => {
      warnings.push({
        severity: "warning",
        message: `Opener id '${id}' from the active version is missing here (removed or renamed). Poll aggregates are keyed by opener id, so its recorded history will be orphaned; if it was renamed, past and future answers will not aggregate together.`,
      });
    });

    const removedTopicKeys = baseline.topics
      .map((topic) => topic.key)
      .filter((key) => !definition.topics.some((topic) => topic.key === key));
    if (removedTopicKeys.length > 0) {
      const counts = await db
        .select({ stepId: snadResponses.stepId, value: count() })
        .from(snadResponses)
        .where(inArray(snadResponses.stepId, removedTopicKeys.map(topicStepId)))
        .groupBy(snadResponses.stepId);
      removedTopicKeys.forEach((key) => {
        const recorded =
          counts.find((row) => row.stepId === topicStepId(key))?.value ?? 0;
        warnings.push(
          recorded > 0
            ? {
                severity: "warning",
                message: `Topic '${key}' is removed but has ${recorded} recorded response(s). The data stays in the database, but nothing on this version will surface or aggregate it.`,
              }
            : {
                severity: "info",
                message: `Topic '${key}' is removed (no recorded responses yet).`,
              },
        );
      });
    }
  }

  return warnings;
}

export type StudyValidationResult =
  | {
      ok: true;
      definition: SnadStudyDefinition;
      warnings: StudyWarning[];
    }
  | { ok: false; errors: string[] };

export async function validateStudyDefinition(
  input: unknown,
): Promise<StudyValidationResult> {
  const envelope = studyDefinitionEnvelopeSchema.safeParse(input);
  if (!envelope.success) {
    return {
      ok: false,
      errors: envelope.error.issues.map(
        (issue) => `${issue.path.join(".") || "definition"}: ${issue.message}`,
      ),
    };
  }

  let normalized: { definition: SnadStudyDefinition; errors: string[] };
  try {
    normalized = normalizeStudyDefinitionLocales(
      envelope.data as SnadStudyDefinition,
    );
  } catch {
    return {
      ok: false,
      errors: ["topic openers are malformed — expected { sequence: [...] } steps"],
    };
  }
  const { definition, errors } = normalized;
  if (errors.length > 0) return { ok: false, errors };
  definition.drawHash = "mixed";

  try {
    assertStudyDefinition(definition);
  } catch (error) {
    return {
      ok: false,
      errors: [error instanceof Error ? error.message : "invalid definition"],
    };
  }

  const active = await ensureActiveStudyVersion();
  const [activeRow] = await db
    .select({ definition: snadStudyVersions.definition })
    .from(snadStudyVersions)
    .where(eq(snadStudyVersions.id, active.id))
    .limit(1);
  const baseline = activeRow
    ? parsePinnedStudyDefinition(activeRow.definition)
    : null;
  const warnings = await computeStudyWarnings(definition, baseline);
  return { ok: true, definition, warnings };
}

export async function listStudyVersions(): Promise<StudyVersionSummary[]> {
  await ensureActiveStudyVersion();
  const rows = await db
    .select({
      id: snadStudyVersions.id,
      label: snadStudyVersions.label,
      notes: snadStudyVersions.notes,
      createdBy: snadStudyVersions.createdBy,
      isActive: snadStudyVersions.isActive,
      definitionHash: snadStudyVersions.definitionHash,
      createdAt: snadStudyVersions.createdAt,
      sessionCount: count(snadSessions.id),
    })
    .from(snadStudyVersions)
    .leftJoin(
      snadSessions,
      eq(snadSessions.studyVersionId, snadStudyVersions.id),
    )
    .groupBy(snadStudyVersions.id)
    .orderBy(desc(snadStudyVersions.createdAt));
  return rows;
}

export async function getStudyVersion(id: string): Promise<{
  summary: StudyVersionSummary;
  definition: SnadStudyDefinition;
} | null> {
  const versions = await listStudyVersions();
  const summary = versions.find((version) => version.id === id);
  if (!summary) return null;
  const [row] = await db
    .select({ definition: snadStudyVersions.definition })
    .from(snadStudyVersions)
    .where(eq(snadStudyVersions.id, id))
    .limit(1);
  if (!row) return null;
  return { summary, definition: parsePinnedStudyDefinition(row.definition) };
}

export type CreateStudyVersionResult =
  | { ok: true; id: string; warnings: StudyWarning[] }
  | { ok: false; errors: string[]; duplicateOfId?: string };

export async function createStudyVersion(input: {
  definition: unknown;
  notes: string | null;
  createdBy: StudyEditorActor;
}): Promise<CreateStudyVersionResult> {
  const validated = await validateStudyDefinition(input.definition);
  if (!validated.ok) return { ok: false, errors: validated.errors };

  const definitionHash = hashStudyDefinition(validated.definition);
  const [created] = await db
    .insert(snadStudyVersions)
    .values({
      definitionHash,
      label: validated.definition.label,
      definition: validated.definition,
      notes: input.notes,
      createdBy: input.createdBy,
    })
    .onConflictDoNothing({ target: snadStudyVersions.definitionHash })
    .returning({ id: snadStudyVersions.id });
  if (created) return { ok: true, id: created.id, warnings: validated.warnings };

  const [duplicate] = await db
    .select({ id: snadStudyVersions.id, label: snadStudyVersions.label })
    .from(snadStudyVersions)
    .where(eq(snadStudyVersions.definitionHash, definitionHash))
    .limit(1);
  return {
    ok: false,
    errors: [
      `an identical definition already exists${duplicate ? ` as version '${duplicate.label}'` : ""} — change something (the label counts) before saving`,
    ],
    duplicateOfId: duplicate?.id,
  };
}

export type ActivateStudyVersionResult =
  | { ok: true; warnings: StudyWarning[] }
  | { ok: false; errors: string[] };

export async function activateStudyVersion(
  id: string,
): Promise<ActivateStudyVersionResult> {
  const [target] = await db
    .select({
      id: snadStudyVersions.id,
      definition: snadStudyVersions.definition,
      isActive: snadStudyVersions.isActive,
    })
    .from(snadStudyVersions)
    .where(eq(snadStudyVersions.id, id))
    .limit(1);
  if (!target) return { ok: false, errors: ["version not found"] };

  let definition: SnadStudyDefinition;
  try {
    definition = parsePinnedStudyDefinition(target.definition);
  } catch (error) {
    return {
      ok: false,
      errors: [
        `this version fails validation and cannot be activated: ${
          error instanceof Error ? error.message : "invalid definition"
        }`,
      ],
    };
  }

  const [activeRow] = await db
    .select({ definition: snadStudyVersions.definition })
    .from(snadStudyVersions)
    .where(eq(snadStudyVersions.isActive, true))
    .limit(1);
  const baseline = activeRow
    ? parsePinnedStudyDefinition(activeRow.definition)
    : null;
  const warnings = await computeStudyWarnings(definition, baseline);

  await db.transaction(async (tx) => {
    await tx
      .update(snadStudyVersions)
      .set({ isActive: false })
      .where(eq(snadStudyVersions.isActive, true));
    await tx
      .update(snadStudyVersions)
      .set({ isActive: true })
      .where(eq(snadStudyVersions.id, id));
  });
  return { ok: true, warnings };
}
