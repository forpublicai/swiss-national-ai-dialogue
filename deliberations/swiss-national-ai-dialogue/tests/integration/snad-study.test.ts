/** @jest-environment node */

jest.mock("@/db", () => ({ db: {} }));

import {
  buildTopicEvent,
  deriveActiveStep,
  progressStepId,
  topicStepId,
} from "@/deliberations/swiss-national-ai-dialogue/server/sessions";
import {
  hashStudyDefinition,
  snadStudyDefinition,
  snadStudyDefinitionHash,
} from "@/deliberations/swiss-national-ai-dialogue/server/study";
import {
  productionContentSnapshot,
  productionPromptSnapshot,
} from "@/deliberations/swiss-national-ai-dialogue/server/production-snapshot";
import type {
  LocalizedText,
  SnadLocale,
  SnadStudyDefinition,
  SnadTopic,
  StoredOpenerSpec,
} from "@/deliberations/swiss-national-ai-dialogue/types";

const SESSION_ID = "11111111-1111-4111-8111-111111111111";

describe("code-owned SNAD study", () => {
  it("retires the end-of-topic interviewers and enables the assisted Other on every multiple-choice opener", () => {
    snadStudyDefinition.topics.forEach((topic) => {
      expect(topic.plan).toBeUndefined();
      const specs = topic.openers.sequence.flatMap((step) =>
        step.mode === "always" ? [step.opener] : step.pool,
      );

      expect(specs.length).toBeGreaterThan(0);
      expect(specs.some((spec) => spec.kind === "interviewer")).toBe(false);
      specs
        .filter((spec) => spec.kind === "question")
        .forEach((spec) => expect(spec.otherAssist).toBe(true));
    });
  });

  it("keeps the feedback interview prompt on the feedback actor", () => {
    const feedbackActor =
      snadStudyDefinition.aiActors[snadStudyDefinition.wrapUp.feedbackActorId];

    expect(feedbackActor.prompt).toBe(productionContentSnapshot.feedbackPlan);
  });

  it("gives every topic and feedback exchange a stable configured actor", () => {
    expect(Object.keys(snadStudyDefinition.aiActors).sort()).toEqual([
      "feedback-v1",
      "topic-accountability-v1",
      "topic-daily-life-v1",
      "topic-investing-v1",
      "topic-languages-culture-v1",
      "topic-swiss-or-foreign-v1",
    ]);
    snadStudyDefinition.topics.forEach((topic) => {
      const actor = snadStudyDefinition.aiActors[topic.actorId];
      expect(actor.id).toBe(topic.actorId);
      expect(actor.model).toBe(productionPromptSnapshot.chatModel);
    });
  });

  it("pins archetype scoring and wrap-up behavior in the definition", () => {
    expect(snadStudyDefinition.wrapUp).toEqual(
      expect.objectContaining({ feedbackActorId: "feedback-v1" }),
    );
    expect(
      snadStudyDefinition.wrapUp.questions?.map((spec) => spec.id),
    ).toEqual([
      "wrapup-ai-frequency",
      "wrapup-ai-uses",
      "wrapup-ai-nonuse",
      "wrapup-age",
      "wrapup-field",
    ]);
    expect(snadStudyDefinition.wrapUp.archetypeRules).toEqual(
      expect.objectContaining({
        axes: ["candor", "protection", "boldness"],
        scaleLow: 40,
        scaleHigh: 60,
      }),
    );
    expect(
      Object.keys(
        snadStudyDefinition.wrapUp.archetypeRules.classification.bySigns,
      ),
    ).toHaveLength(8);
  });

  it("carries editor-authored onboarding copy in every launch locale", () => {
    const onboarding = snadStudyDefinition.onboarding;
    expect(onboarding).toBeDefined();
    (["en", "de", "fr", "it", "rm"] as const).forEach((locale) => {
      expect(onboarding!.cantonQuestion[locale]?.trim().length).toBeGreaterThan(
        0,
      );
      expect(onboarding!.continueLabel[locale]?.trim().length).toBeGreaterThan(
        0,
      );
    });
  });

  it("builds a complete deterministic opener journey in every locale", () => {
    snadStudyDefinition.locales.forEach((locale) => {
      snadStudyDefinition.topics.forEach((topic) => {
        const first = buildTopicEvent(
          snadStudyDefinition,
          SESSION_ID,
          topic.key,
          locale,
        );
        const second = buildTopicEvent(
          snadStudyDefinition,
          SESSION_ID,
          topic.key,
          locale,
        );
        expect(second).toEqual(first);
        expect(first.theme).toBe(topic.key);
        // always/rotate steps emit one spec each; drawN emits n.
        const expectedSteps = topic.openers.sequence.reduce(
          (count, step) => count + (step.mode === "drawN" ? step.n : 1),
          0,
        );
        expect(first.steps.length).toBe(expectedSteps);
        first.steps.forEach((step) => {
          expect(step.opener_id).toBeTruthy();
          expect(step.question?.trim().length).toBeGreaterThan(0);
        });
      });
    });
  });

  it("hashes the complete definition and reuses the rollback hash", () => {
    expect(hashStudyDefinition(snadStudyDefinition)).toBe(snadStudyDefinitionHash);
    expect(hashStudyDefinition(JSON.parse(JSON.stringify(snadStudyDefinition)))).toBe(
      snadStudyDefinitionHash,
    );
    expect(
      hashStudyDefinition({
        ...snadStudyDefinition,
        label: `${snadStudyDefinition.label} changed`,
      }),
    ).not.toBe(snadStudyDefinitionHash);
  });
});

