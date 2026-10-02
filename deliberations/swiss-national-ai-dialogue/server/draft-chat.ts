import { randomUUID } from "node:crypto";

import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { snadChats } from "./db-schema";
import { getLlmBaseUrl } from "@/lib/ai/base-url";

import {
  ensureChat,
  hydrateSession,
  loadOwnedSession,
  loadSessionForChat,
  touchSession,
} from "./sessions";
import { STRINGS } from "../i18n-strings";
import {
  closingEditSystemPrompt,
  closingReplySystemPrompt,
  directorNote,
  DRAFT_MARKER,
  type DraftReplyState,
  editTranscriptTurn,
  otherEditSystemPrompt,
  otherReplySystemPrompt,
} from "../interviewer-prompts";
import {
  CONTRIBUTION_MAX_LENGTH,
  LANGUAGE_NAME,
  SNAD_CONTRIBUTION_MODEL,
} from "./constants";
import type {
  SnadChatTurn,
  SnadClosingConfig,
  SnadLocale,
  SnadStudyDefinition,
  StoredOpenerSpec,
} from "../types";

const OTHER_MAX_LENGTH = 200;

type OpenAiMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string };

function isMarkerPrefix(text: string): boolean {
  return (
    text.length > 0 &&
    text.length < DRAFT_MARKER.length &&
    DRAFT_MARKER.startsWith(text)
  );
}

function locateMarker(
  full: string,
): { visibleEnd: number; draftStart: number } | null {
  if (full.startsWith(DRAFT_MARKER)) {
    return { visibleEnd: 0, draftStart: DRAFT_MARKER.length };
  }
  const at = full.indexOf(`\n${DRAFT_MARKER}`);
  if (at !== -1) return { visibleEnd: at, draftStart: at + 1 + DRAFT_MARKER.length };
  return null;
}

function streamingVisibleLength(full: string): number {
  const marker = locateMarker(full);
  if (marker) return marker.visibleEnd;
  const lastNewline = full.lastIndexOf("\n");
  if (lastNewline === -1) return isMarkerPrefix(full) ? 0 : full.length;
  const tail = full.slice(lastNewline + 1);
  return tail === "" || isMarkerPrefix(tail) ? lastNewline : full.length;
}

const WRAPPING_QUOTE_PAIRS: Array<[string, string]> = [
  ['"', '"'],
  ["“", "”"],
  ["„", "“"],
  ["«", "»"],
  ["‘", "’"],
];

function stripWrappingQuotes(text: string): string {
  let result = text.trim();
  for (;;) {
    const pair = WRAPPING_QUOTE_PAIRS.find(
      ([open, close]) =>
        result.startsWith(open) &&
        result.endsWith(close) &&
        result.length > open.length + close.length,
    );
    if (!pair) return result;
    result = result.slice(pair[0].length, -pair[1].length).trim();
  }
}

function parseFinal(
  full: string,
  maxLength: number,
): { reply: string; draft: string | null } {
  const marker = locateMarker(full);
  const reply = full.slice(0, marker ? marker.visibleEnd : full.length).trim();
  if (!marker) return { reply, draft: null };
  const raw = stripWrappingQuotes(full.slice(marker.draftStart).trim());
  const draft = raw ? raw.slice(0, maxLength).trim() : "";
  return { reply, draft: draft || null };
}

function parseEditorDraft(raw: string, maxLength: number): string | null {
  let text = raw.trim();
  const markerAt = text.lastIndexOf(DRAFT_MARKER);
  if (markerAt !== -1) text = text.slice(markerAt + DRAFT_MARKER.length);
  text = stripWrappingQuotes(text.trim());
  const normalized = text.replace(/[\s.!,;:—-]+$/u, "").toUpperCase();
  if (!text || normalized === "NONE") return null;
  return text.slice(0, maxLength).trim() || null;
}

// ── SSE plumbing ────────────────────────────────────────────────────────────

