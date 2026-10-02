import { NextResponse } from "next/server";

import { getSnadPoll, isSnadPollKind } from "./polls";

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const openerId = params.get("opener_id");
  const kind = params.get("kind");
  if (!openerId || !isSnadPollKind(kind)) {
    return NextResponse.json(
      { error: "missing_opener_id_or_kind" },
      { status: 400 },
    );
  }
  return NextResponse.json({ poll: await getSnadPoll(openerId, kind) });
}
