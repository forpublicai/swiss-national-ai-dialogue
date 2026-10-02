import {
  expect,
  test,
  type APIRequestContext,
  type Locator,
  type Page,
} from "@playwright/test";

const ADMIN_BASE = "/admin/swiss-national-ai-dialogue";
const LIST_URL = `${ADMIN_BASE}/participants`;
const PARTICIPANT_URL = new RegExp(`${ADMIN_BASE}/participants/[^/]+$`);

async function startSession(request: APIRequestContext): Promise<void> {
  const response = await request.post("/api/snad/session", {
    data: { locale: "en", canton: "ZH" },
  });
  expect(response.ok(), await response.text()).toBe(true);
}

async function seedParticipantAndOpenResults(page: Page): Promise<Locator> {
  await startSession(page.request);

  await page.goto(LIST_URL);
  await expect(page.getByRole("heading", { name: "Participants", exact: true })).toBeVisible();

  return page.locator("table tbody tr").first();
}

async function openFirstParticipantModal(page: Page): Promise<Locator> {
  const row = await seedParticipantAndOpenResults(page);

  await row.locator("td").first().click();

  const modal = page.getByRole("dialog");
  await expect(modal).toBeVisible({ timeout: 15_000 });
  await expect(page).toHaveURL(PARTICIPANT_URL);
  return modal;
}

test.describe.configure({ mode: "serial" });

test("clicking anywhere on a participant row opens the journey in a modal over the table", async ({
  page,
}) => {
  const modal = await openFirstParticipantModal(page);

  await expect(modal.getByRole("heading", { name: /^Participant ·/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Participants", exact: true })).toBeAttached();
});

test("the modal closes on ✕, backdrop click, and Escape, returning to the table", async ({
  page,
}) => {
  await openFirstParticipantModal(page);
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page).toHaveURL(new RegExp(`${LIST_URL}$`));

  await openFirstParticipantModal(page);
  await page.getByRole("dialog").click({ position: { x: 5, y: 5 } });
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page).toHaveURL(new RegExp(`${LIST_URL}$`));

  await openFirstParticipantModal(page);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page).toHaveURL(new RegExp(`${LIST_URL}$`));
});

test("a direct load of the participant URL renders the standalone page, not the modal", async ({
  page,
}) => {
  await openFirstParticipantModal(page);
  const deepLink = page.url();

  await page.goto(deepLink);

  await expect(page.getByRole("heading", { name: /^Participant ·/ })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "← All participants" })).toBeVisible();
});
