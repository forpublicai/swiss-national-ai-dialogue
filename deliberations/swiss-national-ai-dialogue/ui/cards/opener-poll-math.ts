import {
  MCQ_OTHER_SENTINEL,
  SLIDER_BIN_COUNT,
  sliderBinIndex,
} from "../../types";

import type { PollDistribution } from "./tradeoff-poll-math";

export type BinaryPollCounts = { total: number; sides: [number, number] };
export type McqPollCounts = { total: number; options: Record<string, number> };
export type SliderPollCounts = { total: number; bins: number[] };
export type BudgetPollCounts = { total: number; sums: Record<string, number> };
export type RankingPollCounts = {
  total: number;
  meanRank: Record<string, number>;
};

export function sliderDistribution(
  server: SliderPollCounts,
  selfPosition: number | null,
): PollDistribution {
  const bins = Array.from(
    { length: SLIDER_BIN_COUNT },
    (_, i) => server.bins[i] ?? 0,
  );
  let total = server.total;
  let youIndex: number | null = null;
  if (selfPosition !== null) {
    youIndex = sliderBinIndex(selfPosition);
    const centreOffset = selfPosition / (100 / SLIDER_BIN_COUNT) - 0.5;
    const lower = Math.floor(centreOffset);
    const upperWeight = centreOffset - lower;
    const fold = (index: number, weight: number) => {
      const clamped = Math.min(SLIDER_BIN_COUNT - 1, Math.max(0, index));
      bins[clamped] += weight;
    };
    fold(lower, 1 - upperWeight);
    fold(lower + 1, upperWeight);
    total += 1;
  }
  const bars = bins.map((count) => ({
    count,
    pct: total > 0 ? Math.round((count / total) * 100) : 0,
  }));
  return { total, bars, youIndex };
}

export function sliderPercentile(
  dist: PollDistribution,
  selfPosition: number,
): { side: "min" | "max"; pct: number } | null {
  const others = dist.total - 1;
  if (others <= 0 || dist.youIndex === null) return null;
  const below = dist.bars
    .slice(0, dist.youIndex)
    .reduce((sum, bar) => sum + bar.count, 0);
  const above = dist.bars
    .slice(dist.youIndex + 1)
    .reduce((sum, bar) => sum + bar.count, 0);
  const side = selfPosition >= 50 ? ("max" as const) : ("min" as const);
  return {
    side,
    pct: Math.round(((side === "max" ? below : above) / others) * 100),
  };
}

export type SliderCurvePaths = { line: string; area: string };

export function sliderCurvePaths(bins: number[]): SliderCurvePaths | null {
  if (bins.length === 0 || bins.reduce((sum, b) => sum + b, 0) <= 0) {
    return null;
  }
  const smoothed = bins.map((bin, i) => {
    const left = bins[i - 1] ?? bin;
    const right = bins[i + 1] ?? bin;
    return (left + 2 * bin + right) / 4;
  });
  const max = Math.max(...smoothed);
  const binWidth = 100 / bins.length;
  const points = [
    { x: 0, v: smoothed[0]! },
    ...smoothed.map((v, i) => ({ x: (i + 0.5) * binWidth, v })),
    { x: 100, v: smoothed[smoothed.length - 1]! },
  ].map(({ x, v }) => ({ x, y: 98 - (v / max) * 86 }));
  const clampY = (y: number) => Math.min(100, Math.max(2, y));
  const line = points
    .map((point, i) => {
      if (i === 0) return `M ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
      const before = points[i - 2] ?? points[i - 1]!;
      const from = points[i - 1]!;
      const after = points[i + 1] ?? point;
      const c1x = from.x + (point.x - before.x) / 6;
      const c1y = clampY(from.y + (point.y - before.y) / 6);
      const c2x = point.x - (after.x - from.x) / 6;
      const c2y = clampY(point.y - (after.y - from.y) / 6);
      return `C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    })
    .join(" ");
  return { line, area: `${line} L 100 100 L 0 100 Z` };
}

