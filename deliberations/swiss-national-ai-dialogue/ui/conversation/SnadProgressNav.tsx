"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/components/ui";

import { OPENER_AUTO_ADVANCE_MS } from "../cards/SwissOpenerSequenceCard";
import { TOPIC_ICONS } from "../topic-icons";
import type { SnadSessionPayload } from "../../types";

export type SnadNavSegments = {
  total: number;
  done: number;
  active: number | null;
  countdown: "idle" | "running";
  viewed: number | null;
  fillMs?: number;
};

type SectionStep = {
  key: string;
  title: string;
  state: "done" | "current" | "upcoming";
};

function sectionSteps(
  topics: SnadSessionPayload["topics"],
  wrapUpLabel: string,
  completed: boolean,
): SectionStep[] {
  return [
    ...topics.map((topic) => ({
      key: topic.key,
      title: topic.title,
      state: topic.state,
    })),
    {
      key: "wrap-up",
      title: wrapUpLabel,
      state: completed
        ? ("done" as const)
        : topics.every((topic) => topic.state === "done")
          ? ("current" as const)
          : ("upcoming" as const),
    },
  ];
}

function useOverallPercent(
  steps: SectionStep[],
  segments: SnadNavSegments | null,
  viewedKey: string | null,
): number {
  const doneCount = steps.filter((step) => step.state === "done").length;
  const withinTopic =
    viewedKey === null && segments && segments.active !== null && segments.total > 0
      ? Math.min(segments.done / segments.total, 1)
      : 0;
  const rawFraction =
    doneCount >= steps.length ? 1 : (doneCount + withinTopic) / steps.length;
  const rawPercent = Math.round(rawFraction * 100);
  const floorRef = useRef(0);
  const percent = Math.max(rawPercent, floorRef.current);
  floorRef.current = percent;
  return percent;
}

