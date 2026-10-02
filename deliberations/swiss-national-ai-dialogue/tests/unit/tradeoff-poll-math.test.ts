import {
  STOP_COUNT,
  type TradeoffPollCounts,
  stopIndex,
  tradeoffDistribution,
} from "@/deliberations/swiss-national-ai-dialogue/ui/cards/tradeoff-poll-math";

const others = (stops: number[]): TradeoffPollCounts => ({
  total: stops.reduce((a, b) => a + b, 0),
  stops,
});

describe("stopIndex", () => {
  it("snaps each position to its nearest of the 6 stops", () => {
    expect([0, 9, 10, 20, 29, 40, 60, 80, 90, 100].map(stopIndex)).toEqual([
      0, 0, 1, 1, 1, 2, 3, 4, 5, 5,
    ]);
  });

  it("bins legacy 5-stop positions, rounding an exact 50 up", () => {
    expect([25, 50, 75].map(stopIndex)).toEqual([1, 3, 4]);
  });
});

describe("tradeoffDistribution", () => {
  it("is empty when there are no responses and no own placement", () => {
    const dist = tradeoffDistribution(others([0, 0, 0, 0, 0, 0]), null);

    expect(dist.total).toBe(0);
    expect(dist.youIndex).toBeNull();
    expect(dist.bars).toHaveLength(STOP_COUNT);
    expect(dist.bars.every((b) => b.pct === 0 && b.count === 0)).toBe(true);
  });

  it("puts a lone first voter at 100% on their own stop", () => {
    const dist = tradeoffDistribution(others([0, 0, 0, 0, 0, 0]), 80);

    expect(dist.total).toBe(1);
    expect(dist.youIndex).toBe(4);
    expect(dist.bars[4]).toEqual({ count: 1, pct: 100 });
  });

  it("folds the participant's placement into the others' distribution", () => {
    const dist = tradeoffDistribution(others([2, 0, 0, 1, 1, 0]), 0);

    expect(dist.total).toBe(5);
    expect(dist.youIndex).toBe(0);
    expect(dist.bars.map((b) => b.count)).toEqual([3, 0, 0, 1, 1, 0]);
    expect(dist.bars.map((b) => b.pct)).toEqual([60, 0, 0, 20, 20, 0]);
  });

  it("shows others without a 'you' bar when the participant didn't place (it's complicated)", () => {
    const dist = tradeoffDistribution(others([1, 1, 1, 0, 0, 0]), null);

    expect(dist.total).toBe(3);
    expect(dist.youIndex).toBeNull();
    expect(dist.bars.map((b) => b.pct)).toEqual([33, 33, 33, 0, 0, 0]);
  });
});
