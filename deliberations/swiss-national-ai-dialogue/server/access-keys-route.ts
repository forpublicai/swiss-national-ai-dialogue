import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createAccessKey,
  listAccessKeys,
  revokeAccessKey,
} from "./access-keys";

const createRequestSchema = z.object({
  label: z.string().trim().min(1).max(120),
});

function audit(action: string, keyId: string): void {
  console.log(
    `[snad-access-keys] ${new Date().toISOString()} action=${action} keyId=${keyId}`,
  );
}

export const accessKeyCollectionRoutes = {
  GET: async (): Promise<Response> =>
    NextResponse.json({ keys: await listAccessKeys() }),
  POST: async (req: Request): Promise<Response> => {
    const parsed = createRequestSchema.safeParse(
      await req.json().catch(() => null),
    );
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_request", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const created = await createAccessKey(parsed.data.label);
    audit("create", created.id);
    return NextResponse.json(created, { status: 201 });
  },
};

export const accessKeyItemRoutes = {
  DELETE: async (
    _req: Request,
    ctx: { params: Promise<{ id: string }> },
  ): Promise<Response> => {
    const { id } = await ctx.params;
    const revoked = await revokeAccessKey(id);
    if (!revoked) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    audit("revoke", id);
    return NextResponse.json({ ok: true });
  },
};