export type BudgetRow = {
  key: string;
  label: string;
  // The participant's own units on this option.
  yours: number;
  // Mean units per respondent (own answer folded in), one decimal.
  average: number;
};

export function budgetRows(
  server: BudgetPollCounts,
  selfByLabel: Record<string, number> | null,
  options: { key: string; label: string }[],
): { total: number; rows: BudgetRow[] } {
  const sums = new Map<string, number>(Object.entries(server.sums));
  let total = server.total;
  if (selfByLabel && Object.keys(selfByLabel).length > 0) {
    total += 1;
    for (const { key, label } of options) {
      const units = selfByLabel[label] ?? 0;
      if (units > 0) sums.set(key, (sums.get(key) ?? 0) + units);
    }
  }
  const rows = options.map(({ key, label }) => ({
    key,
    label,
    yours: selfByLabel?.[label] ?? 0,
    average:
      total > 0 ? Math.round(((sums.get(key) ?? 0) / total) * 10) / 10 : 0,
  }));
  return { total, rows };
}

export type RankingRow = {
  key: string;
  label: string;
  // The participant's own 1-based rank for this option (1 = best), or null.
  yourRank: number | null;
  meanRank: number;
};

export function rankingRows(
  server: RankingPollCounts,
  selfOrder: string[] | null,
  options: { key: string; label: string }[],
): { total: number; rows: RankingRow[] } {
  const hasSelf = Boolean(selfOrder && selfOrder.length > 0);
  const yourRankByKey = new Map<string, number>();
  (selfOrder ?? []).forEach((id, i) => yourRankByKey.set(id, i + 1));
  const rows = options.map(({ key, label }) => {
    const others = server.meanRank[key];
    const yours = yourRankByKey.get(key) ?? null;
    const mean =
      others === undefined
        ? (yours ?? 0)
        : yours === null
          ? others
          : (others * server.total + yours) / (server.total + 1);
    return { key, label, yourRank: yours, meanRank: Math.round(mean * 10) / 10 };
  });
  rows.sort((a, b) => a.meanRank - b.meanRank);
  return { total: server.total + (hasSelf ? 1 : 0), rows };
}

export type BinarySplit = {
  total: number;
  a: { count: number; pct: number };
  b: { count: number; pct: number };
  youSide: "a" | "b" | null;
};

export function binarySplit(
  server: BinaryPollCounts,
  selfChoice: "a" | "b" | null,
): BinarySplit {
  const counts: [number, number] = [server.sides[0] ?? 0, server.sides[1] ?? 0];
  let total = server.total;
  if (selfChoice !== null) {
    counts[selfChoice === "a" ? 0 : 1] += 1;
    total += 1;
  }
  const aPct = total > 0 ? Math.round((counts[0] / total) * 100) : 0;
  return {
    total,
    a: { count: counts[0], pct: total > 0 ? aPct : 0 },
    b: { count: counts[1], pct: total > 0 ? 100 - aPct : 0 },
    youSide: selfChoice,
  };
}

export type McqBar = {
  key: string;
  label: string;
  count: number;
  pct: number;
  mine: boolean;
};

export function mcqBars(
  server: McqPollCounts,
  selfSelected: string[],
  options: { key: string; label: string }[],
): { total: number; bars: McqBar[] } {
  const counts = new Map<string, number>(Object.entries(server.options));
  let total = server.total;
  if (selfSelected.length > 0) {
    total += 1;
    for (const key of selfSelected) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  const keyed = [...options];
  if ((counts.get(MCQ_OTHER_SENTINEL) ?? 0) > 0) {
    keyed.push({ key: MCQ_OTHER_SENTINEL, label: MCQ_OTHER_SENTINEL });
  }
  const bars = keyed.map(({ key, label }) => {
    const count = counts.get(key) ?? 0;
    return {
      key,
      label,
      count,
      pct: total > 0 ? Math.round((count / total) * 100) : 0,
      mine: selfSelected.includes(key),
    };
  });
  return { total, bars };
}
