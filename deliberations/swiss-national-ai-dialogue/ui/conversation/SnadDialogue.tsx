"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, MotionConfig } from "motion/react";

import {
  identifyCanton,
  trackDialogueCompleted,
  trackDialogueStarted,
  trackErrorShown,
  trackOnboardingCompleted,
  trackQuestionAnswered,
  trackReachedWrapUp,
  trackRetryClicked,
  trackTopicCompleted,
} from "../../analytics";

import { SnadConfetti } from "./SnadConfetti";
import {
  SnadProgressNav,
  SnadSectionMenu,
  type SnadNavSegments,
} from "./SnadProgressNav";
import { SnadStoryNav } from "./SnadStoryNav";
import {
  OPENER_AUTO_ADVANCE_MS,
  StepCard,
  SwissOpenerSequenceCard,
} from "../cards/SwissOpenerSequenceCard";
import {
  initialSequenceProgress,
  resolvedSequencePages,
  stepCardAnswer,
  stepValue,
} from "../cards/sequence-steps";
import {
  QuestionFeedbackProvider,
  QuestionNote,
  QuestionThumbs,
} from "../cards/question-feedback";
import { SwissTopicIntro } from "../cards/SwissTopicIntro";
import { SwissEndConfirmCard } from "../end-flow/SwissEndConfirmCard";
import { SwissHero } from "../landing/SwissHero";
import { SnadStartGate } from "../onboarding/SnadStartGate";
import {
  STAGE_TITLES,
  TOPIC_INTROS,
  useSwissDict,
  useSwissLocale,
} from "../../i18n";
import { usePausableHold } from "../use-pausable-hold";
import type {
  CardStepProgress,
  SnadOnboarding,
  SnadSessionPayload,
} from "../../types";

const SLUG = "swiss-national-ai-dialogue";

function isUnansweredValue(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    (typeof value === "object" &&
      (value as { skipped?: unknown }).skipped === true)
  );
}

