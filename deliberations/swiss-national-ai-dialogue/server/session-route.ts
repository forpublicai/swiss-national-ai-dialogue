import { NextResponse } from "next/server";

import { computeAndPersistArchetype } from "./archetype/compute";
import { createSessionSchema, patchSessionSchema } from "./schema";
import {
  amendTopicAnswer,
  completeSession,
  createOrResumeSession,
  hydrateOwnedSession,
  readSnadSessionCookie,
  resetSession,
  resolveResponse,
  resolveWrapUpResponse,
  saveQuestionFeedback,
  saveTopicProgress,
  saveWrapUpProgress,
  updateSessionLocale,
} from "./sessions";

export async function GET(req: Request) {
  const session = await hydrateOwnedSession();
  if (!session) return NextResponse.json({ session: null });
  if (new URL(req.url).searchParams.get("archetype") === "1") {
    const result = await computeAndPersistArchetype(session.sessionId);
    return NextResponse.json({ result });
  }
  return NextResponse.json({ session });
}

export async function POST(req: Request) {
  const parsed = createSessionSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_session", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const session = await createOrResumeSession(parsed.data);
  return NextResponse.json({ session });
}

export async function PATCH(req: Request) {
  const parsed = patchSessionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_operation", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  try {
    if (parsed.data.operation === "progress") {
      await saveTopicProgress({
        topicKey: parsed.data.topic_key,
        values: parsed.data.values,
      });
      return NextResponse.json({ ok: true });
    }
    if (parsed.data.operation === "wrapup_progress") {
      await saveWrapUpProgress({ marker: parsed.data.marker });
      return NextResponse.json({ ok: true });
    }
    if (parsed.data.operation === "question_feedback") {
      await saveQuestionFeedback({
        openerId: parsed.data.opener_id,
        rating: parsed.data.rating,
        note: parsed.data.note,
      });
      return NextResponse.json({ ok: true });
    }
    const session =
      parsed.data.operation === "answer"
        ? await resolveResponse({
            stepId: parsed.data.response.step_id,
            answer: parsed.data.response.answer,
            skipped: parsed.data.response.skipped,
          })
        : parsed.data.operation === "wrapup_answer"
          ? await resolveWrapUpResponse({
              stepId: parsed.data.response.step_id,
              answer: parsed.data.response.answer,
              skipped: parsed.data.response.skipped,
            })
          : parsed.data.operation === "amend"
            ? await amendTopicAnswer({
                topicKey: parsed.data.topic_key,
                question: parsed.data.question,
                value: parsed.data.value,
              })
            : parsed.data.operation === "locale"
            ? await updateSessionLocale(parsed.data.locale)
            : await completeSession();
    return NextResponse.json({ session });
  } catch (error) {
    const message = error instanceof Error ? error.message : "operation_failed";
    const status =
      message === "no_session"
        ? 401
        : message === "step_already_resolved"
          ? 409
          : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE() {
  if (!(await readSnadSessionCookie())) {
    return NextResponse.json({ ok: true });
  }
  await resetSession();
  return NextResponse.json({ ok: true });
}
