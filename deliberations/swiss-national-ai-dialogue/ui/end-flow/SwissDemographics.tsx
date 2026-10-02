"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import { cn } from "@/components/ui";

import { SwissCard, SwissOptionRow } from "../cards/SwissCardChrome";
import {
  SwissOtherAnswerField,
  SwissOtherAssistChat,
  useOtherAssist,
} from "../cards/SwissOtherAssist";
import { OPENER_AUTO_ADVANCE_MS } from "../cards/SwissOpenerSequenceCard";
import { SwissTopicIntro } from "../cards/SwissTopicIntro";
import {
  isStepVisible,
  liveValueByOpenerId,
  stepCardAnswer,
  type StepAnswer,
} from "../cards/sequence-steps";
import { usePausableHold } from "../use-pausable-hold";
import { SwissPostScreen } from "./SwissPostScreen";
import { WRAP_UP_EMAIL_MARKER } from "./wrap-up-progress";
import {
  trackResultsEmail,
} from "../../analytics";
import type { SnadSequenceStep } from "../../types";
import { useSwissDict } from "../../i18n";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

// Long enough for the tapped row's red fill to register before the page turns.
const ADVANCE_DELAY_MS = 240;

const EMAIL_MAX = 254;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type WrapUpQuestion = Extract<SnadSequenceStep, { kind: "question" }>;
type WrapUpAnswer = Record<string, unknown>;

function isQuestion(step: SnadSequenceStep): step is WrapUpQuestion {
  return step.kind === "question";
}

function answeredOptionIds(value: WrapUpAnswer | undefined): Set<string> {
  if (!value) return new Set();
  if (typeof value.choice === "string") return new Set([value.choice]);
  return new Set(
    Array.isArray(value.selected)
      ? value.selected.filter((id): id is string => typeof id === "string")
      : [],
  );
}

function idValueToLabelValue(step: WrapUpQuestion, value: WrapUpAnswer): StepAnswer {
  const labelById = new Map(
    step.options.map((option) => [option.id ?? option.label, option.label] as const),
  );
  const ids =
    typeof value.choice === "string"
      ? [value.choice]
      : Array.isArray(value.selected)
        ? value.selected.filter((id): id is string => typeof id === "string")
        : [];
  const selected = ids.map((id) => labelById.get(id) ?? id);
  return {
    ...(selected.length ? { selected } : {}),
    ...(typeof value.other === "string" ? { other: value.other } : {}),
  };
}

function labelStepAnswers(
  pages: WrapUpQuestion[],
  answersById: Record<string, WrapUpAnswer>,
): (StepAnswer | null)[] {
  return pages.map((step) => {
    const stored = step.opener_id ? answersById[step.opener_id] : undefined;
    return stored ? stepCardAnswer(step, idValueToLabelValue(step, stored)) : null;
  });
}

function visiblePagesFor(
  pages: WrapUpQuestion[],
  answersById: Record<string, WrapUpAnswer>,
): WrapUpQuestion[] {
  const values = liveValueByOpenerId(pages, labelStepAnswers(pages, answersById));
  return pages.filter((step) => isStepVisible(step, pages, values));
}

function recordAnswer(stepId: string, answer: Record<string, unknown>) {
  // Fire-and-forget — the data is optional and must never block the flow.
  void fetch("/api/snad/session", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      operation: "wrapup_answer",
      response: { step_id: stepId, answer, skipped: false },
    }),
  }).catch(() => {});
}

export function PageHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-display max-w-[20ch] text-[clamp(1.7rem,5.6vw,2.5rem)] font-bold leading-[1.05] tracking-[-0.02em] text-[var(--hero-foreground)]">
      {children}
    </h2>
  );
}

export function SkipLink({
  label,
  disabled,
  onClick,
  testId,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className="rounded-md px-1 py-1 text-sm font-medium text-[color-mix(in_srgb,var(--hero-foreground)_60%,transparent)] transition-colors hover:text-[var(--hero-foreground)] disabled:opacity-50"
    >
      {label}
    </button>
  );
}

export function CommitButton({
  label,
  disabled = false,
  onClick,
  testId,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className={cn(
        "self-end rounded-md px-7 py-2.5 text-sm font-bold transition-all",
        disabled
          ? "bg-muted text-muted-foreground cursor-not-allowed"
          : "bg-primary hover:opacity-90 text-white",
      )}
    >
      {label}
    </button>
  );
}