export function SnadDialogue({
  initialSession,
  participantCount,
  onboarding,
  active,
  onHome,
  onSessionUpdate,
}: {
  initialSession: SnadSessionPayload | null;
  participantCount: number;
  onboarding: SnadOnboarding;
  active: boolean;
  onHome: () => void;
  onSessionUpdate: (session: SnadSessionPayload) => void;
}) {
  const locale = useSwissLocale();
  const dict = useSwissDict();
  const [session, setSession] = useState(initialSession);
  const [demographics, setDemographics] = useState<Record<string, string>>(
    initialSession?.canton ? { canton: initialSession.canton } : {},
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [stepProgress, setStepProgress] = useState<CardStepProgress | null>(
    () =>
      initialSession?.activeStep.kind === "topic"
        ? initialSequenceProgress(
            initialSession.activeStep.event,
            initialSession.activeStep.partial,
            initialSession.locale,
          )
        : null,
  );
  const [viewedKey, setViewedKey] = useState<string | null>(null);
  const [livePeek, setLivePeek] = useState<number | null>(null);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [advanceSignal, setAdvanceSignal] = useState(0);
  const [confettiBurst, setConfettiBurst] = useState(0);
  const completionsSeededRef = useRef(false);
  const turnCountRef = useRef(0);
  const interactionStartedRef = useRef(initialSession !== null);
  const endedTrackedRef = useRef(initialSession?.status === "completed");
  const completedTopicsRef = useRef<Set<string>>(new Set());
  const reachedWrapUpRef = useRef(false);
  const applySession = useCallback(
    (next: SnadSessionPayload) => {
      setSession(next);
      setLivePeek(null);
      setError(null);
      onSessionUpdate(next);
    },
    [onSessionUpdate],
  );

  const selectSection = useCallback((key: string | null) => {
    setViewedKey(key);
    setReviewIndex(0);
    setLivePeek(null);
  }, []);

  // Fire-and-forget mid-topic checkpoint — resume fidelity, never a gate.
  const saveProgress = useCallback(
    (values: unknown[]) => {
      if (!session || session.activeStep.kind !== "topic") return;
      void fetch("/api/snad/session", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operation: "progress",
          topic_key: session.activeStep.topicKey,
          values,
        }),
      }).catch(() => {});
    },
    [session],
  );

  const startedTrackedRef = useRef(false);
  useEffect(() => {
    if (!active || startedTrackedRef.current) return;
    startedTrackedRef.current = true;
    trackDialogueStarted({ campaignSlug: SLUG, resumed: initialSession !== null });
  }, [active, initialSession]);

  const noteInteraction = useCallback(() => {
    interactionStartedRef.current = true;
    turnCountRef.current += 1;
  }, []);

  useEffect(() => {
    if (!session || locale === session.locale) return;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/snad/session", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ operation: "locale", locale }),
        });
        if (!response.ok) return;
        const { session: next } = (await response.json()) as {
          session: SnadSessionPayload;
        };
        if (!cancelled && next) applySession(next);
      } catch {
        // best-effort: chrome already switched; cards catch up on next hydrate.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [locale, session, applySession]);

  useEffect(() => {
    if (!session) return;
    const seeding = !completionsSeededRef.current;
    completionsSeededRef.current = true;
    let liveCompletion = false;
    session.topics.forEach((topic, index) => {
      if (
        topic.state !== "done" ||
        completedTopicsRef.current.has(topic.key)
      ) {
        return;
      }
      completedTopicsRef.current.add(topic.key);
      if (!seeding) liveCompletion = true;
      trackTopicCompleted({
        campaignSlug: SLUG,
        topicIndex: index + 1,
        topicKey: topic.key,
      });
    });
    if (liveCompletion) setConfettiBurst((value) => value + 1);
    const wrapping =
      session.activeStep.kind === "wrap_up" ||
      session.activeStep.kind === "completed";
    if (wrapping && !reachedWrapUpRef.current) {
      reachedWrapUpRef.current = true;
      trackReachedWrapUp({ campaignSlug: SLUG });
    }
  }, [session]);

  useEffect(() => {
    const trackAbandonment = () => {
      if (
        !session ||
        session.status === "completed" ||
        !interactionStartedRef.current ||
        endedTrackedRef.current
      ) {
        return;
      }
      endedTrackedRef.current = true;
      trackDialogueCompleted({
        campaignSlug: SLUG,
        reason: "abandoned",
        topicsDone: completedTopicsRef.current.size,
        interactions: turnCountRef.current,
      });
    };
    window.addEventListener("beforeunload", trackAbandonment);
    return () => window.removeEventListener("beforeunload", trackAbandonment);
  }, [session]);

  const startSession = useCallback(async () => {
    if (session || saving) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/snad/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          canton: demographics.canton ?? null,
        }),
      });
      const data = (await response.json()) as {
        session?: SnadSessionPayload;
        error?: string;
      };
      if (!response.ok || !data.session) throw new Error(data.error);
      applySession(data.session);
    } catch {
      setError(dict.errorRetry.message);
      trackErrorShown({ campaignSlug: SLUG, source: "start" });
    } finally {
      setSaving(false);
    }
  }, [applySession, demographics, dict.errorRetry.message, locale, saving, session]);

  const answerCurrentTopic = useCallback(
    async (answer: Record<string, unknown>) => {
      if (!session || session.activeStep.kind !== "topic" || saving) return;
      noteInteraction();
      setSaving(true);
      setError(null);
      try {
        const response = await fetch("/api/snad/session", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            operation: "answer",
            response: {
              step_id: `topic:${session.activeStep.topicKey}`,
              answer,
              skipped: false,
            },
          }),
        });
        const data = (await response.json()) as {
          session?: SnadSessionPayload;
          error?: string;
        };
        if (!response.ok || !data.session) throw new Error(data.error);
        setStepProgress(null);
        applySession(data.session);
      } catch {
        setError(dict.errorRetry.message);
        trackErrorShown({ campaignSlug: SLUG, source: "card" });
      } finally {
        setSaving(false);
      }
    },
    [applySession, dict.errorRetry.message, noteInteraction, saving, session],
  );

  const amendReviewedAnswer = useCallback(
    async (topicKey: string, question: string, value: unknown) => {
      if (saving) return;
      setSaving(true);
      setError(null);
      try {
        const response = await fetch("/api/snad/session", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            operation: "amend",
            topic_key: topicKey,
            question,
            value,
          }),
        });
        const data = (await response.json()) as {
          session?: SnadSessionPayload;
          error?: string;
        };
        if (!response.ok || !data.session) throw new Error(data.error);
        applySession(data.session);
      } catch {
        setError(dict.errorRetry.message);
        trackErrorShown({ campaignSlug: SLUG, source: "card" });
      } finally {
        setSaving(false);
      }
    },
    [applySession, dict.errorRetry.message, saving],
  );

  const complete = useCallback(async () => {
    if (!session || saving) return;
    setSaving(true);
    try {
      const response = await fetch("/api/snad/session", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operation: "complete" }),
      });
      const data = (await response.json()) as { session?: SnadSessionPayload };
      if (!response.ok || !data.session) throw new Error("complete_failed");
      applySession(data.session);
      if (!endedTrackedRef.current) {
        endedTrackedRef.current = true;
        trackDialogueCompleted({
          campaignSlug: SLUG,
          reason: "natural",
          topicsDone: completedTopicsRef.current.size,
          interactions: turnCountRef.current,
        });
      }
    } catch {
      setError(dict.errorRetry.message);
      trackErrorShown({ campaignSlug: SLUG, source: "end" });
    } finally {
      setSaving(false);
    }
  }, [applySession, dict.errorRetry.message, saving, session]);

  const localizedTopics = session?.topics.map((topic) => ({
    ...topic,
    title: STAGE_TITLES[session.locale]?.[topic.key] ?? topic.title,
  }));

  const activeStep = session?.activeStep;
  const reviewedTopic =
    viewedKey !== null
      ? (session?.topics.find((topic) => topic.key === viewedKey) ?? null)
      : null;
  const reviewPages = reviewedTopic?.answer
    ? resolvedSequencePages(reviewedTopic.event, reviewedTopic.answer)
    : [];
  const reviewIntroOffset =
    reviewedTopic && session && STAGE_TITLES[session.locale]?.[reviewedTopic.key]
      ? 1
      : 0;
  const reviewTotal = reviewPages.length + reviewIntroOffset;
  const reviewShown = Math.min(reviewIndex, Math.max(reviewTotal - 1, 0));
  const reviewQuestion =
    reviewedTopic && reviewShown >= reviewIntroOffset
      ? reviewPages[reviewShown - reviewIntroOffset]
      : undefined;
  const reviewAnswerable =
    reviewedTopic !== null &&
    reviewQuestion !== undefined &&
    isUnansweredValue(reviewQuestion.value);

  usePausableHold({
    onDone: () => setReviewIndex(reviewShown + 1),
    ms: OPENER_AUTO_ADVANCE_MS,
    armed:
      reviewedTopic !== null && reviewShown < reviewTotal - 1 && !reviewAnswerable,
    paused: false,
    resetKey: `${viewedKey}:${reviewShown}`,
  });
  const wrapping =
    activeStep?.kind === "wrap_up" || activeStep?.kind === "completed";
  const wrapUpAtFinale =
    wrapping && stepProgress !== null && stepProgress.current >= stepProgress.total;
  const segments: SnadNavSegments | null =
    reviewedTopic && reviewTotal > 0
      ? {
          total: reviewTotal,
          done: reviewShown,
          active: reviewShown,
          countdown:
            !reviewAnswerable && reviewShown < reviewTotal - 1
              ? "running"
              : "idle",
          viewed: null,
        }
      : viewedKey === null && stepProgress
        ? livePeek !== null
          ? {
              total: stepProgress.total,
              done: livePeek,
              active: livePeek,
              countdown: "idle",
              viewed: livePeek,
            }
          : {
              total: stepProgress.total,
              done: wrapUpAtFinale ? stepProgress.total : stepProgress.current - 1,
              active: wrapUpAtFinale ? null : stepProgress.current - 1,
              countdown: stepProgress.answered ? "running" : "idle",
              viewed: null,
              ...(stepProgress.fillMs ? { fillMs: stepProgress.fillMs } : {}),
            }
        : null;

  const storyActive =
    active &&
    (viewedKey !== null ||
      activeStep?.kind === "topic" ||
      (wrapping && Boolean(stepProgress?.navigable)));
  const storyCanBack =
    viewedKey !== null
      ? reviewIndex > 0
      : stepProgress
        ? (livePeek ?? stepProgress.current - 1) > 0
        : false;
  const storyCanForward =
    viewedKey !== null || livePeek !== null || Boolean(stepProgress?.answered);
  const storyBack = () => {
    if (viewedKey !== null) {
      if (reviewIndex > 0) setReviewIndex(reviewIndex - 1);
      return;
    }
    if (!stepProgress) return;
    const from = livePeek ?? stepProgress.current - 1;
    if (from <= 0) return;
    setLivePeek(from - 1);
  };
  const storyForward = () => {
    if (viewedKey !== null) {
      if (reviewIndex < reviewTotal - 1) setReviewIndex(reviewIndex + 1);
      else selectSection(null);
      return;
    }
    if (!stepProgress) return;
    if (livePeek !== null) {
      const activeIdx = stepProgress.current - 1;
      setLivePeek(livePeek + 1 < activeIdx ? livePeek + 1 : null);
      return;
    }
    if (stepProgress.answered) setAdvanceSignal((value) => value + 1);
  };
  const storyResume =
    viewedKey !== null
      ? reviewAnswerable
        ? null
        : () => selectSection(null)
      : livePeek !== null &&
          !(stepProgress?.skipped?.includes(livePeek) ?? false)
        ? () => setLivePeek(null)
        : null;

  return (
    <MotionConfig reducedMotion="user">
      <main>
        {confettiBurst > 0 && <SnadConfetti key={confettiBurst} />}
        <SwissHero
          slug={SLUG}
          interviewCount={participantCount}
          inInterview
          onHome={onHome}
          headerExtra={
            session && localizedTopics ? (
              <SnadSectionMenu
                topics={localizedTopics}
                wrapUpLabel={dict.ack.wrapUpTab}
                viewedKey={viewedKey}
                onSelect={selectSection}
                segments={segments}
                completed={wrapUpAtFinale}
              />
            ) : undefined
          }
        >
          {session && localizedTopics ? (
            <QuestionFeedbackProvider initial={session.questionFeedback}>
            <div className="flex min-h-[calc(100svh-var(--chat-sticky-top))] w-full flex-col">
              <div className="bg-background/80 sticky top-[var(--chat-sticky-top,0px)] z-30 ml-[calc(50%-50vw)] w-screen backdrop-blur-md transition-[top] duration-300 ease-out motion-reduce:transition-none">
                <SnadProgressNav
                  topics={localizedTopics}
                  wrapUpLabel={dict.ack.wrapUpTab}
                  viewedKey={viewedKey}
                  segments={segments}
                  completed={wrapUpAtFinale}
                />
              </div>
              <SnadStoryNav
                enabled={storyActive}
                canBack={storyCanBack}
                canForward={storyCanForward}
                onBack={storyBack}
                onForward={storyForward}
                onResume={storyResume}
                className="flex flex-1 flex-col gap-5 pb-8 pt-6"
              >
                {viewedKey && (
                  <ReadOnlyTopic
                    session={session}
                    topicKey={viewedKey}
                    page={reviewShown}
                    onAmend={(question, value) =>
                      void amendReviewedAnswer(viewedKey, question, value)
                    }
                  />
                )}
                <div className={viewedKey ? "hidden" : "contents"}>
                  <LiveStep
                    session={session}
                    saving={saving}
                    onSession={applySession}
                    onAnswer={answerCurrentTopic}
                    onComplete={complete}
                    onStepProgress={setStepProgress}
                    onPartialSave={saveProgress}
                    peek={livePeek}
                    advanceSignal={advanceSignal}
                    paused={viewedKey !== null}
                    onHome={onHome}
                    onError={(message) => {
                      setError(message);
                      trackErrorShown({
                        campaignSlug: SLUG,
                        source: "card",
                      });
                    }}
                  />
                </div>
                {error && (
                  <p className="text-muted-foreground mx-auto w-full max-w-[34rem] text-sm">
                    {error}
                  </p>
                )}
              </SnadStoryNav>
            </div>
            </QuestionFeedbackProvider>
          ) : (
            <div className="flex min-h-[calc(100svh-var(--chat-sticky-top,0px))] w-full flex-col items-center justify-center py-10">
              <div className="w-full max-w-xl">
                <SnadStartGate
                  onboarding={onboarding}
                  saved={demographics}
                  onPicked={(canton) => {
                    identifyCanton(canton);
                    setDemographics((current) => ({ ...current, canton }));
                  }}
                  onBegin={() => {
                    trackOnboardingCompleted(SLUG);
                    void startSession();
                  }}
                />
                {error && (
                  <p className="text-muted-foreground mt-4 text-center text-sm">
                    {dict.errorRetry.message}{" "}
                    <button
                      type="button"
                      onClick={() => {
                        trackRetryClicked(SLUG);
                        void startSession();
                      }}
                      className="text-primary font-semibold underline underline-offset-2"
                    >
                      {dict.errorRetry.retry}
                    </button>
                  </p>
                )}
              </div>
            </div>
          )}
        </SwissHero>
      </main>
    </MotionConfig>
  );
}

