/**
 * @jest-environment node
 *
 * The MCQ "Other…" assist over the unified draft-chat engine (mode "other"):
 * a helper chat, keyed per question by opener id, persisted to a `snad.chats`
 * row of type "other". Each turn runs a non-streamed EDIT pass (returns the
 * refined answer, or NONE) and a streamed REPLY pass (the conversational text):
 * a captured answer is emitted as draft_update and persisted as the row's
 * draft; NONE leaves the draft untouched; the reply streams as text_delta and
 * is persisted as the assistant turn; loadOtherChat resumes the thread + draft;
 * syncOtherDraft blur-persists a manual edit with no model turn. Cookie auth is
 * mocked and fetch is stubbed file-wide (nothing may reach a real model);
 * everything else runs against the real test DB.
 */

process.env.DATABASE_URL ??=
  "postgresql://postgres:postgres@localhost:5433/dialogue_test";

const originalAnthropicEnv = {
  baseUrl: process.env.LLM_BASE_URL,
  apiKey: process.env.LLM_API_KEY,
};
process.env.LLM_BASE_URL = "https://llm.example.test";
process.env.LLM_API_KEY = "test-key";

const originalFetch = global.fetch;
const fetchMock = jest.fn();
global.fetch = fetchMock as unknown as typeof fetch;

let sessionCookie: string | undefined;
jest.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "snad_session" && sessionCookie
        ? { name, value: sessionCookie }
        : undefined,
    set: jest.fn(),
    delete: jest.fn(),
  }),
}));

import path from "node:path";

import { and, eq, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { Pool } from "pg";

import { db } from "@/db";
import { snadChats, snadSessions } from "@/deliberations/swiss-national-ai-dialogue/server/db-schema";
import {
  loadOtherChat,
  runDraftChat,
  syncOtherDraft,
} from "@/deliberations/swiss-national-ai-dialogue/server/draft-chat";
import { ensureActiveStudyVersion, snadStudyDefinition } from "@/deliberations/swiss-national-ai-dialogue/server/study";
import type { StoredOpenerSpec } from "@/deliberations/swiss-national-ai-dialogue/types";

beforeAll(async () => {
  await migrate(db, {
    migrationsFolder: path.join(__dirname, "../../../../drizzle"),
  });
});

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockRejectedValue(new Error("no model upstream in tests"));
});

afterEach(async () => {
  sessionCookie = undefined;
  await db.execute(
    sql`TRUNCATE snad.sessions, snad.study_versions RESTART IDENTITY CASCADE`,
  );
});

afterAll(async () => {
  process.env.LLM_BASE_URL = originalAnthropicEnv.baseUrl;
  process.env.LLM_API_KEY = originalAnthropicEnv.apiKey;
  if (originalAnthropicEnv.baseUrl === undefined) {
    delete process.env.LLM_BASE_URL;
  }
  if (originalAnthropicEnv.apiKey === undefined) {
    delete process.env.LLM_API_KEY;
  }
  global.fetch = originalFetch;
  await (db.$client as Pool).end();
});

function anOtherAssistQuestionId(): string {
  const specs: StoredOpenerSpec[] = [
    ...snadStudyDefinition.topics.flatMap((topic) =>
      topic.openers.sequence.flatMap((step) =>
        step.mode === "always" ? [step.opener] : step.pool,
      ),
    ),
    ...(snadStudyDefinition.wrapUp.questions ?? []),
  ];
  const spec = specs.find((candidate) => candidate.kind === "question");
  if (!spec) throw new Error("no MCQ question in the study definition");
  return spec.id;
}

async function seedActiveSession(): Promise<string> {
  const version = await ensureActiveStudyVersion();
  const [session] = await db
    .insert(snadSessions)
    .values({ studyVersionId: version.id, locale: "en", canton: "BE" })
    .returning({ id: snadSessions.id });
  return session!.id;
}

