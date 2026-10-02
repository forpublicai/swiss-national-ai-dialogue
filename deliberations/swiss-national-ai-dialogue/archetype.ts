export const PERSONA_AXES = [
  "curiosity",
  "candor",
  "heart",
  "guard",
  "roots",
  "voice",
] as const;

export type PersonaAxis = (typeof PERSONA_AXES)[number];

export type PersonaKey =
  | "pioneer"
  | "mountain-guide"
  | "watchmaker"
  | "st-bernard"
  | "innkeeper"
  | "ranger"
  | "alphorn-player"
  | "bridge-builder";

export type PersonaAxes = Record<PersonaAxis, number>;

export type PersonaItem =
  | {
      kind: "options";
      openerId: string;
      axis: PersonaAxis;
      scoreByOption: Record<string, number>;
    }
  | {
      kind: "scale";
      openerId: string;
      axis: PersonaAxis;
      low: number;
      high: number;
    }
  | {
      kind: "ranking";
      openerId: string;
      axis: PersonaAxis;
      // The reading is where this option landed: rank 1 of n → 100, last → 0.
      optionId: string;
    };

export const PERSONA_ITEMS: readonly PersonaItem[] = [
  // curiosity — how much they embrace AI in their life.
  {
    kind: "options",
    openerId: "dl-usage",
    axis: "curiosity",
    scoreByOption: {
      "dl-usage-daily": 95,
      "dl-usage-weekly": 75,
      "dl-usage-monthly": 50,
      "dl-usage-rarely": 25,
      "dl-usage-never": 5,
    },
  },
  {
    kind: "options",
    openerId: "dl-no-use",
    axis: "curiosity",
    scoreByOption: {
      "dl-no-use-not-needed": 45,
      "dl-no-use-complicated": 35,
      "dl-no-use-not-useful": 35,
      "dl-no-use-distrust": 15,
      "dl-no-use-concerns": 15,
    },
  },
  {
    kind: "options",
    openerId: "dl-uses-v2",
    axis: "curiosity",
    scoreByOption: {
      "dl-uses2-work": 70,
      "dl-uses2-learning": 65,
      "dl-uses2-writing": 70,
      "dl-uses2-coding": 75,
      "dl-uses2-personal": 75,
    },
  },
  {
    kind: "options",
    openerId: "ac-contribute",
    axis: "curiosity",
    scoreByOption: {
      "ac-contribute-surveys": 55,
      "ac-contribute-testing": 70,
      "ac-contribute-workshops": 65,
      "ac-contribute-expertise": 75,
      "ac-contribute-governance": 70,
      "ac-contribute-education": 65,
      "ac-contribute-research": 75,
      "ac-contribute-none": 15,
    },
  },

  // candor — wants a direct, opinionated AI vs a careful, neutral one.
  {
    kind: "options",
    openerId: "dl-vote",
    axis: "candor",
    scoreByOption: {
      "dl-vote-honest": 95,
      "dl-vote-priorities": 55,
      "dl-vote-decline": 10,
    },
  },
  {
    kind: "options",
    openerId: "dl-uncertainty",
    axis: "candor",
    scoreByOption: {
      "dl-unc-guess": 90,
      "dl-unc-possibilities": 55,
      "dl-unc-dontknow": 15,
    },
  },
  {
    kind: "options",
    openerId: "dl-companion-lonely",
    axis: "candor",
    scoreByOption: {
      "dl-lonely-plain": 85,
      "dl-lonely-kind": 55,
      "dl-lonely-warm": 20,
    },
  },
  {
    kind: "options",
    openerId: "dl-never-engage",
    axis: "candor",
    scoreByOption: {
      "dl-never-none": 85,
      "dl-never-political": 40,
      "dl-never-medical": 40,
      "dl-never-legal": 40,
      "dl-never-financial": 40,
      "dl-never-religious": 40,
    },
  },

  // heart — a warm companion vs a tool that gets out of the way.
  { kind: "scale", openerId: "dl-tool-companion", axis: "heart", low: 5, high: 95 },
  {
    kind: "options",
    openerId: "dl-companion-lonely",
    axis: "heart",
    scoreByOption: {
      "dl-lonely-warm": 90,
      "dl-lonely-kind": 60,
      "dl-lonely-plain": 15,
    },
  },
  {
    kind: "options",
    openerId: "sf-prefer-domains-v2",
    axis: "heart",
    scoreByOption: {
      "sf-prefer-personal": 90,
      "sf-prefer-sensitive-topics": 60,
      "sf-prefer-everyday": 50,
      "sf-prefer-work-sensitive": 40,
      "sf-prefer-gov": 40,
      "sf-prefer-none": 30,
    },
  },

  // guard — privacy and protection vs convenience and autonomy.
  { kind: "scale", openerId: "sf-memory", axis: "guard", low: 90, high: 20 },
  { kind: "ranking", openerId: "sf-trust-rank", axis: "guard", optionId: "sf-trust-privacy" },
  {
    kind: "options",
    openerId: "sf-trust-rank",
    axis: "guard",
    scoreByOption: {
      "sf-trust-privacy": 90,
      "sf-trust-data": 65,
      "sf-trust-inspect": 45,
      "sf-trust-experts": 45,
      "sf-trust-public-say": 40,
    },
  },
  {
    kind: "options",
    openerId: "sf-storage",
    axis: "guard",
    scoreByOption: {
      "sf-storage-device": 90,
      "sf-storage-swiss": 65,
      "sf-storage-anywhere": 10,
    },
  },
  {
    kind: "options",
    openerId: "sf-reading",
    axis: "guard",
    scoreByOption: {
      "sf-reading-never": 90,
      "sf-reading-ask": 65,
      "sf-reading-anonymised": 30,
    },
  },
  {
    kind: "options",
    openerId: "sf-consent",
    axis: "guard",
    scoreByOption: {
      "sf-consent-tighten": 95,
      "sf-consent-keep": 70,
      "sf-consent-loosen": 10,
    },
  },
  {
    kind: "options",
    openerId: "ac-loan",
    axis: "guard",
    scoreByOption: {
      "ac-loan-humans-only": 90,
      "ac-loan-human-final": 55,
      "ac-loan-ai": 10,
    },
  },
  {
    kind: "options",
    openerId: "dl-concerns",
    axis: "guard",
    scoreByOption: {
      "dl-concerns-privacy": 85,
      "dl-concerns-oversight": 75,
      "dl-concerns-manipulation": 70,
      "dl-concerns-power": 65,
      "dl-concerns-misinfo": 60,
      "dl-concerns-bias": 60,
      "dl-concerns-jobs": 45,
      "dl-concerns-environment": 40,
    },
  },

  // roots — Swiss-built and locally grounded vs best-available and global.
  { kind: "scale", openerId: "sf-own-or-best", axis: "roots", low: 90, high: 15 },
  { kind: "ranking", openerId: "sf-trust-rank", axis: "roots", optionId: "sf-trust-data" },
  {
    kind: "options",
    openerId: "sf-trust-rank",
    axis: "roots",
    scoreByOption: {
      "sf-trust-data": 90,
      "sf-trust-privacy": 55,
      "sf-trust-public-say": 50,
      "sf-trust-inspect": 45,
      "sf-trust-experts": 40,
    },
  },
  {
    kind: "options",
    openerId: "lc-community",
    axis: "roots",
    scoreByOption: {
      "lc-community-local": 85,
      "lc-community-canton": 80,
      "lc-community-switzerland": 70,
      "lc-community-language": 65,
      "lc-community-europe": 25,
      "lc-community-international": 10,
    },
  },
  {
    kind: "options",
    openerId: "sf-governance",
    axis: "roots",
    scoreByOption: {
      "sf-gov-public": 85,
      "sf-gov-none": 40,
      "sf-gov-private": 15,
    },
  },
  {
    kind: "options",
    openerId: "in-worth-it",
    axis: "roots",
    scoreByOption: {
      "in-worth-languages": 85,
      "in-worth-standard": 60,
      "in-worth-services": 55,
      "in-worth-economy": 40,
    },
  },
  {
    kind: "options",
    openerId: "lc-adapt",
    axis: "roots",
    scoreByOption: {
      "lc-adapt-place": 80,
      "lc-adapt-culture": 75,
      "lc-adapt-institutions": 70,
      "lc-adapt-language": 60,
      "lc-adapt-profession": 45,
    },
  },

  // voice — citizens steer the rules vs experts and institutions decide.
  {
    kind: "options",
    openerId: "ac-final-say",
    axis: "voice",
    scoreByOption: {
      "ac-final-citizens": 90,
      "ac-final-council": 70,
      "ac-final-institutions": 35,
      "ac-final-researchers": 15,
    },
  },
  {
    kind: "options",
    openerId: "in-gov-role",
    axis: "voice",
    scoreByOption: {
      "in-gov-lead": 75,
      "in-gov-collaborate": 60,
      "in-gov-align": 45,
      "in-gov-light": 10,
    },
  },
  { kind: "scale", openerId: "in-funding-slider", axis: "voice", low: 85, high: 20 },
  { kind: "ranking", openerId: "sf-trust-rank", axis: "voice", optionId: "sf-trust-public-say" },
  {
    kind: "options",
    openerId: "sf-trust-rank",
    axis: "voice",
    scoreByOption: {
      "sf-trust-public-say": 95,
      "sf-trust-inspect": 60,
      "sf-trust-experts": 50,
      "sf-trust-data": 45,
      "sf-trust-privacy": 40,
    },
  },
  {
    kind: "options",
    openerId: "ac-disclosure-v2",
    axis: "voice",
    scoreByOption: {
      "ac-disc2-always": 85,
      "ac-disc2-shaped": 50,
      "ac-disc2-no-need": 15,
    },
  },
  {
    kind: "options",
    openerId: "in-private-terms",
    axis: "voice",
    scoreByOption: {
      "in-private-public-control": 80,
      "in-private-priorities": 50,
      "in-private-early-access": 45,
    },
  },
];

