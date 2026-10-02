import {
  expect,
  test,
  type APIRequestContext,
  type BrowserContext,
  type Page,
} from "@playwright/test";

type Locale = "de" | "fr" | "it" | "en" | "rm";

type VisibleWhen = { openerId: string; selected: string[]; negate?: boolean };

type TopicStep =
  | {
      kind: "binary";
      question: string;
      opener_id: string;
      visibleWhen?: VisibleWhen;
      option_a: { id?: string; label: string };
      option_b: { id?: string; label: string };
    }
  | {
      kind: "question";
      question: string;
      opener_id: string;
      visibleWhen?: VisibleWhen;
      multiSelect?: boolean;
      options: { id?: string; label: string }[];
    }
  | {
      kind: "ranking";
      question: string;
      opener_id: string;
      visibleWhen?: VisibleWhen;
      options: { id?: string; label: string }[];
    }
  | {
      kind: "slider";
      question: string;
      opener_id: string;
      visibleWhen?: VisibleWhen;
    }
  | {
      kind: "budget";
      question: string;
      opener_id: string;
      visibleWhen?: VisibleWhen;
      total: number;
      options: { id?: string; label: string }[];
    }
  | {
      kind: "share_more";
      question: string;
      opener_id: string;
    };

type Session = {
  sessionId: string;
  status: "active" | "wrap_up" | "completed";
  locale: Locale;
  activeStep:
    | { kind: "topic"; topicKey: string; event: { steps: TopicStep[] } }
    | { kind: "wrap_up" }
    | { kind: "completed" };
  topics: { key: string; event: { steps: TopicStep[] } }[];
  wrapUpQuestions: TopicStep[];
};

async function startSession(request: APIRequestContext, locale: Locale) {
  const response = await request.post("/api/snad/session", {
    data: { locale, canton: "ZH" },
  });
  expect(response.ok(), await response.text()).toBe(true);
  return ((await response.json()) as { session: Session }).session;
}

async function getSession(request: APIRequestContext) {
  const response = await request.get("/api/snad/session");
  expect(response.ok(), await response.text()).toBe(true);
  return ((await response.json()) as { session: Session | null }).session;
}

async function resolveTopic(
  request: APIRequestContext,
  session: Extract<Session, { activeStep: unknown }>,
  input: { answer: Record<string, unknown> | null; skipped: boolean },
) {
  if (session.activeStep.kind !== "topic") {
    throw new Error("expected active topic");
  }
  const response = await request.patch("/api/snad/session", {
    data: {
      operation: "answer",
      response: {
        step_id: `topic:${session.activeStep.topicKey}`,
        answer: input.answer,
        skipped: input.skipped,
      },
    },
  });
  return response;
}

const REJECT_ALL_BY_LOCALE: Record<Locale, string> = {
  en: "Reject all",
  de: "Alle ablehnen",
  fr: "Tout refuser",
  it: "Rifiuta tutti",
  rm: "Refusar tut",
};

async function dismissCookieBanner(page: Page, locale: Locale = "en") {
  const rejectCookies = page.getByRole("button", {
    name: REJECT_ALL_BY_LOCALE[locale],
  });
  await expect(rejectCookies).toBeVisible();
  await rejectCookies.click();
}

async function enterDialogue(page: Page) {
  await page.getByTestId("landing-cta").click();
}

async function completeOnboarding(page: Page) {
  await enterDialogue(page);
  await page
    .getByRole("combobox", { name: "Select your canton…" })
    .selectOption("ZH");
  const started = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/snad/session") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  expect((await started).ok()).toBe(true);
}

function recordDriverAnswer(
  step: Exclude<TopicStep, { kind: "share_more" }>,
  answered: Map<string, string[]>,
) {
  if (step.kind === "binary" && step.option_a.id) {
    answered.set(step.opener_id, [step.option_a.id]);
  } else if (step.kind === "question" && step.options[0]?.id) {
    answered.set(step.opener_id, [step.options[0].id]);
  }
}

