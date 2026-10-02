/**
 * @jest-environment node
 *
 * Partner-surface auth: the pure HMAC session token primitives
 * (lib/partner/session.ts), the cookie-backed verifyPartnerSession()
 * (next/headers mocked), and the withPartnerSession() API guard. The
 * DB-backed named-key login lives in the SNAD slice's snad-access-keys
 * integration test.
 */

import {
  PARTNER_SESSION_COOKIE,
  PARTNER_SESSION_TTL_MS,
  mintPartnerSessionToken,
  verifyPartnerSessionToken,
} from "@/lib/partner/session";

const SECRET = "test-session-secret-at-least-32-bytes-long!";
const SLUG = "swiss-national-ai-dialogue";

// Mutable holder the next/headers mock reads from, so each test can decide
// what cookie verifyPartnerSession() sees.
let cookieValue: string | undefined;
jest.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === PARTNER_SESSION_COOKIE && cookieValue !== undefined
        ? { name, value: cookieValue }
        : undefined,
  }),
}));

import { verifyPartnerSession } from "@/lib/partner/auth";
import { withPartnerSession } from "@/lib/partner/api";

function setPartnerEnv() {
  process.env.PARTNER_SESSION_SECRET = SECRET;
  process.env.PARTNER_ADMIN_SLUG = SLUG;
}

function clearPartnerEnv() {
  delete process.env.PARTNER_SESSION_SECRET;
  delete process.env.PARTNER_ADMIN_SLUG;
}

afterEach(() => {
  clearPartnerEnv();
  cookieValue = undefined;
});

describe("partner session token (pure)", () => {
  it("round-trips a freshly minted token", () => {
    const token = mintPartnerSessionToken(SLUG, SECRET);
    const claim = verifyPartnerSessionToken(token, SECRET);
    expect(claim?.slug).toBe(SLUG);
    expect(claim!.exp).toBeGreaterThan(Date.now());
  });

  it("rejects a token signed with a different secret", () => {
    const token = mintPartnerSessionToken(SLUG, "some-other-secret");
    expect(verifyPartnerSessionToken(token, SECRET)).toBeNull();
  });

  it("rejects a tampered payload (slug swap keeps the old signature)", () => {
    const token = mintPartnerSessionToken(SLUG, SECRET);
    const [, signature] = token.split(".");
    const forgedPayload = Buffer.from(
      JSON.stringify({ slug: "another-deliberation", exp: Date.now() + 60000 }),
    ).toString("base64url");
    expect(
      verifyPartnerSessionToken(`${forgedPayload}.${signature}`, SECRET),
    ).toBeNull();
  });

  it("rejects an expired token", () => {
    const mintedAt = Date.now() - PARTNER_SESSION_TTL_MS - 1000;
    const token = mintPartnerSessionToken(SLUG, SECRET, mintedAt);
    expect(verifyPartnerSessionToken(token, SECRET)).toBeNull();
    // …but the same token verifies at the time it was minted.
    expect(
      verifyPartnerSessionToken(token, SECRET, mintedAt)?.slug,
    ).toBe(SLUG);
  });

  it("rejects garbage tokens without throwing", () => {
    expect(verifyPartnerSessionToken("", SECRET)).toBeNull();
    expect(verifyPartnerSessionToken("no-dot-here", SECRET)).toBeNull();
    expect(verifyPartnerSessionToken("a.b.c", SECRET)).toBeNull();
    expect(verifyPartnerSessionToken("!!!.???", SECRET)).toBeNull();
  });

  it("round-trips a named-key claim and omits key fields otherwise", () => {
    const withKey = mintPartnerSessionToken(SLUG, SECRET, undefined, {
      keyId: "key-123",
      keyName: "Alex",
    });
    const claim = verifyPartnerSessionToken(withKey, SECRET);
    expect(claim).toMatchObject({ slug: SLUG, keyId: "key-123", keyName: "Alex" });

    const shared = verifyPartnerSessionToken(
      mintPartnerSessionToken(SLUG, SECRET),
      SECRET,
    );
    expect(shared?.keyId).toBeUndefined();
    expect(shared?.keyName).toBeUndefined();
  });
});

describe("withPartnerSession revalidation", () => {
  const ok = () =>
    Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));

  it("runs the handler when the session is valid and passes revalidation", async () => {
    setPartnerEnv();
    cookieValue = mintPartnerSessionToken(SLUG, SECRET, undefined, {
      keyId: "key-123",
      keyName: "Alex",
    });
    const guarded = withPartnerSession(SLUG, ok, async (claim) => {
      expect(claim.keyId).toBe("key-123");
      return true;
    });
    expect((await guarded()).status).toBe(200);
  });

  it("rejects with 401 when revalidation fails (e.g. a revoked key)", async () => {
    setPartnerEnv();
    cookieValue = mintPartnerSessionToken(SLUG, SECRET, undefined, {
      keyId: "revoked-key",
      keyName: "Bob",
    });
    const guarded = withPartnerSession(SLUG, ok, async () => false);
    expect((await guarded()).status).toBe(401);
  });

  it("rejects with 401 when the session itself is invalid, before revalidating", async () => {
    setPartnerEnv();
    cookieValue = undefined;
    let called = false;
    const guarded = withPartnerSession(SLUG, ok, async () => {
      called = true;
      return true;
    });
    expect((await guarded()).status).toBe(401);
    expect(called).toBe(false);
  });
});

describe("verifyPartnerSession (cookie-backed)", () => {
  it("returns the claim for a valid cookie", async () => {
    setPartnerEnv();
    cookieValue = mintPartnerSessionToken(SLUG, SECRET);
    const claim = await verifyPartnerSession();
    expect(claim?.slug).toBe(SLUG);
  });

  it("returns null without a cookie / with a bad cookie / when unconfigured", async () => {
    setPartnerEnv();
    cookieValue = undefined;
    expect(await verifyPartnerSession()).toBeNull();

    cookieValue = "garbage";
    expect(await verifyPartnerSession()).toBeNull();

    cookieValue = mintPartnerSessionToken(SLUG, SECRET);
    clearPartnerEnv();
    expect(await verifyPartnerSession()).toBeNull();
  });

  it("rejects a stale cookie minted for a different slug after a scope change", async () => {
    setPartnerEnv();
    cookieValue = mintPartnerSessionToken("old-deliberation", SECRET);
    expect(await verifyPartnerSession()).toBeNull();
  });
});
