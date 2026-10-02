import crypto from "crypto";

// Pure session-token + password primitives for the /partner surface, kept
// free of next/headers so they're directly unit-testable. The cookie /
// request plumbing lives in lib/partner/auth.ts.
//
// Token format: base64url(JSON{slug, exp, keyId?, keyName?}) + "." +
// base64url(HMAC-SHA256). The slug claim in a verified token — never anything
// client-supplied — is the authoritative scope for every /partner page and
// /api/partner route. keyId/keyName identify the named access key that
// authenticated: keyId is re-checked against the DB per request so a revoked
// key is locked out of live sessions immediately, and keyName is available
// for display. Both are opaque strings here — the DB-backed key model lives
// in the SNAD slice, and every live partner session carries a key (the old
// shared-password credential was removed). The fields stay optional so a
// pre-existing keyless cookie still parses — and is then rejected by the
// slice's per-request key check.

export const PARTNER_SESSION_COOKIE = "partner_session";
export const PARTNER_SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24h

export interface PartnerClaim {
  slug: string;
  exp: number;
  keyId?: string;
  keyName?: string;
}

function hmac(secret: string, payload: string): Buffer {
  return crypto.createHmac("sha256", secret).update(payload).digest();
}

export function mintPartnerSessionToken(
  slug: string,
  secret: string,
  now: number = Date.now(),
  key?: { keyId: string; keyName: string },
): string {
  const payload = Buffer.from(
    JSON.stringify({
      slug,
      exp: now + PARTNER_SESSION_TTL_MS,
      ...(key ? { keyId: key.keyId, keyName: key.keyName } : {}),
    }),
  ).toString("base64url");
  const signature = hmac(secret, payload).toString("base64url");
  return `${payload}.${signature}`;
}

export function verifyPartnerSessionToken(
  token: string,
  secret: string,
  now: number = Date.now(),
): PartnerClaim | null {
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);

  const expected = hmac(secret, payload);
  let actual: Buffer;
  try {
    actual = Buffer.from(signature, "base64url");
  } catch {
    return null;
  }
  if (
    actual.length !== expected.length ||
    !crypto.timingSafeEqual(actual, expected)
  ) {
    return null;
  }

  let claim: unknown;
  try {
    claim = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (
    typeof claim !== "object" ||
    claim === null ||
    typeof (claim as PartnerClaim).slug !== "string" ||
    (claim as PartnerClaim).slug.length === 0 ||
    typeof (claim as PartnerClaim).exp !== "number"
  ) {
    return null;
  }
  const parsed = claim as PartnerClaim;
  if (parsed.exp <= now) return null;
  return {
    slug: parsed.slug,
    exp: parsed.exp,
    ...(typeof parsed.keyId === "string" ? { keyId: parsed.keyId } : {}),
    ...(typeof parsed.keyName === "string" ? { keyName: parsed.keyName } : {}),
  };
}
