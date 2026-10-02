import { notFound, redirect } from "next/navigation";

import { requirePartnerSession, verifyPartnerSession } from "@/lib/partner/auth";
import type { PartnerClaim } from "@/lib/partner/session";

// App-layer composition of the generic partner HMAC session
// (lib/partner/auth) with the SNAD slice's DB-backed access-key model. This
// glue lives in the app layer — not lib/partner (which must not import a
// deliberation) and not the slice (which must not import lib/partner) — and
// dynamic-imports the slice, exactly as the /partner pages already do.

const SNAD_SLUG = "swiss-national-ai-dialogue";

// Every live partner session must carry a named key that is still
// un-revoked. This is the per-request re-check that locks a revoked key out
// of an existing session immediately (rather than waiting for the 24h cookie
// to expire) and also invalidates any pre-existing keyless cookie left over
// from the removed shared-password credential.
async function keyStillActive(claim: PartnerClaim): Promise<boolean> {
  if (!claim.keyId) return false;
  const { isAccessKeyActive } = await import(
    "@/deliberations/swiss-national-ai-dialogue/server/access-keys"
  );
  return isAccessKeyActive(claim.keyId);
}

// For authed /partner pages: verify the HMAC session, enforce the single
// scoped slug, and re-check the key. A revoked key bounces to the login form
// (which re-checks too, so this does not loop back to the dashboard).
export async function requireActivePartnerSession(): Promise<PartnerClaim> {
  const claim = await requirePartnerSession();
  if (claim.slug !== SNAD_SLUG) notFound();
  if (!(await keyStillActive(claim))) redirect("/partner/login");
  return claim;
}

// For the login page's "already signed in" short-circuit: a valid session
// with a live key skips the form; anything else (no session, wrong slug,
// revoked key) shows it.
export async function hasActivePartnerSession(): Promise<boolean> {
  const claim = await verifyPartnerSession();
  if (!claim || claim.slug !== SNAD_SLUG) return false;
  return keyStillActive(claim);
}
