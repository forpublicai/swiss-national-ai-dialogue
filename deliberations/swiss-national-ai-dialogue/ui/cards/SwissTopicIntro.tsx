"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";

import { cn } from "@/components/ui";

import { TOPIC_ICONS } from "../topic-icons";
import { WordsReveal } from "../onboarding/WordsReveal";

const EASE = [0.22, 1, 0.36, 1] as const;

const WORD_STAGGER_S = 0.025;
const WORD_DURATION_MS = 300;
const TITLE_STAGGER_MS = 300;

function wordCount(text: string): number {
  return text
    .split("\n")
    .reduce((sum, line) => sum + line.split(/\s+/).filter(Boolean).length, 0);
}

export function SwissTopicIntro({
  title,
  topicKey,
  about,
  purpose,
  position,
  mode = "live",
  onTypingStart,
  onTyped,
  onDone,
  advanceSignal,
}: {
  title: string;
  // Picks the topic's glyph (TOPIC_ICONS); absent or unknown = no glyph.
  topicKey?: string;
  about?: string;
  purpose?: string;
  position?: { index: number; count: number };
  mode?: "live" | "static";
  // Live mode: the word reveal started (the parent starts its hold here).
  onTypingStart?: () => void;
  // Live mode: the word reveal finished.
  onTyped?: () => void;
  // Live mode: the beat is over (tap after typing finished).
  onDone?: () => void;
  advanceSignal?: number;
}) {
  const live = mode === "live";
  const TopicIcon = topicKey ? TOPIC_ICONS[topicKey] : undefined;
  const paragraph = [about, purpose]
    .filter((line): line is string => Boolean(line?.trim()))
    .join(" ");
  const totalWords = wordCount(paragraph);
  const revealMs =
    totalWords === 0 ? 0 : Math.round((totalWords - 1) * WORD_STAGGER_S * 1000) + WORD_DURATION_MS;

  // Static mode (and fast-forward) shows everything at once, no animation.
  const [entered, setEntered] = useState(!live);
  const [instant, setInstant] = useState(!live);
  const [doneTyping, setDoneTyping] = useState(!live || totalWords === 0);

  const startedNotifiedRef = useRef(false);
  const notifyStarted = useCallback(() => {
    if (startedNotifiedRef.current) return;
    startedNotifiedRef.current = true;
    onTypingStart?.();
  }, [onTypingStart]);

  const typedNotifiedRef = useRef(false);
  const notifyTyped = useCallback(() => {
    if (typedNotifiedRef.current) return;
    typedNotifiedRef.current = true;
    onTyped?.();
  }, [onTyped]);

  const startTimerRef = useRef<number | null>(null);
  const finishTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (!live) return;
    if (totalWords === 0) {
      notifyStarted();
      setDoneTyping(true);
      notifyTyped();
      return;
    }
    startTimerRef.current = window.setTimeout(() => {
      notifyStarted();
      setEntered(true);
      finishTimerRef.current = window.setTimeout(() => {
        setDoneTyping(true);
        notifyTyped();
      }, revealMs);
    }, TITLE_STAGGER_MS);
    return () => {
      if (startTimerRef.current !== null) window.clearTimeout(startTimerRef.current);
      if (finishTimerRef.current !== null) window.clearTimeout(finishTimerRef.current);
    };
  }, [live, totalWords, revealMs, notifyStarted, notifyTyped]);

  const advance = useCallback(() => {
    if (!doneTyping) {
      if (startTimerRef.current !== null) window.clearTimeout(startTimerRef.current);
      if (finishTimerRef.current !== null) window.clearTimeout(finishTimerRef.current);
      notifyStarted();
      setInstant(true);
      setEntered(true);
      setDoneTyping(true);
      notifyTyped();
      return;
    }
    onDone?.();
  }, [doneTyping, notifyStarted, notifyTyped, onDone]);

  const handleTap = () => {
    if (!live) return;
    advance();
  };

  const advanceSeenRef = useRef(advanceSignal ?? 0);
  useEffect(() => {
    const seen = advanceSeenRef.current;
    advanceSeenRef.current = advanceSignal ?? 0;
    if (!live) return;
    if ((advanceSignal ?? 0) <= seen) return;
    advance();
  }, [advanceSignal, live, advance]);

  const item = (delay: number) => ({
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, ease: EASE, delay },
  });

  const body = (
    <>
      {TopicIcon && (
        <motion.span
          aria-hidden
          className="flex size-9 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--primary)_9%,transparent)] text-[color:var(--primary)]"
          {...(live ? item(0.02) : {})}
        >
          <TopicIcon className="size-5" />
        </motion.span>
      )}

      {position && (
        <motion.span
          className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider tabular-nums"
          {...(live ? item(0.05) : {})}
        >
          {position.index} / {position.count}
        </motion.span>
      )}

      <motion.span
        className="font-display block text-pretty text-[clamp(1.6rem,5vw,2.25rem)] font-bold leading-[1.15] tracking-[-0.02em] text-[var(--hero-foreground)]"
        {...(live ? item(0.12) : {})}
      >
        {title}
      </motion.span>

      {paragraph && (
        <p className="text-[1.02rem] font-medium leading-relaxed text-[color-mix(in_srgb,var(--hero-foreground)_82%,transparent)] sm:text-[1.08rem]">
          <WordsReveal text={paragraph} entered={entered} instant={instant} />
        </p>
      )}
    </>
  );

  if (!live) {
    return (
      <div className="mx-auto flex w-full max-w-[34rem] flex-col items-start gap-3 pb-2 pt-4 text-left">
        {body}
      </div>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={handleTap}
      data-testid="topic-intro"
      className={cn(
        "mx-auto flex w-full max-w-[34rem] cursor-pointer flex-col items-start gap-3",
        "pb-2 pt-4 text-left focus-visible:outline-none",
      )}
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3, ease: EASE }}
    >
      {body}
    </motion.button>
  );
}
