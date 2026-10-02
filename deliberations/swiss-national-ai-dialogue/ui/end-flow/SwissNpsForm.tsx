"use client";

import { useEffect, useState } from "react";
import { cn } from "@/components/ui";

import { useSwissDict } from "../../i18n";

const NPS_DONE_KEY = "swiss-nps-done";

function readNpsDone(): boolean {
  try {
    return window.localStorage.getItem(NPS_DONE_KEY) === "1";
  } catch {
    return false;
  }
}

export function SwissNpsForm() {
  const dict = useSwissDict();
  const t = dict.nps;
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (readNpsDone()) setDone(true);
  }, []);

  const submit = () => {
    if (score === null) return;
    const trimmed = comment.trim();
    void fetch("/api/snad/session", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operation: "wrapup_answer",
        response: {
          step_id: "wrapup-nps",
          answer: { nps: score, ...(trimmed ? { comment: trimmed } : {}) },
          skipped: false,
        },
      }),
    }).catch(() => {});
    try {
      window.localStorage.setItem(NPS_DONE_KEY, "1");
    } catch {
      // Private-mode storage failure just means a reload re-asks once.
    }
    setDone(true);
  };

  if (done) {
    return (
      <p className="text-[15px] leading-relaxed text-[color-mix(in_srgb,var(--hero-foreground)_72%,transparent)]">
        {t.thanks}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[15px] font-semibold text-[var(--hero-foreground)]">
        {t.heading}
      </p>
      <div
        role="radiogroup"
        aria-label={t.heading}
        className="grid grid-cols-11 gap-1"
      >
        {Array.from({ length: 11 }, (_, value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={score === value}
            data-testid={`nps-${value}`}
            onClick={() => setScore(value)}
            className={cn(
              "border-border rounded-md border py-2 text-[13px] font-semibold transition-colors",
              score === value
                ? "bg-primary border-primary text-white"
                : "bg-card text-foreground hover:border-primary/50",
            )}
          >
            {value}
          </button>
        ))}
      </div>
      <div className="text-muted-foreground flex justify-between text-[11px] font-semibold uppercase tracking-wide">
        <span>{t.low}</span>
        <span>{t.high}</span>
      </div>
      <textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        maxLength={2000}
        rows={2}
        placeholder={t.commentPlaceholder}
        aria-label={t.commentPlaceholder}
        data-testid="nps-comment"
        className="border-border bg-card text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-primary/20 w-full resize-none rounded-xl border px-3.5 py-3 text-[16px] leading-relaxed outline-none focus:ring-2"
      />
      <button
        type="button"
        data-testid="nps-submit"
        onClick={submit}
        disabled={score === null}
        className="bg-foreground text-background w-full rounded-md px-7 py-3.5 text-center text-sm font-bold transition-all hover:opacity-90 disabled:opacity-40 disabled:hover:opacity-40"
      >
        {t.submit}
      </button>
    </div>
  );
}
