"use client";

import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { SwissCantonPicker } from "../canton/SwissCantonPicker";
import { WordsReveal } from "./WordsReveal";
import { useSwissDict } from "../../i18n";

const EASE = [0.22, 1, 0.36, 1] as const;

export function SwissOnboardingCanton({
  question,
  why,
  continueLabel,
  onPicked,
  onContinue,
  reduced,
  reveal = true,
  hideContinue = false,
  readOnly = false,
  saved = null,
}: {
  // Definition-authored, already localized (the map + residency stay in code).
  question: string;
  why: string;
  continueLabel: string;
  onPicked: (canton: string) => void;
  onContinue: () => void;
  reduced: boolean;
  reveal?: boolean;
  hideContinue?: boolean;
  readOnly?: boolean;
  saved?: Record<string, string> | null;
}) {
  const dict = useSwissDict();
  const [picked, setPicked] = useState<string | null>(saved?.canton || null);

  return (
    <div>
      <h2 className="mb-1.5">
        <WordsReveal
          text={question}
          entered={reveal}
          className="font-display text-[clamp(1.3rem,4vw,1.9rem)] font-bold leading-[1.1] tracking-[-0.02em] text-balance text-[var(--hero-foreground)]"
        />
      </h2>
      <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
        {why}
      </p>
      <SwissCantonPicker
        large
        previewSelect
        readOnly={readOnly}
        event={{
          type: "awaiting_canton_selection",
          tool_use_id: "onboarding-canton",
          counts: [],
        }}
        answer={picked ? { canton: picked } : null}
        onAnswer={(result) => {
          const canton =
            typeof result.canton === "string" ? result.canton : null;
          if (!canton) return;
          setPicked(canton);
          onPicked(canton);
        }}
        fail={() => {
          // No host error channel in onboarding, swallow; the picker stays
          // interactive so a retry tap can still commit.
        }}
      />
      <p className="text-muted-foreground mt-4 text-center text-xs leading-relaxed text-nowrap">
        {dict.intro.cantonBeat.legal}{" "}
        <Link
          href="/swiss-national-ai-dialogue/terms"
          target="_blank"
          rel="noopener noreferrer"
          className="text-foreground underline"
        >
          {dict.intro.cantonBeat.terms}
        </Link>
      </p>
      {picked && !hideContinue && (
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE, delay: 0.2 }}
          className="mt-4 flex flex-col items-center gap-3"
        >
          <motion.button
            type="button"
            onClick={onContinue}
            whileHover={reduced ? undefined : { scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="bg-primary text-primary-foreground group inline-flex items-center justify-center gap-2 rounded-2xl px-7 py-3 text-base font-bold shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--primary)_45%,transparent)]"
          >
            {continueLabel}
            <ArrowRight
              className="size-5 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </motion.button>
        </motion.div>
      )}
    </div>
  );
}