function isStepShown(step: TopicStep, answered: Map<string, string[]>): boolean {
  if (step.kind === "share_more" || !step.visibleWhen) return true;
  const cond = step.visibleWhen;
  const ids = new Set(answered.get(cond.openerId) ?? []);
  const matches = cond.selected.some((id) => ids.has(id));
  return cond.negate ? !matches : matches;
}

const STEM_BOUNDARY = /[.!?](?:\s*["»«”“’‘])?\s+/g;

function splitStem(text: string): { setup: string; ask: string } | null {
  let best: { setup: string; ask: string } | null = null;
  for (const match of text.matchAll(STEM_BOUNDARY)) {
    const end = (match.index ?? 0) + match[0].length;
    const setup = text.slice(0, end).trimEnd();
    const ask = text.slice(end).trim();
    if (ask.length >= 12 && setup.length >= 24 && ask.endsWith("?")) {
      best = { setup, ask };
    }
  }
  return best;
}

async function expectQuestionVisible(
  page: Page,
  question: string,
  timeout?: number,
) {
  const parts = splitStem(question);
  if (!parts) {
    await expect(page.getByText(question, { exact: true })).toBeVisible({
      timeout,
    });
    return;
  }
  await expect(page.getByText(parts.setup, { exact: true })).toBeVisible({
    timeout,
  });
  await expect(
    page.getByText(parts.ask, { exact: true }).first(),
  ).toBeVisible({ timeout });
}

function splitTitledLabel(
  label: string,
): { title: string; rest: string } | null {
  const idx = label.indexOf(":");
  if (idx === -1) return null;
  const title = label.slice(0, idx).trim();
  const rest = label.slice(idx + 1).trim();
  if (!title || title.length > 48 || !rest) return null;
  return { title, rest };
}

function optionName(label: string, siblings: string[]): string {
  const allTitled =
    siblings.length > 0 &&
    siblings.every((sibling) => splitTitledLabel(sibling) !== null);
  if (!allTitled) return label;
  const parts = splitTitledLabel(label)!;
  return `${parts.title} ${parts.rest}`;
}

async function skipTopicIntroIfShown(page: Page) {
  const intro = page.getByTestId("topic-intro");
  const appeared = await intro.waitFor({ state: "visible", timeout: 2500 }).then(
    () => true,
    () => false,
  );
  if (!appeared) return;
  for (let tap = 0; tap < 4; tap += 1) {
    if (!(await intro.isVisible().catch(() => false))) return;
    await intro.click({ timeout: 1500 }).catch(() => {});
    await page.waitForTimeout(120);
  }
  await expect(intro).toHaveCount(0);
}

async function answerVisibleStep(
  page: Page,
  step: Exclude<TopicStep, { kind: "share_more" }>,
  { skipHold = true }: { skipHold?: boolean } = {},
) {
  await expectQuestionVisible(page, step.question);
  if (step.kind === "binary") {
    const poles = [step.option_a.label, step.option_b.label];
    await page
      .getByRole("radio", { name: optionName(step.option_a.label, poles) })
      .click();
  } else if (step.kind === "question" && step.multiSelect) {
    const labels = step.options.map((option) => option.label);
    // Multi-select renders checkboxes gated behind an explicit Submit.
    await page
      .getByRole("checkbox", { name: optionName(labels[0]!, labels) })
      .click();
    await page.getByRole("button", { name: "Submit" }).click();
  } else if (step.kind === "question") {
    const labels = step.options.map((option) => option.label);
    await page
      .getByRole("radio", { name: optionName(labels[0]!, labels) })
      .click();
  } else if (step.kind === "slider") {
    await page.getByRole("slider", { name: step.question }).fill("60");
    await page.getByRole("button", { name: "Submit" }).click();
  } else if (step.kind === "ranking") {
    // The authored order is a valid answer — submit it as-is.
    await page.getByRole("button", { name: "Submit" }).click();
  } else {
    const increase = page.getByRole("button", {
      name: `+ ${step.options[0]!.label}`,
    });
    for (let unit = 0; unit < step.total; unit += 1) await increase.click();
    await page.getByRole("button", { name: "Submit" }).click();
  }
  if (skipHold) await page.getByTestId("story-forward").click();
}

async function answerTopicThroughUi(page: Page, session: Session) {
  if (session.activeStep.kind !== "topic") {
    throw new Error("expected active topic");
  }
  await skipTopicIntroIfShown(page);
  const answered = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/snad/session") &&
      response.request().method() === "PATCH" &&
      response.request().postDataJSON()?.operation === "answer",
  );
  const driverAnswers = new Map<string, string[]>();
  for (const step of session.activeStep.event.steps) {
    if (step.kind === "share_more") throw new Error("unexpected share-more step");
    if (!isStepShown(step, driverAnswers)) continue;
    await answerVisibleStep(page, step);
    recordDriverAnswer(step, driverAnswers);
  }
  expect((await answered).ok()).toBe(true);
}

test.describe.configure({ mode: "serial" });

for (const locale of ["de", "fr", "it", "en", "rm"] as const) {
  test(`renders the code-owned ${locale} questionnaire`, async ({ page }) => {
    test.setTimeout(60_000);
    const session = await startSession(page.request, locale);
    expect(session.locale).toBe(locale);
    expect(session.activeStep.kind).toBe("topic");
    if (session.activeStep.kind !== "topic") return;

    await page.goto(`/swiss-national-ai-dialogue?lang=${locale}`);

    // The banner overlays the landing and would intercept the CTA tap.
    await dismissCookieBanner(page, locale);
    await enterDialogue(page);
    await skipTopicIntroIfShown(page);
    await expect(
      page.getByText(session.activeStep.event.steps[0].question, { exact: true }),
    ).toBeVisible();
  });
}

test("never renders the retired language screen on a fresh visit or hard reload", async ({
  page,
}) => {
  const response = await page.request.get("/swiss-national-ai-dialogue");
  const serverHtml = await response.text();
  expect(serverHtml).toContain("The future of AI in Switzerland");
  expect(serverHtml).not.toContain("You can change it any time.");

  await page.addInitScript(() => {
    const oldHeadings = new Set([
      "Choose your language",
      "Wählen Sie Ihre Sprache",
      "Choisissez votre langue",
      "Scegli la tua lingua",
    ]);
    const detect = () => {
      const seen = [...document.querySelectorAll("h2")].some((heading) =>
        oldHeadings.has(heading.textContent?.trim() ?? ""),
      );
      if (seen) {
        (window as typeof window & { __oldLanguageScreenSeen?: boolean })
          .__oldLanguageScreenSeen = true;
      }
    };
    (window as typeof window & { __oldLanguageScreenSeen?: boolean })
      .__oldLanguageScreenSeen = false;
    new MutationObserver(detect).observe(document, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    document.addEventListener("DOMContentLoaded", detect);
  });

  await page.goto("/swiss-national-ai-dialogue");
  await expect(
    page.getByText("The future of AI in Switzerland", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        (window as typeof window & { __oldLanguageScreenSeen?: boolean })
          .__oldLanguageScreenSeen,
    ),
  ).toBe(false);

  await dismissCookieBanner(page);
  await completeOnboarding(page);
  await expect(
    page.getByRole("button", { name: "Daily life" }).first(),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Daily life" }).first(),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        (window as typeof window & { __oldLanguageScreenSeen?: boolean })
          .__oldLanguageScreenSeen,
    ),
  ).toBe(false);
});

test("submits a ranking through the participant flow and proceeds to the next question", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/swiss-national-ai-dialogue");
  await dismissCookieBanner(page);
  await completeOnboarding(page);

  let session = await getSession(page.request);
  if (!session) throw new Error("expected active session");
  test.skip(
    !session.topics.some((topic) =>
      topic.event.steps.some((step) => step.kind === "ranking"),
    ),
    "active content carries no ranking question",
  );
  while (
    session.activeStep.kind === "topic" &&
    session.activeStep.topicKey !== "languages-culture"
  ) {
    await answerTopicThroughUi(page, session);
    const nextSession = await getSession(page.request);
    if (!nextSession) throw new Error("expected active session");
    session = nextSession;
  }
  expect(session.activeStep.kind).toBe("topic");
  if (session.activeStep.kind !== "topic") return;

  const steps = session.activeStep.event.steps;
  const rankingIndex = steps.findIndex((step) => step.kind === "ranking");
  expect(rankingIndex).toBeGreaterThan(0);
  const ranking = steps[rankingIndex];
  if (!ranking || ranking.kind !== "ranking") return;

  await skipTopicIntroIfShown(page);
  const answered = new Map<string, string[]>();
  for (const step of steps.slice(0, rankingIndex)) {
    if (step.kind === "share_more") throw new Error("unexpected share-more step");
    if (!isStepShown(step, answered)) continue;
    await answerVisibleStep(page, step);
    recordDriverAnswer(step, answered);
  }

  await expect(page.getByText(ranking.question, { exact: true })).toBeVisible();
  const firstGrip = page.getByRole("button", {
    name: `${ranking.options[0]!.label} — reorder`,
  });
  await expect(firstGrip).toBeVisible();

  await page.getByRole("button", { name: "Submit" }).click();

  const nextStep = steps[rankingIndex + 1];
  expect(nextStep).toBeDefined();
  if (nextStep && nextStep.kind !== "share_more") {
    await expectQuestionVisible(page, nextStep.question, 15_000);
  }
  expect(errors).toEqual([]);
});

