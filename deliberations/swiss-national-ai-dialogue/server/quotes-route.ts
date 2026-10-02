import { NextResponse } from "next/server";
import { z } from "zod";

import { listClosingQuotes, updateClosingQuote } from "./quotes-admin";
import type { StudyEditorActor } from "./study-versions";

const updateRequestSchema = z.object({
  id: z.string().uuid(),
  featured: z.boolean().optional(),
  status: z.enum(["approved", "pending", "hidden"]).optional(),
});

export function quoteRoutes(actor: StudyEditorActor) {
  return {
    GET: async (): Promise<Response> =>
      NextResponse.json({ quotes: await listClosingQuotes() }),
    PATCH: async (req: Request): Promise<Response> => {
      const parsed = updateRequestSchema.safeParse(
        await req.json().catch(() => null),
      );
      if (!parsed.success) {
        return NextResponse.json(
          { error: "invalid_request", issues: parsed.error.flatten() },
          { status: 400 },
        );
      }
      const quote = await updateClosingQuote(parsed.data);
      if (!quote) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
      }
      console.log(
        `[snad-quotes] ${new Date().toISOString()} actor=${actor} action=update_quote id=${quote.id} featured=${quote.featured} status=${quote.status}`,
      );
      return NextResponse.json({ quote });
    },
  };
}
