export const STOP_COUNT = 6;

export type TradeoffPollCounts = {
  total: number;
  // Counts at each of the 6 stops, option_a → option_b. Length STOP_COUNT.
  stops: number[];
};

export type PollBar = { pct: number; count: number };

export type PollDistribution = {
  total: number;
  bars: PollBar[];
  youIndex: number | null;
};

export function stopIndex(position: number): number {
  return Math.min(STOP_COUNT - 1, Math.max(0, Math.round(position / 20)));
}

export function distributionBars(
  serverStops: number[],
  serverTotal: number,
  youIndex: number | null,
): PollDistribution {
  const counts = serverStops.map((c) => c ?? 0);
  let total = serverTotal;
  if (youIndex !== null && youIndex >= 0 && youIndex < counts.length) {
    counts[youIndex] += 1;
    total += 1;
  }
  const bars = counts.map((count) => ({
    count,
    pct: total > 0 ? Math.round((count / total) * 100) : 0,
  }));
  return { total, bars, youIndex };
}

export function tradeoffDistribution(
  server: TradeoffPollCounts,
  selfPosition: number | null,
): PollDistribution {
  const stops = Array.from({ length: STOP_COUNT }, (_, i) => server.stops[i] ?? 0);
  return distributionBars(
    stops,
    server.total,
    selfPosition === null ? null : stopIndex(selfPosition),
  );
}
