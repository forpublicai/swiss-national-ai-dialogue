"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "@/components/ui";

import type {
  AwaitingEventOf,
  CardRenderProps,
  OpenerResponseKind,
} from "../../types";
import { SwissBinaryChoiceCard } from "./SwissBinaryChoiceCard";
import { SwissBudgetCard } from "./SwissBudgetCard";
import { SwissContinuousSliderCard } from "./SwissContinuousSliderCard";
import { SwissCard, SwissOpenerLead } from "./SwissCardChrome";
import { SwissRankingCard } from "./SwissRankingCard";
import { SwissTopicIntro } from "./SwissTopicIntro";
import { SwissUserQuestionCard } from "./SwissUserQuestionCard";
import { QuestionNote, QuestionThumbs } from "./question-feedback";
import { useOpenerPollSettled } from "./use-opener-poll";
import {
  firstUnansweredIndex,
  isStepVisible,
  liveValueByOpenerId,
  seededStepAnswers,
  stepCardAnswer,
  stepValue,
  type AuthoredStep,
  type StepAnswer,
} from "./sequence-steps";
import {
  fill,
  STAGE_TITLES,
  TOPIC_INTROS,
  useSwissDict,
  useSwissLocale,
} from "../../i18n";
import { trackQuestionSkipped } from "../../analytics";
import { usePausableHold } from "../use-pausable-hold";

const SLUG = "swiss-national-ai-dialogue";

const EASE = [0.22, 1, 0.36, 1] as const;

export const OPENER_AUTO_ADVANCE_MS = 3000;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

type SequenceEvent = AwaitingEventOf<"awaiting_opener_sequence">;
type ShareMoreChoice = "talk" | "skip";
type SequenceStep = SequenceEvent["steps"][number];
type SynthesizedStep = Exclude<
  AuthoredStep,
  { kind: "slider" } | { kind: "budget" } | { kind: "ranking" }
>;

function stepEvent(
  step: SynthesizedStep,
  index: number,
  event: SequenceEvent,
):
  | AwaitingEventOf<"awaiting_binary_choice">
  | AwaitingEventOf<"awaiting_user_question"> {
  const base = {
    tool_use_id: `${event.tool_use_id}#${index}`,
    ...(event.theme ? { theme: event.theme } : {}),
    ...(step.opener_id ? { opener_id: step.opener_id } : {}),
  };
  if (step.kind === "binary") {
    return {
      type: "awaiting_binary_choice",
      question: step.question,
      option_a: step.option_a,
      option_b: step.option_b,
      ...base,
    };
  }
  return {
    type: "awaiting_user_question",
    questions: [
      {
        question: step.question,
        header: step.header,
        options: step.options,
        ...(step.multiSelect ? { multiSelect: true } : {}),
        ...(step.maxSelect ? { maxSelect: step.maxSelect } : {}),
        ...(step.otherAssist ? { otherAssist: true } : {}),
      },
    ],
    ...base,
  };
}

export function StepCard({
  step,
  index,
  event,
  answer,
  onAnswer,
  readOnly,
  autoCommit,
  revealPolls,
  onSkip,
  actionsLead,
  fail,
}: {
  step: AuthoredStep;
  index: number;
  event: SequenceEvent;
  answer: StepAnswer | null;
  onAnswer: (result: StepAnswer) => void;
  readOnly?: boolean;
  autoCommit?: boolean;
  revealPolls?: boolean;
  onSkip?: () => void;
  actionsLead?: ReactNode;
  fail: (message: string) => void;
}) {
  if (step.kind === "slider") {
    return (
      <SwissContinuousSliderCard
        step={step}
        theme={event.theme}
        answer={answer}
        onAnswer={onAnswer}
        readOnly={readOnly}
        revealPolls={revealPolls}
        onSkip={onSkip}
        actionsLead={actionsLead}
      />
    );
  }
  if (step.kind === "budget") {
    return (
      <SwissBudgetCard
        step={step}
        theme={event.theme}
        answer={answer}
        onAnswer={onAnswer}
        readOnly={readOnly}
        revealPolls={revealPolls}
      />
    );
  }
  if (step.kind === "ranking") {
    return (
      <SwissRankingCard
        step={step}
        theme={event.theme}
        answer={answer}
        onAnswer={onAnswer}
        readOnly={readOnly}
        revealPolls={revealPolls}
        actionsLead={actionsLead}
      />
    );
  }
  const synthesized = stepEvent(step, index, event);
  const shared = { answer, onAnswer, readOnly, autoCommit, revealPolls, onSkip, actionsLead, fail };
  if (synthesized.type === "awaiting_binary_choice") {
    return <SwissBinaryChoiceCard event={synthesized} {...shared} />;
  }
  return <SwissUserQuestionCard event={synthesized} {...shared} />;
}