export const PERSONA_OPENER_IDS: ReadonlySet<string> = new Set(
  PERSONA_ITEMS.map((item) => item.openerId),
);

export const PERSONAS: readonly { key: PersonaKey; profile: PersonaAxes }[] = [
  {
    key: "pioneer",
    profile: { curiosity: 90, candor: 75, heart: 45, guard: 20, roots: 25, voice: 45 },
  },
  {
    key: "mountain-guide",
    profile: { curiosity: 70, candor: 90, heart: 40, guard: 55, roots: 70, voice: 55 },
  },
  {
    key: "watchmaker",
    profile: { curiosity: 45, candor: 65, heart: 20, guard: 90, roots: 60, voice: 45 },
  },
  {
    key: "st-bernard",
    profile: { curiosity: 55, candor: 30, heart: 90, guard: 80, roots: 70, voice: 50 },
  },
  {
    key: "innkeeper",
    profile: { curiosity: 80, candor: 45, heart: 85, guard: 35, roots: 55, voice: 50 },
  },
  {
    key: "ranger",
    profile: { curiosity: 25, candor: 50, heart: 35, guard: 85, roots: 85, voice: 55 },
  },
  {
    key: "alphorn-player",
    profile: { curiosity: 55, candor: 50, heart: 65, guard: 50, roots: 85, voice: 90 },
  },
  {
    key: "bridge-builder",
    profile: { curiosity: 60, candor: 20, heart: 60, guard: 55, roots: 50, voice: 80 },
  },
];

