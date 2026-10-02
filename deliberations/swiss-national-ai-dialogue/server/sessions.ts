import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

import { and, count, eq, gt, inArray, isNotNull, sql } from "drizzle-orm";
import { cookies } from "next/headers";

import { db } from "@/db";
import {
  snadChats,
  snadContributions,
  snadResponses,
  snadSessions,
} from "./db-schema";

import {
  ensureActiveStudyVersion,
  getPinnedDefinition,
  snadStudyDefinition,
} from "./study";
import { wrapUpMarkers, wrapUpSpecsOf } from "./progress";
import {
  SNAD_CLOSING_TOPIC_KEY,
  SNAD_EMAIL_STEP_ID,
  SNAD_NPS_STEP_ID,
  SNAD_QUESTION_FEEDBACK_PREFIX,
  SNAD_SHAPE_STEP_ID,
  SNAD_TOPIC_TIMING_PREFIX,
  SNAD_WRAP_UP_PROGRESS_STEP_ID,
} from "./constants";
import type {
  SnadLocale,
  SnadOpenerSequenceEvent,
  SnadQuestionVerdict,
  SnadSequenceStep,
  SnadSessionPayload,
  SnadStudyDefinition,
  StoredOpenerOption,
  StoredOpenerSpec,
} from "../types";

const COOKIE_NAME = "snad_session";
const RESUME_DAYS = 30;
const RESUME_SECONDS = RESUME_DAYS * 24 * 60 * 60;

type SessionRow = typeof snadSessions.$inferSelect;
type ResponseRow = typeof snadResponses.$inferSelect;
type ChatRow = typeof snadChats.$inferSelect;
type ContributionRow = typeof snadContributions.$inferSelect;

export async function readSnadSessionCookie(): Promise<string | undefined> {
  return (await cookies()).get(COOKIE_NAME)?.value;
}

async function writeSnadSessionCookie(id: string): Promise<void> {
  (await cookies()).set(COOKIE_NAME, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: RESUME_SECONDS,
  });
}

async function clearSnadSessionCookie(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}

function fnv1a(input: string): number {
  return [...input].reduce((hash, char) => {
    const next = hash ^ char.charCodeAt(0);
    return Math.imul(next, 0x01000193) >>> 0;
  }, 0x811c9dc5);
}

