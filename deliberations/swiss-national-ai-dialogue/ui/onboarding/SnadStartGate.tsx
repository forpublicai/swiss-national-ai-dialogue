"use client";

import { useEffect, useRef } from "react";

import { SwissOnboardingCanton } from "./SwissOnboardingCanton";
import { prefersReducedMotion } from "./WordsReveal";
import { SwissLanguageToggle } from "../landing/SwissLanguageToggle";
import { localizeOnboarding, useSwissLocale } from "../../i18n";
import type { SnadOnboarding } from "../../types";

export function SnadStartGate({
  onboarding,
  saved,
  onPicked,
  onBegin,
}: {
  onboarding: SnadOnboarding;
  saved: Record<string, string> | null;
  onPicked: (canton: string) => void;
  onBegin: () => void;
}) {
  const locale = useSwissLocale();
  const copy = localizeOnboarding(onboarding, locale);
  const reduced = useRef(false);
  useEffect(() => {
    reduced.current = prefersReducedMotion();
  }, []);

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex justify-start">
        <SwissLanguageToggle variant="inline" />
      </div>
      <SwissOnboardingCanton
        question={copy.cantonQuestion}
        why={copy.cantonWhy}
        continueLabel={copy.continueLabel}
        reduced={reduced.current}
        onPicked={onPicked}
        onContinue={onBegin}
        saved={saved}
      />
    </div>
  );
}