export const PERSONA_KEYS: readonly PersonaKey[] = PERSONAS.map((p) => p.key);

export function isPersonaKey(value: string): value is PersonaKey {
  return PERSONA_KEYS.includes(value as PersonaKey);
}

export type PersonaAnswer = {
  openerId: string;
  // Binary a/b arrives as 0/100; slider as its 0–100 position.
  position: number | null;
  // Selected option ids (single- or multi-select questions).
  selected: string[] | null;
  // Ranking order, best first.
  order: string[] | null;
};

function itemReading(item: PersonaItem, answer: PersonaAnswer): number | null {
  if (item.kind === "scale") {
    if (typeof answer.position !== "number") return null;
    const t = Math.max(0, Math.min(100, answer.position)) / 100;
    return item.low + (item.high - item.low) * t;
  }
  if (item.kind === "ranking") {
    if (!answer.order || answer.order.length < 2) return null;
    const index = answer.order.indexOf(item.optionId);
    if (index === -1) return null;
    return (100 * (answer.order.length - 1 - index)) / (answer.order.length - 1);
  }
  if (!answer.selected) return null;
  const readings = answer.selected
    .map((option) => item.scoreByOption[option])
    .filter((score): score is number => score !== undefined);
  if (readings.length === 0) return null;
  return readings.reduce((sum, score) => sum + score, 0) / readings.length;
}

export type PersonaScore = {
  axes: PersonaAxes;
  readings: number;
};

export function scorePersona(answers: PersonaAnswer[]): PersonaScore {
  const byOpener = new Map(answers.map((answer) => [answer.openerId, answer]));
  const sums = Object.fromEntries(PERSONA_AXES.map((axis) => [axis, 0])) as PersonaAxes;
  const counts = Object.fromEntries(PERSONA_AXES.map((axis) => [axis, 0])) as PersonaAxes;
  let readings = 0;
  PERSONA_ITEMS.forEach((item) => {
    const answer = byOpener.get(item.openerId);
    if (!answer) return;
    const reading = itemReading(item, answer);
    if (reading === null) return;
    sums[item.axis] += reading;
    counts[item.axis] += 1;
    readings += 1;
  });
  const axes = Object.fromEntries(
    PERSONA_AXES.map((axis) => [
      axis,
      counts[axis] === 0 ? 50 : Math.round(sums[axis] / counts[axis]),
    ]),
  ) as PersonaAxes;
  return { axes, readings };
}

export function classifyPersona(axes: PersonaAxes): PersonaKey {
  let best: PersonaKey = PERSONAS[0]!.key;
  let bestDistance = Infinity;
  PERSONAS.forEach(({ key, profile }) => {
    const distance = PERSONA_AXES.reduce(
      (sum, axis) => sum + (axes[axis] - profile[axis]) ** 2,
      0,
    );
    if (distance < bestDistance) {
      bestDistance = distance;
      best = key;
    }
  });
  return best;
}

