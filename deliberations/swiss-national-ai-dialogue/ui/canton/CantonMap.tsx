"use client";

import { motion } from "motion/react";
import { useMemo, useState } from "react";

import { cn } from "@/components/ui";

import { cantonData, cantonName, getCantonById } from "./cantons";
import type { CantonData } from "./cantons";
import { MAP_VIEWBOX, cantonBounds, cantonSvgPaths } from "./cantonPaths";
import { fill, useSwissDict, useSwissLocale } from "../../i18n";

export { cantonData, getCantonById } from "./cantons";
export type { CantonData } from "./cantons";

const RENDER_ORDER: CantonData[] = [
  ...cantonData.filter((c) => c.id !== "AR" && c.id !== "AI"),
  ...cantonData.filter((c) => c.id === "AR" || c.id === "AI"),
];

/** Seeded PRNG (mulberry32) for deterministic dot placement. */
function seededRandom(seed: number): number {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/**
 * Ray-casting point-in-polygon test against a simplified SVG path. Treats
 * every coordinate pair in the path (including curve control points) as a
 * polygon vertex, good enough to keep scattered dots inside a canton.
 */
function isPointInPolygon(px: number, py: number, pathData: string): boolean {
  const vertices: [number, number][] = [];
  const nums = pathData.match(/-?\d+\.?\d*/g);
  if (!nums) return false;
  for (let i = 0; i < nums.length - 1; i += 2) {
    const x = parseFloat(nums[i]);
    const y = parseFloat(nums[i + 1]);
    if (x > -500 && x < 1500 && y > -500 && y < 1500) {
      vertices.push([x, y]);
    }
  }
  if (vertices.length < 3) return false;

  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const [xi, yi] = vertices[i];
    const [xj, yj] = vertices[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

interface Dot {
  x: number;
  y: number;
  cantonId: string;
}

function generateDotsInCanton(
  cantonId: string,
  count: number,
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  pathData: string,
): Dot[] {
  const dots: Dot[] = [];
  let seed = 0;
  for (let i = 0; i < cantonId.length; i++) {
    seed = seed * 31 + cantonId.charCodeAt(i);
  }

  const padX = (bounds.maxX - bounds.minX) * 0.08;
  const padY = (bounds.maxY - bounds.minY) * 0.08;
  const minX = bounds.minX + padX;
  const maxX = bounds.maxX - padX;
  const minY = bounds.minY + padY;
  const maxY = bounds.maxY - padY;

  let attempts = 0;
  while (dots.length < count && attempts < count * 50) {
    const r1 = seededRandom(seed + attempts * 7919);
    const r2 = seededRandom(seed + attempts * 7919 + 1);
    const x = minX + r1 * (maxX - minX);
    const y = minY + r2 * (maxY - minY);
    attempts++;
    if (isPointInPolygon(x, y, pathData)) {
      dots.push({ x, y, cantonId });
    }
  }
  return dots;
}

interface CantonMapProps {
  /**
   * Picker mode. Fires with the 2-letter canton id when the participant
   * clicks a shape. Omit for density (display-only) mode.
   */
  onSelect?: (cantonId: string) => void;
  /** Canton id to keep highlighted (e.g. the one just picked). */
  selectedCanton?: string | null;
  /** Disables interaction once a selection has been committed. */
  disabled?: boolean;
  /**
   * Density mode. Map of 2-letter canton id → participant count. When
   * provided, the map scatters animated dots inside each canton (one dot per
   * `participantsPerDot` participants) and the tooltip shows the tally.
   */
  participantCounts?: Record<string, number>;
  /** Participants represented by each dot in density mode. */
  participantsPerDot?: number;
  /**
   * Enlarge the map: drop the `max-w-3xl` reading cap so the SVG fills its
   * column (the onboarding canton beat gives it a wide column). The
   * in-chat picker leaves this off and keeps the compact size.
   */
  large?: boolean;
  /**
   * Picker-mode escape hatch rendered over the map's empty north-west corner:
   * a tappable "Not in Switzerland" button for participants with no canton
   * (kept sentinel-agnostic — the picker owns what selecting it commits).
   */
  notInSwitzerland?: { label: string; active: boolean; onSelect: () => void };
}

export default function CantonMap({
  onSelect,
  selectedCanton,
  disabled = false,
  participantCounts,
  participantsPerDot = 3,
  large = false,
  notInSwitzerland,
}: CantonMapProps) {
  const [hoveredCanton, setHoveredCanton] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const locale = useSwissLocale();
  const dict = useSwissDict();

  const isDensity = participantCounts != null;
  const interactive = typeof onSelect === "function" && !disabled;

  // Density dots, empty array (no work) unless participantCounts is set.
  const allDots = useMemo(() => {
    if (!participantCounts) return [];
    const dots: Dot[] = [];
    for (const canton of cantonData) {
      const count = participantCounts[canton.id] || 0;
      if (count <= 0) continue;
      const dotCount = Math.max(1, Math.round(count / participantsPerDot));
      const pathData = cantonSvgPaths[canton.id];
      const bounds = cantonBounds[canton.id];
      if (pathData && bounds) {
        dots.push(
          ...generateDotsInCanton(canton.id, dotCount, bounds, pathData),
        );
      }
    }
    return dots;
  }, [participantCounts, participantsPerDot]);

  const hoveredData = hoveredCanton ? getCantonById(hoveredCanton) : null;
  const hoveredCount =
    hoveredCanton && participantCounts
      ? participantCounts[hoveredCanton] || 0
      : 0;

  return (
    <div
      className={`relative mx-auto w-full ${large ? "max-w-none" : "max-w-3xl"}`}
    >
      {notInSwitzerland && (
        <button
          type="button"
          onClick={notInSwitzerland.onSelect}
          className={cn(
            "absolute bottom-1.5 right-1.5 z-10 max-w-[8rem] rounded-md border px-2 py-1 text-right text-[11px] font-medium leading-tight transition-colors",
            notInSwitzerland.active
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border/70 bg-card/80 text-muted-foreground hover:border-primary hover:bg-primary hover:text-primary-foreground",
          )}
        >
          {notInSwitzerland.label}
        </button>
      )}
      <svg
        viewBox={MAP_VIEWBOX}
        className="h-auto w-full"
        onMouseLeave={() => setHoveredCanton(null)}
      >
        {RENDER_ORDER.map((canton, i) => {
          const pathData = cantonSvgPaths[canton.id];
          if (!pathData) return null;
          const isHovered = hoveredCanton === canton.id;
          const isSelected = selectedCanton === canton.id;
          return (
            <motion.path
              key={canton.id}
              d={pathData}
              fill={
                isSelected
                  ? "color-mix(in srgb, var(--primary) 38%, var(--card))"
                  : isHovered
                    ? "color-mix(in srgb, var(--primary) 16%, var(--card))"
                    : "var(--card)"
              }
              stroke={
                isSelected || isHovered
                  ? "var(--primary)"
                  : "color-mix(in srgb, var(--foreground) 24%, transparent)"
              }
              strokeWidth={isSelected || isHovered ? "0.9" : "0.5"}
              className={interactive ? "cursor-pointer" : "cursor-default"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: i * 0.02 }}
              onMouseEnter={(e) => {
                setHoveredCanton(canton.id);
                const svg = e.currentTarget.ownerSVGElement;
                if (svg) {
                  const rect = svg.getBoundingClientRect();
                  setTooltipPos({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                  });
                }
              }}
              onMouseMove={(e) => {
                const svg = e.currentTarget.ownerSVGElement;
                if (svg) {
                  const rect = svg.getBoundingClientRect();
                  setTooltipPos({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                  });
                }
              }}
              onClick={() => {
                if (!interactive) return;
                onSelect(canton.id);
              }}
            />
          );
        })}

        {allDots.length > 0 && (
          <motion.g
            className="pointer-events-none"
            style={{ filter: "drop-shadow(0 0 2px var(--primary))" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.4 }}
          >
            {allDots.map((dot, i) => (
              <circle
                key={`dot-${i}`}
                cx={dot.x}
                cy={dot.y}
                r={2.5}
                fill="var(--primary)"
                opacity={hoveredCanton === dot.cantonId ? 1 : 0.7}
                className="transition-opacity duration-150"
              />
            ))}
          </motion.g>
        )}
      </svg>

      {hoveredData && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-lg"
          style={{
            left: tooltipPos.x + 12,
            top: tooltipPos.y - 10,
            transform: "translateY(-100%)",
          }}
        >
          <div className="font-semibold text-foreground">
            {cantonName(hoveredData, locale)}
          </div>
          {isDensity && (
            <div className="text-xs text-muted-foreground">
              {fill(dict.canton.tooltip, { count: hoveredCount })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
