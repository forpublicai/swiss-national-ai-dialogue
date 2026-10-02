"use client";

import { type CSSProperties, type ReactNode, useEffect, useState } from "react";
import { Check } from "lucide-react";

import { cn } from "@/components/ui";

import { useSwissDict } from "../../i18n";

const SWISS_CARD_QUESTION_CLASS =
  "font-display text-[clamp(1.05rem,2.9vw,1.3rem)] font-bold leading-snug tracking-[-0.02em] text-[var(--hero-foreground)]";

function SwissCardEyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
      {children}
    </p>
  );
}

const STEM_BOUNDARY = /[.!?](?:\s*["»«”“’‘])?\s+/g;

function splitQuestionStem(
  text: string,
): { setup: string; ask: string } | null {
  let best: { setup: string; ask: string } | null = null;
  for (const match of text.matchAll(STEM_BOUNDARY)) {
    const end = (match.index ?? 0) + match[0].length;
    const setup = text.slice(0, end).trimEnd();
    const ask = text.slice(end).trim();
    if (ask.length >= 12 && setup.length >= 24 && ask.endsWith("?")) {
      best = { setup, ask };
    }
  }
  return best;
}

function StemText({ question }: { question: ReactNode }) {
  const parts =
    typeof question === "string" ? splitQuestionStem(question) : null;
  if (!parts) return <>{question}</>;
  return (
    <>
      <span className="mb-1.5 block font-normal leading-snug tracking-normal text-[color-mix(in_srgb,var(--hero-foreground)_78%,transparent)]">
        {parts.setup}
      </span>
      <span className="block">{parts.ask}</span>
    </>
  );
}

export function SwissCard({
  eyebrow,
  question,
  questionClassName,
  children,
  className,
  large = false,
}: {
  eyebrow?: ReactNode;
  question?: ReactNode;
  questionClassName?: string;
  children: ReactNode;
  className?: string;
  large?: boolean;
}) {
  return (
    <div
      className={cn(
        "animate-in fade-in slide-in-from-bottom-1 mx-auto flex w-full flex-col gap-4 duration-300",
        large ? "max-w-3xl" : "max-w-[34rem]",
        className,
      )}
    >
      {(eyebrow || question) && (
        <div className="flex flex-col gap-2">
          {eyebrow && <SwissCardEyebrow>{eyebrow}</SwissCardEyebrow>}
          {question && (
            <p
              className={cn(
                "border-border/60 border-b pb-3",
                questionClassName ?? SWISS_CARD_QUESTION_CLASS,
              )}
            >
              <StemText question={question} />
            </p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

export function SwissOpenerLead({ text }: { text: string }) {
  return (
    <p className="font-display text-pretty mx-auto mb-3 w-full max-w-[34rem] text-[clamp(1.2rem,3.6vw,1.7rem)] font-bold leading-[1.25] tracking-[-0.02em] text-[var(--hero-foreground)]">
      {text}
    </p>
  );
}

export function splitTitledLabel(
  label: ReactNode,
): { title: string; rest: string } | null {
  if (typeof label !== "string") return null;
  const idx = label.indexOf(":");
  if (idx === -1) return null;
  const title = label.slice(0, idx).trim();
  const rest = label.slice(idx + 1).trim();
  if (!title || title.length > 48 || !rest) return null;
  return { title, rest };
}

export function allLabelsTitled(labels: ReactNode[]): boolean {
  return (
    labels.length > 0 && labels.every((label) => splitTitledLabel(label) !== null)
  );
}

export function OptionLabel({ label }: { label: ReactNode }) {
  const parts = splitTitledLabel(label);
  if (!parts) return <>{label}</>;
  return (
    <>
      <span className="block font-bold">{parts.title}</span>
      <span className="font-normal">{parts.rest}</span>
    </>
  );
}

export function SwissOptionRow({
  selected,
  multi,
  locked = false,
  dimmed = false,
  muted = false,
  split = false,
  onClick,
  label,
  description,
  result = null,
  expansion,
}: {
  selected: boolean;
  multi: boolean;
  locked?: boolean;
  dimmed?: boolean;
  muted?: boolean;
  split?: boolean;
  onClick: () => void;
  label: ReactNode;
  description?: ReactNode;
  result?: { count: number; pct: number } | null;
  expansion?: ReactNode;
}) {
  const mine = result !== null && selected;
  const fill = useRevealFill(result === null ? null : result.pct);
  const expandable = expansion !== undefined;
  const inlineField = Boolean(expansion);

  const row = (
    <button
      type="button"
      role={multi ? "checkbox" : "radio"}
      aria-checked={selected}
      disabled={locked || result !== null}
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-md text-left text-[15px] leading-snug transition-colors",
        inlineField ? "shrink-0" : "w-full",
        result !== null
          ? cn(
              "bg-card cursor-default",
              mine ? "text-[color:var(--primary)]" : "text-muted-foreground",
            )
          : cn(
              locked
                ? "cursor-default"
                : "cursor-pointer hover:bg-[color-mix(in_srgb,var(--hero-foreground)_4%,transparent)]",
              selected && !expandable && "bg-primary/5",
              "text-foreground",
              dimmed && "opacity-40",
            ),
      )}
    >
      {result !== null && (
        <span
          aria-hidden
          className={cn(
            "absolute inset-y-0 left-0 rounded-md transition-[width] duration-700 ease-out",
            mine
              ? "bg-[color-mix(in_srgb,var(--primary)_12%,transparent)]"
              : "bg-[color-mix(in_srgb,var(--hero-foreground)_7%,transparent)]",
          )}
          style={{ width: `${fill}%` }}
        />
      )}
      <span className="relative flex w-full items-start justify-between gap-3 px-3.5 py-3">
        <span
          aria-hidden
          className={cn(
            "mt-0.5 flex size-5 shrink-0 items-center justify-center border-[1.5px] transition-colors",
            multi ? "rounded-[4px]" : "rounded-full",
            selected
              ? "border-[color:var(--primary)]"
              : cn(
                  "border-[color:color-mix(in_srgb,var(--hero-foreground)_35%,transparent)]",
                  !locked && result === null && "group-hover:border-[color:var(--primary)]",
                ),
            multi && selected && "bg-[color:var(--primary)]",
          )}
        >
          {selected &&
            (multi ? (
              <Check
                className="text-primary-foreground size-3"
                strokeWidth={3}
              />
            ) : (
              <span className="size-2.5 rounded-full bg-[color:var(--primary)]" />
            ))}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-start justify-between gap-3">
            <span
              className={cn(
                "whitespace-normal font-medium leading-snug",
                muted &&
                  !selected &&
                  result === null &&
                  cn(
                    "text-muted-foreground/70",
                    !locked && "group-hover:text-foreground",
                  ),
              )}
            >
              {split ? <OptionLabel label={label} /> : label}
            </span>
            {result !== null && (
              <span className="flex w-14 shrink-0 items-start justify-end">
                <span
                  className={cn(
                    "flex items-center gap-1 tabular-nums",
                    mine && "font-bold",
                  )}
                >
                  {result.pct}%
                </span>
              </span>
            )}
          </span>
          {description && (
            <span className="whitespace-normal text-[13px] leading-snug opacity-75">
              {description}
            </span>
          )}
        </span>
      </span>
    </button>
  );

  if (!expandable) return row;
  return (
    <div className="flex w-full items-center rounded-md">
      {row}
      {expansion}
    </div>
  );
}

export function SwissRevealFillRow({
  reveal,
  className,
  children,
}: {
  reveal: { pct: number; mine: boolean } | null;
  className?: string;
  children: ReactNode;
}) {
  const fill = useRevealFill(reveal === null ? null : reveal.pct);
  return (
    <div className={cn("relative w-full overflow-hidden", className)}>
      {reveal !== null && !reveal.mine && (
        <div
          aria-hidden
          className="absolute inset-y-0 left-0 bg-[color-mix(in_srgb,var(--hero-foreground)_8%,transparent)] transition-[width] duration-700 ease-out"
          style={{ width: `${fill}%` }}
        />
      )}
      <div className="relative">{children}</div>
      {reveal !== null && reveal.mine && (
        <div
          aria-hidden
          className="bg-primary text-primary-foreground absolute inset-0 transition-[clip-path] duration-700 ease-out"
          style={{ clipPath: `inset(0 ${100 - fill}% 0 0)` }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function useRevealFill(pct: number | null, unarmed = 0): number {
  const [armed, setArmed] = useState(false);
  const hasResult = pct !== null;
  useEffect(() => {
    if (!hasResult) return;
    const frame = requestAnimationFrame(() => setArmed(true));
    return () => cancelAnimationFrame(frame);
  }, [hasResult]);
  if (pct === null) return 0;
  if (!armed) return unarmed;
  if (pct <= 0) return 0;
  return Math.max(pct, 2);
}

export function SwissPollPanel({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const dict = useSwissDict();
  return (
    <div
      className={cn(
        "bg-card border-border flex flex-col gap-2.5 rounded-lg border border-l-4 border-l-[color:var(--primary)] p-4",
        className,
      )}
      style={style}
    >
      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--primary)]">
        {dict.tradeoff.pollKicker}
      </p>
      {children}
    </div>
  );
}
