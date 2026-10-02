import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  PARTNER_SESSION_COOKIE,
  verifyPartnerSessionToken,
  type PartnerClaim,
} from "./session";

// Request-side partner auth. Every /partner page and /api/partner route MUST
// call verifyPartnerSession() (or requirePartnerSession() for pages) and use
// the returned claim's slug as the one and only scope — the middleware
// /partner redirect is cookie-presence UX, not security.

export function getPartnerConfig(): {
  sessionSecret: string;
  slug: string;
} | null {
  const sessionSecret = process.env.PARTNER_SESSION_SECRET;
  const slug = process.env.PARTNER_ADMIN_SLUG;
  if (!sessionSecret || !slug) return null;
  return { sessionSecret, slug };
}

export async function verifyPartnerSession(): Promise<PartnerClaim | null> {
  const config = getPartnerConfig();
  if (!config) return null;
  const cookieStore = await cookies();
  const token = cookieStore.get(PARTNER_SESSION_COOKIE)?.value;
  if (!token) return null;
  const claim = verifyPartnerSessionToken(token, config.sessionSecret);
  // A stale cookie from before a scope change must not grant the old slug.
  if (!claim || claim.slug !== config.slug) return null;
  return claim;
}

export async function requirePartnerSession(): Promise<PartnerClaim> {
  const claim = await verifyPartnerSession();
  if (!claim) redirect("/partner/login");
  return claim;
}

// Lightweight audit trail for partner-initiated mutations, written to the
// server logs.
export function partnerAudit(
  action: string,
  slug: string,
  detail?: Record<string, unknown>,
): void {
  console.log(
    `[partner-audit] ${new Date().toISOString()} action=${action} slug=${slug}${
      detail ? ` detail=${JSON.stringify(detail)}` : ""
    }`,
  );
}
