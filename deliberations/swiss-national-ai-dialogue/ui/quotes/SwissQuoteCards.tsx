"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { motion } from "motion/react";

import { cn } from "@/components/ui";

import { cantonName, getCantonById } from "../canton/cantons";
import { useSwissDict, useSwissLocale } from "../../i18n";
import type { SnadWallEntry } from "../../types";

const EASE = [0.22, 1, 0.36, 1] as const;

const QUOTE_PREVIEW_WORDS = 26;

const WALL_MAX_HEIGHT = "min(60vh, 420px)";

export function quotePreview(text: string): {
  preview: string;
  truncated: boolean;
} {
  const trimmed = text.trim();
  const words = trimmed.split(/\s+/);
  if (words.length <= QUOTE_PREVIEW_WORDS)
    return { preview: trimmed, truncated: false };
  return {
    preview: `${words.slice(0, QUOTE_PREVIEW_WORDS).join(" ")}…`,
    truncated: true,
  };
}

export function SwissQuoteCard({
  entry,
  highlighted = false,
  label,
}: {
  entry: { text: string; canton: string | null };
  highlighted?: boolean;
  label?: string;
}) {
  const dict = useSwissDict();
  const locale = useSwissLocale();
  const [expanded, setExpanded] = useState(false);
  const { preview, truncated } = quotePreview(entry.text);
  const expandable = truncated && !highlighted;
  const canton =
    entry.canton && /^[A-Z]{2}$/.test(entry.canton)
      ? getCantonById(entry.canton)
      : undefined;
  const cantonLabel = canton ? cantonName(canton, locale) : null;
  const text = expandable && !expanded ? preview : entry.text.trim();

  return (
    <figure
      onClick={expandable ? () => setExpanded((value) => !value) : undefined}
      className={cn(
        "flex flex-col gap-3 border p-5 text-left",
        highlighted
          ? "border-primary bg-[color-mix(in_srgb,var(--primary)_6%,var(--card))] border-2"
          : "border-border bg-card",
        expandable && "cursor-pointer",
      )}
    >
      {(label || cantonLabel) && (
        <figcaption className="flex items-baseline justify-between gap-3">
          {label ? (
            <span className="text-primary flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em]">
              <Check aria-hidden className="size-3.5 self-center" strokeWidth={3} />
              {label}
            </span>
          ) : (
            <span className="text-primary flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em]">
              <span aria-hidden className="bg-primary size-1.5 shrink-0" />
              {cantonLabel}
            </span>
          )}
          {label && cantonLabel && (
            <span className="text-muted-foreground shrink-0 text-[11px] font-bold uppercase tracking-[0.18em]">
              {cantonLabel}
            </span>
          )}
        </figcaption>
      )}
      <blockquote className="text-foreground text-[15px] leading-relaxed">
        “{text}”
      </blockquote>
      {expandable && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setExpanded((value) => !value);
          }}
          aria-expanded={expanded}
          className="text-muted-foreground hover:text-foreground self-start text-xs font-semibold underline underline-offset-2 transition-colors"
        >
          {expanded ? dict.quoteWall.showLess : dict.quoteWall.readMore}
        </button>
      )}
    </figure>
  );
}

export function SwissQuoteWall({
  ownText,
  canton,
  wall,
}: {
  ownText: string | null;
  canton: string | null;
  wall: SnadWallEntry[] | null;
}) {
  const dict = useSwissDict();
  const t = dict.contribution;
  return (
    <div className="flex flex-col gap-3">
      {ownText && (
        <SwissQuoteCard
          entry={{ text: ownText, canton }}
          highlighted
          label={t.yourNote}
        />
      )}
      {wall && wall.length > 0 && (
        <div
          className="flex flex-col gap-3 overflow-y-auto overscroll-contain pr-0.5"
          style={{ maxHeight: WALL_MAX_HEIGHT }}
        >
          {wall.map((entry, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: EASE, delay: 0.15 + index * 0.07 }}
            >
              <SwissQuoteCard entry={entry} />
            </motion.div>
          ))}
        </div>
      )}
      {wall && wall.length === 0 && (
        <div className="border-border flex flex-col items-center gap-1 border border-dashed px-4 py-6 text-center">
          <p className="text-muted-foreground text-sm">{t.empty}</p>
        </div>
      )}
    </div>
  );
}