export const SWISS_INPUT_CLASS =
  "border-border bg-card text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-primary/20 w-full rounded-md border px-4 py-3.5 text-[16px] outline-none focus:ring-2";

export function SwissDemographicsScreen({
  slug,
  questions,
  initialAnswers,
  onPage,
  onReached,
  onSkippedChange,
  onDone,
  peek,
}: {
  slug: string;
  questions: SnadSequenceStep[];
  initialAnswers: Record<string, WrapUpAnswer>;
  onPage?: (page: number) => void;
  onReached?: (marker: string) => void;
  onSkippedChange?: (skipped: number[]) => void;
  onDone: () => void;
  peek?: number | null;
}) {
  const dict = useSwissDict();
  const pages = questions.filter(isQuestion);
  const seededIndex = (() => {
    const visible = visiblePagesFor(pages, initialAnswers);
    const firstUnanswered = visible.findIndex(
      (page) => !page.opener_id || initialAnswers[page.opener_id] === undefined,
    );
    return firstUnanswered === -1 ? visible.length : firstUnanswered;
  })();
  const [index, setIndex] = useState(seededIndex);
  const [showIntro, setShowIntro] = useState(
    () => !prefersReducedMotion() && seededIndex === 0,
  );
  const [introStarted, setIntroStarted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, WrapUpAnswer>>(
    () => ({ ...initialAnswers }),
  );
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const visiblePages = visiblePagesFor(pages, answers);
  const advance = () => setIndex((current) => current + 1);

  useEffect(() => {
    onPage?.(showIntro ? -1 : index);
  }, [index, showIntro, onPage]);
  const liveMarker =
    visiblePages[showIntro ? 0 : index]?.opener_id ?? WRAP_UP_EMAIL_MARKER;
  useEffect(() => {
    onReached?.(liveMarker);
  }, [liveMarker, onReached]);
  usePausableHold({
    onDone: () => setShowIntro(false),
    ms: OPENER_AUTO_ADVANCE_MS,
    armed: showIntro && introStarted,
    paused: false,
    resetKey: "wrapup-intro",
  });

  const skippedKey = visiblePages
    .slice(0, index)
    .flatMap((page, i) =>
      page.opener_id && answers[page.opener_id] === undefined ? [i] : [],
    )
    .join(",");
  useEffect(() => {
    onSkippedChange?.(
      skippedKey ? skippedKey.split(",").map((n) => Number(n) + 1) : [],
    );
  }, [skippedKey, onSkippedChange]);

  const peekingIntro = peek === 0;
  const peekQuestionIdx =
    typeof peek === "number" && peek >= 1 && peek - 1 < visiblePages.length
      ? peek - 1
      : null;
  const peekingEmail = typeof peek === "number" && peek - 1 >= visiblePages.length;
  const peeking = peekQuestionIdx !== null && peekQuestionIdx < index;

  if ((showIntro && peek == null && index === 0) || peekingIntro) {
    return (
      <SwissPostScreen>
        <SwissTopicIntro
          topicKey="wrap-up"
          title={dict.ack.wrapUpTab}
          about={dict.demographics.introAbout}
          mode={peekingIntro ? "static" : "live"}
          onTypingStart={() => setIntroStarted(true)}
          onDone={() => setShowIntro(false)}
        />
      </SwissPostScreen>
    );
  }

  if (peekingEmail) {
    if (submittedEmail !== null) {
      return (
        <SwissResultsEmailPage
          slug={slug}
          readOnly
          submittedEmail={submittedEmail}
          onDone={onDone}
        />
      );
    }
    return (
      <SwissResultsEmailPage
        slug={slug}
        initialValue=""
        onResolve={setSubmittedEmail}
        onDone={() => {}}
      />
    );
  }
  if (peek == null && index >= visiblePages.length) {
    return (
      <SwissResultsEmailPage
        slug={slug}
        initialValue={submittedEmail ?? ""}
        onResolve={setSubmittedEmail}
        onDone={onDone}
      />
    );
  }

  const displayIdx = peeking ? peekQuestionIdx! : index;
  const step = visiblePages[displayIdx]!;
  const storedAnswer = step.opener_id ? answers[step.opener_id] : undefined;
  const locked = peeking && storedAnswer !== undefined;

  return (
    <QuestionPage
      key={step.opener_id ?? displayIdx}
      step={step}
      answer={storedAnswer}
      readOnly={locked}
      onAnswer={(answer) => {
        if (step.opener_id) {
          recordAnswer(step.opener_id, answer);
          const id = step.opener_id;
          setAnswers((current) => ({ ...current, [id]: answer }));
        }
        if (!peeking) advance();
      }}
      onSkip={() => {
        if (!peeking) advance();
      }}
    />
  );
}

function QuestionPage({
  step,
  answer,
  readOnly,
  onAnswer,
  onSkip,
}: {
  step: WrapUpQuestion;
  answer?: WrapUpAnswer;
  readOnly?: boolean;
  onAnswer: (answer: Record<string, unknown>) => void;
  onSkip: () => void;
}) {
  const dict = useSwissDict();
  const dem = dict.demographics;
  const [advancing, setAdvancing] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [otherId, setOtherId] = useState<string | null>(null);
  const [otherText, setOtherText] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const multi = Boolean(step.multiSelect);
  const optionId = (option: WrapUpQuestion["options"][number]) =>
    option.id ?? option.label;
  const exclusiveIds = new Set(
    step.options.filter((option) => option.exclusive).map(optionId),
  );
  const freeTextIds = new Set(
    step.options.filter((option) => option.freeText).map(optionId),
  );
  const freeTextOptionId =
    step.options.filter((option) => option.freeText).map(optionId)[0] ?? null;
  const atCap =
    typeof step.maxSelect === "number" && picked.size >= step.maxSelect;

  const otherAssistOn =
    step.otherAssist === true && Boolean(step.opener_id) && !readOnly;
  const assist = useOtherAssist({
    openerId: otherAssistOn ? step.opener_id! : null,
    text: otherText,
    onText: setOtherText,
    onResume: () => {
      if (!freeTextOptionId) return;
      if (multi) setPicked((current) => new Set(current).add(freeTextOptionId));
      else setOtherId(freeTextOptionId);
    },
  });

  const lockedSelected = readOnly ? answeredOptionIds(answer) : null;
  const lockedOther =
    readOnly && typeof answer?.other === "string" ? answer.other : undefined;

  const tapOption = (id: string) => {
    if (readOnly || advancing) return;
    setPendingId(id);
    setAdvancing(true);
    window.setTimeout(() => {
      onAnswer({ choice: id });
    }, ADVANCE_DELAY_MS);
  };

  const toggleOption = (id: string) => {
    if (readOnly || advancing) return;
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
        return next;
      }
      if (exclusiveIds.has(id)) return new Set([id]);
      exclusiveIds.forEach((exclusive) => next.delete(exclusive));
      if (atCap) return current;
      next.add(id);
      return next;
    });
  };

  const otherAnswerText = () =>
    otherAssistOn && assist.isStem ? "" : otherText.trim();

  const commitOther = () => {
    if (readOnly || !otherId) return;
    const other = otherAnswerText();
    onAnswer({ choice: otherId, ...(other ? { other } : {}) });
  };

  const commitMulti = () => {
    if (readOnly || picked.size === 0) return;
    const selected = step.options.map(optionId).filter((id) => picked.has(id));
    const other = otherAnswerText();
    const pickedFreeText = selected.some((id) => freeTextIds.has(id));
    onAnswer({
      selected,
      ...(pickedFreeText && other ? { other } : {}),
    });
  };

  const showOtherBox = multi
    ? [...picked].some((id) => freeTextIds.has(id))
    : otherId !== null;

  const primeStem = assist.primeStem;
  useEffect(() => {
    if (otherAssistOn && showOtherBox) primeStem();
  }, [otherAssistOn, showOtherBox, primeStem]);

  return (
    <SwissPostScreen>
      <SwissCard question={step.question}>
        {(step.opener_id === "wrapup-age" ||
          step.opener_id === "wrapup-field" ||
          step.opener_id === "wrapup-ai-frequency" ||
          step.opener_id === "wrapup-ai-uses" ||
          step.opener_id === "wrapup-ai-nonuse") && (
          <p className="text-muted-foreground -mt-2 text-xs leading-relaxed">
            {dem.wideRangeNote}
          </p>
        )}
        <div
          role={multi ? "group" : "radiogroup"}
          aria-label={step.question}
          className="flex flex-col gap-1"
        >
          {step.options.map((option) => {
            const id = optionId(option);
            const active = readOnly
              ? lockedSelected!.has(id)
              : multi
                ? picked.has(id)
                : pendingId === id || otherId === id;
            const assistRow = otherAssistOn && Boolean(option.freeText);
            return (
              <SwissOptionRow
                key={id}
                multi={multi}
                selected={active}
                locked={readOnly || advancing}
                muted={assistRow}
                dimmed={
                  !readOnly &&
                  multi &&
                  atCap &&
                  !picked.has(id) &&
                  !exclusiveIds.has(id)
                }
                expansion={
                  assistRow ? (
                    <SwissOtherAnswerField
                      assist={assist}
                      selected={active}
                      onActivate={() => {
                        if (multi) {
                          if (!picked.has(id)) toggleOption(id);
                        } else if (otherId !== id) {
                          setOtherId(id);
                        }
                      }}
                    />
                  ) : undefined
                }
                onClick={() => {
                  if (readOnly) return;
                  if (multi) {
                    toggleOption(id);
                    return;
                  }
                  if (option.freeText) {
                    setOtherId(id);
                    return;
                  }
                  tapOption(id);
                }}
                label={option.label}
              />
            );
          })}
        </div>
        {readOnly ? (
          lockedOther !== undefined && (
            <p className="text-muted-foreground text-[15px] leading-snug">
              {lockedOther}
            </p>
          )
        ) : (
          <>
            {showOtherBox &&
              (otherAssistOn ? (
                <SwissOtherAssistChat assist={assist} />
              ) : (
                <div className="flex flex-col gap-3">
                  <input
                    type="text"
                    value={otherText}
                    maxLength={200}
                    autoFocus
                    placeholder={dem.otherPlaceholder}
                    onChange={(event) => setOtherText(event.target.value)}
                    className={SWISS_INPUT_CLASS}
                  />
                  {!multi && (
                    <CommitButton
                      label={dict.question.next}
                      onClick={commitOther}
                    />
                  )}
                </div>
              ))}
            <div className="flex items-center justify-end gap-4">
              <SkipLink
                label={dem.skip}
                disabled={advancing}
                onClick={onSkip}
              />
              {!multi && otherAssistOn && showOtherBox && (
                <CommitButton
                  label={dict.question.next}
                  disabled={!otherAnswerText()}
                  onClick={commitOther}
                />
              )}
              {multi && (
                <CommitButton
                  label={dict.question.next}
                  disabled={picked.size === 0}
                  onClick={commitMulti}
                />
              )}
            </div>
          </>
        )}
      </SwissCard>
    </SwissPostScreen>
  );
}