test("stories arrows step forward and back, on mobile too", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const session = await startSession(page.request, "en");
  expect(session.activeStep.kind).toBe("topic");
  if (session.activeStep.kind !== "topic") return;
  const steps = session.activeStep.event.steps;
  const first = steps[0];
  if (!first || first.kind === "share_more") {
    throw new Error("expected an authored first step");
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/swiss-national-ai-dialogue?lang=en");
  await dismissCookieBanner(page);
  await enterDialogue(page);
  await skipTopicIntroIfShown(page);
  await answerVisibleStep(page, first, { skipHold: false });

  const driverAnswers = new Map<string, string[]>();
  recordDriverAnswer(first, driverAnswers);
  const second = steps
    .slice(1)
    .find((step) => isStepShown(step, driverAnswers));
  if (!second || second.kind === "share_more") {
    throw new Error("expected a second authored step");
  }
  await page.getByTestId("story-forward").click();
  await expectQuestionVisible(page, second.question, 4_000);

  const third = steps
    .slice(steps.indexOf(second) + 1)
    .find((step) => isStepShown(step, driverAnswers));
  if (!third || third.kind === "share_more") {
    throw new Error("expected a third authored step");
  }
  await expect(page.getByTestId("story-forward")).not.toBeVisible();
  await page.getByTestId("question-skip").click();
  await expectQuestionVisible(page, third.question, 4_000);

  await page.getByTestId("story-back").click();
  await expectQuestionVisible(page, second.question);
  await expect(page.getByTestId("story-resume")).toHaveCount(0);

  await page.getByTestId("story-back").click();
  await expectQuestionVisible(page, first.question);
  await page.getByTestId("story-resume").click();
  await expectQuestionVisible(page, third.question);
  await expect(page.getByTestId("story-resume")).toHaveCount(0);
});

