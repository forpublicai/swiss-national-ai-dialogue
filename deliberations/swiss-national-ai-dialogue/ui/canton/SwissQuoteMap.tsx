"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "@/components/ui";

import { MAP_VIEWBOX, cantonCentroids, cantonSvgPaths } from "./cantonPaths";
import { cantonName, getCantonById } from "./cantons";
import { SwissQuoteCard } from "../quotes/SwissQuoteCards";
import { useSwissDict, useSwissLocale } from "../../i18n";
import type { SnadWallEntry } from "../../types";
import styles from "./SwissQuoteMap.module.css";

const EASE = [0.22, 1, 0.36, 1] as const;

export function SwissQuoteMap({
  cantonCounts,
  quotes,
  className,
}: {
  cantonCounts: { canton: string; count: number }[];
  quotes: SnadWallEntry[];
  className?: string;
}) {
  const dict = useSwissDict();
  const locale = useSwissLocale();
  const [hovered, setHovered] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const [overflowing, setOverflowing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const clear = () => {
    setPinned(null);
    setHovered(null);
  };

  const quotesByCanton = useMemo(() => {
    const grouped = new Map<string, SnadWallEntry[]>();
    for (const quote of quotes) {
      if (!quote.canton || !cantonCentroids[quote.canton]) continue;
      grouped.set(quote.canton, [...(grouped.get(quote.canton) ?? []), quote]);
    }
    return grouped;
  }, [quotes]);

  const allQuotes = useMemo(() => {
    const seen = new Set<string | null>();
    const spread = quotes.filter((quote) => {
      if (seen.has(quote.canton)) return false;
      seen.add(quote.canton);
      return true;
    });
    const rest = quotes.filter((quote) => !spread.includes(quote));
    return [...spread, ...rest];
  }, [quotes]);

  const active = hovered ?? pinned;
  const activeCanton = active ? getCantonById(active) : undefined;
  const shown = active ? (quotesByCanton.get(active) ?? []) : allQuotes;
  const hasQuotes = quotesByCanton.size > 0 || quotes.length > 0;
  const panelKey = active ?? "all";

  const measurePanel = () => {
    const panel = panelRef.current;
    if (!panel) return;
    const remaining = panel.scrollHeight - panel.scrollTop - panel.clientHeight;
    setOverflowing(remaining > 8);
  };
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    panel.scrollTop = 0;
    measurePanel();
    const observer = new ResizeObserver(measurePanel);
    observer.observe(panel);
    return () => observer.disconnect();
  }, [panelKey]);

  const dots = useMemo(() => {
    const counted = cantonCounts.filter(
      ({ canton, count }) => count > 0 && cantonCentroids[canton],
    );
    const max = counted.reduce((top, { count }) => Math.max(top, count), 0);
    return counted.map(({ canton, count }) => {
      const t = max > 0 ? Math.sqrt(count / max) : 0;
      return {
        id: canton,
        x: cantonCentroids[canton].x,
        y: cantonCentroids[canton].y,
        core: 2 + 2.6 * t,
        halo: 7 + 15 * t,
        strength: 0.35 + 0.65 * t,
      };
    });
  }, [cantonCounts]);

  const map = (
    <svg
      viewBox={MAP_VIEWBOX}
      className="h-auto w-full"
      aria-hidden={hasQuotes ? undefined : "true"}
      focusable="false"
    >
      <defs>
        <radialGradient id="snad-canton-glow">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.5" />
          <stop offset="45%" stopColor="var(--primary)" stopOpacity="0.16" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </radialGradient>
      </defs>
      {Object.entries(cantonSvgPaths).map(([id, d]) => {
        const interactive = quotesByCanton.has(id);
        const isActive = active === id;
        const data = getCantonById(id);
        return (
          <path
            key={id}
            d={d}
            fill={
              isActive
                ? "color-mix(in srgb, var(--primary) 10%, transparent)"
                : interactive
                  ? "color-mix(in srgb, var(--primary) 4%, transparent)"
                  : "transparent"
            }
            stroke={
              isActive
                ? "var(--primary)"
                : interactive
                  ? "color-mix(in srgb, var(--primary) 40%, transparent)"
                  : "color-mix(in srgb, var(--foreground) 12%, transparent)"
            }
            strokeWidth={isActive ? 1 : interactive ? 0.75 : 0.5}
            {...(interactive
              ? {
                  role: "button",
                  tabIndex: 0,
                  "aria-label": data ? cantonName(data, locale) : id,
                  "aria-pressed": pinned === id,
                  className:
                    "cursor-pointer outline-none focus-visible:stroke-[var(--primary)]",
                  onPointerEnter: (event: React.PointerEvent<SVGPathElement>) => {
                    if (event.pointerType !== "mouse") return;
                    setHovered(id);
                  },
                  onPointerLeave: (event: React.PointerEvent<SVGPathElement>) => {
                    if (event.pointerType !== "mouse") return;
                    setHovered((current) => (current === id ? null : current));
                  },
                  onClick: () =>
                    pinned === id ? clear() : setPinned(id),
                  onKeyDown: (event: React.KeyboardEvent<SVGPathElement>) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    if (pinned === id) clear();
                    else setPinned(id);
                  },
                }
              : {})}
          />
        );
      })}
      <g className={styles.glow} pointerEvents="none">
        {dots.map((dot) => (
          <circle
            key={`halo-${dot.id}`}
            cx={dot.x}
            cy={dot.y}
            r={dot.halo}
            fill="url(#snad-canton-glow)"
            opacity={dot.strength}
          />
        ))}
      </g>
      <g pointerEvents="none">
        {dots.map((dot) => (
          <circle
            key={`core-${dot.id}`}
            cx={dot.x}
            cy={dot.y}
            r={dot.core}
            fill="var(--primary)"
          />
        ))}
      </g>
    </svg>
  );

  if (!hasQuotes) {
    return (
      <div className={cn("mx-auto w-full max-w-[1100px]", className)}>{map}</div>
    );
  }

  return (
    <div
      className={cn(
        "grid items-start gap-8 lg:grid-cols-[7fr_5fr] lg:gap-14",
        className,
      )}
    >
      <div className="min-w-0 lg:sticky lg:top-8">{map}</div>
      <div className="flex min-w-0 flex-col gap-4" aria-live="polite">
        <div className="flex items-baseline justify-between gap-3">
          <p
            className={cn(
              "flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.22em]",
              activeCanton ? "text-primary" : "text-muted-foreground",
            )}
          >
            <span aria-hidden className="bg-primary size-2 shrink-0" />
            {activeCanton
              ? cantonName(activeCanton, locale)
              : dict.landing.quotesEyebrow}
          </p>
          {pinned && (
            <button
              type="button"
              onClick={clear}
              className="text-muted-foreground hover:text-foreground shrink-0 text-xs font-semibold underline underline-offset-2 transition-colors"
            >
              {dict.landing.quotesAllCantons}
            </button>
          )}
        </div>
        <div className="relative">
          <div
            ref={panelRef}
            onScroll={measurePanel}
            className={cn(
              styles.panel,
              "overflow-y-auto overscroll-contain pr-0.5",
            )}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={panelKey}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: EASE }}
                className="flex flex-col gap-3"
              >
                {shown.map((quote, index) => (
                  <SwissQuoteCard key={`${panelKey}-${index}`} entry={quote} />
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
          <div
            aria-hidden
            className={cn(
              styles.fade,
              "pointer-events-none absolute inset-x-0 bottom-0 transition-opacity duration-300",
              overflowing ? "opacity-100" : "opacity-0",
            )}
          />
        </div>
        <p className="text-muted-foreground text-xs leading-relaxed">
          {dict.landing.quotesHint}
        </p>
      </div>
    </div>
  );
}