function SwissResultsEmailPage({
  slug,
  initialValue,
  readOnly,
  submittedEmail,
  onResolve,
  onDone,
}: {
  slug: string;
  initialValue?: string;
  readOnly?: boolean;
  submittedEmail?: string | null;
  onResolve?: (email: string | null) => void;
  onDone: () => void;
}) {
  const dict = useSwissDict();
  const em = dict.demographics.email;
  const [email, setEmail] = useState(initialValue ?? "");

  const normalized = email.trim().toLowerCase();
  const valid =
    normalized.length > 0 &&
    normalized.length <= EMAIL_MAX &&
    EMAIL_RE.test(normalized);

  const finishWithEmail = () => {
    if (!valid) return;
    trackResultsEmail({ campaignSlug: slug, choice: "submit" });
    recordAnswer("wrapup-email", { email: normalized });
    onResolve?.(normalized);
    onDone();
  };

  const finishWithoutEmail = () => {
    trackResultsEmail({ campaignSlug: slug, choice: "skip" });
    onResolve?.(null);
    onDone();
  };

  return (
    <SwissPostScreen key="email">
      <div className="flex flex-col gap-3">
        <PageHeading>{em.heading}</PageHeading>
        <p className="max-w-[46ch] text-[15px] leading-relaxed text-[color-mix(in_srgb,var(--hero-foreground)_72%,transparent)]">
          {em.body}
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          value={readOnly ? (submittedEmail ?? "") : email}
          maxLength={EMAIL_MAX}
          placeholder={em.placeholder}
          aria-label={em.heading}
          readOnly={readOnly}
          disabled={readOnly}
          onChange={(e) => setEmail(e.target.value)}
          className={cn(SWISS_INPUT_CLASS, readOnly && "opacity-70")}
        />
        {!readOnly && (
          <div className="flex items-center justify-end gap-4">
            <SkipLink label={em.finishWithout} disabled={false} onClick={finishWithoutEmail} />
            <CommitButton
              label={em.submit}
              disabled={!valid}
              onClick={finishWithEmail}
            />
          </div>
        )}
      </div>
    </SwissPostScreen>
  );
}