describe("rendezvous draw gating", () => {
  const text = (value: string): LocalizedText => ({
    en: value,
    de: value,
    fr: value,
    it: value,
  });
  const slider = (id: string): StoredOpenerSpec => ({
    kind: "slider",
    id,
    question: text(`Slider ${id}`),
    minLabel: text("Low"),
    maxLabel: text("High"),
  });
  const shuffledQuestion: StoredOpenerSpec = {
    kind: "question",
    id: "shuffled-question",
    header: text("Header"),
    question: text("Pick one"),
    multiSelect: false,
    shuffleOptions: true,
    options: [
      ...["o1", "o2", "o3", "o4"].map((id) => ({
        id,
        label: text(`Option ${id}`),
      })),
      { id: "none", label: text("None of the above"), exclusive: true },
    ],
  };
  const fixtureTopic: SnadTopic = {
    key: "fixture-topic",
    title: "Fixture",
    blurb: "",
    rationale: "",
    actorId: snadStudyDefinition.topics[0]!.actorId,
    openers: {
      sequence: [
        {
          id: "draw-step",
          mode: "drawN",
          n: 2,
          pool: ["q1", "q2", "q3", "q4", "q5", "q6"].map(slider),
        },
        { id: "ask-step", mode: "always", opener: shuffledQuestion },
      ],
    },
  };
  const legacyDefinition: SnadStudyDefinition = {
    ...snadStudyDefinition,
    topics: [fixtureTopic],
  };
  delete legacyDefinition.drawHash;
  const mixedDefinition: SnadStudyDefinition = {
    ...legacyDefinition,
    drawHash: "mixed",
  };
  const shuffledOptionIds = (
    definition: SnadStudyDefinition,
  ): (string | undefined)[] => {
    const event = buildTopicEvent(definition, SESSION_ID, "fixture-topic", "en");
    const question = event.steps[2];
    if (question?.kind !== "question") throw new Error("expected question step");
    return question.options.map((option) => option.id);
  };

  it("pins the code snapshot to the mixed draw hash", () => {
    expect(snadStudyDefinition.drawHash).toBe("mixed");
  });

  it("replays the legacy FNV-1a draws for pinned pre-drawHash definitions", () => {
    const event = buildTopicEvent(
      legacyDefinition,
      SESSION_ID,
      "fixture-topic",
      "en",
    );

    expect(event.steps.map((step) => step.opener_id)).toEqual([
      "q1",
      "q6",
      "shuffled-question",
    ]);
    expect(shuffledOptionIds(legacyDefinition)).toEqual([
      "o4",
      "o3",
      "o2",
      "o1",
      "none",
    ]);
  });

  it("draws with the mixed scores when the definition opts in", () => {
    const event = buildTopicEvent(
      mixedDefinition,
      SESSION_ID,
      "fixture-topic",
      "en",
    );

    expect(event.steps.map((step) => step.opener_id)).toEqual([
      "q1",
      "q3",
      "shuffled-question",
    ]);
    expect(shuffledOptionIds(mixedDefinition)).toEqual([
      "o4",
      "o1",
      "o2",
      "o3",
      "none",
    ]);
  });
});

describe("deterministic SNAD progression", () => {
  const session = {
    id: SESSION_ID,
    studyVersionId: "22222222-2222-4222-8222-222222222222",
    locale: "en" as SnadLocale,
    canton: "BE",
    status: "active" as const,
    demographics: {},
    archetype: null,
    createdAt: new Date(),
    lastActiveAt: new Date(),
    completedAt: null,
  };
  const response = (topicKey: string, answer: Record<string, unknown> | null, skipped = false) => ({
    id: `${topicKey}-response`,
    sessionId: SESSION_ID,
    stepId: topicStepId(topicKey),
    answer,
    skipped,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const data = (responses: ReturnType<typeof response>[], chats: Array<Record<string, unknown>> = []) => ({
    session,
    definition: snadStudyDefinition,
    responses,
    chats,
  });

  it("advances explicit skips without creating a generic cursor", () => {
    expect(deriveActiveStep(data([]) as never)).toMatchObject({
      kind: "topic",
      topicKey: "daily-life",
    });
    expect(
      deriveActiveStep(
        data([response("daily-life", null, true)]) as never,
      ),
    ).toMatchObject({ kind: "topic", topicKey: "swiss-or-foreign" });
  });

  it("surfaces the mid-topic checkpoint on the active topic and drops it once resolved", () => {
    const checkpoint = {
      id: "daily-life-progress",
      sessionId: SESSION_ID,
      stepId: progressStepId("daily-life"),
      answer: { values: [{ choice: "a" }, null] },
      skipped: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(deriveActiveStep(data([checkpoint as never]) as never)).toMatchObject({
      kind: "topic",
      topicKey: "daily-life",
      partial: [{ choice: "a" }, null],
    });
    expect(
      deriveActiveStep(
        data([checkpoint as never, response("daily-life", null, true)]) as never,
      ),
    ).toMatchObject({
      kind: "topic",
      topicKey: "swiss-or-foreign",
      partial: null,
    });
  });

  it("treats a resolved topic as done regardless of the share-more answer, and moves to the next", () => {
    expect(
      deriveActiveStep(
        data([response("daily-life", { answers: {}, share_more: "talk" })]) as never,
      ),
    ).toMatchObject({
      kind: "topic",
      topicKey: "swiss-or-foreign",
    });
  });

  it("reaches wrap-up only after every stable topic step resolves", () => {
    const responses = snadStudyDefinition.topics.map((topic) =>
      response(topic.key, null, true),
    );
    expect(deriveActiveStep(data(responses) as never)).toEqual({
      kind: "wrap_up",
    });
    expect(
      deriveActiveStep({
        ...data(responses),
        session: { ...session, status: "completed" as const },
      } as never),
    ).toEqual({ kind: "completed" });
  });
});
