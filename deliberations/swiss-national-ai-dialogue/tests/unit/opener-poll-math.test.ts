import {
  binarySplit,
  mcqBars,
  sliderCurvePaths,
  sliderDistribution,
} from "@/deliberations/swiss-national-ai-dialogue/ui/cards/opener-poll-math";
import { MCQ_OTHER_SENTINEL } from "@/deliberations/swiss-national-ai-dialogue/types";

describe("sliderCurvePaths", () => {
  it("returns null when no one has answered yet", () => {
    expect(sliderCurvePaths([])).toBeNull();
    expect(sliderCurvePaths([0, 0, 0, 0])).toBeNull();
  });

  it("draws one point per bin plus flat endpoints, closed down to the baseline", () => {
    const paths = sliderCurvePaths([1, 0, 3, 0, 1]);

    expect(paths).not.toBeNull();
    const moves = paths!.line.match(/[MC]/g)!;
    expect(moves).toEqual(["M", ...Array(6).fill("C")]);
    expect(paths!.line.startsWith("M 0.00")).toBe(true);
    expect(paths!.area).toBe(`${paths!.line} L 100 100 L 0 100 Z`);
  });

  it("keeps every drawn coordinate inside the 100×100 box", () => {
    const spiky = sliderCurvePaths([0, 0, 9, 0, 0, 0, 0, 0, 0, 9])!;

    const coords = spiky.line.match(/-?\d+(\.\d+)?/g)!.map(Number);
    expect(Math.min(...coords)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...coords)).toBeLessThanOrEqual(100);
  });

  it("puts the tallest bin's centre at the top of the box", () => {
    const paths = sliderCurvePaths([0, 0, 0, 0, 0, 0, 0, 0, 0, 5])!;

    expect(paths.line.endsWith("100.00 12.00")).toBe(true);
  });
});

describe("sliderDistribution", () => {
  const emptyServer = { total: 0, bins: Array(10).fill(0) };

  it("folds a position at a bin centre wholly into that bin", () => {
    const dist = sliderDistribution(emptyServer, 55);

    expect(dist.total).toBe(1);
    expect(dist.bars[5]!.count).toBe(1);
    expect(dist.youIndex).toBe(5);
  });

  it("splits a position between bin centres so the folded mass stays centred on it", () => {
    const dist = sliderDistribution(emptyServer, 60);

    expect(dist.bars[5]!.count).toBeCloseTo(0.5);
    expect(dist.bars[6]!.count).toBeCloseTo(0.5);
    const centroid = dist.bars.reduce(
      (sum, bar, i) => sum + bar.count * (i * 10 + 5),
      0,
    );
    expect(centroid).toBeCloseTo(60);
  });

  it("clamps edge positions into the outermost bin", () => {
    const atMin = sliderDistribution(emptyServer, 0);
    const atMax = sliderDistribution(emptyServer, 100);

    expect(atMin.bars[0]!.count).toBeCloseTo(1);
    expect(atMax.bars[9]!.count).toBeCloseTo(1);
  });

  it("folds on top of the others-only server bins and bumps the total", () => {
    const server = { total: 3, bins: [0, 0, 3, 0, 0, 0, 0, 0, 0, 0] };

    const dist = sliderDistribution(server, 25);

    expect(dist.total).toBe(4);
    expect(dist.bars[2]!.count).toBe(4);
  });

  it("leaves the crowd untouched when the participant has no placement", () => {
    const server = { total: 2, bins: [0, 2, 0, 0, 0, 0, 0, 0, 0, 0] };

    const dist = sliderDistribution(server, null);

    expect(dist.total).toBe(2);
    expect(dist.bars[1]!.count).toBe(2);
    expect(dist.youIndex).toBeNull();
  });
});

describe("binarySplit", () => {
  it("splits a lone first voter 100/0 on their side", () => {
    const split = binarySplit({ total: 0, sides: [0, 0] }, "b");

    expect(split.total).toBe(1);
    expect(split.a).toEqual({ count: 0, pct: 0 });
    expect(split.b).toEqual({ count: 1, pct: 100 });
    expect(split.youSide).toBe("b");
  });

  it("folds the participant's side in and keeps the shares summing to 100", () => {
    const split = binarySplit({ total: 2, sides: [1, 1] }, "a");

    expect(split.total).toBe(3);
    expect(split.a).toEqual({ count: 2, pct: 67 });
    expect(split.b).toEqual({ count: 1, pct: 33 });
  });

  it("shows others without a 'you' side when the participant didn't place", () => {
    const split = binarySplit({ total: 3, sides: [2, 1] }, null);

    expect(split.total).toBe(3);
    expect(split.a.pct).toBe(67);
    expect(split.youSide).toBeNull();
  });
});

describe("mcqBars", () => {
  const OPTIONS = [
    { key: "economy", label: "Economy" },
    { key: "health", label: "Health" },
    { key: "government", label: "Government" },
  ];
  const LABELS = OPTIONS.map((o) => o.label);

  it("keeps the authored option order and marks the participant's picks", () => {
    const { total, bars } = mcqBars(
      { total: 3, options: { health: 2, economy: 1 } },
      ["government"],
      OPTIONS,
    );

    expect(total).toBe(4);
    expect(bars.map((b) => b.label)).toEqual(LABELS);
    expect(bars.map((b) => b.pct)).toEqual([25, 50, 25]);
    expect(bars.map((b) => b.mine)).toEqual([false, false, true]);
  });

  it("counts a multi-select respondent once per chosen option (shares need not sum to 100)", () => {
    const { total, bars } = mcqBars(
      { total: 2, options: { economy: 2, health: 1 } },
      ["economy", "health"],
      OPTIONS,
    );

    expect(total).toBe(3);
    expect(bars.map((b) => b.pct)).toEqual([100, 67, 0]);
  });

  it("appends an Other bar only when someone used it", () => {
    const withoutOther = mcqBars({ total: 1, options: { economy: 1 } }, [], OPTIONS);
    expect(withoutOther.bars.map((b) => b.label)).toEqual(LABELS);

    const withOther = mcqBars(
      { total: 1, options: { economy: 1 } },
      [MCQ_OTHER_SENTINEL],
      OPTIONS,
    );
    expect(withOther.bars.map((b) => b.label)).toEqual([
      ...LABELS,
      MCQ_OTHER_SENTINEL,
    ]);
    expect(withOther.bars[3]).toMatchObject({ mine: true, count: 1, pct: 50 });
  });
});