function sse(value: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(value)}\n\n`);
}

function controllerClosed(error: unknown): boolean {
  return (
    error instanceof TypeError &&
    (error as TypeError & { code?: string }).code === "ERR_INVALID_STATE"
  );
}

function emit(
  controller: ReadableStreamDefaultController<Uint8Array>,
  value: unknown,
): void {
  try {
    controller.enqueue(sse(value));
  } catch (error) {
    if (!controllerClosed(error)) throw error;
  }
}

function close(controller: ReadableStreamDefaultController<Uint8Array>): void {
  try {
    controller.close();
  } catch (error) {
    if (!controllerClosed(error)) throw error;
  }
}

async function upstreamStream(input: {
  model: string;
  system: string;
  messages: OpenAiMessage[];
}): Promise<Response> {
  const baseUrl = getLlmBaseUrl();
  const apiKey = process.env.LLM_API_KEY;
  if (!baseUrl || !apiKey) throw new Error("SNAD AI is not configured");
  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: input.model,
      stream: true,
      messages: [{ role: "system", content: input.system }, ...input.messages],
    }),
  });
  if (!response.ok || !response.body) {
    await response.text().catch(() => "");
    throw new Error(`SNAD AI upstream failed (${response.status})`);
  }
  return response;
}

async function upstreamComplete(input: {
  model: string;
  system: string;
  messages: OpenAiMessage[];
}): Promise<string> {
  const baseUrl = getLlmBaseUrl();
  const apiKey = process.env.LLM_API_KEY;
  if (!baseUrl || !apiKey) throw new Error("SNAD AI is not configured");
  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: input.model,
      stream: false,
      messages: [{ role: "system", content: input.system }, ...input.messages],
    }),
  });
  if (!response.ok) {
    await response.text().catch(() => "");
    throw new Error(`SNAD AI upstream failed (${response.status})`);
  }
  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? "";
}

function streamTurn(args: {
  chatId: string;
  priorMessages: SnadChatTurn[];
  sessionId: string;
  model: string;
  editSystem: string;
  editHistory: OpenAiMessage[];
  replySystem: (state: DraftReplyState) => string;
  history: OpenAiMessage[];
  noun: "answer" | "quote";
  question: string;
  preTurnDraft: string | null;
  maxLength: number;
  withSession: boolean;
}): ReadableStream<Uint8Array> {
  return new ReadableStream({
    async start(controller) {
      let nextDraft = args.preTurnDraft;
      try {
        const raw = await upstreamComplete({
          model: args.model,
          system: args.editSystem,
          messages: args.editHistory,
        });
        nextDraft = parseEditorDraft(raw, args.maxLength) ?? args.preTurnDraft;
      } catch {
        nextDraft = args.preTurnDraft;
      }
      const changedThisTurn = nextDraft !== args.preTurnDraft;
      if (nextDraft !== null && changedThisTurn) {
        const [updated] = await db
          .update(snadChats)
          .set({ contributionDraft: nextDraft, updatedAt: new Date() })
          .where(
            and(
              eq(snadChats.id, args.chatId),
              args.preTurnDraft === null
                ? isNull(snadChats.contributionDraft)
                : eq(snadChats.contributionDraft, args.preTurnDraft),
            ),
          )
          .returning({ id: snadChats.id });
        if (updated) emit(controller, { type: "draft_update", draft: nextDraft });
      }

      let upstream: Response;
      const replyState: DraftReplyState = {
        draft: nextDraft,
        changedThisTurn,
        messages: args.priorMessages,
      };
      try {
        upstream = await upstreamStream({
          model: args.model,
          system: args.replySystem(replyState),
          messages: [
            ...args.history,
            {
              role: "user",
              content: directorNote(replyState, args.noun, args.question),
            },
          ],
        });
      } catch (error) {
        emit(controller, {
          type: "error",
          message: error instanceof Error ? error.message : "chat_failed",
          requestId: randomUUID(),
        });
        close(controller);
        return;
      }
      const reader = upstream.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let full = "";
      let emitted = 0;
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let boundary = buffer.indexOf("\n\n");
          while (boundary !== -1) {
            const frame = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);
            const line = frame
              .split("\n")
              .find((item) => item.startsWith("data:"));
            const payload = line?.slice(5).trim();
            if (payload && payload !== "[DONE]") {
              const parsed = JSON.parse(payload) as {
                choices?: Array<{ delta?: { content?: string } }>;
              };
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                full += delta;
                const visible = streamingVisibleLength(full);
                if (visible > emitted) {
                  emit(controller, {
                    type: "text_delta",
                    delta: full.slice(emitted, visible),
                  });
                  emitted = visible;
                }
              }
            }
            boundary = buffer.indexOf("\n\n");
          }
        }

        const { reply } = parseFinal(full, args.maxLength);
        if (reply.length > emitted) {
          emit(controller, { type: "text_delta", delta: reply.slice(emitted) });
        }

        const messages: SnadChatTurn[] = reply
          ? [...args.priorMessages, { role: "assistant", content: reply }]
          : args.priorMessages;
        await db
          .update(snadChats)
          .set({ messages, updatedAt: new Date() })
          .where(eq(snadChats.id, args.chatId));

        await touchSession(args.sessionId);
        emit(controller, {
          type: "done",
          ...(args.withSession
            ? { session: await hydrateSession(args.sessionId) }
            : {}),
        });
        close(controller);
      } catch (error) {
        const requestId = randomUUID();
        const message = error instanceof Error ? error.message : "chat_failed";
        console.error("[snad/draft-chat] stream failed", { requestId, message });
        emit(controller, { type: "error", message, requestId });
        close(controller);
      }
    },
  });
}

function historyFrom(
  lead: OpenAiMessage[],
  messages: SnadChatTurn[],
): OpenAiMessage[] {
  return [
    ...lead,
    ...messages.map(
      (turn) =>
        ({ role: turn.role, content: turn.content }) satisfies OpenAiMessage,
    ),
  ];
}

async function appendUserMessage(
  chat: typeof snadChats.$inferSelect,
  message: string,
): Promise<typeof snadChats.$inferSelect> {
  const last = chat.messages.at(-1);
  if (last?.role === "user" && last.content === message) return chat;
  const [updated] = await db
    .update(snadChats)
    .set({
      messages: [...chat.messages, { role: "user", content: message }],
      updatedAt: new Date(),
    })
    .where(eq(snadChats.id, chat.id))
    .returning();
  return updated;
}

async function syncDraft(
  chat: typeof snadChats.$inferSelect,
  draft: string,
  maxLength: number,
): Promise<typeof snadChats.$inferSelect> {
  const next = draft.trim().slice(0, maxLength) || null;
  if (next === chat.contributionDraft) return chat;
  const [updated] = await db
    .update(snadChats)
    .set({ contributionDraft: next, updatedAt: new Date() })
    .where(eq(snadChats.id, chat.id))
    .returning();
  return updated;
}

const localize = (value: Record<string, string>, locale: SnadLocale): string =>
  value[locale]?.trim() || value.en?.trim() || "";

function localizeClosingQuestion(
  closing: SnadClosingConfig,
  locale: SnadLocale,
): string {
  return closing.question[locale]?.trim() || closing.question.en?.trim() || "";
}

const KICKOFF_DELTA_MS = 28;

function kickoffStream(input: {
  sessionId: string;
  text: string;
}): ReadableStream<Uint8Array> {
  return new ReadableStream({
    async start(controller) {
      const words = input.text.split(/(?<=\s)/);
      for (const word of words) {
        emit(controller, { type: "text_delta", delta: word });
        await new Promise((resolve) => setTimeout(resolve, KICKOFF_DELTA_MS));
      }
      emit(controller, {
        type: "done",
        session: await hydrateSession(input.sessionId),
      });
      close(controller);
    },
  });
}

async function runClosing(input: {
  message?: string;
  kickoff?: boolean;
  draft?: string;
}): Promise<ReadableStream<Uint8Array>> {
  const data = await loadSessionForChat();
  if (
    data.payload.activeStep.kind !== "wrap_up" &&
    data.payload.activeStep.kind !== "completed"
  ) {
    throw new Error("feedback_not_active");
  }
  const closing = data.definition.wrapUp.closing;
  if (!closing) throw new Error("closing_not_configured");
  const actor = data.definition.aiActors[data.definition.wrapUp.feedbackActorId];
  if (!actor) throw new Error("actor_not_found");

  let chat = await ensureChat({
    sessionId: data.session.id,
    stepId: "feedback",
    actorId: actor.id,
    type: "feedback",
  });
  if (chat.status === "completed") throw new Error("chat_completed");

  if (input.draft !== undefined) {
    chat = await syncDraft(chat, input.draft, CONTRIBUTION_MAX_LENGTH);
  }

  const kickoff = input.kickoff === true;
  if (kickoff && chat.messages.length > 0) {
    return new ReadableStream({
      async start(controller) {
        emit(controller, {
          type: "done",
          session: await hydrateSession(data.session.id),
        });
        close(controller);
      },
    });
  }
  if (kickoff) {
    const locale = data.session.locale as SnadLocale;
    const text = STRINGS[locale].closing.kickoff.replace(
      "{question}",
      localizeClosingQuestion(closing, locale),
    );
    await db
      .update(snadChats)
      .set({
        messages: [...chat.messages, { role: "assistant", content: text }],
        updatedAt: new Date(),
      })
      .where(eq(snadChats.id, chat.id));
    await touchSession(data.session.id);
    return kickoffStream({ sessionId: data.session.id, text });
  }

  const message = input.message?.trim();
  if (!message) throw new Error("message_required");
  chat = await appendUserMessage(chat, message);

  const locale = data.session.locale as SnadLocale;
  const preTurnDraft = chat.contributionDraft;
  const question = localizeClosingQuestion(closing, locale);
  const editSystem = closingEditSystemPrompt({
    locale,
    currentDraft: preTurnDraft,
  });
  const replySystem = () =>
    closingReplySystemPrompt({ locale, canton: data.session.canton, question });
  const history = historyFrom(
    [
      {
        role: "user",
        content:
          "The participant has finished every topic of the dialogue. The exchange below has already opened with your introduction and your closing question — continue it, following your brief.",
      },
    ],
    chat.messages,
  );
  return streamTurn({
    chatId: chat.id,
    priorMessages: chat.messages,
    sessionId: data.session.id,
    model: SNAD_CONTRIBUTION_MODEL,
    editSystem,
    editHistory: [
      {
        role: "user",
        content: editTranscriptTurn({
          messages: chat.messages,
          language: LANGUAGE_NAME[locale],
          noun: "quote",
        }),
      },
    ],
    replySystem,
    history,
    noun: "quote",
    question,
    preTurnDraft,
    maxLength: CONTRIBUTION_MAX_LENGTH,
    withSession: true,
  });
}

// ── MCQ "Other…" assist (mode "other") ──────────────────────────────────────

function findQuestionSpec(
  definition: SnadStudyDefinition,
  openerId: string,
): Extract<StoredOpenerSpec, { kind: "question" }> | null {
  const specs: StoredOpenerSpec[] = [
    ...definition.topics.flatMap((topic) =>
      topic.openers.sequence.flatMap((step) =>
        step.mode === "always" ? [step.opener] : step.pool,
      ),
    ),
    ...(definition.wrapUp.questions ?? []),
  ];
  const spec = specs.find((candidate) => candidate.id === openerId);
  return spec && spec.kind === "question" ? spec : null;
}

const otherStepId = (openerId: string): string => `other:${openerId}`;

export async function loadOtherChat(
  openerId: string,
): Promise<{ turns: SnadChatTurn[]; draft: string | null } | null> {
  const owned = await loadOwnedSession();
  if (!owned) throw new Error("no_session");
  const [chat] = await db
    .select()
    .from(snadChats)
    .where(
      and(
        eq(snadChats.sessionId, owned.session.id),
        eq(snadChats.stepId, otherStepId(openerId)),
        eq(snadChats.type, "other"),
      ),
    )
    .limit(1);
  if (!chat) return null;
  return { turns: chat.messages, draft: chat.contributionDraft };
}

async function runOther(input: {
  openerId?: string;
  message?: string;
  draft?: string;
}): Promise<ReadableStream<Uint8Array>> {
  const openerId = input.openerId;
  if (!openerId) throw new Error("opener_id_required");
  const owned = await loadOwnedSession();
  if (!owned) throw new Error("no_session");
  const locale = owned.session.locale as SnadLocale;
  const spec = findQuestionSpec(owned.definition, openerId);
  if (!spec) throw new Error("question_not_found");

  let chat = await ensureChat({
    sessionId: owned.session.id,
    stepId: otherStepId(openerId),
    actorId: "other-assist",
    type: "other",
  });

  if (input.draft !== undefined) {
    chat = await syncDraft(chat, input.draft, OTHER_MAX_LENGTH);
  }

  const message = input.message?.trim();
  if (!message) throw new Error("message_required");
  chat = await appendUserMessage(chat, message);

  const question = localize(spec.question, locale);
  const options = spec.options.map((option) => localize(option.label, locale));
  const editSystem = otherEditSystemPrompt({
    locale,
    question,
    options,
    currentAnswer: chat.contributionDraft,
  });
  const replySystem = () => otherReplySystemPrompt({ locale, question, options });
  const history = historyFrom(
    [{ role: "assistant", content: STRINGS[locale].assist.kickoff }],
    chat.messages,
  );
  return streamTurn({
    chatId: chat.id,
    priorMessages: chat.messages,
    sessionId: owned.session.id,
    model: SNAD_CONTRIBUTION_MODEL,
    editSystem,
    editHistory: [
      {
        role: "user",
        content: editTranscriptTurn({
          messages: chat.messages,
          language: LANGUAGE_NAME[locale],
          noun: "answer",
        }),
      },
    ],
    replySystem,
    history,
    noun: "answer",
    question,
    preTurnDraft: chat.contributionDraft,
    maxLength: OTHER_MAX_LENGTH,
    withSession: false,
  });
}

export async function syncOtherDraft(input: {
  openerId: string;
  draft: string;
}): Promise<void> {
  const owned = await loadOwnedSession();
  if (!owned) throw new Error("no_session");
  if (!findQuestionSpec(owned.definition, input.openerId)) return;
  const chat = await ensureChat({
    sessionId: owned.session.id,
    stepId: otherStepId(input.openerId),
    actorId: "other-assist",
    type: "other",
  });
  await syncDraft(chat, input.draft, OTHER_MAX_LENGTH);
  await touchSession(owned.session.id);
}

// ── Entry point ─────────────────────────────────────────────────────────────

export async function runDraftChat(input: {
  mode: "closing" | "other";
  openerId?: string;
  message?: string;
  kickoff?: boolean;
  draft?: string;
}): Promise<ReadableStream<Uint8Array>> {
  if (input.mode === "other") {
    return runOther({
      openerId: input.openerId,
      message: input.message,
      draft: input.draft,
    });
  }
  return runClosing({
    message: input.message,
    kickoff: input.kickoff,
    draft: input.draft,
  });
}