function stubOtherTurn(input: { reply: string; draft: string | null }) {
  fetchMock.mockImplementation(async (_url: unknown, init: unknown) => {
    const body = JSON.parse((init as RequestInit).body as string) as {
      stream?: boolean;
    };
    if (body.stream) {
      const encoder = new TextEncoder();
      return {
        ok: true,
        body: new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ choices: [{ delta: { content: input.reply } }] })}\n\n`,
              ),
            );
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          },
        }),
      } as Response;
    }
    return {
      ok: true,
      json: async () => ({
        choices: [{ message: { content: input.draft ?? "NONE" } }],
      }),
    } as Response;
  });
}

async function readStream(
  stream: ReadableStream<Uint8Array>,
): Promise<Array<Record<string, unknown>>> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
  }
  return buffer
    .split("\n\n")
    .filter((frame) => frame.startsWith("data:"))
    .map((frame) => JSON.parse(frame.slice(5).trim()));
}

async function otherChatRow(sessionId: string, openerId: string) {
  const [row] = await db
    .select()
    .from(snadChats)
    .where(
      and(
        eq(snadChats.sessionId, sessionId),
        eq(snadChats.stepId, `other:${openerId}`),
        eq(snadChats.type, "other"),
      ),
    );
  return row;
}

describe("MCQ Other assist streaming turn", () => {
  it("streams the reply, persists the thread, and lands the edit pass's answer as the draft", async () => {
    const sessionId = await seedActiveSession();
    sessionCookie = sessionId;
    const openerId = anOtherAssistQuestionId();
    stubOtherTurn({
      reply: "Got it — anything else?",
      draft: "I want AI that respects my privacy.",
    });

    const events = await readStream(
      await runDraftChat({
        mode: "other",
        openerId,
        message: "I care about privacy.",
      }),
    );

    const visible = events
      .filter((event) => event.type === "text_delta")
      .map((event) => event.delta)
      .join("");
    expect(visible).toBe("Got it — anything else?");
    expect(events.find((event) => event.type === "draft_update")).toMatchObject({
      draft: "I want AI that respects my privacy.",
    });

    const row = await otherChatRow(sessionId, openerId);
    expect(row).toMatchObject({
      type: "other",
      stepId: `other:${openerId}`,
      contributionDraft: "I want AI that respects my privacy.",
    });
    expect(row!.messages).toEqual([
      { role: "user", content: "I care about privacy." },
      { role: "assistant", content: "Got it — anything else?" },
    ]);
  });

  it("leaves the draft untouched when the edit pass returns NONE", async () => {
    const sessionId = await seedActiveSession();
    sessionCookie = sessionId;
    const openerId = anOtherAssistQuestionId();
    stubOtherTurn({ reply: "Tell me a bit more — what worries you?", draft: null });

    const events = await readStream(
      await runDraftChat({ mode: "other", openerId, message: "hello" }),
    );

    expect(events.some((event) => event.type === "draft_update")).toBe(false);
    const row = await otherChatRow(sessionId, openerId);
    expect(row!.contributionDraft).toBeNull();
    expect(row!.messages.at(-1)).toEqual({
      role: "assistant",
      content: "Tell me a bit more — what worries you?",
    });
  });

  it("rejects an unknown opener id", async () => {
    sessionCookie = await seedActiveSession();

    await expect(
      runDraftChat({ mode: "other", openerId: "not-a-real-opener", message: "hi" }),
    ).rejects.toThrow("question_not_found");
  });
});

describe("MCQ Other assist resume + blur-sync", () => {
  it("loadOtherChat returns the stored thread and draft", async () => {
    const sessionId = await seedActiveSession();
    sessionCookie = sessionId;
    const openerId = anOtherAssistQuestionId();
    stubOtherTurn({ reply: "Noted.", draft: "Keep my data in Switzerland." });
    await readStream(
      await runDraftChat({ mode: "other", openerId, message: "Data locality." }),
    );

    const state = await loadOtherChat(openerId);

    expect(state).toEqual({
      turns: [
        { role: "user", content: "Data locality." },
        { role: "assistant", content: "Noted." },
      ],
      draft: "Keep my data in Switzerland.",
    });
  });

  it("loadOtherChat is null before the question is opened", async () => {
    sessionCookie = await seedActiveSession();

    expect(await loadOtherChat(anOtherAssistQuestionId())).toBeNull();
  });

  it("syncOtherDraft persists a manual edit with no model turn", async () => {
    const sessionId = await seedActiveSession();
    sessionCookie = sessionId;
    const openerId = anOtherAssistQuestionId();

    await syncOtherDraft({ openerId, draft: "My own words, typed directly." });

    const row = await otherChatRow(sessionId, openerId);
    expect(row).toMatchObject({
      type: "other",
      contributionDraft: "My own words, typed directly.",
    });
    expect(row!.messages).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
