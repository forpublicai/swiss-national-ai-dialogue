import { and, desc, eq, lte, ne, sql } from "drizzle-orm";

import { db } from "@/db";
import { getLlmBaseUrl } from "@/lib/ai/base-url";
import { snadChats, snadContributions } from "./db-schema";

import {
  CONTRIBUTION_MAX_LENGTH,
  SNAD_CLOSING_TOPIC_KEY,
  SNAD_CONTRIBUTION_MODEL,
} from "./constants";
import {
  ensureChat,
  hydrateSession,
  loadOwnedSession,
  loadSessionData,
  touchSession,
} from "./sessions";
import type { SnadSessionPayload, SnadWallEntry } from "../types";

const WALL_SIZE = 12;

const MAP_QUOTES_PER_CANTON = 4;

const MODERATION_PROMPT = [
  "You are a content-safety check for an anonymous public wall in a Swiss civic dialogue about AI. You receive one participant statement. Reply with exactly one word:",
  "OK — the statement can be shown publicly. Strong opinions, criticism of government, companies, or AI, and blunt language are all OK.",
  "FLAG — only if the statement contains hate speech or slurs, harassment or threats, sexual content, personal data that could identify someone (full names, addresses, phone numbers, emails), spam or advertising, or instructions for causing harm.",
  "Reply with OK or FLAG and nothing else.",
].join("\n");

export async function moderateContribution(
  text: string,
): Promise<"approved" | "pending" | "hidden"> {
  const baseUrl = getLlmBaseUrl();
  const apiKey = process.env.LLM_API_KEY;
  if (!baseUrl || !apiKey) return "pending";
  try {
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: SNAD_CONTRIBUTION_MODEL,
        temperature: 0,
        max_tokens: 5,
        messages: [
          { role: "system", content: MODERATION_PROMPT },
          { role: "user", content: text },
        ],
      }),
    });
    if (!response.ok) return "pending";
    const body = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const verdict = body.choices?.[0]?.message?.content?.trim().toUpperCase();
    if (verdict?.startsWith("OK")) return "approved";
    if (verdict?.startsWith("FLAG")) return "hidden";
    return "pending";
  } catch (error) {
    console.error("[snad/contribution] moderation failed", error);
    return "pending";
  }
}

export async function getFeaturedQuotes(options: {
  excludeSessionId?: string;
  locale?: string;
}): Promise<SnadWallEntry[]> {
  const rows = await db
    .select({
      text: snadContributions.text,
      canton: snadContributions.canton,
      locale: snadContributions.locale,
    })
    .from(snadContributions)
    .where(
      and(
        eq(snadContributions.topicKey, SNAD_CLOSING_TOPIC_KEY),
        eq(snadContributions.status, "approved"),
        eq(snadContributions.featured, true),
        options.excludeSessionId
          ? ne(snadContributions.sessionId, options.excludeSessionId)
          : undefined,
      ),
    )
    .orderBy(
      ...(options.locale
        ? [desc(sql`(${snadContributions.locale} = ${options.locale})::int`)]
        : []),
      desc(snadContributions.createdAt),
    )
    .limit(WALL_SIZE);
  return rows;
}

export async function getMapQuotes(): Promise<SnadWallEntry[]> {
  const ranked = db
    .select({
      text: snadContributions.text,
      canton: snadContributions.canton,
      locale: snadContributions.locale,
      createdAt: snadContributions.createdAt,
      rank: sql<number>`row_number() over (partition by ${snadContributions.canton} order by ${snadContributions.createdAt} desc)`.as(
        "rank",
      ),
    })
    .from(snadContributions)
    .where(
      and(
        eq(snadContributions.topicKey, SNAD_CLOSING_TOPIC_KEY),
        eq(snadContributions.status, "approved"),
        eq(snadContributions.featured, true),
      ),
    )
    .as("ranked");

  return db
    .select({ text: ranked.text, canton: ranked.canton, locale: ranked.locale })
    .from(ranked)
    .where(lte(ranked.rank, MAP_QUOTES_PER_CANTON))
    .orderBy(desc(ranked.createdAt));
}

export { summarizeClosingPrompt } from "../interviewer-prompts";

async function loadClosingState() {
  const owned = await loadOwnedSession();
  if (!owned) throw new Error("no_session");
  if (!owned.definition.wrapUp.closing) throw new Error("closing_not_configured");
  const data = await loadSessionData(owned.session.id);
  const chat = data.chats.find((candidate) => candidate.type === "feedback") ?? null;
  const resolved =
    data.contributions.some(
      (contribution) => contribution.topicKey === SNAD_CLOSING_TOPIC_KEY,
    ) || chat?.status === "completed";
  const reachable =
    owned.session.status === "wrap_up" || owned.session.status === "completed";
  return { owned, chat, resolved, active: reachable && !resolved };
}

async function ensureClosingChat(
  owned: NonNullable<Awaited<ReturnType<typeof loadOwnedSession>>>,
) {
  return ensureChat({
    sessionId: owned.session.id,
    stepId: "feedback",
    actorId: owned.definition.wrapUp.feedbackActorId,
    type: "feedback",
  });
}

export async function resolveClosingContribution(input: {
  text: string | null;
  skipped: boolean;
}): Promise<{ session: SnadSessionPayload; wall: SnadWallEntry[] }> {
  const { owned, chat, resolved, active } = await loadClosingState();
  const wall = () =>
    getFeaturedQuotes({
      excludeSessionId: owned.session.id,
      locale: owned.session.locale,
    });
  if (!active) {
    if (!resolved) throw new Error("step_not_active");
    return {
      session: await hydrateSession(owned.session.id),
      wall: await wall(),
    };
  }

  const text = input.text?.trim() ?? "";
  if (!input.skipped) {
    if (!text) throw new Error("text_required");
    if (text.length > CONTRIBUTION_MAX_LENGTH) throw new Error("text_too_long");
    const status = await moderateContribution(text);
    await db
      .insert(snadContributions)
      .values({
        sessionId: owned.session.id,
        topicKey: SNAD_CLOSING_TOPIC_KEY,
        text,
        locale: owned.session.locale,
        canton: owned.session.canton,
        source: (chat?.messages ?? []).some((turn) => turn.role === "user")
          ? "chat"
          : "write",
        status,
      })
      .onConflictDoNothing();
  }
  const ensured = chat ?? (await ensureClosingChat(owned));
  if (ensured.status !== "completed") {
    await db
      .update(snadChats)
      .set({
        status: "completed",
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(snadChats.id, ensured.id));
  }
  await touchSession(owned.session.id);
  return {
    session: await hydrateSession(owned.session.id),
    wall: await wall(),
  };
}

export async function syncClosingDraft(input: { draft: string }): Promise<void> {
  const { owned, active } = await loadClosingState();
  if (!active) return;
  const chat = await ensureClosingChat(owned);
  await db
    .update(snadChats)
    .set({
      contributionDraft:
        input.draft.trim().slice(0, CONTRIBUTION_MAX_LENGTH) || null,
      updatedAt: new Date(),
    })
    .where(eq(snadChats.id, chat.id));
  await touchSession(owned.session.id);
}
