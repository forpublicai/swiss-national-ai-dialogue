import { NextResponse } from "next/server";

import {
  getFeaturedQuotes,
  resolveClosingContribution,
  syncClosingDraft,
} from "./contributions";
import { loadOwnedSession } from "./sessions";
import { contributionRequestSchema } from "./schema";

export async function POST(req: Request) {
  const parsed = contributionRequestSchema.safeParse(
    await req.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_contribution", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  try {
    if (parsed.data.operation === "draft") {
      await syncClosingDraft({ draft: parsed.data.draft });
      return NextResponse.json({ ok: true });
    }
    if (parsed.data.operation === "wall") {
      const owned = await loadOwnedSession();
      const wall = await getFeaturedQuotes({
        excludeSessionId: owned?.session.id,
        locale: owned?.session.locale,
      });
      return NextResponse.json({ wall });
    }
    const result = await resolveClosingContribution({
      text: parsed.data.operation === "submit" ? parsed.data.text : null,
      skipped: parsed.data.operation === "skip",
    });
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "contribution_failed";
    return NextResponse.json(
      { error: message },
      { status: message === "no_session" ? 401 : 400 },
    );
  }
}
