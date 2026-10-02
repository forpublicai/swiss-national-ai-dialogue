import { test, expect } from "@playwright/test";

// Without ADMIN_PASSWORD the middleware only lets localhost reach /admin, so a
// request carrying a public Host header must be challenged.
const PUBLIC_HOST = "dialogue.example.com";

test("/admin asks for credentials from a public hostname", async ({ request }) => {
  const response = await request.get("/admin", {
    headers: { host: PUBLIC_HOST },
  });
  expect(response.status()).toBe(401);
  expect(response.headers()["www-authenticate"]).toContain("Basic");
});

test("/api/admin asks for credentials from a public hostname", async ({ request }) => {
  const response = await request.get("/api/admin/snad/study-versions", {
    headers: { host: PUBLIC_HOST },
  });
  expect(response.status()).toBe(401);
});
