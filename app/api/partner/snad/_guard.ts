import type { PartnerClaim } from "@/lib/partner/session";

// Per-request revalidation passed to withPartnerSession for every SNAD
// /partner API route: a session is valid only while its named key is present
// and un-revoked (a keyless cookie from the removed shared-password
// credential is rejected). The DB-backed check lives in the slice and is
// reached by dynamic import, so this app-layer glue keeps lib/partner free of
// any deliberation dependency.
export async function snadKeyStillActive(claim: PartnerClaim): Promise<boolean> {
  if (!claim.keyId) return false;
  const { isAccessKeyActive } = await import(
    "@/deliberations/swiss-national-ai-dialogue/server/access-keys"
  );
  return isAccessKeyActive(claim.keyId);
}
