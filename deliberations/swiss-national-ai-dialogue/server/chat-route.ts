import { NextResponse } from "next/server";

import { loadOtherChat, runDraftChat, syncOtherDraft } from "./draft-chat";
import { chatRequestSchema } from "./schema";

export async function POST(req: Request) {
  const parsed = chatRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_chat_request" }, { status: 400 });
  }
  const data = parsed.data;
  try {
    if (data.mode === "other" && "operation" in data) {
      if (data.operation === "load") {
        const state = await loadOtherChat(data.opener_id);
        return NextResponse.json(state ?? { turns: [], draft: null });
      }
      await syncOtherDraft({ openerId: data.opener_id, draft: data.draft });
      return NextResponse.json({ ok: true });
    }
    const stream = await runDraftChat(
      data.mode === "other"
        ? {
            mode: "other",
            openerId: data.opener_id,
            message: data.message,
            draft: data.draft,
          }
        : {
            mode: "closing",
            message: data.message,
            kickoff: data.kickoff,
            draft: data.draft,
          },
    );
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "chat_failed";
    console.error("[snad/chat] request failed", { message });
    return NextResponse.json(
      { error: message },
      { status: message === "no_session" ? 401 : 400 },
    );
  }
}
