import { and, count, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  snadChats,
  snadContributions,
  snadResponses,
  snadSessions,
  snadStudyVersions,
} from "./db-schema";

import {
  buildTopicEvent,
  buildWrapUpQuestions,
  parseQuestionVerdict,
  progressStepId,
  topicStepId,
  topicTimingStepId,
} from "./sessions";
import {
  deriveProgress,
  stepIsVisible,
  wrapUpSpecsOf,
  type ParticipantProgress,
  type ProgressFacts,
} from "./progress";
import { parsePinnedStudyDefinition } from "./study";
import {
  SNAD_CLOSING_TOPIC_KEY,
  SNAD_EMAIL_STEP_ID,
  SNAD_NPS_STEP_ID,
  SNAD_QUESTION_FEEDBACK_PREFIX,
  SNAD_SHAPE_STEP_ID,
  SNAD_SKIP_TOPIC_MESSAGE,
  SNAD_WRAP_UP_PROGRESS_STEP_ID,
} from "./constants";
import type {
  SnadChatTurn,
  SnadLocale,
  SnadQuestionVerdict,
  SnadSequenceStep,
  SnadStudyDefinition,
} from "../types";

type SessionRow = typeof snadSessions.$inferSelect;

export type ParticipantStage =
  | { kind: "topic"; index: number; total: number; title: string }
  | { kind: "wrap_up" }
  | { kind: "completed" };

export type ParticipantSummary = {
  id: string;
  createdAt: Date;
  lastActiveAt: Date;
  completedAt: Date | null;
  locale: string;
  startLocale: string | null;
  endLocale: string | null;
  languageSwitched: boolean;
  canton: string | null;
  status: SessionRow["status"];
  answeredTopics: number;
  totalTopics: number;
  quoteInterviewReplies: number;
  otherChatCount: number;
  // The finale Net Promoter Score (0–10), null until the participant submits it.
  nps: number | null;
  npsComment: string | null;
  shapeSuggestion: string | null;
  activeMs: number;
  elapsedMs: number;
  stage: ParticipantStage;
  progress: ParticipantProgress;
};

export type ParticipantListing = {
  participants: ParticipantSummary[];
  totalSessions: number;
};

const PARTICIPANT_LIST_CAP = 1000;

const IDLE_GAP_CAP_MS = 30 * 60 * 1000;

function activeMsFrom(timestamps: number[]): number {
  const sorted = [...timestamps].sort((left, right) => left - right);
  return sorted.reduce(
    (active, time, index) =>
      index === 0
        ? 0
        : active + Math.min(time - sorted[index - 1]!, IDLE_GAP_CAP_MS),
    0,
  );
}

function timeOnTaskFrom(timestamps: number[]) {
  const sorted = [...timestamps].sort((left, right) => left - right);
  return (at: Date | null | undefined): number | null => {
    if (!at) return null;
    const time = at.getTime();
    const previous = sorted.reduce<number | null>(
      (latest, candidate) => (candidate < time ? candidate : latest),
      null,
    );
    if (previous === null) return null;
    const gap = time - previous;
    return gap > IDLE_GAP_CAP_MS ? null : gap;
  };
}

