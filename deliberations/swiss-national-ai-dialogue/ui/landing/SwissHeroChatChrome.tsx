"use client";

import { motion } from "motion/react";

const EASE = [0.22, 1, 0.36, 1] as const;

export function SwissHeroTextBubble({
  role,
  content,
}: {
  role: "user" | "assistant";
  content: string;
}) {
  if (role === "assistant") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE }}
        className="mx-auto w-full max-w-[34rem] py-2.5"
      >
        <p
          className="font-display text-pretty text-[clamp(1.2rem,3.6vw,1.7rem)] font-bold leading-[1.25] tracking-[-0.02em] text-[var(--hero-foreground)]"
          style={{ whiteSpace: "pre-wrap" }}
        >
          {content}
        </p>
      </motion.div>
    );
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="mx-auto flex w-full max-w-[34rem] justify-end py-1"
    >
      <div
        className="max-w-[85%] rounded-2xl bg-[color-mix(in_srgb,var(--hero-foreground)_3%,var(--background))] px-4 py-2.5 text-left text-[1.02rem] font-medium leading-snug text-[var(--hero-foreground)] sm:text-[1.05rem]"
        style={{ whiteSpace: "pre-wrap" }}
      >
        {content}
      </div>
    </motion.div>
  );
}

export function SwissHeroTypingIndicator() {
  return (
    <div className="mx-auto w-full max-w-[34rem] py-3">
      <span
        className="inline-flex items-center gap-1.5"
        aria-live="polite"
        aria-label="Interviewer is thinking"
      >
        <span className="size-2.5 animate-pulse rounded-full bg-[color-mix(in_srgb,var(--hero-foreground)_45%,transparent)]" />
        <span className="size-2.5 animate-pulse rounded-full bg-[color-mix(in_srgb,var(--hero-foreground)_45%,transparent)] [animation-delay:200ms]" />
        <span className="size-2.5 animate-pulse rounded-full bg-[color-mix(in_srgb,var(--hero-foreground)_45%,transparent)] [animation-delay:400ms]" />
      </span>
    </div>
  );
}