export function SnadSectionMenu({
  topics,
  wrapUpLabel,
  viewedKey,
  onSelect,
  segments,
  completed = false,
}: {
  topics: SnadSessionPayload["topics"];
  wrapUpLabel: string;
  viewedKey: string | null;
  onSelect: (key: string | null) => void;
  segments: SnadNavSegments | null;
  completed?: boolean;
}) {
  const steps = sectionSteps(topics, wrapUpLabel, completed);
  const percent = useOverallPercent(steps, segments, viewedKey);
  const currentStep = steps.find((step) => step.state === "current") ?? null;
  const viewedStep =
    viewedKey === null
      ? null
      : (steps.find((step) => step.key === viewedKey) ?? null);
  const [open, setOpen] = useState(false);
  const menuRootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!menuRootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const label =
    viewedStep?.title ??
    currentStep?.title ??
    steps.find((step) => step.state !== "done")?.title ??
    steps.at(-1)?.title ??
    "";

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <div ref={menuRootRef} className="relative min-w-0">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-haspopup="menu"
          aria-expanded={open}
          data-testid="snad-section-menu"
          className={cn(
            "flex h-9 min-w-0 cursor-pointer items-center gap-1.5 rounded-full text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--primary)_50%,transparent)]",
            viewedStep
              ? "text-[color:var(--primary)]"
              : "text-foreground hover:text-foreground/70",
          )}
        >
          <span className="truncate">{label}</span>
          <ChevronDown
            aria-hidden
            className={cn(
              "size-4 shrink-0 opacity-60 transition-transform",
              open && "rotate-180",
            )}
          />
        </button>
        {open && (
          <div
            role="menu"
            className="animate-in fade-in slide-in-from-top-1 border-border bg-card absolute right-0 top-full z-50 mt-1 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border py-1 shadow-lg duration-150"
          >
            {steps.map((step) => {
              const done = step.state === "done";
              const current = step.state === "current";
              const isViewed = viewedKey !== null && step.key === viewedKey;
              const StepIcon = TOPIC_ICONS[step.key];
              if (!done && !current) {
                return (
                  <div
                    key={step.key}
                    role="menuitem"
                    aria-disabled
                    className="text-muted-foreground/60 flex w-full items-center gap-2.5 px-3 py-2 text-sm font-medium"
                  >
                    {StepIcon ? (
                      <StepIcon aria-hidden className="size-4 shrink-0 opacity-50" />
                    ) : (
                      <span aria-hidden className="size-4 shrink-0" />
                    )}
                    <span className="truncate">{step.title}</span>
                  </div>
                );
              }
              return (
                <button
                  key={step.key}
                  type="button"
                  role="menuitemradio"
                  data-testid={`section-item-${step.key}`}
                  aria-checked={current ? viewedKey === null : isViewed}
                  onClick={() => {
                    setOpen(false);
                    onSelect(current || isViewed ? null : step.key);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm font-medium transition-colors",
                    isViewed
                      ? "bg-primary/10 text-foreground"
                      : "text-foreground/80 hover:bg-primary/5",
                  )}
                >
                  {StepIcon ? (
                    <StepIcon
                      aria-hidden
                      className={cn(
                        "size-4 shrink-0",
                        current ? "text-[color:var(--primary)]" : "opacity-60",
                      )}
                    />
                  ) : current ? (
                    <span
                      aria-hidden
                      className="flex size-4 shrink-0 items-center justify-center"
                    >
                      <span className="bg-primary size-1.5 animate-pulse rounded-full" />
                    </span>
                  ) : (
                    <Check aria-hidden className="size-4 shrink-0 opacity-60" />
                  )}
                  <span className="truncate">{step.title}</span>
                  {done && (
                    <Check aria-hidden className="ml-auto size-4 shrink-0 opacity-60" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <span className="shrink-0 text-[12px] font-semibold tabular-nums text-[color:var(--primary)]">
        {percent}
      </span>
    </div>
  );
}

export function SnadProgressNav({
  topics,
  wrapUpLabel,
  viewedKey,
  segments,
  completed = false,
}: {
  topics: SnadSessionPayload["topics"];
  wrapUpLabel: string;
  viewedKey: string | null;
  segments: SnadNavSegments | null;
  completed?: boolean;
}) {
  const steps = sectionSteps(topics, wrapUpLabel, completed);
  const percent = useOverallPercent(steps, segments, viewedKey);

  if (segments && segments.total > 1) {
    const shownIndex = steps.findIndex((step) =>
      viewedKey !== null ? step.key === viewedKey : step.state === "current",
    );
    const context =
      shownIndex >= 0
        ? {
            left: steps.slice(0, shownIndex).map((step) => step.state),
            right: steps.slice(shownIndex + 1).map((step) => step.state),
          }
        : undefined;
    return <SegmentBar segments={segments} context={context} />;
  }
  return (
    <div className="flex h-4 w-full items-center px-3">
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-[3px] w-full overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--primary)_14%,transparent)]"
      >
        <div
          className="h-full bg-[var(--primary)] transition-[width] duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function SectionStub({ state }: { state: SectionStep["state"] }) {
  return (
    <span
      aria-hidden
      className={cn(
        "h-[3px] w-2 shrink-0 rounded-full",
        state === "done"
          ? "bg-[color-mix(in_srgb,var(--primary)_55%,transparent)]"
          : "bg-[color-mix(in_srgb,var(--primary)_12%,transparent)]",
      )}
    />
  );
}

function SegmentBar({
  segments,
  context,
}: {
  segments: SnadNavSegments;
  context?: {
    left: SectionStep["state"][];
    right: SectionStep["state"][];
  };
}) {
  const { total, done, active, countdown, viewed } = segments;
  const fillMs = segments.fillMs ?? OPENER_AUTO_ADVANCE_MS;
  return (
    <div aria-hidden className="flex h-4 w-full items-center gap-1 px-3">
      <style>{`@keyframes snad-segment-fill { from { transform: scaleX(0); } to { transform: scaleX(1); } }`}</style>
      {context?.left.map((state, index) => (
        <SectionStub key={`l-${index}`} state={state} />
      ))}
      {Array.from({ length: total }, (_, index) => {
        const isActive = index === active;
        const isDone = index < done || (active === null && index < total);
        const counting = isActive && countdown !== "idle";
        const isViewed = viewed !== null && index === viewed;
        return (
          <span
            key={index}
            data-testid="snad-segment"
            className="flex h-full min-w-0 flex-1 items-center"
          >
            <span
              className={cn(
                "relative block h-[3px] w-full overflow-hidden rounded-full transition-all",
                isDone && !isActive
                  ? "bg-[var(--primary)]"
                  : "bg-[color-mix(in_srgb,var(--primary)_18%,transparent)]",
                isViewed &&
                  "ring-2 ring-[color-mix(in_srgb,var(--primary)_35%,transparent)]",
              )}
            >
              {counting && (
                <span
                  className="absolute inset-0 origin-left rounded-full bg-[var(--primary)]"
                  style={{
                    animation: `snad-segment-fill ${fillMs}ms linear forwards`,
                  }}
                />
              )}
            </span>
          </span>
        );
      })}
      {context?.right.map((state, index) => (
        <SectionStub key={`r-${index}`} state={state} />
      ))}
    </div>
  );
}
