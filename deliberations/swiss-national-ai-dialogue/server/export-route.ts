import { NextResponse } from "next/server";

import { answersCsv, chatsCsv, quotesCsv, sessionsCsv } from "./export";

const buildersByKind = {
  sessions: sessionsCsv,
  answers: answersCsv,
  quotes: quotesCsv,
  chats: chatsCsv,
};

export function exportRoutes(actor: "admin" | "partner") {
  return {
    GET: async (
      _req: Request,
      ctx: { params: Promise<{ kind: string }> },
    ): Promise<Response> => {
      const { kind } = await ctx.params;
      if (!Object.hasOwn(buildersByKind, kind)) {
        return NextResponse.json({ error: "unknown_export" }, { status: 400 });
      }
      const builder = buildersByKind[kind as keyof typeof buildersByKind];
      const csv = await builder();
      console.log(
        `[snad-export] ${new Date().toISOString()} actor=${actor} kind=${kind}`,
      );
      return new Response(csv, {
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": `attachment; filename="snad-${kind}-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    },
  };
}