function LiveStep({
  session,
  saving,
  onSession,
  onAnswer,
  onComplete,
  onStepProgress,
  onPartialSave,
  peek,
  advanceSignal,
  paused,
  onHome,
  onError,
}: {
  session: SnadSessionPayload;
  saving: boolean;
  onSession: (session: SnadSessionPayload) => void;
  onAnswer: (answer: Record<string, unknown>) => void;
  onComplete: () => void;
  onStepProgress: (progress: CardStepProgress | null) => void;
  onPartialSave: (values: unknown[]) => void;
  peek: number | null;
  advanceSignal: number;
  paused: boolean;
  onHome: () => void;
  onError: (error: string) => void;
}) {
  if (session.activeStep.kind === "topic") {
    const activeKey = session.activeStep.topicKey;
    const topicIndex =
      session.topics.findIndex((topic) => topic.key === activeKey) + 1;
    return (
      <div className="my-auto w-full">
        <SwissOpenerSequenceCard
          key={session.activeStep.event.tool_use_id}
          event={session.activeStep.event}
          answer={null}
          onAnswer={onAnswer}
          fail={onError}
          onStepProgress={onStepProgress}
          readOnly={saving}
          topicIndex={topicIndex > 0 ? topicIndex : undefined}
          topicCount={session.topics.length}
          partial={session.activeStep.partial}
          onPartialSave={onPartialSave}
          peek={peek}
          advanceSignal={advanceSignal}
          paused={paused}
        />
      </div>
    );
  }
  return (
    <div className="flex w-full flex-1 flex-col">
      <SwissEndConfirmCard
        event={{
          type: "awaiting_end_confirmation",
          idea_summary: "",
          worry_summary: "",
          summary: "",
        }}
        disabled={saving}
        submitted={session.activeStep.kind === "completed"}
        slug={SLUG}
        onSubmit={() => onComplete()}
        session={session}
        onSession={onSession}
        onStepProgress={onStepProgress}
        onHome={onHome}
        peek={peek}
        paused={paused}
        advanceSignal={advanceSignal}
      />
    </div>
  );
}

