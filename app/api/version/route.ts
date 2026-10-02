import { NextResponse } from "next/server";

export const runtime = "nodejs";
// Never cached or statically evaluated: the client polls this to learn the
// build id the live pods are serving right now, so it must reflect the current
// process, not a value frozen at build time.
export const dynamic = "force-dynamic";

// The deployment id (image tag) baked into the running server at build time
// (Dockerfile ARG NEXT_DEPLOYMENT_ID). Clients compare it against the id baked
// into their bundle (NEXT_PUBLIC_DEPLOYMENT_ID) to detect a newer deploy.
export function GET() {
  return NextResponse.json({ id: process.env.NEXT_DEPLOYMENT_ID ?? null });
}
