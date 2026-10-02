import { NextResponse } from "next/server";
import { z } from "zod";

import {
  activateStudyVersion,
  createStudyVersion,
  getStudyVersion,
  listStudyVersions,
  validateStudyDefinition,
  type StudyEditorActor,
} from "./study-versions";

const createRequestSchema = z.object({
  definition: z.unknown(),
  notes: z.string().trim().max(4000).nullable().default(null),
});

const validateRequestSchema = z.object({ definition: z.unknown() });

function audit(
  actor: StudyEditorActor,
  action: string,
  detail: Record<string, unknown>,
): void {
  console.log(
    `[snad-study-editor] ${new Date().toISOString()} actor=${actor} action=${action} detail=${JSON.stringify(detail)}`,
  );
}

export function studyVersionCollectionRoutes(actor: StudyEditorActor) {
  return {
    GET: async (): Promise<Response> =>
      NextResponse.json({ versions: await listStudyVersions() }),
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
      const result = await createStudyVersion({
        definition: parsed.data.definition,
        notes: parsed.data.notes,
        createdBy: actor,
      });
      if (!result.ok) {
        return NextResponse.json(
          {
            error: "invalid_definition",
            errors: result.errors,
            duplicateOfId: result.duplicateOfId ?? null,
          },
          { status: result.duplicateOfId ? 409 : 400 },
        );
      }
      audit(actor, "create_study_version", { id: result.id });
      return NextResponse.json(
        { id: result.id, warnings: result.warnings },
        { status: 201 },
      );
    },
  };
}

export function studyVersionItemRoutes(actor: StudyEditorActor) {
  void actor;
  return {
    GET: async (
      _req: Request,
      ctx: { params: Promise<{ id: string }> },
    ): Promise<Response> => {
      const { id } = await ctx.params;
      const version = await getStudyVersion(id);
      if (!version) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
      }
      return NextResponse.json(version);
    },
  };
}

export function studyVersionActivateRoutes(actor: StudyEditorActor) {
  return {
    POST: async (
      _req: Request,
      ctx: { params: Promise<{ id: string }> },
    ): Promise<Response> => {
      const { id } = await ctx.params;
      const result = await activateStudyVersion(id);
      if (!result.ok) {
        return NextResponse.json(
          { error: "activation_failed", errors: result.errors },
          { status: 400 },
        );
      }
      audit(actor, "activate_study_version", { id });
      return NextResponse.json({ ok: true, warnings: result.warnings });
    },
  };
}

export function studyVersionValidateRoutes(actor: StudyEditorActor) {
  void actor;
  return {
    POST: async (req: Request): Promise<Response> => {
      const parsed = validateRequestSchema.safeParse(
        await req.json().catch(() => null),
      );
      if (!parsed.success) {
        return NextResponse.json(
          { error: "invalid_request", issues: parsed.error.flatten() },
          { status: 400 },
        );
      }
      const result = await validateStudyDefinition(parsed.data.definition);
      if (!result.ok) {
        return NextResponse.json({ ok: false, errors: result.errors });
      }
      return NextResponse.json({
        ok: true,
        warnings: result.warnings,
        definition: result.definition,
      });
    },
  };
}