function ShareMoreStep({
  topicTitle,
  question,
  choice,
  onChoose,
  locked,
}: {
  topicTitle?: string;
  question?: string;
  choice: ShareMoreChoice | null;
  onChoose?: (choice: ShareMoreChoice) => void;
  locked: boolean;
}) {
  const dict = useSwissDict();
  const t = dict.shareMore;
  const heading = topicTitle
    ? fill(t.thanks, { topic: topicTitle })
    : question?.trim() || t.invitation;
  return (
    <SwissCard question={heading}>
      <div className="flex flex-col gap-4">
        <p className="text-[15px] leading-relaxed text-[color-mix(in_srgb,var(--hero-foreground)_78%,transparent)]">
          {t.invitation}
        </p>
        <button
          type="button"
          data-testid="share-more-talk"
          disabled={locked}
          onClick={() => onChoose?.("talk")}
          className={cn(
            "bg-foreground text-background w-full rounded-md px-7 py-3.5 text-center text-sm font-bold transition-all hover:opacity-90",
            locked && "hover:opacity-100",
            choice === "talk" && "ring-2 ring-[color-mix(in_srgb,var(--primary)_50%,transparent)] ring-offset-2",
            choice === "skip" && "opacity-40",
          )}
        >
          {t.talk}
        </button>
        <button
          type="button"
          data-testid="share-more-skip"
          disabled={locked}
          onClick={() => onChoose?.("skip")}
          className={cn(
            "text-muted-foreground hover:text-foreground self-center px-2 text-sm font-semibold transition-colors",
            locked && "hover:text-muted-foreground",
            choice === "skip" && "text-foreground underline underline-offset-4",
            choice === "talk" && "opacity-40",
          )}
        >
          {t.skip}
        </button>
      </div>
    </SwissCard>
  );
}

function parseShareChoice(value: unknown): ShareMoreChoice | null {
  return value === "talk" || value === "skip" ? value : null;
}

function isSkipSentinel(
  step: SequenceStep,
  answer: StepAnswer | null,
): boolean {
  if (step.kind === "share_more") return false;
  const value = stepValue(step, answer);
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { skipped?: unknown }).skipped === true
  );
}

type SwissOpenerSequenceCardProps = CardRenderProps<"awaiting_opener_sequence"> & {
  topicIndex?: number;
  topicCount?: number;
  partial?: unknown[] | null;
  onPartialSave?: (values: unknown[]) => void;
  peek?: number | null;
  advanceSignal?: number;
  paused?: boolean;
};