test("a question skipped in a done topic can be completed by paging back into it", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const session = await startSession(page.request, "en");
  if (session.activeStep.kind !== "topic") throw new Error("expected topic");
  const topicKey = session.activeStep.topicKey;
  const steps = session.activeStep.event.steps;
  const first = steps[0];
  if (!first || first.kind === "share_more") {
    throw new Error("expected an authored first step");
  }

  const answers: Record<string, unknown> = {};
  for (const step of steps) {
    if (step.kind === "share_more") continue;
    answers[step.question] = { skipped: true };
  }
  const resolved = await resolveTopic(page.request, session, {
    answer: { answers, share_more: "skip" },
    skipped: false,
  });
  expect(resolved.ok(), await resolved.text()).toBe(true);

  await page.goto("/swiss-national-ai-dialogue?lang=en");
  await dismissCookieBanner(page);
  await enterDialogue(page);

  await page.getByTestId("snad-section-menu").click();
  await page.getByTestId(`section-item-${topicKey}`).click();
  await expectQuestionVisible(page, first.question, 8_000);

  await expect(page.getByTestId("story-resume")).toHaveCount(0);
  const amended = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/snad/session") &&
      response.request().method() === "PATCH" &&
      response.request().postDataJSON()?.operation === "amend",
  );
  await answerVisibleStep(page, first, { skipHold: false });
  expect((await amended).ok()).toBe(true);

  const raw = (await (
    await page.request.get("/api/snad/session")
  ).json()) as {
    session: {
      topics: { key: string; answer: { answers: Record<string, unknown> } | null }[];
    };
  };
  const doneTopic = raw.session.topics.find((topic) => topic.key === topicKey);
  expect(doneTopic?.answer?.answers[first.question]).not.toEqual({
    skipped: true,
  });
});

