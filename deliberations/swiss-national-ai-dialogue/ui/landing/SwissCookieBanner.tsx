"use client";

import { useState } from "react";

import { Button } from "@/components/ui";

import type { ConsentPrefs } from "@/lib/analytics/cookies";

import type { CookieConsentBannerProps } from "../../types";
import { useSwissDict } from "../../i18n";

export function SwissCookieBanner(props: CookieConsentBannerProps) {
  const c = useSwissDict().cookieConsent;
  const [customizing, setCustomizing] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const decide = (prefs: ConsentPrefs) => props.onDecision(prefs);

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={c.title}
      className="border-border bg-card fixed inset-x-0 bottom-0 z-[60] border-t shadow-[0_-4px_24px_rgba(0,0,0,0.08)]"
    >
      <div className="mx-auto flex max-w-[900px] flex-col gap-4 px-4 py-5 sm:px-6">
        <div>
          <h2 className="text-foreground text-base font-bold">{c.title}</h2>
          <p className="text-muted-foreground mt-1 text-sm">{c.body}</p>
        </div>
        {customizing && (
          <div className="divide-border border-border divide-y border-y">
            <CategoryToggle
              label={c.categories.necessary.label}
              description={c.categories.necessary.desc}
              checked
              lockedLabel={c.alwaysOn}
            />
            <CategoryToggle
              label={c.categories.analytics.label}
              description={c.categories.analytics.desc}
              checked={analytics}
              onChange={setAnalytics}
            />
            <CategoryToggle
              label={c.categories.marketing.label}
              description={c.categories.marketing.desc}
              checked={marketing}
              onChange={setMarketing}
            />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          {customizing ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => decide({ analytics, marketing })}
            >
              {c.save}
            </Button>
          ) : (
            <>
              <Button
                variant="primary"
                size="sm"
                onClick={() => decide({ analytics: true, marketing: true })}
              >
                {c.acceptAll}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => decide({ analytics: false, marketing: false })}
              >
                {c.rejectAll}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCustomizing(true)}
              >
                {c.customize}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CategoryToggle({
  label,
  description,
  checked,
  onChange,
  lockedLabel,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange?: (next: boolean) => void;
  lockedLabel?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-foreground text-sm font-semibold">{label}</p>
        <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>
      </div>
      {lockedLabel ? (
        <span className="text-muted-foreground mt-1 shrink-0 text-xs font-medium">
          {lockedLabel}
        </span>
      ) : (
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={label}
          onClick={() => onChange?.(!checked)}
          className={`relative mt-1 h-6 w-10 shrink-0 rounded-full transition-colors ${checked ? "bg-primary" : "bg-border"}`}
        >
          <span
            className={`bg-background absolute top-0.5 h-5 w-5 rounded-full shadow transition-all ${checked ? "left-[18px]" : "left-0.5"}`}
          />
        </button>
      )}
    </div>
  );
}