export function SwissOpenerSequenceCard({
  event,
  answer,
  onAnswer,
  fail,
  readOnly,
  onStepProgress,
  topicIndex,
  topicCount,
  partial,
  onPartialSave,
  peek,
  advanceSignal,
  paused,
}: SwissOpenerSequenceCardProps) {
  const dict = useSwissDict();
  const locale = useSwissLocale();
  const steps = event.steps;

  const combined =
    answer && typeof answer.answers === "object" && answer.answers !== null
      ? (answer.answers as Record<string, unknown>)
      : null;
  const [hydratedResolved] = useState(combined !== null || Boolean(readOnly));

  const [stepAnswers, setStepAnswers] = useState<(StepAnswer | null)[]>(() =>
    seededStepAnswers(steps, partial ?? null),
  );
  const [current, setCurrent] = useState(() =>
    firstUnansweredIndex(steps, seededStepAnswers(steps, partial ?? null)),
  );
  const [submittedLocal, setSubmittedLocal] = useState(false);
  const [shareChoice, setShareChoice] = useState<ShareMoreChoice | null>(null);

  const topicTitle = event.theme
    ? STAGE_TITLES[locale]?.[event.theme]
    : undefined;
  const introCopy = event.theme
    ? (TOPIC_INTROS[locale]?.[event.theme] ?? TOPIC_INTROS.en[event.theme])
    : undefined;
  const resumed = (partial ?? []).some((value) => value != null);
  const [showIntro, setShowIntro] = useState(
    () =>
      !hydratedResolved &&
      !resumed &&
      Boolean(topicTitle) &&
      !prefersReducedMotion(),
  );
  const [introStarted, setIntroStarted] = useState(false);
  const introOffset = topicTitle ? 1 : 0;
  const introPosition =
    typeof topicIndex === "number" && typeof topicCount === "number"
      ? { index: topicIndex, count: topicCount }
      : undefined;

  const liveValues = liveValueByOpenerId(steps, stepAnswers);
  const hydratedValueByOpenerId = new Map<string, unknown>();
  steps.forEach((s) => {
    const id = "opener_id" in s ? s.opener_id : undefined;
    if (id && combined && s.kind !== "share_more") {
      hydratedValueByOpenerId.set(id, combined[s.question]);
    }
  });
  const visibleLive = (step: SequenceStep) =>
    isStepVisible(step, steps, liveValues);

  const combinedRecordFrom = (answers: readonly (StepAnswer | null)[]) => {
    const values = liveValueByOpenerId(steps, answers);
    return Object.fromEntries(
      steps.flatMap((step, i) => {
        const stepResult = answers[i];
        if (step.kind === "share_more" || stepResult === null) return [];
        if (!isStepVisible(step, steps, values)) return [];
        const value =
          step.kind === "question"
            ? (stepResult.answers as Record<string, unknown>)[step.question]
            : stepResult;
        return [[step.question, value]];
      }),
    );
  };
  const combinedRecord = () => combinedRecordFrom(stepAnswers);
  const combinedRecordRef = useRef(combinedRecord);
  combinedRecordRef.current = combinedRecord;

  const live = !hydratedResolved && combined === null && !submittedLocal;
  const visibleIndices = steps
    .map((_, i) => i)
    .filter((i) => visibleLive(steps[i]!));
  const total = visibleIndices.length + introOffset;
  const currentVisibleIdx = visibleIndices.indexOf(current);
  const currentSegIdx = showIntro ? 0 : currentVisibleIdx + introOffset;
  const currentPos = currentSegIdx + 1;
  const currentStep = steps[current];
  const currentAuthoredStep =
    currentStep && currentStep.kind !== "share_more" ? currentStep : undefined;
  const currentPollKind: OpenerResponseKind | undefined = currentAuthoredStep
    ? currentAuthoredStep.kind === "question"
      ? "mcq"
      : currentAuthoredStep.kind
    : undefined;
  const currentPollKey = currentAuthoredStep?.opener_id
    ? { openerId: currentAuthoredStep.opener_id, question: currentAuthoredStep.question }
    : undefined;
  const pollSettled = useOpenerPollSettled(
    currentPollKind,
    currentPollKey,
    live && Boolean(currentPollKey),
  );
  const currentAnswered = showIntro
    ? introStarted
    : stepAnswers[current] !== null &&
      steps[current]?.kind !== "share_more" &&
      pollSettled;
  const skippedKey = visibleIndices
    .flatMap((raw, vi) =>
      isSkipSentinel(steps[raw]!, stepAnswers[raw] ?? null)
        ? [vi + introOffset]
        : [],
    )
    .join(",");
  useEffect(() => {
    if (!onStepProgress || !live || total <= 1) return;
    const skipped = skippedKey ? skippedKey.split(",").map(Number) : [];
    onStepProgress({
      current: currentPos,
      total,
      answered: currentAnswered,
      ...(skipped.length ? { skipped } : {}),
    });
  }, [onStepProgress, live, currentPos, total, currentAnswered, skippedKey]);
  useEffect(() => {
    return () => onStepProgress?.(null);
  }, [onStepProgress]);

  const peekSeg = peek ?? null;
  const peekIntro =
    live && !showIntro && introOffset === 1 && peekSeg === 0;
  const peekRaw =
    peekSeg !== null && peekSeg >= introOffset
      ? visibleIndices[peekSeg - introOffset]
      : undefined;
  const peeking =
    live &&
    !showIntro &&
    (peekIntro ||
      (peekRaw !== undefined &&
        peekRaw !== current &&
        stepAnswers[peekRaw] !== null));

  const held = peeking || Boolean(paused);
  const nextRef = useRef<() => void>(() => {});
  usePausableHold({
    onDone: () => nextRef.current(),
    ms: OPENER_AUTO_ADVANCE_MS,
    armed:
      !hydratedResolved &&
      !submittedLocal &&
      !readOnly &&
      steps[current] !== undefined &&
      steps[current]!.kind !== "share_more" &&
      stepAnswers[current] !== null &&
      pollSettled,
    paused: held,
    resetKey: `${current}:${held}`,
  });

  usePausableHold({
    onDone: () => setShowIntro(false),
    ms: OPENER_AUTO_ADVANCE_MS,
    armed: showIntro && introStarted && !readOnly,
    paused: Boolean(paused),
    resetKey: "intro",
  });

  const advanceSeenRef = useRef(advanceSignal ?? 0);
  useEffect(() => {
    const seen = advanceSeenRef.current;
    advanceSeenRef.current = advanceSignal ?? 0;
    if ((advanceSignal ?? 0) <= seen) return;
    if (showIntro) return;
    nextRef.current();
  }, [advanceSignal, showIntro]);

  if (hydratedResolved) {
    return (
      <div className="flex w-full flex-col gap-3">
        {event.lead ? <SwissOpenerLead text={event.lead} /> : null}
        {steps.map((step, i) => {
          if (step.kind === "share_more") {
            return (
              <ShareMoreStep
                key={i}
                topicTitle={topicTitle}
                question={step.question}
                choice={parseShareChoice(answer?.share_more)}
                locked
              />
            );
          }
          if (!isStepVisible(step, steps, hydratedValueByOpenerId)) return null;
          return (
            <div key={i} className="flex w-full flex-col gap-3">
              <StepCard
                step={step}
                index={i}
                event={event}
                answer={stepCardAnswer(step, combined?.[step.question])}
                onAnswer={() => {}}
                readOnly={readOnly || combined !== null}
                actionsLead={<QuestionThumbs step={step} theme={event.theme} />}
                fail={fail}
              />
              <QuestionNote step={step} theme={event.theme} />
            </div>
          );
        })}
      </div>
    );
  }

  const answerStep = (index: number, result: StepAnswer) => {
    if (submittedLocal) return;
    const nextAnswers = stepAnswers.map((a, i) => (i === index ? result : a));
    setStepAnswers(nextAnswers);
    onPartialSave?.(
      steps.map((step, i) =>
        step.kind === "share_more"
          ? null
          : (stepValue(step, nextAnswers[i] ?? null) ?? null),
      ),
    );
  };

  const nextVisibleIndex = (from: number) => {
    let i = from + 1;
    while (i < steps.length && !visibleLive(steps[i]!)) i++;
    return i;
  };

  const next = () => {
    if (submittedLocal || stepAnswers[current] === null) return;
    const nxt = nextVisibleIndex(current);
    if (nxt < steps.length) {
      setCurrent(nxt);
      return;
    }
    setSubmittedLocal(true);
    onAnswer({ answers: combinedRecord() });
  };
  nextRef.current = next;

  const skipCurrent = () => {
    if (submittedLocal || readOnly || peeking) return;
    const step = steps[current];
    if (!step || step.kind === "share_more") return;
    if (stepAnswers[current] !== null) {
      next();
      return;
    }
    trackQuestionSkipped({
      campaignSlug: SLUG,
      theme: event.theme ?? "",
      openerId: step.opener_id ?? null,
      kind: step.kind === "question" ? "mcq" : step.kind,
    });
    const sentinel = stepCardAnswer(step, { skipped: true })!;
    const nextAnswers = stepAnswers.map((a, i) => (i === current ? sentinel : a));
    setStepAnswers(nextAnswers);
    onPartialSave?.(
      steps.map((s, i) =>
        s.kind === "share_more"
          ? null
          : (stepValue(s, nextAnswers[i] ?? null) ?? null),
      ),
    );
    const values = liveValueByOpenerId(steps, nextAnswers);
    let i = current + 1;
    while (i < steps.length && !isStepVisible(steps[i]!, steps, values)) i++;
    if (i < steps.length) {
      setCurrent(i);
      return;
    }
    setSubmittedLocal(true);
    onAnswer({ answers: combinedRecordFrom(nextAnswers) });
  };

  const submitShareMore = (choice: ShareMoreChoice) => {
    if (submittedLocal) return;
    setShareChoice(choice);
    setSubmittedLocal(true);
    const t = dict.shareMore;
    const record = combinedRecord();
    const shareStep = steps[current];
    const prompt =
      (shareStep?.kind === "share_more" && shareStep.question?.trim()) ||
      t.invitation;
    record[prompt] = choice === "talk" ? t.talk : t.skip;
    onAnswer({ answers: record, share_more: choice });
  };

  const step = steps[current]!;
  const currentAnswer = stepAnswers[current];
  const terminalSkipPending =
    submittedLocal && isSkipSentinel(step, currentAnswer);

  return (
    <AnimatePresence mode="wait">
      {showIntro && topicTitle ? (
        <SwissTopicIntro
          key="intro"
          title={topicTitle}
          topicKey={event.theme}
          about={introCopy?.about}
          purpose={introCopy?.purpose}
          position={introPosition}
          mode="live"
          onTypingStart={() => setIntroStarted(true)}
          onDone={() => setShowIntro(false)}
          advanceSignal={advanceSignal}
        />
      ) : (
        <motion.div
          key="questions"
          className="flex w-full flex-col gap-3"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE }}
        >
          {event.lead ? <SwissOpenerLead text={event.lead} /> : null}

          {peeking && (
            <motion.div
              key={`peek-${peekSeg}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: EASE }}
              className="flex w-full flex-col gap-3"
            >
              {peekIntro && topicTitle ? (
                <SwissTopicIntro
                  title={topicTitle}
                  topicKey={event.theme}
                  about={introCopy?.about}
                  purpose={introCopy?.purpose}
                  position={introPosition}
                  mode="static"
                />
              ) : isSkipSentinel(steps[peekRaw!]!, stepAnswers[peekRaw!]) ? (
                <>
                  <StepCard
                    step={steps[peekRaw!]! as AuthoredStep}
                    index={peekRaw!}
                    event={event}
                    answer={null}
                    onAnswer={(result) => answerStep(peekRaw!, result)}
                    autoCommit
                    actionsLead={
                      <QuestionThumbs
                        step={steps[peekRaw!]! as AuthoredStep}
                        theme={event.theme}
                      />
                    }
                    fail={fail}
                  />
                  <QuestionNote
                    step={steps[peekRaw!]! as AuthoredStep}
                    theme={event.theme}
                  />
                </>
              ) : (
                <>
                  <StepCard
                    step={steps[peekRaw!]! as AuthoredStep}
                    index={peekRaw!}
                    event={event}
                    answer={stepAnswers[peekRaw!]}
                    onAnswer={() => {}}
                    readOnly
                    revealPolls
                    actionsLead={
                      <QuestionThumbs
                        step={steps[peekRaw!]! as AuthoredStep}
                        theme={event.theme}
                      />
                    }
                    fail={fail}
                  />
                  <QuestionNote
                    step={steps[peekRaw!]! as AuthoredStep}
                    theme={event.theme}
                  />
                </>
              )}
            </motion.div>
          )}

          <div className={peeking ? "hidden" : "contents"}>
            <motion.div
              key={current}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="flex w-full flex-col gap-3"
            >
              {step.kind === "share_more" ? (
                <ShareMoreStep
                  topicTitle={topicTitle}
                  question={step.question}
                  choice={shareChoice}
                  onChoose={submitShareMore}
                  locked={submittedLocal || Boolean(readOnly)}
                />
              ) : terminalSkipPending ? null : (
                <>
                  <StepCard
                    step={step}
                    index={current}
                    event={event}
                    answer={currentAnswer}
                    onAnswer={(result) => answerStep(current, result)}
                    readOnly={readOnly}
                    autoCommit
                    onSkip={skipCurrent}
                    actionsLead={<QuestionThumbs step={step} theme={event.theme} />}
                    fail={fail}
                  />
                  <QuestionNote step={step} theme={event.theme} />
                </>
              )}
            </motion.div>
          </div>

        </motion.div>
      )}
    </AnimatePresence>
  );
}
