"use client";

import { type CSSProperties, useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/components/ui";

import {
  trackQuestionAnswered,
  trackQuestionShown,
} from "../../analytics";

import type { AwaitingEventOf } from "../../types";
import { splitTitledLabel, SwissCard } from "./SwissCardChrome";
import { SwissSliderCurve } from "./SwissSliderCurve";
import { sliderDistribution, type SliderPollCounts } from "./opener-poll-math";
import { useOpenerPoll } from "./use-opener-poll";
import { useSwissDict } from "../../i18n";

type SliderStep = Extract<
  AwaitingEventOf<"awaiting_opener_sequence">["steps"][number],
  { kind: "slider" }
>;

const SLUG = "swiss-national-ai-dialogue";

const shownFired = new Set<string>();

function PoleLabel({
  label,
  active,
  alignRight = false,
}: {
  label: string;
  active: boolean;
  alignRight?: boolean;
}) {
  const parts = splitTitledLabel(label);
  if (!parts) {
    return (
      <span
        className={cn(
          "min-w-0 max-w-[46%] text-[14px] font-semibold leading-snug",
          alignRight && "text-right",
          active ? "text-[color:var(--tradeoff-accent)]" : "text-foreground",
        )}
      >
        {label}
      </span>
    );
  }
  return (
    <span
      className={cn(
        "flex min-w-0 max-w-[46%] flex-col gap-0.5",
        alignRight && "text-right",
      )}
    >
      <span
        className={cn(
          "text-[14px] font-bold leading-snug",
          active ? "text-[color:var(--tradeoff-accent)]" : "text-foreground",
        )}
      >
        {parts.title}
      </span>
      <span className="text-muted-foreground text-[12px] leading-snug">
        {parts.rest}
      </span>
    </span>
  );
}

export function SwissContinuousSliderCard({
  step,
  theme,
  answer,
  onAnswer,
  readOnly,
  revealPolls,
  onSkip,
  actionsLead,
}: {
  step: SliderStep;
  theme?: string;
  answer: Record<string, unknown> | null;
  onAnswer: (result: Record<string, unknown>) => void;
  readOnly?: boolean;
  onSkip?: () => void;
  // Left side of the same action row (the beta thumbs).
  actionsLead?: ReactNode;
  revealPolls?: boolean;
}) {
  const dict = useSwissDict();
  const t = dict.tradeoff;

  const committedPosition =
    typeof answer?.position === "number"
      ? Math.min(100, Math.max(0, answer.position))
      : null;
  const resolved = committedPosition !== null;
  const locked = Boolean(readOnly) || resolved;

  const [position, setPosition] = useState(50);
  const [touched, setTouched] = useState(false);

  const themeSlug = theme?.trim() || "unknown";
  const trackParams = {
    campaignSlug: SLUG,
    theme: themeSlug,
    openerId: step.opener_id ?? null,
    kind: "slider" as const,
  };

  useEffect(() => {
    if (readOnly || resolved || shownFired.has(step.question)) return;
    shownFired.add(step.question);
    trackQuestionShown({
      campaignSlug: SLUG,
      theme: themeSlug,
      openerId: step.opener_id ?? null,
      kind: "slider",
    });
  }, [readOnly, resolved, step.question, step.opener_id, themeSlug]);

  const stripRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const positionFromClientX = (clientX: number) => {
    const rect = stripRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 50;
    return ((clientX - rect.left) / rect.width) * 100;
  };

  const move = (next: number) => {
    if (locked) return;
    setPosition(Math.min(100, Math.max(0, next)));
    setTouched(true);
  };

  const confirm = () => {
    if (locked || !touched) return;
    trackQuestionAnswered({ ...trackParams, position });
    onAnswer({ position });
  };

  const displayPos = resolved ? committedPosition : position;
  const active = touched || resolved;

  const pollArm = revealPolls || !readOnly;
  const othersPoll = useOpenerPoll<SliderPollCounts>(
    "slider",
    { openerId: step.opener_id, question: step.question },
    pollArm,
  );
  const dist = othersPoll
    ? sliderDistribution(othersPoll, committedPosition)
    : null;
  const revealed = pollArm && resolved && dist !== null;

  return (
    <SwissCard question={step.question}>
      <div
        className="flex flex-col gap-4"
        style={{ "--tradeoff-accent": "var(--primary)" } as CSSProperties}
      >
        <div
          className={cn(
            "flex flex-col gap-4 touch-none",
            !locked && "cursor-pointer",
          )}
          onPointerDown={(e) => {
            if (locked) return;
            draggingRef.current = true;
            move(positionFromClientX(e.clientX));
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch {}
          }}
          onPointerMove={(e) => {
            if (draggingRef.current) move(positionFromClientX(e.clientX));
          }}
          onPointerUp={() => {
            draggingRef.current = false;
          }}
          onPointerCancel={() => {
            draggingRef.current = false;
          }}
        >
          <div ref={stripRef} className="relative py-4">
            {revealed && dist && (
              <div
                aria-hidden
                className="animate-in fade-in absolute inset-x-0 -top-2 bottom-1/2 duration-300 ease-out"
              >
                <SwissSliderCurve
                  bins={dist.bars.map((bar) => bar.count)}
                  youPosition={committedPosition}
                />
              </div>
            )}
            <div className="relative h-2 rounded-full bg-border">
              <div
                aria-hidden
                className={cn(
                  "absolute inset-y-0 left-0 rounded-full transition-colors duration-300 ease-out",
                  active && !revealed
                    ? "bg-[var(--tradeoff-accent)]"
                    : "bg-transparent",
                )}
                style={{ width: `${displayPos}%` }}
              />
              <span
                aria-hidden
                className={cn(
                  "absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-md transition-colors",
                  active
                    ? "bg-[var(--tradeoff-accent)]"
                    : "border-border bg-card border-2",
                )}
                style={{ left: `${displayPos}%` }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={displayPos}
              disabled={locked}
              onChange={(e) => move(Number(e.target.value))}
              aria-label={step.question}
              aria-valuetext={`${displayPos} — ${
                displayPos < 50 ? step.min_label : step.max_label
              }`}
              className="pointer-events-none absolute inset-0 m-0 h-full w-full opacity-0"
            />
          </div>

          <div className="flex items-start justify-between gap-4">
            <PoleLabel
              label={step.min_label}
              active={active && displayPos < 50}
            />
            <PoleLabel
              label={step.max_label}
              active={active && displayPos > 50}
              alignRight
            />
          </div>
        </div>

        {(actionsLead || !readOnly) && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center">{actionsLead}</div>
            <div className="flex items-center gap-4">
            {onSkip && !resolved && !readOnly && (
              <button
                type="button"
                data-testid="question-skip"
                onClick={onSkip}
                className="text-muted-foreground hover:text-foreground rounded-md px-1 py-1 text-sm font-medium transition-colors"
              >
                {dict.question.skip}
              </button>
            )}
            {!readOnly && (
              <button
                type="button"
                disabled={!touched || resolved}
                onClick={confirm}
                className={cn(
                  "rounded-md px-6 py-2 text-sm font-bold transition-all",
                  touched
                    ? "bg-[var(--tradeoff-accent)] text-white hover:opacity-90"
                    : "bg-muted text-muted-foreground cursor-not-allowed",
                  resolved && "invisible",
                )}
              >
                {t.confirm}
              </button>
            )}
            </div>
          </div>
        )}
      </div>
    </SwissCard>
  );
}
