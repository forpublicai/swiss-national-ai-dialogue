import { NextResponse } from "next/server";
import { z } from "zod";

import { getPartnerConfig, partnerAudit } from "@/lib/partner/auth";
import {
  PARTNER_SESSION_COOKIE,
  PARTNER_SESSION_TTL_MS,
  mintPartnerSessionToken,
} from "@/lib/partner/session";

export const runtime = "nodejs";

const bodySchema = z.object({
  key: z.string().min(1).max(500),
});

// Fixed delay on failure to slow brute-forcing of access keys; pair it with a
// rate limit at your proxy.
const FAILURE_DELAY_MS = 300;

const SNAD_SLUG = "swiss-national-ai-dialogue";

// A named access key belongs to the SNAD slice's DB-backed key model. The
// login route may dynamic-import the slice (the /partner pages already do) so
// lib/partner stays free of any deliberation import.
async function verifyNamedKey(
  slug: string,
  credential: string,
): Promise<{ keyId: string; keyName: string } | null> {
  if (slug !== SNAD_SLUG) return null;
  const { verifyAccessKey } = await import(
    "@/deliberations/swiss-national-ai-dialogue/server/access-keys"
  );
  return verifyAccessKey(credential);
}

export async function POST(req: Request) {
  const config = getPartnerConfig();
  if (!config) {
    return NextResponse.json({ error: "partner_not_configured" }, { status: 503 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  // A named access key issued from /admin is the only credential. The session
  // embeds keyId/keyName so audit logging records who acted and revocation can
  // lock the session out per request.
  const key = await verifyNamedKey(config.slug, parsed.data.key);
  if (!key) {
    await new Promise((resolve) => setTimeout(resolve, FAILURE_DELAY_MS));
    return NextResponse.json({ error: "invalid_key" }, { status: 401 });
  }

  partnerAudit("login", config.slug, { keyId: key.keyId });
  const token = mintPartnerSessionToken(
    config.slug,
    config.sessionSecret,
    undefined,
    key,
  );
  const response = NextResponse.json({ ok: true });
  response.cookies.set(PARTNER_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(PARTNER_SESSION_TTL_MS / 1000),
  });
  return response;
}
