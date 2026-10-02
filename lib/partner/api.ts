import { NextResponse } from "next/server";

import { verifyPartnerSession } from "./auth";
import type { PartnerClaim } from "./session";

// Wrap an API route handler so it only runs for a verified partner session
// scoped to `slug`. The /partner middleware redirect is cookie-presence UX
// only — this HMAC check is the real gate for partner API mutations.
//
// `revalidate` is an optional per-request check the caller supplies to
// invalidate a still-valid HMAC session out of band — e.g. the SNAD adapter
// passes one that confirms the session's named access key hasn't been
// revoked. It stays a caller-injected callback so lib/partner (generic infra)
// never imports a deliberation's DB-backed key model.
export function withPartnerSession<Args extends unknown[]>(
  slug: string,
  handler: (...args: Args) => Promise<Response>,
  revalidate?: (claim: PartnerClaim) => Promise<boolean>,
): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    const claim = await verifyPartnerSession();
    if (!claim || claim.slug !== slug) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (revalidate && !(await revalidate(claim))) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return handler(...args);
  };
}
