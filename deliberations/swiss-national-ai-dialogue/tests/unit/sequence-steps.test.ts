import {
  firstUnansweredIndex,
  resolvedSequencePages,
  seededStepAnswers,
} from "@/deliberations/swiss-national-ai-dialogue/ui/cards/sequence-steps";
import type { SnadOpenerSequenceEvent } from "@/deliberations/swiss-national-ai-dialogue/types";

const event: SnadOpenerSequenceEvent = {
  type: "awaiting_opener_sequence",
  tool_use_id: "session:topic",
  steps: [
    {
      kind: "binary",
      opener_id: "b1",
      question: "Swiss or foreign?",
      option_a: { id: "swiss", label: "Swiss" },
      option_b: { id: "foreign", label: "Foreign" },
    },
    {
      kind: "question",
      opener_id: "q1",
      visibleWhen: { openerId: "b1", selected: ["swiss"] },
      header: "Why",
      question: "Why Swiss?",
      options: [
        { id: "trust", label: "Trust" },
        { id: "jobs", label: "Jobs" },
      ],
    },
    {
      kind: "slider",
      opener_id: "s1",
      question: "How confident are you?",
      min_label: "Not at all",
      max_label: "Fully",
    },
    { kind: "share_more", opener_id: "sm1", question: "More to share?" },
  ],
};
const steps = event.steps;

describe("mid-topic resume seeding", () => {
  it("rebuilds per-step answers from checkpoint values and lands on the first unanswered step", () => {
    const answers = seededStepAnswers(steps, [
      { choice: "a", choice_label: "Swiss" },
      null,
      null,
      null,
    ]);

    expect(answers[0]).toEqual({ choice: "a", choice_label: "Swiss" });
    expect(answers[1]).toBeNull();
    // Pole A makes the conditional MCQ the next question.
    expect(firstUnansweredIndex(steps, answers)).toBe(1);
  });

  it("re-wraps a question step's value under its question text", () => {
    const answers = seededStepAnswers(steps, [
      { choice: "a", choice_label: "Swiss" },
      { selected: ["Trust"] },
      null,
      null,
    ]);

    expect(answers[1]).toEqual({ answers: { "Why Swiss?": { selected: ["Trust"] } } });
    expect(firstUnansweredIndex(steps, answers)).toBe(2);
  });

  it("skips a hidden conditional when resuming", () => {
    const answers = seededStepAnswers(steps, [
      { choice: "b", choice_label: "Foreign" },
      null,
      null,
      null,
    ]);

    // Pole B hides the MCQ, so the slider is next.
    expect(firstUnansweredIndex(steps, answers)).toBe(2);
  });

  it("falls back to the last visible step when every question is already answered", () => {
    const answers = seededStepAnswers(steps, [
      { choice: "b", choice_label: "Foreign" },
      null,
      { position: 60 },
      null,
    ]);

    // The share-more page is the remaining unanswered visible step.
    expect(firstUnansweredIndex(steps, answers)).toBe(3);
  });
});

describe("resolved-topic review pages", () => {
  it("pages only the questions the participant actually saw", () => {
    const pages = resolvedSequencePages(event, {
      answers: {
        "Swiss or foreign?": { choice: "b", choice_label: "Foreign" },
        "How confident are you?": { position: 40 },
        "More to share?": "Skip",
      },
      share_more: "skip",
    });

    // The pole-B answer hides the MCQ; share-more is never a review page.
    expect(pages.map((page) => page.index)).toEqual([0, 2]);
    expect(pages[1]?.value).toEqual({ position: 40 });
  });
});