function ReadOnlyTopic({
  session,
  topicKey,
  page,
  onAmend,
}: {
  session: SnadSessionPayload;
  topicKey: string;
  page: number;
  onAmend: (question: string, value: unknown) => void;
}) {
  const topic = session.topics.find((candidate) => candidate.key === topicKey);
  const pages = topic?.answer
    ? resolvedSequencePages(topic.event, topic.answer)
    : [];
  const topicTitle = topic
    ? (STAGE_TITLES[session.locale]?.[topic.key] ?? topic.title)
    : undefined;
  const introOffset =
    topic && STAGE_TITLES[session.locale]?.[topic.key] ? 1 : 0;
  const introCopy = topic
    ? (TOPIC_INTROS[session.locale]?.[topic.key] ?? TOPIC_INTROS.en[topic.key])
    : undefined;
  const total = topic ? pages.length + introOffset : 0;
  const shown = total > 0 ? Math.min(page, total - 1) : 0;
  const showingIntro = introOffset === 1 && shown === 0;
  const question = showingIntro ? undefined : pages[shown - introOffset];

  if (!topic || !topic.answer || total === 0) return null;
  return (
    <motion.div
      key={shown}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="my-auto flex w-full flex-col gap-3"
    >
      {showingIntro && topicTitle ? (
        <SwissTopicIntro
          title={topicTitle}
          topicKey={topic.event.theme}
          about={introCopy?.about}
          purpose={introCopy?.purpose}
          mode="static"
        />
      ) : question ? (
        isUnansweredValue(question.value) ? (
          <>
            <StepCard
              step={question.step}
              index={question.index}
              event={topic.event}
              answer={null}
              onAnswer={(result) => {
                trackQuestionAnswered({
                  campaignSlug: SLUG,
                  theme: topic.event.theme ?? "",
                  openerId: question.step.opener_id ?? null,
                  kind: question.step.kind === "question" ? "mcq" : question.step.kind,
                });
                onAmend(question.step.question, stepValue(question.step, result));
              }}
              autoCommit
              actionsLead={
                <QuestionThumbs step={question.step} theme={topic.event.theme} />
              }
              fail={() => {}}
            />
            <QuestionNote step={question.step} theme={topic.event.theme} />
          </>
        ) : (
          <>
            <StepCard
              step={question.step}
              index={question.index}
              event={topic.event}
              answer={stepCardAnswer(question.step, question.value)}
              onAnswer={() => {}}
              readOnly
              revealPolls
              actionsLead={
                <QuestionThumbs step={question.step} theme={topic.event.theme} />
              }
              fail={() => {}}
            />
            <QuestionNote step={question.step} theme={topic.event.theme} />
          </>
        )
      ) : null}
    </motion.div>
  );
}
