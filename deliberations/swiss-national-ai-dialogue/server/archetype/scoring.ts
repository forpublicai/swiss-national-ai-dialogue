import type { SnadArchetypeRules } from "../../types";

export const ARCHETYPE_RULES: SnadArchetypeRules = {
  axes: ["candor", "protection", "boldness"],
  scaleHigh: 60,
  scaleLow: 40,
  scaleItems: [
    { openerId: "sf-memory", axis: "protection", low: 1, high: -1 },
    { openerId: "sf-own-or-best", axis: "boldness", low: 1, high: -1 },
    { openerId: "in-access", axis: "boldness", low: -1, high: 1 },
  ],
  mcqItems: [
    {
      openerId: "dl-vote",
      axis: "candor",
      byOption: { "dl-vote-honest": 1, "dl-vote-decline": -1 },
    },
    {
      openerId: "dl-uncertainty",
      axis: "candor",
      byOption: { "dl-unc-guess": 1, "dl-unc-dontknow": -1 },
    },
    {
      openerId: "dl-companion-lonely",
      axis: "candor",
      byOption: { "dl-lonely-plain": 1, "dl-lonely-warm": -1 },
    },
    {
      openerId: "ac-loan",
      axis: "protection",
      byOption: { "ac-loan-humans-only": 1, "ac-loan-ai": -1 },
    },
  ],
  axisMax: { candor: 3, protection: 2, boldness: 2 },
  classification: {
    thresholds: {
      candor: { value: 0, inclusive: false },
      protection: { value: 0, inclusive: true },
      boldness: { value: 0, inclusive: false },
    },
    bySigns: {
      "111": "protective-realist",
      "110": "vigilant-guardian",
      "101": "straight-talker",
      "100": "principled-skeptic",
      "011": "pragmatic-guardian",
      "010": "careful-mediator",
      "001": "liberal-pragmatist",
      "000": "quiet-liberal",
    },
  },
  trackRange: { min: 5, max: 95 },
};
