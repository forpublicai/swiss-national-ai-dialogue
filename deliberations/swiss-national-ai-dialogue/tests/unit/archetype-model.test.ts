import {
  PERSONAS,
  PERSONA_AXES,
  classifyPersona,
  scorePersona,
  type PersonaAnswer,
} from "@/deliberations/swiss-national-ai-dialogue/archetype";

const answer = (overrides: Partial<PersonaAnswer> & { openerId: string }): PersonaAnswer => ({
  position: null,
  selected: null,
  order: null,
  ...overrides,
});

// A guarded, locally-rooted, low-adoption answer set — the ranger's home turf.
const answersOfAValleyGuardian = (): PersonaAnswer[] => [
  answer({ openerId: "dl-usage", selected: ["dl-usage-never"] }),
  answer({ openerId: "dl-no-use", selected: ["dl-no-use-distrust"] }),
  answer({ openerId: "sf-memory", position: 0 }),
  answer({ openerId: "sf-own-or-best", position: 0 }),
  answer({
    openerId: "sf-trust-rank",
    order: [
      "sf-trust-privacy",
      "sf-trust-data",
      "sf-trust-inspect",
      "sf-trust-experts",
      "sf-trust-public-say",
    ],
  }),
  answer({ openerId: "lc-community", selected: ["lc-community-local"] }),
  answer({ openerId: "ac-loan", selected: ["ac-loan-humans-only"] }),
];

describe("scorePersona", () => {
  it("averages every answered item into 0-100 axes and defaults unanswered axes to the midpoint", () => {
    const answers = [
      answer({ openerId: "dl-usage", selected: ["dl-usage-daily"] }),
      answer({ openerId: "dl-tool-companion", position: 100 }),
    ];

    const { axes, readings } = scorePersona(answers);

    expect(readings).toBe(2);
    expect(axes.curiosity).toBe(95);
    expect(axes.heart).toBe(95);
    expect(axes.candor).toBe(50);
    expect(axes.voice).toBe(50);
  });

  it("reads a multi-select as the mean of its mapped picks", () => {
    const answers = [
      answer({
        openerId: "dl-concerns",
        selected: ["dl-concerns-privacy", "dl-concerns-environment"],
      }),
    ];

    const { axes } = scorePersona(answers);

    expect(axes.guard).toBe(Math.round((85 + 40) / 2));
  });

  it("reads a ranking as where the target option landed", () => {
    const { axes } = scorePersona([
      answer({
        openerId: "sf-trust-rank",
        order: [
          "sf-trust-privacy",
          "sf-trust-data",
          "sf-trust-inspect",
          "sf-trust-experts",
          "sf-trust-public-say",
        ],
      }),
    ]);

    expect(axes.guard).toBe(100);
    expect(axes.voice).toBe(0);
    expect(axes.roots).toBe(75);
  });

  it("returns zero readings when nothing scorable was answered", () => {
    const { readings } = scorePersona([
      answer({ openerId: "unknown-opener", selected: ["whatever"] }),
    ]);

    expect(readings).toBe(0);
  });
});

describe("classifyPersona", () => {
  it("assigns the guarded, locally-rooted, low-adoption profile to the ranger", () => {
    const { axes } = scorePersona(answersOfAValleyGuardian());

    expect(classifyPersona(axes)).toBe("ranger");
  });

  it("assigns an all-middling profile to the bridge-builder rather than an extreme", () => {
    const middling = Object.fromEntries(
      PERSONA_AXES.map((axis) => [axis, 50]),
    ) as Parameters<typeof classifyPersona>[0];

    expect(classifyPersona(middling)).toBe("bridge-builder");
  });

  it("classifies every persona's own prototype as itself, so each persona is reachable", () => {
    PERSONAS.forEach(({ key, profile }) => {
      expect(classifyPersona(profile)).toBe(key);
    });
  });
});

