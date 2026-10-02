/**
 * @jest-environment node
 *
 * The end-of-dialogue closing interview: the feedback chat's kickoff streams
 * the localized Apertus intro with the study version's closing question
 * folded in (no model round-trip);
 * resolveClosingContribution stores the quote under the reserved closing key
 * and completes the feedback chat row (skip resolves without a row, re-posts
 * are idempotent, premature calls reject); the session payload carries the
 * localized closing state; and the curated quote wall serves only featured,
 * approved quotes from other sessions. Curation itself: featuring implies
 * approval, hiding un-features. The per-turn quote rewrite renders the
 * code-canonical quote-rewrite rules into the EDIT pass's system prompt: the
 * quote is produced by that non-streamed edit pass, and the streamed reply pass
 * never sees the quote-form rules. Cookie-scoped
 * auth is mocked (jest has
 * no request scope) and fetch is stubbed file-wide (getLlmBaseUrl
 * memoizes per process, so the allowlisted URL must be in place before the
 * first AI call — and nothing may ever reach it); everything else runs
 * against the real test DB.
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

import { eq, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { Pool } from "pg";

import { db } from "@/db";
import { DEFAULT_CLOSING } from "@/deliberations/swiss-national-ai-dialogue/closing-default";
import { STRINGS } from "@/deliberations/swiss-national-ai-dialogue/i18n-strings";
import {
  snadChats,
  snadContributions,
  snadResponses,
  snadSessions,
} from "@/deliberations/swiss-national-ai-dialogue/server/db-schema";
import { runDraftChat } from "@/deliberations/swiss-national-ai-dialogue/server/draft-chat";
import { SNAD_CLOSING_TOPIC_KEY } from "@/deliberations/swiss-national-ai-dialogue/server/constants";
import {
  getFeaturedQuotes,
  getMapQuotes,
  resolveClosingContribution,
  summarizeClosingPrompt,
  syncClosingDraft,
} from "@/deliberations/swiss-national-ai-dialogue/server/contributions";
import {
  listClosingQuotes,
  updateClosingQuote,
} from "@/deliberations/swiss-national-ai-dialogue/server/quotes-admin";
import {
  hydrateSession,
  topicStepId,
} from "@/deliberations/swiss-national-ai-dialogue/server/sessions";
import {
  ensureActiveStudyVersion,
  snadStudyDefinition,
} from "@/deliberations/swiss-national-ai-dialogue/server/study";

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

async function insertSessionAtWrapUp(input: {
  studyVersionId: string;
  locale?: string;
  canton?: string | null;
}): Promise<string> {
  const [session] = await db
    .insert(snadSessions)
    .values({
      studyVersionId: input.studyVersionId,
      locale: input.locale ?? "en",
      canton: input.canton === undefined ? "BE" : input.canton,
      status: "wrap_up",
    })
    .returning({ id: snadSessions.id });
  await Promise.all(
    snadStudyDefinition.topics.map((topic) =>
      db.insert(snadResponses).values({
        sessionId: session!.id,
        stepId: topicStepId(topic.key),
        answer: null,
        skipped: true,
        locale: input.locale ?? "en",
      }),
    ),
  );
  return session!.id;
}

async function seedSessionAtWrapUp(input: {
  locale?: string;
  canton?: string | null;
} = {}): Promise<string> {
  const version = await ensureActiveStudyVersion();
  return insertSessionAtWrapUp({ studyVersionId: version.id, ...input });
}

async function seedFeaturedQuote(input: {
  text: string;
  locale?: string;
  canton?: string;
  createdAt?: Date;
  featured?: boolean;
  status?: "approved" | "pending" | "hidden";
}): Promise<string> {
  const otherSession = await seedSessionAtWrapUp({
    locale: input.locale ?? "en",
    canton: input.canton ?? "ZH",
  });
  const [row] = await db
    .insert(snadContributions)
    .values({
      sessionId: otherSession,
      topicKey: SNAD_CLOSING_TOPIC_KEY,
      text: input.text,
      locale: input.locale ?? "en",
      canton: input.canton ?? "ZH",
      source: "chat",
      status: input.status ?? "approved",
      featured: input.featured ?? true,
      ...(input.createdAt ? { createdAt: input.createdAt } : {}),
    })
    .returning({ id: snadContributions.id });
  return row!.id;
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

describe("closing chat kickoff", () => {
  it("streams the localized Apertus intro with the version's closing question folded in, model-free", async () => {
    const sessionId = await seedSessionAtWrapUp({ locale: "de" });
    sessionCookie = sessionId;

    const events = await readStream(
      await runDraftChat({ mode: "closing", kickoff: true }),
    );

    const expected = STRINGS.de.closing.kickoff.replace(
      "{question}",
      DEFAULT_CLOSING.question.de,
    );
    const streamed = events
      .filter((event) => event.type === "text_delta")
      .map((event) => event.delta)
      .join("");
    expect(streamed).toBe(expected);
    expect((events.at(-1) as { type: string }).type).toBe("done");
    const [chat] = await db
      .select()
      .from(snadChats)
      .where(eq(snadChats.sessionId, sessionId));
    expect(chat).toMatchObject({ type: "feedback", stepId: "feedback" });
    expect(chat!.messages).toEqual([{ role: "assistant", content: expected }]);
  });

  it("does not duplicate the opening line when the kickoff re-fires", async () => {
    const sessionId = await seedSessionAtWrapUp();
    sessionCookie = sessionId;
    await readStream(await runDraftChat({ mode: "closing", kickoff: true }));

    await readStream(await runDraftChat({ mode: "closing", kickoff: true }));

    const [chat] = await db
      .select()
      .from(snadChats)
      .where(eq(snadChats.sessionId, sessionId));
    expect(chat!.messages).toHaveLength(1);
  });
});

describe("session payload closing state", () => {
  it("carries the localized question and the quote card's persisted draft", async () => {
    const sessionId = await seedSessionAtWrapUp({ locale: "fr" });
    sessionCookie = sessionId;
    await syncClosingDraft({ draft: "Ce qui me manque…" });

    const session = await hydrateSession(sessionId);

    expect(session.closing).toEqual({
      question: DEFAULT_CLOSING.question.fr,
      draft: "Ce qui me manque…",
      contribution: null,
      resolved: false,
    });
  });
});

describe("resolveClosingContribution", () => {
  it("stores the quote under the reserved closing key and completes the feedback chat", async () => {
    const sessionId = await seedSessionAtWrapUp();
    sessionCookie = sessionId;
    await readStream(await runDraftChat({ mode: "closing", kickoff: true }));

    const result = await resolveClosingContribution({
      text: "Nobody asked about education.",
      skipped: false,
    });

    expect(result.session.closing).toMatchObject({
      contribution: "Nobody asked about education.",
      resolved: true,
    });
    const [row] = await db
      .select()
      .from(snadContributions)
      .where(eq(snadContributions.sessionId, sessionId));
    // The file-wide fetch stub rejects, so moderation degrades to pending.
    expect(row).toMatchObject({
      topicKey: SNAD_CLOSING_TOPIC_KEY,
      text: "Nobody asked about education.",
      canton: "BE",
      source: "write",
      status: "pending",
      featured: false,
    });
    const [chat] = await db
      .select()
      .from(snadChats)
      .where(eq(snadChats.sessionId, sessionId));
    expect(chat).toMatchObject({ status: "completed" });
  });

  it("resolves without a contribution row on skip and stays idempotent", async () => {
    const sessionId = await seedSessionAtWrapUp();
    sessionCookie = sessionId;

    const first = await resolveClosingContribution({ text: null, skipped: true });
    const second = await resolveClosingContribution({ text: null, skipped: true });

    expect(first.session.closing).toMatchObject({ resolved: true });
    expect(second.session.closing).toMatchObject({ resolved: true });
    const rows = await db
      .select()
      .from(snadContributions)
      .where(eq(snadContributions.sessionId, sessionId));
    expect(rows).toHaveLength(0);
  });

  it("rejects before the session reaches wrap-up", async () => {
    const version = await ensureActiveStudyVersion();
    const [session] = await db
      .insert(snadSessions)
      .values({ studyVersionId: version.id, locale: "en", canton: "BE" })
      .returning({ id: snadSessions.id });
    sessionCookie = session!.id;

    await expect(
      resolveClosingContribution({ text: "too early", skipped: false }),
    ).rejects.toThrow("step_not_active");
  });

  it("returns the curated wall — featured approved quotes from other sessions only", async () => {
    const sessionId = await seedSessionAtWrapUp();
    sessionCookie = sessionId;
    await seedFeaturedQuote({ text: "Featured voice." });
    await seedFeaturedQuote({ text: "Approved but not picked.", featured: false });
    await seedFeaturedQuote({ text: "Picked but hidden.", status: "hidden" });

    const result = await resolveClosingContribution({
      text: "My own words.",
      skipped: false,
    });

    expect(result.wall.map((entry) => entry.text)).toEqual(["Featured voice."]);
  });
});

function stubModelUpstreams(input: { quote: string; reply: string }) {
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
                `data: ${JSON.stringify({
                  choices: [{ delta: { content: input.reply } }],
                })}\n\n`,
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
      json: async () => ({ choices: [{ message: { content: input.quote } }] }),
    } as Response;
  });
}

function editSystemPrompts(): string[] {
  return fetchMock.mock.calls
    .map(
      (call) =>
        JSON.parse((call[1] as RequestInit).body as string) as {
          stream?: boolean;
          messages: Array<{ role: string; content: string }>;
        },
    )
    .filter((body) => !body.stream)
    .map((body) => body.messages[0]!.content);
}

describe("closing quote rewrite prompt", () => {
  it("renders the code-canonical quote rules into the marker section — fresh-quote branch first, standing-quote branch once a draft exists", async () => {
    const sessionId = await seedSessionAtWrapUp();
    sessionCookie = sessionId;
    await readStream(await runDraftChat({ mode: "closing", kickoff: true }));
    stubModelUpstreams({
      quote: "Patient data must stay in Switzerland.",
      reply: "Thanks — say more?",
    });

    const firstTurn = await readStream(
      await runDraftChat({
        mode: "closing",
        message: "Nobody asked about healthcare.",
      }),
    );
    await readStream(
      await runDraftChat({
        mode: "closing",
        message: "And data must stay here.",
      }),
    );

    expect(firstTurn.some((event) => event.type === "draft_update")).toBe(true);
    const prompts = editSystemPrompts();
    expect(prompts[0]).toContain(
      summarizeClosingPrompt({ locale: "en", currentDraft: null }),
    );
    expect(prompts[1]).toContain(
      summarizeClosingPrompt({
        locale: "en",
        currentDraft: "Patient data must stay in Switzerland.",
      }),
    );
  });

  it("renders the code default quote rules in the participant's language", async () => {
    const sessionId = await seedSessionAtWrapUp({ locale: "de" });
    sessionCookie = sessionId;
    await readStream(await runDraftChat({ mode: "closing", kickoff: true }));
    stubModelUpstreams({
      quote: "Patientendaten müssen in der Schweiz bleiben.",
      reply: "Danke — mögen Sie mehr erzählen?",
    });

    await readStream(
      await runDraftChat({
        mode: "closing",
        message: "Niemand hat über Gesundheit gesprochen.",
      }),
    );

    expect(editSystemPrompts()[0]).toContain(
      summarizeClosingPrompt({ locale: "de", currentDraft: null }),
    );
  });
});

describe("quote curation", () => {
  it("featuring a pending quote approves it; hiding un-features it", async () => {
    const id = await seedFeaturedQuote({
      text: "Needs a second look.",
      featured: false,
      status: "pending",
    });

    const featured = await updateClosingQuote({ id, featured: true });
    expect(featured).toMatchObject({ featured: true, status: "approved" });

    const hidden = await updateClosingQuote({ id, status: "hidden" });
    expect(hidden).toMatchObject({ featured: false, status: "hidden" });
  });

  it("lists only closing quotes, newest first", async () => {
    const sessionId = await seedSessionAtWrapUp();
    await db.insert(snadContributions).values({
      sessionId,
      topicKey: "daily-life",
      text: "A topic contribution, not a quote.",
      locale: "en",
      canton: "BE",
      source: "write",
      status: "approved",
    });
    await seedFeaturedQuote({ text: "A real closing quote." });

    const quotes = await listClosingQuotes();

    expect(quotes.map((quote) => quote.text)).toEqual([
      "A real closing quote.",
    ]);
  });

  it("getMapQuotes keeps every featured canton the flat wall would drop", async () => {
    const day = (offset: number) => new Date(Date.UTC(2026, 0, offset));
    await seedFeaturedQuote({
      text: "An older voice from Vaud.",
      canton: "VD",
      createdAt: day(1),
    });
    for (const index of [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]) {
      await seedFeaturedQuote({
        text: `Zürich voice ${index}.`,
        canton: "ZH",
        createdAt: day(index),
      });
    }

    const wall = await getFeaturedQuotes({});
    const map = await getMapQuotes();

    expect(wall.map((entry) => entry.canton)).not.toContain("VD");
    expect(map.map((entry) => entry.canton)).toContain("VD");
    expect(map.filter((entry) => entry.canton === "ZH")).toHaveLength(4);
    expect(map.map((entry) => entry.text)[0]).toBe("Zürich voice 13.");
  });

  it("getFeaturedQuotes prefers the viewer's language", async () => {
    await seedFeaturedQuote({ text: "Deutsch zuerst?", locale: "de" });
    await seedFeaturedQuote({ text: "English voice.", locale: "en" });

    const wall = await getFeaturedQuotes({ locale: "en" });

    expect(wall.map((entry) => entry.text)).toEqual([
      "English voice.",
      "Deutsch zuerst?",
    ]);
  });
});
