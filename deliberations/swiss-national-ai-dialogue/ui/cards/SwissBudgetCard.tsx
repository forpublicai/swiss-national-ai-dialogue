"use client";

import { type CSSProperties, useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";

import { cn } from "@/components/ui";

import {
  trackQuestionAnswered,
  trackQuestionShown,
} from "../../analytics";

import type { AwaitingEventOf } from "../../types";
import {
  allLabelsTitled,
  OptionLabel,
  SwissCard,
  SwissRevealFillRow,
} from "./SwissCardChrome";
import { budgetRows, type BudgetPollCounts } from "./opener-poll-math";
import { useOpenerPoll } from "./use-opener-poll";
import { useSwissDict } from "../../i18n";

type BudgetStep = Extract<
  AwaitingEventOf<"awaiting_opener_sequence">["steps"][number],
  { kind: "budget" }
>;

const SLUG = "swiss-national-ai-dialogue";

const shownFired = new Set<string>();

function committedAllocation(
  answer: Record<string, unknown> | null,
): Record<string, number> | null {
  const raw = answer?.allocation;
  if (!raw || typeof raw !== "object") return null;
  const entries = Object.entries(raw).filter(
    (e): e is [string, number] => typeof e[1] === "number" && e[1] > 0,
  );
  return entries.length > 0 ? Object.fromEntries(entries) : null;
}

export function SwissBudgetCard({
  step,
  theme,
  answer,
  onAnswer,
  readOnly,
  revealPolls,
}: {
  step: BudgetStep;
  theme?: string;
  answer: Record<string, unknown> | null;
  onAnswer: (result: Record<string, unknown>) => void;
  readOnly?: boolean;
  revealPolls?: boolean;
}) {
  const dict = useSwissDict();
  const t = dict.tradeoff;

  const committed = committedAllocation(answer);
  const resolved = committed !== null;
  const locked = Boolean(readOnly) || resolved;

  const [units, setUnits] = useState<Record<string, number>>({});
  const spent = Object.values(units).reduce((a, b) => a + b, 0);
  const left = step.total - spent;

  const themeSlug = theme?.trim() || "unknown";

  useEffect(() => {
    if (readOnly || resolved || shownFired.has(step.question)) return;
    shownFired.add(step.question);
    trackQuestionShown({
      campaignSlug: SLUG,
      theme: themeSlug,
      openerId: step.opener_id ?? null,
      kind: "budget",
    });
  }, [readOnly, resolved, step.question, step.opener_id, themeSlug]);

  const adjust = (label: string, delta: number) => {
    if (locked) return;
    const current = units[label] ?? 0;
    if (delta > 0 && left <= 0) return;
    if (delta < 0 && current <= 0) return;
    setUnits({ ...units, [label]: current + delta });
  };

  const confirm = () => {
    if (locked || left !== 0) return;
    trackQuestionAnswered({
      campaignSlug: SLUG,
      theme: themeSlug,
      openerId: step.opener_id ?? null,
      kind: "budget",
    });
    onAnswer({
      allocation: Object.fromEntries(
        Object.entries(units).filter(([, n]) => n > 0),
      ),
    });
  };

  const pollArm = revealPolls || !readOnly;
  const othersPoll = useOpenerPoll<BudgetPollCounts>(
    "budget",
    { openerId: step.opener_id, question: step.question },
    pollArm,
  );
  const reveal = othersPoll
    ? budgetRows(
        othersPoll,
        committed,
        step.options.map((o) => ({ key: o.id ?? o.label, label: o.label })),
      )
    : null;
  const showReveal = pollArm && resolved && reveal !== null && reveal.total > 0;
  const revealRowByKey = new Map(
    (reveal?.rows ?? []).map((row) => [row.key, row]),
  );

  const displayUnits = (label: string) =>
    resolved ? (committed?.[label] ?? 0) : (units[label] ?? 0);

  return (
    <SwissCard question={step.question}>
      <div
        className="flex flex-col gap-4"
        style={
          { "--tradeoff-accent": "var(--primary)" } as CSSProperties
        }
      >
        {!readOnly && (
          <div
            className={cn(
              "flex items-center gap-1.5 transition-opacity duration-300",
              resolved && "opacity-0",
            )}
            aria-live="polite"
            aria-hidden={resolved}
            aria-label={dict.budget.toPlace.replace("{count}", String(left))}
          >
            {Array.from({ length: step.total }).map((_, i) => (
              <span
                key={i}
                aria-hidden
                className={cn(
                  "size-3 rounded-full border-[1.5px] border-[var(--tradeoff-accent)] transition-colors",
                  i < left ? "bg-[var(--tradeoff-accent)]" : "bg-transparent opacity-30",
                )}
              />
            ))}
            <span className="text-muted-foreground ml-2 font-mono text-[11px] font-semibold uppercase tracking-[0.08em]">
              {dict.budget.toPlace.replace("{count}", String(left))}
            </span>
          </div>
        )}

        <div className="flex flex-col">
          {step.options.map((option, i) => {
            const n = displayUnits(option.label);
            const revealRow = showReveal
              ? revealRowByKey.get(option.id ?? option.label)
              : undefined;
            const mine = (revealRow?.yours ?? 0) > 0;
            return (
              <SwissRevealFillRow
                key={option.id ?? option.label}
                reveal={
                  revealRow
                    ? {
                        pct: Math.min(
                          100,
                          (revealRow.average / step.total) * 100,
                        ),
                        mine,
                      }
                    : null
                }
                className={cn(
                  "border-border border-b",
                  i === 0 && "border-t",
                  revealRow &&
                    (mine
                      ? "font-medium text-[color:var(--primary)]"
                      : "text-muted-foreground"),
                )}
              >
                <div className="flex items-center justify-between gap-3 py-3">
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span
                      className={cn(
                        "text-[16px] leading-snug",
                        n > 0 ? "font-bold" : "font-medium",
                        !revealRow && "text-foreground",
                      )}
                    >
                      {allLabelsTitled(step.options.map((o) => o.label)) ? (
                        <OptionLabel label={option.label} />
                      ) : (
                        option.label
                      )}
                    </span>
                    {option.description && (
                      <span
                        className={cn(
                          "text-[13px] leading-snug",
                          revealRow ? "opacity-75" : "text-muted-foreground",
                        )}
                      >
                        {option.description}
                      </span>
                    )}
                  </span>
                  <span className="relative flex shrink-0 items-center gap-2.5">
                    {!readOnly && (
                      <button
                        type="button"
                        aria-label={`− ${option.label}`}
                        disabled={locked || n === 0}
                        onClick={() => adjust(option.label, -1)}
                        className={cn(
                          "border-border enabled:hover:border-primary enabled:hover:bg-primary enabled:hover:text-primary-foreground flex size-10 items-center justify-center rounded-md border transition-all",
                          locked
                            ? "pointer-events-none opacity-0"
                            : "disabled:opacity-30",
                        )}
                      >
                        <Minus className="size-4" strokeWidth={2.5} />
                      </button>
                    )}
                    <span
                      className={cn(
                        "w-6 text-center font-mono text-[15px] font-bold",
                        !revealRow &&
                          (n > 0
                            ? "text-[color:var(--tradeoff-accent)]"
                            : "text-muted-foreground"),
                      )}
                    >
                      {n}
                    </span>
                    {revealRow && (
                      <span className="animate-in fade-in absolute right-0 top-1/2 mt-2.5 whitespace-nowrap text-[11px] opacity-75 duration-300">
                        {dict.budget.average} {revealRow.average}
                      </span>
                    )}
                    {!readOnly && (
                      <button
                        type="button"
                        aria-label={`+ ${option.label}`}
                        disabled={locked || left === 0}
                        onClick={() => adjust(option.label, 1)}
                        className={cn(
                          "border-border enabled:hover:border-primary enabled:hover:bg-primary enabled:hover:text-primary-foreground flex size-10 items-center justify-center rounded-md border transition-all",
                          locked
                            ? "pointer-events-none opacity-0"
                            : "disabled:opacity-30",
                        )}
                      >
                        <Plus className="size-4" strokeWidth={2.5} />
                      </button>
                    )}
                  </span>
                </div>
              </SwissRevealFillRow>
            );
          })}
        </div>

        {!readOnly && (
          <button
            type="button"
            disabled={left !== 0 || resolved}
            onClick={confirm}
            className={cn(
              "self-end rounded-md px-6 py-2 text-sm font-bold transition-all",
              left === 0
                ? "bg-[var(--tradeoff-accent)] text-white hover:opacity-90"
                : "bg-muted text-muted-foreground cursor-not-allowed",
              resolved && "invisible",
            )}
          >
            {left === 0
              ? t.confirm
              : dict.budget.placeMore.replace("{count}", String(left))}
          </button>
        )}
      </div>
    </SwissCard>
  );
}
