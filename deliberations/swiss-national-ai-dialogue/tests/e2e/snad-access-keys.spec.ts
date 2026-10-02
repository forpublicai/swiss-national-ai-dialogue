import { expect, test, type Page } from "@playwright/test";

const ADMIN_BASE = "/admin/swiss-national-ai-dialogue";

async function openAccessTabFromResults(page: Page): Promise<void> {
  await page.goto(ADMIN_BASE);
  await page.getByRole("link", { name: "Access" }).click();

  await expect(page).toHaveURL(new RegExp(`${ADMIN_BASE}/access$`));
  await expect(
    page.getByRole("heading", { name: "Create an access key" }),
  ).toBeVisible();
}

test.describe.configure({ mode: "serial" });

test("the Access tab is reachable from Results on the admin surface", async ({
  page,
}) => {
  await openAccessTabFromResults(page);
});

test("an admin creates a copy-once key, sees it listed active, then revokes it", async ({
  page,
}) => {
  const label = `E2E key ${Date.now()}`;
  await openAccessTabFromResults(page);

  await page.getByLabel("Name").fill(label);
  await page.getByRole("button", { name: "Create key" }).click();

  await expect(page.getByText(`Key for “${label}” created`)).toBeVisible();
  await expect(page.locator("code")).toContainText("snadk_");
  const row = page.locator("table tbody tr", { hasText: label });
  await expect(row.getByText("Active", { exact: true })).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await row.getByRole("button", { name: "Revoke" }).click();

  await expect(row.getByText("Revoked", { exact: false })).toBeVisible({
    timeout: 15_000,
  });
  await expect(row.getByRole("button", { name: "Revoke" })).toHaveCount(0);
});