type ResponseFacts = {
  stepId: string;
  skipped: boolean;
  shareMore: string | null;
  nps: number | null;
  npsComment: string | null;
  shapeSuggestion: string | null;
  progressValues: unknown[] | null;
  // The `progress:wrapup` row's furthest wrap-up page marker.
  wrapUpMarker: string | null;
  locale: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type ChatFacts = {
  stepId: string;
  type: "topic" | "feedback" | "other";
  status: "active" | "completed";
  replies: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
};

function stageOf(
  definition: SnadStudyDefinition,
  session: Pick<SessionRow, "status">,
  responses: Map<string, Pick<ResponseFacts, "skipped" | "shareMore">>,
  topicChats: Map<string, Pick<ChatFacts, "status">>,
): ParticipantStage {
  if (session.status === "completed") return { kind: "completed" };
  const total = definition.topics.length;
  for (const [index, topic] of definition.topics.entries()) {
    const stepId = topicStepId(topic.key);
    const response = responses.get(stepId);
    const pendingChat =
      response &&
      !response.skipped &&
      response.shareMore === "talk" &&
      topicChats.get(stepId)?.status !== "completed";
    if (!response || pendingChat) {
      return { kind: "topic", index, total, title: topic.title };
    }
  }
  return { kind: "wrap_up" };
}

function progressFactsFrom(input: {
  definition: SnadStudyDefinition;
  responses: {
    stepId: string;
    skipped: boolean;
    shareMore: string | null;
    progressValues: unknown[] | null;
    wrapUpMarker: string | null;
  }[];
  chats: { stepId: string; type: string; status: string }[];
}): ProgressFacts {
  const wrapUpSpecIds = new Set(
    wrapUpSpecsOf(input.definition).map((spec) => spec.id),
  );
  const facts: ProgressFacts = {
    topicAnswers: new Map(),
    completedTopicChats: new Set(),
    topicPartials: new Map(),
    answeredWrapUpSpecs: new Set(),
    wrapUpMarker: null,
    reachedEmail: false,
    reachedShape: false,
    hasClosingChat: false,
    closingResolved: false,
    answeredNps: false,
  };
  input.definition.topics.forEach((topic) => {
    const answer = input.responses.find(
      (response) => response.stepId === topicStepId(topic.key),
    );
    if (answer) {
      facts.topicAnswers.set(topic.key, {
        skipped: answer.skipped,
        shareMore: answer.shareMore,
      });
    }
    const partial = input.responses.find(
      (response) => response.stepId === progressStepId(topic.key),
    );
    if (Array.isArray(partial?.progressValues)) {
      facts.topicPartials.set(topic.key, partial.progressValues);
    }
  });
  input.responses.forEach((response) => {
    if (wrapUpSpecIds.has(response.stepId)) {
      facts.answeredWrapUpSpecs.add(response.stepId);
    }
    if (response.stepId === SNAD_EMAIL_STEP_ID) facts.reachedEmail = true;
    if (response.stepId === SNAD_SHAPE_STEP_ID) facts.reachedShape = true;
    if (response.stepId === SNAD_NPS_STEP_ID) facts.answeredNps = true;
    if (response.stepId === SNAD_WRAP_UP_PROGRESS_STEP_ID) {
      facts.wrapUpMarker = response.wrapUpMarker;
    }
  });
  input.chats.forEach((chat) => {
    if (chat.type === "topic" && chat.status === "completed") {
      facts.completedTopicChats.add(chat.stepId.replace(/^topic:/, ""));
    }
    if (chat.type === "feedback") {
      facts.hasClosingChat = true;
      if (chat.status === "completed") facts.closingResolved = true;
    }
  });
  return facts;
}

export async function listParticipants(): Promise<ParticipantListing> {
  const [versions, sessions, [total]] = await Promise.all([
    db
      .select({
        id: snadStudyVersions.id,
        definition: snadStudyVersions.definition,
      })
      .from(snadStudyVersions),
    db
      .select()
      .from(snadSessions)
      .orderBy(desc(snadSessions.createdAt))
      .limit(PARTICIPANT_LIST_CAP),
    db.select({ value: count() }).from(snadSessions),
  ]);
  const definitionByVersion = new Map(
    versions.map((version) => [
      version.id,
      parsePinnedStudyDefinition(version.definition),
    ]),
  );

  const sessionIds = sessions.map((session) => session.id);
  const [responses, chats] = sessionIds.length
    ? await Promise.all([
        db
          .select({
            sessionId: snadResponses.sessionId,
            stepId: snadResponses.stepId,
            skipped: snadResponses.skipped,
            shareMore: sql<string | null>`${snadResponses.answer}->>'share_more'`,
            nps: sql<number | null>`CASE WHEN ${snadResponses.stepId} = ${SNAD_NPS_STEP_ID} THEN (${snadResponses.answer}->>'nps')::int END`,
            npsComment: sql<
              string | null
            >`CASE WHEN ${snadResponses.stepId} = ${SNAD_NPS_STEP_ID} THEN nullif(btrim(${snadResponses.answer}->>'comment'), '') END`,
            shapeSuggestion: sql<
              string | null
            >`CASE WHEN ${snadResponses.stepId} = ${SNAD_SHAPE_STEP_ID} THEN nullif(btrim(${snadResponses.answer}->>'text'), '') END`,
            progressValues: sql<
              unknown[] | null
            >`CASE WHEN ${snadResponses.stepId} LIKE 'progress:%' THEN ${snadResponses.answer}->'values' END`,
            wrapUpMarker: sql<
              string | null
            >`CASE WHEN ${snadResponses.stepId} = ${SNAD_WRAP_UP_PROGRESS_STEP_ID} THEN ${snadResponses.answer}->>'marker' END`,
            locale: snadResponses.locale,
            createdAt: snadResponses.createdAt,
            updatedAt: snadResponses.updatedAt,
          })
          .from(snadResponses)
          .where(inArray(snadResponses.sessionId, sessionIds)),
        db
          .select({
            sessionId: snadChats.sessionId,
            stepId: snadChats.stepId,
            type: snadChats.type,
            status: snadChats.status,
            replies: sql<number>`(
              SELECT count(*)::int FROM jsonb_array_elements(${snadChats.messages}) AS message
              WHERE message->>'role' = 'user'
                AND message->>'content' <> ${SNAD_SKIP_TOPIC_MESSAGE}
            )`,
            createdAt: snadChats.createdAt,
            updatedAt: snadChats.updatedAt,
            completedAt: snadChats.completedAt,
          })
          .from(snadChats)
          .where(inArray(snadChats.sessionId, sessionIds)),
      ])
    : [[], []];

  const responsesBySession = new Map<string, Map<string, ResponseFacts>>();
  responses.forEach((response) => {
    const bucket =
      responsesBySession.get(response.sessionId) ?? new Map<string, ResponseFacts>();
    bucket.set(response.stepId, response);
    responsesBySession.set(response.sessionId, bucket);
  });
  const chatsBySession = new Map<string, ChatFacts[]>();
  chats.forEach((chat) => {
    const bucket = chatsBySession.get(chat.sessionId) ?? [];
    bucket.push(chat);
    chatsBySession.set(chat.sessionId, bucket);
  });

  const participants = sessions.map((session) => {
    const definition = definitionByVersion.get(session.studyVersionId);
    if (!definition) throw new Error("SNAD session pinned to unknown version");
    const sessionResponses =
      responsesBySession.get(session.id) ?? new Map<string, ResponseFacts>();
    const sessionChats = chatsBySession.get(session.id) ?? [];
    const responseFacts = [...sessionResponses.values()];
    const topicChatsByStep = new Map(
      sessionChats
        .filter((chat) => chat.type === "topic")
        .map((chat) => [chat.stepId, chat]),
    );
    const quoteInterview = sessionChats.find((chat) => chat.type === "feedback");
    const otherChatCount = sessionChats.filter(
      (chat) => chat.type === "other" && chat.replies > 0,
    ).length;
    const answeredTopics = definition.topics.filter((topic) =>
      sessionResponses.has(topicStepId(topic.key)),
    ).length;
    const primaryLocale = session.startLocale ?? session.locale;
    const languageSwitched =
      (session.startLocale != null &&
        session.endLocale != null &&
        session.startLocale !== session.endLocale) ||
      responseFacts.some(
        (response) =>
          response.locale != null && response.locale !== primaryLocale,
      );
    const activityTimes = [
      session.createdAt,
      ...responseFacts.flatMap((response) => [
        response.createdAt,
        response.updatedAt,
      ]),
      ...sessionChats.flatMap((chat) => [
        chat.createdAt,
        chat.updatedAt,
        chat.completedAt,
      ]),
      session.completedAt,
    ]
      .filter((value): value is Date => value != null)
      .map((value) => value.getTime());
    const elapsedEnd = session.completedAt ?? session.lastActiveAt;
    return {
      id: session.id,
      createdAt: session.createdAt,
      lastActiveAt: session.lastActiveAt,
      completedAt: session.completedAt,
      locale: session.locale,
      startLocale: session.startLocale,
      endLocale: session.endLocale,
      languageSwitched,
      canton: session.canton,
      status: session.status,
      answeredTopics,
      totalTopics: definition.topics.length,
      quoteInterviewReplies: quoteInterview?.replies ?? 0,
      otherChatCount,
      nps: sessionResponses.get(SNAD_NPS_STEP_ID)?.nps ?? null,
      npsComment: sessionResponses.get(SNAD_NPS_STEP_ID)?.npsComment ?? null,
      shapeSuggestion:
        sessionResponses.get(SNAD_SHAPE_STEP_ID)?.shapeSuggestion ?? null,
      activeMs: activeMsFrom(activityTimes),
      elapsedMs: Math.max(0, elapsedEnd.getTime() - session.createdAt.getTime()),
      stage: stageOf(definition, session, sessionResponses, topicChatsByStep),
      progress: deriveProgress(
        definition,
        progressFactsFrom({ definition, responses: responseFacts, chats: sessionChats }),
        (topicKey) =>
          buildTopicEvent(
            definition,
            session.id,
            topicKey,
            session.locale as SnadLocale,
            session.studyVersionId,
          ).steps,
      ),
    };
  });

  return { participants, totalSessions: total?.value ?? 0 };
}

export type JourneyStep = {
  step: SnadSequenceStep;
  number: number;
  // The page they stopped on: the last thing this participant saw.
  droppedHere: boolean;
  answer: unknown;
  // The MCQ "Other…" assist chat for this question, if the participant used it.
  otherChat: SnadChatTurn[];
  feedback: SnadQuestionVerdict | null;
  answeredAt: Date | null;
  durationMs: number | null;
};

export type JourneyTopic = {
  key: string;
  title: string;
  state: "answered" | "skipped" | "dropped_here" | "not_reached";
  steps: JourneyStep[];
  shareMore: "talk" | "skip" | null;
  chat: SnadChatTurn[];
  chatStatus: "active" | "completed" | null;
  answeredAt: Date | null;
  answeredLocale: string | null;
  durationMs: number | null;
};

export type JourneyWrapUpAnswer = {
  step: SnadSequenceStep;
  number: number;
  droppedHere: boolean;
  answer: unknown;
  otherChat: SnadChatTurn[];
  answeredAt: Date | null;
  // Genuinely per-question here: every wrap-up question owns its own row.
  durationMs: number | null;
};

export type ParticipantJourney = {
  session: {
    id: string;
    status: SessionRow["status"];
    locale: string;
    startLocale: string | null;
    endLocale: string | null;
    canton: string | null;
    createdAt: Date;
    lastActiveAt: Date;
    completedAt: Date | null;
    activeMs: number;
    elapsedMs: number;
    archetype: string | null;
  };
  stage: ParticipantStage;
  progress: ParticipantProgress;
  versionLabel: string;
  topics: JourneyTopic[];
  wrapUpAnswers: JourneyWrapUpAnswer[];
  nps: { score: number; comment: string | null } | null;
  shapeSuggestion: string | null;
  quoteInterview: SnadChatTurn[];
  closingQuote: {
    text: string;
    status: "approved" | "pending" | "hidden";
    canton: string | null;
    locale: string;
    featured: boolean;
    createdAt: Date;
  } | null;
  // Results-email opt-in — personal data, surfaced in the detail view only.
  email: string | null;
};

function visibleTurns(messages: SnadChatTurn[]): SnadChatTurn[] {
  return messages.filter((turn) => turn.content !== SNAD_SKIP_TOPIC_MESSAGE);
}

function checkpointAnswers(
  steps: SnadSequenceStep[],
  checkpoint: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const values = Array.isArray(checkpoint?.values) ? checkpoint.values : null;
  if (!values) return {};
  return steps.reduce<Record<string, unknown>>((answers, step, index) => {
    if (step.kind !== "share_more" && values[index] != null) {
      answers[step.question] = values[index];
    }
    return answers;
  }, {});
}

function stepWasShown(
  steps: SnadSequenceStep[],
  answers: Record<string, unknown>,
  step: SnadSequenceStep,
): boolean {
  if (step.kind === "share_more") return true;
  const values = steps.reduce((byOpener, candidate) => {
    if (candidate.kind !== "share_more" && candidate.opener_id) {
      byOpener.set(candidate.opener_id, answers[candidate.question]);
    }
    return byOpener;
  }, new Map<string, unknown>());
  return stepIsVisible(step, steps, values);
}

export async function loadParticipantJourney(
  sessionId: string,
): Promise<ParticipantJourney | null> {
  const [row] = await db
    .select({
      session: snadSessions,
      definition: snadStudyVersions.definition,
      versionLabel: snadStudyVersions.label,
    })
    .from(snadSessions)
    .innerJoin(
      snadStudyVersions,
      eq(snadStudyVersions.id, snadSessions.studyVersionId),
    )
    .where(eq(snadSessions.id, sessionId))
    .limit(1);
  if (!row) return null;
  const definition = parsePinnedStudyDefinition(row.definition);
  const [responses, chats, closingQuoteRow] = await Promise.all([
    db
      .select()
      .from(snadResponses)
      .where(eq(snadResponses.sessionId, sessionId)),
    db.select().from(snadChats).where(eq(snadChats.sessionId, sessionId)),
    db
      .select({
        text: snadContributions.text,
        status: snadContributions.status,
        canton: snadContributions.canton,
        locale: snadContributions.locale,
        featured: snadContributions.featured,
        createdAt: snadContributions.createdAt,
      })
      .from(snadContributions)
      .where(
        and(
          eq(snadContributions.sessionId, sessionId),
          eq(snadContributions.topicKey, SNAD_CLOSING_TOPIC_KEY),
        ),
      )
      .limit(1),
  ]);
  const responseByStep = new Map(
    responses.map((response) => [response.stepId, response]),
  );
  const chatByStep = new Map(
    chats.filter((chat) => chat.type === "topic").map((chat) => [chat.stepId, chat]),
  );
  const otherChatByOpener = new Map(
    chats
      .filter((chat) => chat.type === "other")
      .map((chat) => [
        chat.stepId.replace(/^other:/, ""),
        visibleTurns(chat.messages),
      ]),
  );
  const otherChatFor = (step: SnadSequenceStep): SnadChatTurn[] =>
    (step.opener_id && otherChatByOpener.get(step.opener_id)) || [];
  const feedbackByOpener = new Map(
    responses.flatMap((response) => {
      if (!response.stepId.startsWith(SNAD_QUESTION_FEEDBACK_PREFIX)) return [];
      return [
        [
          response.stepId.slice(SNAD_QUESTION_FEEDBACK_PREFIX.length),
          parseQuestionVerdict(response.answer),
        ],
      ];
    }),
  );
  const feedbackFor = (step: SnadSequenceStep): SnadQuestionVerdict | null =>
    (step.opener_id && feedbackByOpener.get(step.opener_id)) || null;
  const topicEventFor = (topicKey: string) =>
    buildTopicEvent(
      definition,
      row.session.id,
      topicKey,
      row.session.locale as SnadLocale,
    );
  const stage = stageOf(
    definition,
    row.session,
    new Map(
      responses.map((response) => [
        response.stepId,
        {
          skipped: response.skipped,
          shareMore:
            typeof response.answer?.share_more === "string"
              ? response.answer.share_more
              : null,
        },
      ]),
    ),
    new Map(
      chats
        .filter((chat) => chat.type === "topic")
        .map((chat) => [
          chat.stepId,
          {
            status: chat.status,
          },
        ]),
    ),
  );

  const progress = deriveProgress(
    definition,
    progressFactsFrom({
      definition,
      responses: responses.map((response) => ({
        stepId: response.stepId,
        skipped: response.skipped,
        shareMore:
          typeof response.answer?.share_more === "string"
            ? response.answer.share_more
            : null,
        progressValues: Array.isArray(response.answer?.values)
          ? response.answer.values
          : null,
        wrapUpMarker:
          typeof response.answer?.marker === "string"
            ? response.answer.marker
            : null,
      })),
      chats,
    }),
    (topicKey) => topicEventFor(topicKey).steps,
  );

  const activityTimes = [
    row.session.createdAt,
    ...responses.flatMap((response) => [
      response.createdAt,
      response.updatedAt,
    ]),
    ...chats.flatMap((chat) => [
      chat.createdAt,
      chat.updatedAt,
      chat.completedAt,
    ]),
    row.session.completedAt,
  ]
    .filter((value): value is Date => value != null)
    .map((value) => value.getTime());

  const questionTimesFor = (topicKey: string): (Date | null)[] => {
    const answer =
      responseByStep.get(topicTimingStepId(topicKey))?.answer ??
      responseByStep.get(progressStepId(topicKey))?.answer;
    const times = Array.isArray(answer?.times) ? answer.times : [];
    return times.map((value) =>
      typeof value === "string" && !Number.isNaN(Date.parse(value))
        ? new Date(value)
        : null,
    );
  };
  const timeOnTask = timeOnTaskFrom([
    ...activityTimes,
    ...definition.topics.flatMap((topic) =>
      questionTimesFor(topic.key)
        .filter((value): value is Date => value != null)
        .map((value) => value.getTime()),
    ),
  ]);

  const topics = definition.topics.map((topic, index): JourneyTopic => {
    const stepId = topicStepId(topic.key);
    const response = responseByStep.get(stepId);
    const chat = chatByStep.get(stepId) ?? null;
    const event = topicEventFor(topic.key);
    const answers =
      response?.answer && typeof response.answer.answers === "object"
        ? (response.answer.answers as Record<string, unknown>)
        : checkpointAnswers(
            event.steps,
            responseByStep.get(progressStepId(topic.key))?.answer,
          );
    const shareMoreRaw = response?.answer?.share_more;
    const shareMore =
      shareMoreRaw === "talk" || shareMoreRaw === "skip" ? shareMoreRaw : null;
    const droppedHere =
      row.session.status !== "completed" &&
      stage.kind === "topic" &&
      stage.index === index;
    const state = response
      ? response.skipped
        ? "skipped"
        : droppedHere
          ? "dropped_here"
          : "answered"
      : droppedHere
        ? "dropped_here"
        : "not_reached";
    const questionTimes = questionTimesFor(topic.key);
    const steps: JourneyStep[] = event.steps
      .flatMap((step, stepIndex) =>
        step.kind === "share_more" ? [] : [{ step, number: stepIndex + 1 }],
      )
      .filter(
        ({ step }) =>
          answers[step.question] != null ||
          stepWasShown(event.steps, answers, step),
      )
      .map(({ step, number }) => {
        const answeredAt = questionTimes[number - 1] ?? null;
        return {
          step,
          number,
          droppedHere:
            progress.step.groupKey === topic.key &&
            progress.step.number === number,
          answer: answers[step.question] ?? null,
          otherChat: otherChatFor(step),
          feedback: feedbackFor(step),
          answeredAt,
          durationMs: timeOnTask(answeredAt),
        };
      });
    const perQuestionMs = steps
      .map((entry) => entry.durationMs)
      .filter((value): value is number => value != null);
    return {
      key: topic.key,
      title: topic.title,
      state,
      steps,
      shareMore,
      chat: chat ? visibleTurns(chat.messages) : [],
      chatStatus: chat?.status ?? null,
      answeredAt: response?.createdAt ?? null,
      answeredLocale: response?.locale ?? null,
      durationMs: perQuestionMs.length
        ? perQuestionMs.reduce((total, value) => total + value, 0)
        : timeOnTask(response?.createdAt),
    };
  });

  const wrapUpAnswers = buildWrapUpQuestions(
    definition,
    row.session.locale as SnadLocale,
  ).map((step, index): JourneyWrapUpAnswer => {
    const response = step.opener_id
      ? responseByStep.get(step.opener_id)
      : undefined;
    return {
      step,
      number: index + 1,
      droppedHere:
        progress.step.phase === "wrap_up" && progress.step.number === index + 1,
      answer: response?.answer ?? null,
      otherChat: otherChatFor(step),
      answeredAt: response?.createdAt ?? null,
      durationMs: timeOnTask(response?.createdAt),
    };
  });

  const npsAnswer = responseByStep.get(SNAD_NPS_STEP_ID)?.answer;
  const nps =
    npsAnswer && typeof npsAnswer.nps === "number"
      ? {
          score: npsAnswer.nps,
          comment:
            typeof npsAnswer.comment === "string" ? npsAnswer.comment : null,
        }
      : null;
  const shapeAnswer = responseByStep.get(SNAD_SHAPE_STEP_ID)?.answer;
  const shapeSuggestion =
    typeof shapeAnswer?.text === "string" && shapeAnswer.text.trim().length > 0
      ? shapeAnswer.text.trim()
      : null;
  const emailAnswer = responseByStep.get(SNAD_EMAIL_STEP_ID)?.answer;
  const email =
    emailAnswer && typeof emailAnswer.email === "string"
      ? emailAnswer.email
      : null;

  const elapsedEnd = row.session.completedAt ?? row.session.lastActiveAt;

  return {
    session: {
      id: row.session.id,
      status: row.session.status,
      locale: row.session.locale,
      startLocale: row.session.startLocale,
      endLocale: row.session.endLocale,
      canton: row.session.canton,
      createdAt: row.session.createdAt,
      lastActiveAt: row.session.lastActiveAt,
      completedAt: row.session.completedAt,
      activeMs: activeMsFrom(activityTimes),
      elapsedMs: Math.max(
        0,
        elapsedEnd.getTime() - row.session.createdAt.getTime(),
      ),
      archetype: row.session.archetype,
    },
    stage,
    progress,
    versionLabel: row.versionLabel,
    topics,
    wrapUpAnswers,
    nps,
    shapeSuggestion,
    quoteInterview: visibleTurns(
      chats.find((chat) => chat.type === "feedback")?.messages ?? [],
    ),
    closingQuote: closingQuoteRow[0] ?? null,
    email,
  };
}