function mix32(hash: number): number {
  let h = (hash ^ (hash >>> 16)) >>> 0;
  h = Math.imul(h, 0x85ebca6b);
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

type DrawScore = (input: string) => number;

function drawScorer(definition: SnadStudyDefinition): DrawScore {
  if (definition.drawHash !== "mixed") return fnv1a;
  return (input) => mix32(fnv1a(input));
}

function rendezvousPick<T extends { id: string }>(
  pool: T[],
  seed: string,
  score: DrawScore,
): T {
  return pool.reduce((best, item) => {
    const bestScore = score(`${seed}:${best.id}`);
    const itemScore = score(`${seed}:${item.id}`);
    if (itemScore > bestScore) return item;
    if (itemScore === bestScore && item.id < best.id) return item;
    return best;
  });
}

function rendezvousPickN<T extends { id: string }>(
  pool: T[],
  seed: string,
  n: number,
  score: DrawScore,
): T[] {
  if (n >= pool.length) return pool;
  const scored = pool.map((item, index) => ({
    item,
    index,
    score: score(`${seed}:${item.id}`),
  }));
  const winners = new Set(
    [...scored]
      .sort((a, b) =>
        b.score !== a.score ? b.score - a.score : a.item.id < b.item.id ? -1 : 1,
      )
      .slice(0, n)
      .map((entry) => entry.index),
  );
  return scored.filter((entry) => winners.has(entry.index)).map((entry) => entry.item);
}

function localize(value: Record<string, string>, locale: SnadLocale): string {
  return value[locale]?.trim() || value.en?.trim() || "";
}

function sessionOptionOrder(
  spec: Extract<StoredOpenerSpec, { kind: "question" }>,
  sessionId: string,
  score: DrawScore,
): StoredOpenerSpec {
  if (!spec.shuffleOptions) return spec;
  const pinned = spec.options.filter(
    (option) => option.exclusive || option.freeText,
  );
  const shuffled = spec.options
    .filter((option) => !option.exclusive && !option.freeText)
    .map((option) => ({
      option,
      score: score(`${sessionId}:${spec.id}:options:${option.id}`),
    }))
    .sort((a, b) =>
      b.score !== a.score ? b.score - a.score : a.option.id < b.option.id ? -1 : 1,
    )
    .map((entry) => entry.option);
  return { ...spec, options: [...shuffled, ...pinned] };
}

function localizeOption(
  option: StoredOpenerOption,
  locale: SnadLocale,
) {
  const description = option.description
    ? localize(option.description, locale)
    : "";
  return {
    id: option.id,
    label: localize(option.label, locale),
    ...(description ? { description } : {}),
    ...(option.exclusive ? { exclusive: true } : {}),
    ...(option.freeText ? { freeText: true } : {}),
  };
}

function eventStep(spec: StoredOpenerSpec, locale: SnadLocale) {
  const openerId = { opener_id: spec.id };
  const cond = spec.visibleWhen ? { visibleWhen: spec.visibleWhen } : {};
  if (spec.kind === "binary") {
    return {
      kind: "binary" as const,
      question: localize(spec.question, locale),
      option_a: localizeOption(spec.optionA, locale),
      option_b: localizeOption(spec.optionB, locale),
      ...openerId,
      ...cond,
    };
  }
  if (spec.kind === "question") {
    return {
      kind: "question" as const,
      header: localize(spec.header, locale),
      question: localize(spec.question, locale),
      options: spec.options.map((option) => localizeOption(option, locale)),
      ...(spec.multiSelect ? { multiSelect: true } : {}),
      ...(spec.maxSelect ? { maxSelect: spec.maxSelect } : {}),
      ...(spec.otherAssist ? { otherAssist: true } : {}),
      ...openerId,
      ...cond,
    };
  }
  if (spec.kind === "ranking") {
    return {
      kind: "ranking" as const,
      header: localize(spec.header, locale),
      question: localize(spec.question, locale),
      options: spec.options.map((option) => localizeOption(option, locale)),
      ...(spec.followUp
        ? { follow_up: localize(spec.followUp, locale) }
        : {}),
      ...openerId,
      ...cond,
    };
  }
  if (spec.kind === "slider") {
    return {
      kind: "slider" as const,
      question: localize(spec.question, locale),
      min_label: localize(spec.minLabel, locale),
      max_label: localize(spec.maxLabel, locale),
      ...openerId,
      ...cond,
    };
  }
  if (spec.kind === "budget") {
    return {
      kind: "budget" as const,
      question: localize(spec.question, locale),
      total: spec.total,
      options: spec.options.map((option) => localizeOption(option, locale)),
      ...openerId,
      ...cond,
    };
  }
  return {
    kind: "share_more" as const,
    question: localize(spec.question, locale),
    ...openerId,
  };
}

export function topicStepId(topicKey: string): string {
  return `topic:${topicKey}`;
}

export function progressStepId(topicKey: string): string {
  return `progress:${topicKey}`;
}

export function questionFeedbackStepId(openerId: string): string {
  return `${SNAD_QUESTION_FEEDBACK_PREFIX}${openerId}`;
}

export function topicTimingStepId(topicKey: string): string {
  return `${SNAD_TOPIC_TIMING_PREFIX}${topicKey}`;
}

export function stampedTimes(input: {
  values: unknown[];
  priorValues: unknown[];
  priorTimes: unknown[];
  now: string;
}): (string | null)[] {
  return input.values.map((value, index) => {
    if (value == null) return null;
    const prior = input.priorTimes[index];
    return input.priorValues[index] != null && typeof prior === "string"
      ? prior
      : input.now;
  });
}

function parsePartialValues(
  response: ResponseRow | undefined,
): unknown[] | null {
  const raw = response?.answer?.values;
  return Array.isArray(raw) ? raw : null;
}

export function parseQuestionVerdict(
  answer: Record<string, unknown> | null,
): SnadQuestionVerdict {
  const rating = answer?.rating;
  return {
    rating: rating === "up" || rating === "down" ? rating : null,
    note: typeof answer?.note === "string" ? answer.note : "",
  };
}

const TOPIC_EVENT_CACHE_MAX = 4096;
const topicEventCache = new Map<string, SnadOpenerSequenceEvent>();

export function buildTopicEvent(
  definition: SnadStudyDefinition,
  sessionId: string,
  topicKey: string,
  locale: SnadLocale,
  studyVersionId?: string,
): SnadOpenerSequenceEvent {
  const cacheKey = studyVersionId
    ? `${studyVersionId}:${sessionId}:${topicKey}:${locale}`
    : null;
  if (cacheKey) {
    const cached = topicEventCache.get(cacheKey);
    if (cached) {
      topicEventCache.delete(cacheKey);
      topicEventCache.set(cacheKey, cached);
      return cached;
    }
  }
  const topic = definition.topics.find((candidate) => candidate.key === topicKey);
  if (!topic) throw new Error(`unknown SNAD topic ${topicKey}`);
  const score = drawScorer(definition);
  const specs = topic.openers.sequence.flatMap((step) => {
    if (step.mode === "always") return [step.opener];
    const seed = `${sessionId}:${topic.key}:${step.id}`;
    if (step.mode === "drawN") {
      return rendezvousPickN(step.pool, seed, step.n, score);
    }
    return [rendezvousPick(step.pool, seed, score)];
  });
  const event: SnadOpenerSequenceEvent = {
    type: "awaiting_opener_sequence",
    tool_use_id: `${sessionId}:${topic.key}`,
    steps: specs.map((spec) =>
      eventStep(
        spec.kind === "question"
          ? sessionOptionOrder(spec, sessionId, score)
          : spec,
        locale,
      ),
    ),
    theme: topic.key,
  };
  if (cacheKey) {
    if (topicEventCache.size >= TOPIC_EVENT_CACHE_MAX) {
      const oldest = topicEventCache.keys().next().value;
      if (oldest !== undefined) topicEventCache.delete(oldest);
    }
    topicEventCache.set(cacheKey, event);
  }
  return event;
}

export type SnadOpenerStep = Exclude<SnadSequenceStep, { kind: "share_more" }>;

export type SnadOpenerIndex = {
  byOpenerId: Map<string, SnadOpenerStep[]>;
  byQuestion: Map<string, { openerId: string; step: SnadOpenerStep }>;
  wrapUpQuestionIds: Set<string>;
};

const OPENER_INDEX_CACHE_MAX = 32;
const openerIndexCache = new Map<string, SnadOpenerIndex>();

export function buildOpenerIndex(
  definition: SnadStudyDefinition,
  studyVersionId?: string,
): SnadOpenerIndex {
  if (studyVersionId) {
    const cached = openerIndexCache.get(studyVersionId);
    if (cached) {
      openerIndexCache.delete(studyVersionId);
      openerIndexCache.set(studyVersionId, cached);
      return cached;
    }
  }
  const index: SnadOpenerIndex = {
    byOpenerId: new Map(),
    byQuestion: new Map(),
    wrapUpQuestionIds: new Set(
      (definition.wrapUp.questions ?? []).map((spec) => spec.id),
    ),
  };
  definition.topics.forEach((topic) =>
    topic.openers.sequence.forEach((sequenceStep) => {
      const specs =
        sequenceStep.mode === "always" ? [sequenceStep.opener] : sequenceStep.pool;
      specs.forEach((spec) =>
        definition.locales.forEach((locale) => {
          const step = eventStep(spec, locale);
          if (step.kind === "share_more") return;
          const variants = index.byOpenerId.get(spec.id) ?? [];
          if (variants.some((variant) => variant.question === step.question)) {
            return;
          }
          variants.push(step);
          index.byOpenerId.set(spec.id, variants);
          index.byQuestion.set(step.question, { openerId: spec.id, step });
        }),
      );
    }),
  );
  if (studyVersionId) {
    if (openerIndexCache.size >= OPENER_INDEX_CACHE_MAX) {
      const oldest = openerIndexCache.keys().next().value;
      if (oldest !== undefined) openerIndexCache.delete(oldest);
    }
    openerIndexCache.set(studyVersionId, index);
  }
  return index;
}

export async function getOpenerIndex(
  studyVersionId: string,
): Promise<SnadOpenerIndex> {
  const cached = openerIndexCache.get(studyVersionId);
  if (cached) {
    openerIndexCache.delete(studyVersionId);
    openerIndexCache.set(studyVersionId, cached);
    return cached;
  }
  return buildOpenerIndex(await getPinnedDefinition(studyVersionId), studyVersionId);
}

export function buildWrapUpQuestions(
  definition: SnadStudyDefinition,
  locale: SnadLocale,
): SnadSequenceStep[] {
  return wrapUpSpecsOf(definition).map((spec) => eventStep(spec, locale));
}

export async function loadOwnedSession(): Promise<{
  session: SessionRow;
  definition: SnadStudyDefinition;
} | null> {
  const id = await readSnadSessionCookie();
  if (!id) return null;
  const cutoff = new Date(Date.now() - RESUME_SECONDS * 1000);
  const [session] = await db
    .select()
    .from(snadSessions)
    .where(and(eq(snadSessions.id, id), gt(snadSessions.lastActiveAt, cutoff)))
    .limit(1);
  if (!session) return null;
  return {
    session,
    definition: await getPinnedDefinition(session.studyVersionId),
  };
}

export async function createOrResumeSession(input: {
  locale: SnadLocale;
  canton: string | null;
}): Promise<SnadSessionPayload> {
  const existing = await loadOwnedSession();
  if (existing) {
    await touchSession(existing.session.id);
    return hydrateSession(existing.session.id, existing);
  }

  const version = await ensureActiveStudyVersion();
  const id = randomUUID();
  await db.insert(snadSessions).values({
    id,
    studyVersionId: version.id,
    locale: input.locale,
    startLocale: input.locale,
    canton: input.canton,
  });
  await writeSnadSessionCookie(id);
  return hydrateSession(id);
}

export async function hydrateOwnedSession(): Promise<SnadSessionPayload | null> {
  const owned = await loadOwnedSession();
  if (!owned) return null;
  await touchSession(owned.session.id);
  return hydrateSession(owned.session.id, owned);
}

export async function loadOnboardingCopy() {
  try {
    const owned = await loadOwnedSession();
    if (owned) {
      return owned.definition.onboarding ?? snadStudyDefinition.onboarding!;
    }
    const active = await ensureActiveStudyVersion();
    const definition = await getPinnedDefinition(active.id);
    return definition.onboarding ?? snadStudyDefinition.onboarding!;
  } catch (error) {
    console.error("[snad] onboarding copy load failed, using snapshot", error);
    return snadStudyDefinition.onboarding!;
  }
}

const PARTICIPANT_COUNT_TTL_MS = 15_000;
let participantCountCache: { value: number; at: number } | null = null;
let participantCountInflight: Promise<number> | null = null;

async function loadSnadParticipantCountCached(): Promise<number> {
  const now = Date.now();
  if (participantCountCache && now - participantCountCache.at < PARTICIPANT_COUNT_TTL_MS) {
    return participantCountCache.value;
  }
  if (participantCountInflight) return participantCountInflight;
  participantCountInflight = (async () => {
    try {
      const [total] = await db.select({ value: count() }).from(snadSessions);
      const value = total?.value ?? 0;
      participantCountCache = { value, at: Date.now() };
      return value;
    } finally {
      participantCountInflight = null;
    }
  })();
  return participantCountInflight;
}

export async function loadSnadParticipantCount(): Promise<number> {
  return loadSnadParticipantCountCached();
}

export async function loadSnadCantonCounts(): Promise<
  { canton: string; count: number }[]
> {
  const rows = await db
    .select({ canton: snadSessions.canton, count: count() })
    .from(snadSessions)
    .where(isNotNull(snadSessions.canton))
    .groupBy(snadSessions.canton);
  return rows.flatMap((row) =>
    row.canton ? [{ canton: row.canton, count: row.count }] : [],
  );
}

type PreloadedSession = {
  session: SessionRow;
  definition: SnadStudyDefinition;
  responses?: ResponseRow[];
};

async function loadSessionBase(sessionId: string): Promise<PreloadedSession> {
  const [session] = await db
    .select()
    .from(snadSessions)
    .where(eq(snadSessions.id, sessionId))
    .limit(1);
  if (!session) throw new Error("SNAD session not found");
  return {
    session,
    definition: await getPinnedDefinition(session.studyVersionId),
  };
}

async function loadResponses(sessionId: string): Promise<ResponseRow[]> {
  return db
    .select()
    .from(snadResponses)
    .where(eq(snadResponses.sessionId, sessionId));
}

async function loadChats(sessionId: string): Promise<ChatRow[]> {
  return db
    .select({
      id: snadChats.id,
      sessionId: snadChats.sessionId,
      stepId: snadChats.stepId,
      actorId: snadChats.actorId,
      type: snadChats.type,
      messages: sql<
        ChatRow["messages"]
      >`case when ${snadChats.type} = 'feedback' then ${snadChats.messages} else '[]'::jsonb end`,
      contributionDraft: snadChats.contributionDraft,
      status: snadChats.status,
      createdAt: snadChats.createdAt,
      updatedAt: snadChats.updatedAt,
      completedAt: snadChats.completedAt,
    })
    .from(snadChats)
    .where(eq(snadChats.sessionId, sessionId));
}

export async function loadSessionData(
  sessionId: string,
  preloaded?: PreloadedSession,
): Promise<{
  session: SessionRow;
  definition: SnadStudyDefinition;
  responses: ResponseRow[];
  chats: ChatRow[];
  contributions: ContributionRow[];
}> {
  const base = preloaded ?? (await loadSessionBase(sessionId));
  const [responses, chats, contributions] = await Promise.all([
    base.responses ?? loadResponses(sessionId),
    loadChats(sessionId),
    db
      .select()
      .from(snadContributions)
      .where(eq(snadContributions.sessionId, sessionId)),
  ]);
  return {
    session: base.session,
    definition: base.definition,
    responses,
    chats,
    contributions,
  };
}

type ActiveStepInput = {
  session: SessionRow;
  definition: SnadStudyDefinition;
  responses: ResponseRow[];
};

export function deriveActiveStep(data: ActiveStepInput) {
  const responseByStep = new Map(
    data.responses.map((response) => [response.stepId, response]),
  );

  for (const topic of data.definition.topics) {
    const stepId = topicStepId(topic.key);
    const response = responseByStep.get(stepId);
    if (!response) {
      return {
        kind: "topic" as const,
        topicKey: topic.key,
        event: buildTopicEvent(
          data.definition,
          data.session.id,
          topic.key,
          data.session.locale as SnadLocale,
          data.session.studyVersionId,
        ),
        partial: parsePartialValues(
          responseByStep.get(progressStepId(topic.key)),
        ),
      };
    }
  }
  if (data.session.status === "completed") {
    return { kind: "completed" as const };
  }
  return { kind: "wrap_up" as const };
}

export async function hydrateSession(
  sessionId: string,
  preloaded?: PreloadedSession,
): Promise<SnadSessionPayload> {
  const data = await loadSessionData(sessionId, preloaded);
  const responseByStep = new Map(
    data.responses.map((response) => [response.stepId, response]),
  );
  const activeStep = deriveActiveStep(data);
  const participantCount = await loadSnadParticipantCountCached();

  const wrapUpSpecIds = new Set(wrapUpSpecsOf(data.definition).map((spec) => spec.id));
  const wrapUpAnswers = Object.fromEntries(
    data.responses.flatMap((response) =>
      wrapUpSpecIds.has(response.stepId) && !response.skipped && response.answer
        ? [[response.stepId, response.answer as Record<string, unknown>]]
        : [],
    ),
  );

  const questionFeedback = Object.fromEntries(
    data.responses.flatMap((response) =>
      response.stepId.startsWith(SNAD_QUESTION_FEEDBACK_PREFIX)
        ? [
            [
              response.stepId.slice(SNAD_QUESTION_FEEDBACK_PREFIX.length),
              parseQuestionVerdict(response.answer),
            ],
          ]
        : [],
    ),
  );

  return {
    sessionId: data.session.id,
    status: data.session.status,
    locale: data.session.locale as SnadLocale,
    canton: data.session.canton,
    archetype: data.session.archetype,
    wrapUpQuestions: buildWrapUpQuestions(
      data.definition,
      data.session.locale as SnadLocale,
    ),
    wrapUpAnswers,
    activeStep,
    topics: data.definition.topics.map((topic) => {
      const stepId = topicStepId(topic.key);
      const response = responseByStep.get(stepId);
      const state =
        activeStep.kind === "topic" && activeStep.topicKey === topic.key
          ? "current"
          : response
            ? "done"
            : "upcoming";
      return {
        key: topic.key,
        title: topic.title,
        state,
        answer: response?.answer ?? null,
        event: buildTopicEvent(
          data.definition,
          data.session.id,
          topic.key,
          data.session.locale as SnadLocale,
          data.session.studyVersionId,
        ),
      };
    }),
    questionFeedback,
    feedbackChat:
      data.chats.find((chat) => chat.type === "feedback")?.messages ?? [],
    shape: buildShapeState(responseByStep.get(SNAD_SHAPE_STEP_ID)),
    closing: buildClosingState(data),
    participantCount,
  };
}

function buildClosingState(
  data: Awaited<ReturnType<typeof loadSessionData>>,
): SnadSessionPayload["closing"] {
  const closing = data.definition.wrapUp.closing;
  if (!closing) return null;
  const chat = data.chats.find((candidate) => candidate.type === "feedback");
  const contribution =
    data.contributions.find(
      (candidate) => candidate.topicKey === SNAD_CLOSING_TOPIC_KEY,
    )?.text ?? null;
  return {
    question: localize(closing.question, data.session.locale as SnadLocale),
    draft: chat?.contributionDraft ?? null,
    contribution,
    resolved: contribution !== null || chat?.status === "completed",
  };
}

function buildShapeState(
  row: { answer: Record<string, unknown> | null } | undefined,
): SnadSessionPayload["shape"] {
  const text = row?.answer?.text;
  return {
    text: typeof text === "string" && text.length > 0 ? text : null,
    resolved: row !== undefined,
  };
}

export async function resolveResponse(input: {
  stepId: string;
  answer: Record<string, unknown> | null;
  skipped: boolean;
}): Promise<SnadSessionPayload> {
  const owned = await loadOwnedSession();
  if (!owned) throw new Error("no_session");

  const responses = await loadResponses(owned.session.id);
  const existing = responses.find((row) => row.stepId === input.stepId);
  if (existing) {
    const same =
      existing.skipped === input.skipped &&
      isDeepStrictEqual(existing.answer, input.answer);
    if (!same) throw new Error("step_already_resolved");
    return hydrateSession(owned.session.id, owned);
  }

  const active = deriveActiveStep({
    session: owned.session,
    definition: owned.definition,
    responses,
  });
  if (active.kind !== "topic") throw new Error("step_not_active");
  if (input.stepId !== topicStepId(active.topicKey)) {
    throw new Error("step_not_active");
  }
  if (!input.skipped && !input.answer) throw new Error("answer_required");

  const [created] = await db
    .insert(snadResponses)
    .values({
      sessionId: owned.session.id,
      stepId: input.stepId,
      answer: input.answer,
      skipped: input.skipped,
      locale: owned.session.locale,
    })
    .onConflictDoNothing()
    .returning();
  if (!created) {
    const [raced] = await db
      .select()
      .from(snadResponses)
      .where(
        and(
          eq(snadResponses.sessionId, owned.session.id),
          eq(snadResponses.stepId, input.stepId),
        ),
      )
      .limit(1);
    const same =
      raced?.skipped === input.skipped &&
      isDeepStrictEqual(raced.answer, input.answer);
    if (!same) throw new Error("step_already_resolved");
    return hydrateSession(owned.session.id, owned);
  }
  const supersededTopicKey = input.stepId.startsWith("topic:")
    ? input.stepId.slice("topic:".length)
    : null;
  if (supersededTopicKey) {
    await db
      .update(snadResponses)
      .set({
        stepId: topicTimingStepId(supersededTopicKey),
        answer: sql`jsonb_build_object('times', coalesce(${snadResponses.answer}->'times', '[]'::jsonb))`,
      })
      .where(
        and(
          eq(snadResponses.sessionId, owned.session.id),
          eq(snadResponses.stepId, progressStepId(supersededTopicKey)),
        ),
      );
  }
  await touchSession(owned.session.id);

  const responsesAfter = (
    supersededTopicKey
      ? responses.filter(
          (row) => row.stepId !== progressStepId(supersededTopicKey),
        )
      : responses
  ).concat(created);
  const nextActive = deriveActiveStep({
    session: owned.session,
    definition: owned.definition,
    responses: responsesAfter,
  });
  let session = owned.session;
  if (nextActive.kind === "wrap_up") {
    await db
      .update(snadSessions)
      .set({ status: "wrap_up", lastActiveAt: new Date() })
      .where(eq(snadSessions.id, owned.session.id));
    session = { ...owned.session, status: "wrap_up" };
  }
  return hydrateSession(owned.session.id, {
    session,
    definition: owned.definition,
    responses: responsesAfter,
  });
}

export async function amendTopicAnswer(input: {
  topicKey: string;
  question: string;
  value: unknown;
}): Promise<SnadSessionPayload> {
  const owned = await loadOwnedSession();
  if (!owned) throw new Error("no_session");
  if (!owned.definition.topics.some((topic) => topic.key === input.topicKey)) {
    throw new Error("invalid_step");
  }
  const event = buildTopicEvent(
    owned.definition,
    owned.session.id,
    input.topicKey,
    owned.session.locale as SnadLocale,
  );
  const known = event.steps.some(
    (step) => step.kind !== "share_more" && step.question === input.question,
  );
  if (!known) throw new Error("invalid_step");
  const [existing] = await db
    .select()
    .from(snadResponses)
    .where(
      and(
        eq(snadResponses.sessionId, owned.session.id),
        eq(snadResponses.stepId, topicStepId(input.topicKey)),
      ),
    )
    .limit(1);
  if (!existing) throw new Error("step_not_active");
  const prior = existing.answer ?? {};
  const priorAnswers =
    typeof prior.answers === "object" && prior.answers !== null
      ? (prior.answers as Record<string, unknown>)
      : {};
  const nextAnswer = {
    ...prior,
    answers: { ...priorAnswers, [input.question]: input.value },
  };
  await db
    .update(snadResponses)
    .set({ answer: nextAnswer, skipped: false, updatedAt: new Date() })
    .where(
      and(
        eq(snadResponses.sessionId, owned.session.id),
        eq(snadResponses.stepId, topicStepId(input.topicKey)),
      ),
    );
  await touchSession(owned.session.id);
  return hydrateSession(owned.session.id, owned);
}

export async function saveTopicProgress(input: {
  topicKey: string;
  values: unknown[];
}): Promise<void> {
  const owned = await loadOwnedSession();
  if (!owned) throw new Error("no_session");
  if (!owned.definition.topics.some((topic) => topic.key === input.topicKey)) {
    throw new Error("invalid_step");
  }
  const rows = await db
    .select({ stepId: snadResponses.stepId, answer: snadResponses.answer })
    .from(snadResponses)
    .where(
      and(
        eq(snadResponses.sessionId, owned.session.id),
        inArray(snadResponses.stepId, [
          topicStepId(input.topicKey),
          progressStepId(input.topicKey),
        ]),
      ),
    );
  const resolved = rows.some(
    (row) => row.stepId === topicStepId(input.topicKey),
  );
  if (resolved) throw new Error("step_already_resolved");
  const prior = rows.find(
    (row) => row.stepId === progressStepId(input.topicKey),
  )?.answer;
  const answer = {
    values: input.values,
    times: stampedTimes({
      values: input.values,
      priorValues: Array.isArray(prior?.values) ? prior.values : [],
      priorTimes: Array.isArray(prior?.times) ? prior.times : [],
      now: new Date().toISOString(),
    }),
  };
  await db
    .insert(snadResponses)
    .values({
      sessionId: owned.session.id,
      stepId: progressStepId(input.topicKey),
      answer,
      skipped: false,
      locale: owned.session.locale,
    })
    .onConflictDoUpdate({
      target: [snadResponses.sessionId, snadResponses.stepId],
      set: {
        answer,
        locale: owned.session.locale,
        updatedAt: new Date(),
      },
    });
  await touchSession(owned.session.id);
}

export async function saveWrapUpProgress(input: {
  marker: string;
}): Promise<void> {
  const owned = await loadOwnedSession();
  if (!owned) throw new Error("no_session");
  const markers = wrapUpMarkers(owned.definition);
  const reached = markers.indexOf(input.marker);
  if (reached === -1) throw new Error("invalid_step");
  const [existing] = await db
    .select({ answer: snadResponses.answer })
    .from(snadResponses)
    .where(
      and(
        eq(snadResponses.sessionId, owned.session.id),
        eq(snadResponses.stepId, SNAD_WRAP_UP_PROGRESS_STEP_ID),
      ),
    )
    .limit(1);
  const recorded =
    typeof existing?.answer?.marker === "string"
      ? markers.indexOf(existing.answer.marker)
      : -1;
  if (recorded >= reached) {
    await touchSession(owned.session.id);
    return;
  }
  const answer = { marker: input.marker };
  await db
    .insert(snadResponses)
    .values({
      sessionId: owned.session.id,
      stepId: SNAD_WRAP_UP_PROGRESS_STEP_ID,
      answer,
      skipped: false,
      locale: owned.session.locale,
    })
    .onConflictDoUpdate({
      target: [snadResponses.sessionId, snadResponses.stepId],
      set: { answer, locale: owned.session.locale, updatedAt: new Date() },
    });
  await touchSession(owned.session.id);
}

function definitionOpenerIds(definition: SnadStudyDefinition): Set<string> {
  const ids = new Set<string>();
  definition.topics.forEach((topic) =>
    topic.openers.sequence.forEach((step) => {
      const specs = step.mode === "always" ? [step.opener] : step.pool;
      specs.forEach((spec) => ids.add(spec.id));
    }),
  );
  wrapUpSpecsOf(definition).forEach((spec) => ids.add(spec.id));
  return ids;
}

export async function saveQuestionFeedback(input: {
  openerId: string;
  rating: "up" | "down" | null;
  note: string;
}): Promise<void> {
  const owned = await loadOwnedSession();
  if (!owned) throw new Error("no_session");
  if (!definitionOpenerIds(owned.definition).has(input.openerId)) {
    throw new Error("invalid_step");
  }
  const stepId = questionFeedbackStepId(input.openerId);
  const note = input.note.trim();
  if (!input.rating && !note) {
    await db
      .delete(snadResponses)
      .where(
        and(
          eq(snadResponses.sessionId, owned.session.id),
          eq(snadResponses.stepId, stepId),
        ),
      );
    return;
  }
  const answer = { rating: input.rating, note };
  await db
    .insert(snadResponses)
    .values({
      sessionId: owned.session.id,
      stepId,
      answer,
      skipped: false,
      locale: owned.session.locale,
    })
    .onConflictDoUpdate({
      target: [snadResponses.sessionId, snadResponses.stepId],
      set: { answer, locale: owned.session.locale, updatedAt: new Date() },
    });
  await touchSession(owned.session.id);
}

export async function resolveWrapUpResponse(input: {
  stepId: string;
  answer: Record<string, unknown> | null;
  skipped: boolean;
}): Promise<SnadSessionPayload> {
  const owned = await loadOwnedSession();
  if (!owned) throw new Error("no_session");
  if (
    owned.session.status !== "wrap_up" &&
    owned.session.status !== "completed"
  ) {
    throw new Error("step_not_active");
  }
  const validIds = new Set(wrapUpSpecsOf(owned.definition).map((spec) => spec.id));
  validIds.add(SNAD_NPS_STEP_ID);
  validIds.add(SNAD_EMAIL_STEP_ID);
  validIds.add(SNAD_SHAPE_STEP_ID);
  if (!validIds.has(input.stepId)) throw new Error("invalid_step");
  await db
    .insert(snadResponses)
    .values({
      sessionId: owned.session.id,
      stepId: input.stepId,
      answer: input.answer,
      skipped: input.skipped,
      locale: owned.session.locale,
    })
    .onConflictDoNothing();
  await touchSession(owned.session.id);
  return hydrateSession(owned.session.id, owned);
}

export async function updateSessionLocale(
  locale: SnadLocale,
): Promise<SnadSessionPayload> {
  const owned = await loadOwnedSession();
  if (!owned) throw new Error("no_session");
  if (owned.session.locale !== locale) {
    await db
      .update(snadSessions)
      .set({ locale, lastActiveAt: new Date() })
      .where(eq(snadSessions.id, owned.session.id));
  }
  return hydrateSession(owned.session.id, {
    session: { ...owned.session, locale },
    definition: owned.definition,
  });
}

export async function completeSession(): Promise<SnadSessionPayload> {
  const owned = await loadOwnedSession();
  if (!owned) throw new Error("no_session");
  const responses = await loadResponses(owned.session.id);
  const active = deriveActiveStep({
    session: owned.session,
    definition: owned.definition,
    responses,
  });
  if (active.kind !== "wrap_up" && active.kind !== "completed") {
    throw new Error("session_not_ready");
  }
  await db
    .update(snadSessions)
    .set({
      status: "completed",
      completedAt: owned.session.completedAt ?? new Date(),
      // Snapshot the language they finished in (the current, last-chosen one).
      endLocale: owned.session.locale,
      lastActiveAt: new Date(),
    })
    .where(eq(snadSessions.id, owned.session.id));
  return hydrateSession(owned.session.id, {
    session: { ...owned.session, status: "completed" },
    definition: owned.definition,
  });
}

export async function resetSession(): Promise<void> {
  const id = await readSnadSessionCookie();
  if (id) await db.delete(snadSessions).where(eq(snadSessions.id, id));
  await clearSnadSessionCookie();
}

export async function touchSession(sessionId: string): Promise<void> {
  await db
    .update(snadSessions)
    .set({ lastActiveAt: new Date() })
    .where(eq(snadSessions.id, sessionId));
}

export async function ensureChat(input: {
  sessionId: string;
  stepId: string;
  actorId: string;
  type: "topic" | "feedback" | "other";
}): Promise<ChatRow> {
  const [existing] = await db
    .select()
    .from(snadChats)
    .where(
      and(
        eq(snadChats.sessionId, input.sessionId),
        eq(snadChats.stepId, input.stepId),
        eq(snadChats.type, input.type),
      ),
    )
    .limit(1);
  if (existing) return existing;
  const [created] = await db
    .insert(snadChats)
    .values(input)
    .onConflictDoNothing()
    .returning();
  if (created) return created;
  const [raced] = await db
    .select()
    .from(snadChats)
    .where(
      and(
        eq(snadChats.sessionId, input.sessionId),
        eq(snadChats.stepId, input.stepId),
        eq(snadChats.type, input.type),
      ),
    )
    .limit(1);
  if (!raced) throw new Error("failed to create SNAD chat");
  return raced;
}

export async function loadSessionForChat() {
  const owned = await loadOwnedSession();
  if (!owned) throw new Error("no_session");
  const data = await loadSessionData(owned.session.id, owned);
  return { ...data, payload: await hydrateSession(owned.session.id, owned) };
}

export async function setSessionArchetype(
  sessionId: string,
  archetype: string,
): Promise<void> {
  await db
    .update(snadSessions)
    .set({ archetype, lastActiveAt: new Date() })
    .where(eq(snadSessions.id, sessionId));
}