test("the wordmark returns to the landing and the CTA resumes in place", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const session = await startSession(page.request, "en");
  if (session.activeStep.kind !== "topic") throw new Error("expected topic");
  const first = session.activeStep.event.steps[0];
  if (!first || first.kind === "share_more") {
    throw new Error("expected an authored first step");
  }
  await page.goto("/swiss-national-ai-dialogue?lang=en");
  await dismissCookieBanner(page);
  await enterDialogue(page);
  await skipTopicIntroIfShown(page);
  await expectQuestionVisible(page, first.question);

  await page
    .getByRole("link", {
      name: "Swiss National AI Dialogue — back to the start",
    })
    .filter({ visible: true })
    .click();

  await expect(
    page.getByText("The future of AI in Switzerland", { exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("story-back")).toHaveCount(0);
  await expect(page.getByTestId("story-forward")).toHaveCount(0);
  await enterDialogue(page);
  await expectQuestionVisible(page, first.question);
  await expect(page.getByTestId("story-back")).toBeVisible();
});

test("a reload resumes mid-topic at the question in progress", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const session = await startSession(page.request, "en");
  expect(session.activeStep.kind).toBe("topic");
  if (session.activeStep.kind !== "topic") return;
  const steps = session.activeStep.event.steps;

  await page.goto("/swiss-national-ai-dialogue");
  await dismissCookieBanner(page);
  await enterDialogue(page);
  await skipTopicIntroIfShown(page);

  const driverAnswers = new Map<string, string[]>();
  let answeredCount = 0;
  for (const step of steps) {
    if (step.kind === "share_more") break;
    if (!isStepShown(step, driverAnswers)) continue;
    const checkpoint = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/snad/session") &&
        response.request().method() === "PATCH" &&
        response.request().postDataJSON()?.operation === "progress",
    );
    await answerVisibleStep(page, step);
    recordDriverAnswer(step, driverAnswers);
    expect((await checkpoint).ok()).toBe(true);
    answeredCount += 1;
    if (answeredCount === 2) break;
  }
  expect(answeredCount).toBe(2);

  const shown = steps.filter((step) => isStepShown(step, driverAnswers));
  const expected = shown[answeredCount]!;
  await expectQuestionVisible(page, expected.question);

  // Mid-session reload auto-resumes the dialogue via `?view=dialogue`.
  await page.reload();

  // Back on the SAME question — not the top of the topic.
  await expectQuestionVisible(page, expected.question, 15_000);
  if (shown[0]!.question !== expected.question) {
    await expect(
      page.getByText(shown[0]!.question, { exact: true }),
    ).toHaveCount(0);
  }
});

