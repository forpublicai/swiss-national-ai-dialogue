import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";

type TopicStep = { kind: string; question?: string; opener_id?: string };

type Session = {
  sessionId: string;
  activeStep:
    | { kind: "topic"; topicKey: string; event: { steps: TopicStep[] } }
    | { kind: string };
  topics: { key: string; title: string }[];
};

type VersionSummary = {
  id: string;
  label: string;
  isActive: boolean;
};

async function listVersions(
  request: APIRequestContext,
): Promise<VersionSummary[]> {
  const response = await request.get("/api/admin/snad/study-versions");
  expect(response.ok(), await response.text()).toBe(true);
  return ((await response.json()) as { versions: VersionSummary[] }).versions;
}

async function startSession(request: APIRequestContext): Promise<Session> {
  const response = await request.post("/api/snad/session", {
    data: { locale: "en", canton: "ZH" },
  });
  expect(response.ok(), await response.text()).toBe(true);
  return ((await response.json()) as { session: Session }).session;
}

async function getSession(request: APIRequestContext): Promise<Session> {
  const response = await request.get("/api/snad/session");
  expect(response.ok(), await response.text()).toBe(true);
  return ((await response.json()) as { session: Session }).session;
}

function firstQuestionOf(session: Session): string {
  if (session.activeStep.kind !== "topic" || !("event" in session.activeStep)) {
    throw new Error("expected an active topic step");
  }
  const first = session.activeStep.event.steps[0];
  if (!first?.question) throw new Error("expected a first opener question");
  return first.question;
}

async function dismissCookieBanner(page: Page) {
  const rejectCookies = page.getByRole("button", { name: "Reject all" });
  await expect(rejectCookies).toBeVisible();
  await rejectCookies.click();
}

async function completeOnboarding(page: Page) {
  await page.getByTestId("landing-cta").click();
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

async function publishFirstOpenerQuestionEdit(
  page: Page,
  label: string,
  editedQuestion: string,
) {
  await page.goto("/admin/swiss-national-ai-dialogue/editor");
  await page.getByRole("button", { name: "Edit survey" }).click();
  await page.getByLabel("Version label").fill(label);

  const topicsSection = page
    .locator("details")
    .filter({ hasText: "Survey topics & questions" })
    .first();
  const firstTopic = topicsSection.locator("details").first();
  await firstTopic.locator("> summary").click();
  const firstQuestion = firstTopic.locator("details").first();
  await firstQuestion.locator("> summary").click();
  await firstQuestion.getByLabel("Question (en)").first().fill(editedQuestion);

  await page.getByRole("button", { name: "Publish…" }).click();
  await page.getByRole("button", { name: "Confirm publish" }).click();
  await expect(page.getByText("Published.", { exact: false })).toBeVisible({
    timeout: 15_000,
  });
}

let originalActiveId: string | null = null;

test.afterEach(async ({ request }) => {
  if (!originalActiveId) return;
  const restore = await request.post(
    `/api/admin/snad/study-versions/${originalActiveId}/activate`,
  );
  expect(restore.ok(), await restore.text()).toBe(true);
  originalActiveId = null;
});

test("an editor copy change goes live for NEW sessions only; in-flight sessions keep their pinned wording", async ({
  page,
  browser,
}) => {
  test.setTimeout(120_000);
  const runTag = `e2e-${Date.now()}`;
  const versions = await listVersions(page.request);
  const active = versions.find((version) => version.isActive);
  expect(active).toBeDefined();

  const oldSession = await startSession(page.request);
  const originalQuestion = firstQuestionOf(oldSession);
  const editedQuestion = `How do you use AI, ${runTag}?`;

  originalActiveId = active!.id;
  await publishFirstOpenerQuestionEdit(page, runTag, editedQuestion);

  const freshContext = await browser.newContext();
  const freshPage = await freshContext.newPage();
  await freshPage.goto("/swiss-national-ai-dialogue");
  await dismissCookieBanner(freshPage);
  await completeOnboarding(freshPage);
  const freshSession = await getSession(freshPage.request);
  expect(firstQuestionOf(freshSession)).toBe(editedQuestion);
  await expect(
    freshPage.getByText(editedQuestion, { exact: true }),
  ).toBeVisible({ timeout: 20_000 });
  await freshContext.close();

  const pinned = await getSession(page.request);
  expect(pinned.sessionId).toBe(oldSession.sessionId);
  expect(firstQuestionOf(pinned)).toBe(originalQuestion);
  expect(firstQuestionOf(pinned)).not.toBe(editedQuestion);
});
