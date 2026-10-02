/**
 * @jest-environment node
 *
 * Named /partner access keys: the SNAD slice's DB-backed key model
 * (create → copy-once plaintext, hash-only storage, verify + last-used
 * stamping, soft-delete revoke + per-request active check) and the
 * /api/partner/login route accepting a named key end-to-end (embedding the
 * key identity in the HMAC claim, and rejecting a revoked key).
 */

process.env.DATABASE_URL ??=
  "postgresql://postgres:postgres@localhost:5433/dialogue_test";

import path from "node:path";

import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { Pool } from "pg";

import { db } from "@/db";
import {
  createAccessKey,
  isAccessKeyActive,
  listAccessKeys,
  revokeAccessKey,
  verifyAccessKey,
} from "@/deliberations/swiss-national-ai-dialogue/server/access-keys";
import { snadAccessKeys } from "@/deliberations/swiss-national-ai-dialogue/server/db-schema";
import {
  PARTNER_SESSION_COOKIE,
  verifyPartnerSessionToken,
} from "@/lib/partner/session";
import { POST as loginPost } from "@/app/api/partner/login/route";

const SECRET = "test-session-secret-at-least-32-bytes-long!";
const SLUG = "swiss-national-ai-dialogue";

function setPartnerEnv() {
  process.env.PARTNER_SESSION_SECRET = SECRET;
  process.env.PARTNER_ADMIN_SLUG = SLUG;
}

function clearPartnerEnv() {
  delete process.env.PARTNER_SESSION_SECRET;
  delete process.env.PARTNER_ADMIN_SLUG;
}

function loginRequest(key: string): Request {
  return new Request("http://localhost/api/partner/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });
}

function claimFromResponse(res: Response) {
  const setCookie = res.headers.get("set-cookie") ?? "";
  const token = decodeURIComponent(
    setCookie.split(`${PARTNER_SESSION_COOKIE}=`)[1].split(";")[0],
  );
  return verifyPartnerSessionToken(token, SECRET);
}

beforeAll(async () => {
  await migrate(db, {
    migrationsFolder: path.join(__dirname, "../../../../drizzle"),
  });
});

afterEach(async () => {
  clearPartnerEnv();
  await db.execute(sql`TRUNCATE snad.access_keys RESTART IDENTITY CASCADE`);
});

afterAll(async () => {
  await (db.$client as Pool).end();
});

describe("access-key model", () => {
  it("creates a copy-once key, stores only its hash, and lists it as active", async () => {
    const created = await createAccessKey("  Alex (partner)  ");
    expect(created.label).toBe("Alex (partner)");
    expect(created.key).toMatch(/^snadk_/);

    const [stored] = await db
      .select({ keyHash: snadAccessKeys.keyHash })
      .from(snadAccessKeys);
    expect(stored!.keyHash).not.toContain(created.key);

    const keys = await listAccessKeys();
    expect(keys).toHaveLength(1);
    expect(keys[0]).toMatchObject({
      id: created.id,
      label: "Alex (partner)",
      revokedAt: null,
      lastUsedAt: null,
    });
    expect(await isAccessKeyActive(created.id)).toBe(true);
  });

  it("verifies the plaintext, stamps last-used, and rejects the wrong key", async () => {
    const created = await createAccessKey("Alex");

    const match = await verifyAccessKey(created.key);
    expect(match).toEqual({ keyId: created.id, keyName: "Alex" });

    const [after] = await listAccessKeys();
    expect(after!.lastUsedAt).not.toBeNull();

    expect(await verifyAccessKey("snadk_not-a-real-key")).toBeNull();
  });

  it("revokes immediately: no verify, no active, idempotent, unknown → false", async () => {
    const created = await createAccessKey("Alex");

    expect(await revokeAccessKey(created.id)).toBe(true);
    expect(await isAccessKeyActive(created.id)).toBe(false);
    expect(await verifyAccessKey(created.key)).toBeNull();

    // Already revoked / unknown ids report no-op.
    expect(await revokeAccessKey(created.id)).toBe(false);
    expect(
      await revokeAccessKey("00000000-0000-0000-0000-000000000000"),
    ).toBe(false);
  });
});

describe("POST /api/partner/login with a named key", () => {
  it("accepts a named key and embeds its identity in the session claim", async () => {
    setPartnerEnv();
    const created = await createAccessKey("Alex");

    const res = await loginPost(loginRequest(created.key));
    expect(res.status).toBe(200);

    const claim = claimFromResponse(res);
    expect(claim).toMatchObject({
      slug: SLUG,
      keyId: created.id,
      keyName: "Alex",
    });
  });

  it("returns 503 when the partner surface is not configured", async () => {
    const res = await loginPost(loginRequest("snadk_anything"));
    expect(res.status).toBe(503);
  });

  it("rejects a revoked key with 401 and sets no cookie", async () => {
    setPartnerEnv();
    const created = await createAccessKey("Alex");
    await revokeAccessKey(created.id);

    const res = await loginPost(loginRequest(created.key));
    expect(res.status).toBe(401);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("rejects an unknown credential with 401", async () => {
    setPartnerEnv();
    const res = await loginPost(loginRequest("snadk_nope"));
    expect(res.status).toBe(401);
  });
});