test("progresses deterministically with idempotent skips, resumes, and completes", async ({
  page,
}) => {
  const genericStart = await page.request.post(
    "/api/interview/start?deliberation=swiss-national-ai-dialogue",
  );
  expect(genericStart.status()).toBe(404);

  let session = await startSession(page.request, "en");
  const suggestion = `Ask about AI in schools ${session.sessionId}`;
  const kinds = new Set<TopicStep["kind"]>();
  let firstStepId = "";

  while (session.activeStep.kind === "topic") {
    session.activeStep.event.steps.forEach((step) => kinds.add(step.kind));
    const stepId = `topic:${session.activeStep.topicKey}`;
    if (!firstStepId) firstStepId = stepId;
    const resolved = await resolveTopic(page.request, session, {
      answer: null,
      skipped: true,
    });
    expect(resolved.ok(), await resolved.text()).toBe(true);
    const after = ((await resolved.json()) as { session: Session }).session;

    const retry = await page.request.patch("/api/snad/session", {
      data: {
        operation: "answer",
        response: { step_id: stepId, answer: null, skipped: true },
      },
    });
    expect(retry.ok(), await retry.text()).toBe(true);
    const retried = ((await retry.json()) as { session: Session }).session;
    expect(retried.activeStep).toEqual(after.activeStep);
    session = after;
  }

  const contentKinds = new Set(
    session.topics.flatMap((topic) =>
      topic.event.steps.map((step) => step.kind),
    ),
  );
  expect(kinds.has("share_more")).toBe(false);
  expect(kinds.has("question")).toBe(true);
  expect([...kinds].sort()).toEqual([...contentKinds].sort());
  expect(session.activeStep.kind).toBe("wrap_up");
  expect(session.status).toBe("wrap_up");

  const conflict = await page.request.patch("/api/snad/session", {
    data: {
      operation: "answer",
      response: {
        step_id: firstStepId,
        answer: { answers: {}, share_more: "skip" },
        skipped: false,
      },
    },
  });
  expect(conflict.status()).toBe(409);

  const wrapUpAnswer = await page.request.patch("/api/snad/session", {
    data: {
      operation: "wrapup_answer",
      response: {
        step_id: "wrapup-age",
        answer: { choice: "age-25-44" },
        skipped: false,
      },
    },
  });
  expect(wrapUpAnswer.ok(), await wrapUpAnswer.text()).toBe(true);

  const completed = await page.request.patch("/api/snad/session", {
    data: { operation: "complete" },
  });
  expect(completed.ok(), await completed.text()).toBe(true);
  session = ((await completed.json()) as { session: Session }).session;
  expect(session.status).toBe("completed");
  expect(session.activeStep.kind).toBe("completed");

  const email = await page.request.patch("/api/snad/session", {
    data: {
      operation: "wrapup_answer",
      response: {
        step_id: "wrapup-email",
        answer: { email: `e2e+${session.sessionId}@example.ch` },
        skipped: false,
      },
    },
  });
  expect(email.ok(), await email.text()).toBe(true);

  await page.goto("/swiss-national-ai-dialogue");
  await page.getByRole("button", { name: "Reject all" }).click();
  await enterDialogue(page);
  const firstWrapUp = session.wrapUpQuestions[0];
  if (!firstWrapUp || firstWrapUp.kind !== "question") {
    throw new Error("expected an authored wrap-up question");
  }
  await expect(
    page.getByText(firstWrapUp.question, { exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => page.getByTestId("snad-segment").count())
    .toBeGreaterThanOrEqual(6);
  await expect(page.getByText("100", { exact: true })).toHaveCount(0);
  const emailHeading = page.getByText("See what Switzerland decided.", {
    exact: true,
  });
  for (let i = 0; i < session.wrapUpQuestions.length; i += 1) {
    if (await emailHeading.isVisible().catch(() => false)) break;
    const skip = page.getByRole("button", { name: "Skip" });
    if (!(await skip.isVisible().catch(() => false))) break;
    await skip.click();
    await page.waitForTimeout(200);
  }
  await expect(emailHeading).toBeVisible();
  const closingKickoff = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/snad/chat") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Skip" }).click();
  await expect(page.getByTestId("shape-question-text")).toBeVisible();
  await page.getByTestId("shape-question-text").fill(suggestion);
  await page.getByTestId("shape-question-submit").click();
  await expect(page.getByTestId("closing-quote-text")).toBeVisible();
  const kickoffResponse = await closingKickoff;
  await kickoffResponse.finished();
  await page.getByTestId("story-back").click();
  await expect(page.getByTestId("shape-question-text")).toHaveValue(suggestion);
  await page.getByTestId("story-forward").click();
  await expect(page.getByTestId("closing-quote-text")).toBeVisible();
  await page.getByTestId("closing-quote-skip").click();
  await expect(page.getByTestId("closing-wall-continue")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Copy link to share" })).toBeVisible();
  await expect(page.getByText("100", { exact: true })).toBeVisible();
  await page.getByTestId("story-back").click();
  await expect(page.getByTestId("closing-quote-text")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Copy link to share" })).toHaveCount(0);
  await page.getByTestId("story-forward").click();
  await expect(page.getByRole("button", { name: "Copy link to share" })).toBeVisible();
  await page.reload();
  await enterDialogue(page);
  await expect(page.getByRole("button", { name: "Copy link to share" })).toBeVisible();
  // The finale's quiet closing link steps back out to the landing view.
  await page.getByTestId("finale-back-home").click();
  await expect(page.getByTestId("landing-cta")).toBeVisible();

  await page.goto("/admin/swiss-national-ai-dialogue");
  await expect(
    page.getByRole("heading", { name: "What people want asked next" }),
  ).toBeVisible();
  await expect(page.getByText(suggestion, { exact: false })).toBeVisible();
  await page.goto(
    `/admin/swiss-national-ai-dialogue/participants/${session.sessionId}`,
  );
  await expect(
    page.getByText("Their question for the next round"),
  ).toBeVisible();
  await expect(page.getByText(suggestion, { exact: false })).toBeVisible();

  const reset = await page.request.delete("/api/snad/session");
  expect(reset.ok()).toBe(true);
  const hydrated = await page.request.get("/api/snad/session");
  expect(await hydrated.json()).toEqual({ session: null });
});

test("keeps the current participant out of dedicated poll aggregates", async ({
  browser,
  page,
}) => {
  let session = await startSession(page.request, "en");
  if (session.activeStep.kind !== "topic") throw new Error("expected active topic");
  while (
    session.activeStep.kind === "topic" &&
    !session.activeStep.event.steps.some((step) => step.kind === "binary")
  ) {
    const skipped = await resolveTopic(page.request, session, {
      answer: null,
      skipped: true,
    });
    expect(skipped.ok(), await skipped.text()).toBe(true);
    session = ((await skipped.json()) as { session: Session }).session;
  }
  if (session.activeStep.kind !== "topic") throw new Error("expected active topic");
  const binary = session.activeStep.event.steps.find(
    (step) => step.kind === "binary",
  );
  if (!binary) throw new Error("expected binary opener");
  const query = new URLSearchParams({
    opener_id: binary.opener_id,
    kind: "binary",
  });
  const before = await page.request.get(`/api/snad/polls?${query}`);
  const baseline = (await before.json()) as {
    poll: { total: number; sides: [number, number] };
  };

  const answered = await resolveTopic(page.request, session, {
    answer: {
      answers: { [binary.question]: { choice: "a" } },
      share_more: "skip",
    },
    skipped: false,
  });
  expect(answered.ok(), await answered.text()).toBe(true);

  const ownView = (await (
    await page.request.get(`/api/snad/polls?${query}`)
  ).json()) as typeof baseline;
  expect(ownView.poll).toEqual(baseline.poll);

  const observer: BrowserContext = await browser.newContext();
  const observerPage = await observer.newPage();
  const aggregate = (await (
    await observerPage.request.get(
      `${new URL(before.url()).origin}/api/snad/polls?${query}`,
    )
  ).json()) as typeof baseline;
  expect(aggregate.poll.total).toBe(baseline.poll.total + 1);
  expect(aggregate.poll.sides[0]).toBe(baseline.poll.sides[0] + 1);
  await observer.close();
});

test("a topic answered through the UI reports per-question times in /admin", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const session = await startSession(page.request, "en");
  if (session.activeStep.kind !== "topic") throw new Error("expected topic");
  const answerable = session.activeStep.event.steps.filter(
    (step) => step.kind !== "share_more",
  ).length;

  await page.goto("/swiss-national-ai-dialogue?lang=en");
  await dismissCookieBanner(page);
  await enterDialogue(page);
  await answerTopicThroughUi(page, session);

  await page.goto(
    `/admin/swiss-national-ai-dialogue/participants/${session.sessionId}`,
  );
  const times = page.getByTestId("question-time");
  await expect(times.first()).toBeVisible();
  expect(await times.count()).toBeGreaterThanOrEqual(answerable - 1);
  await expect(page.getByTestId("topic-time").first()).toBeVisible();
});
