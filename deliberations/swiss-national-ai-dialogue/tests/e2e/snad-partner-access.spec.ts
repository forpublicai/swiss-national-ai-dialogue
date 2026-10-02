import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";

async function partnerConfigured(request: APIRequestContext): Promise<boolean> {
  const res = await request.post("/api/partner/login", { data: { key: "x" } });
  return res.status() !== 503;
}

async function createKey(
  request: APIRequestContext,
  label: string,
): Promise<{ id: string; key: string }> {
  const res = await request.post("/api/admin/snad/access-keys", {
    data: { label },
  });
  expect(res.ok(), await res.text()).toBe(true);
  return (await res.json()) as { id: string; key: string };
}

async function signInWithKey(page: Page, key: string): Promise<void> {
  await page.goto("/partner/login");
  await page.getByLabel("Access key").fill(key);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ request }) => {
  test.skip(!(await partnerConfigured(request)), "partner surface not configured");
});

test("a named key signs in to /partner, and revoking it locks the live session out on the next request", async ({
  page,
}) => {
  const created = await createKey(page.request, `E2E partner ${Date.now()}`);

  await signInWithKey(page, created.key);
  await expect(page).toHaveURL(/\/partner$/);
  await expect(
    page.getByRole("heading", { name: "Swiss National AI Dialogue" }),
  ).toBeVisible();

  const revoke = await page.request.delete(
    `/api/admin/snad/access-keys/${created.id}`,
  );
  expect(revoke.ok(), await revoke.text()).toBe(true);

  await page.goto("/partner");
  await expect(page).toHaveURL(/\/partner\/login$/);
});

test("a revoked key can no longer sign in", async ({ page }) => {
  const created = await createKey(page.request, `E2E revoked ${Date.now()}`);
  const revoke = await page.request.delete(
    `/api/admin/snad/access-keys/${created.id}`,
  );
  expect(revoke.ok(), await revoke.text()).toBe(true);

  await signInWithKey(page, created.key);

  await expect(
    page.getByText("That access key wasn't recognised."),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/partner\/login$/);
});
