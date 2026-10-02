import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { snadContributions } from "./db-schema";

import { SNAD_CLOSING_TOPIC_KEY } from "./constants";
import type { SnadClosingQuote } from "../types";

export async function listClosingQuotes(): Promise<SnadClosingQuote[]> {
  return db
    .select({
      id: snadContributions.id,
      text: snadContributions.text,
      locale: snadContributions.locale,
      canton: snadContributions.canton,
      source: snadContributions.source,
      status: snadContributions.status,
      featured: snadContributions.featured,
      createdAt: snadContributions.createdAt,
    })
    .from(snadContributions)
    .where(eq(snadContributions.topicKey, SNAD_CLOSING_TOPIC_KEY))
    .orderBy(desc(snadContributions.createdAt));
}

export async function updateClosingQuote(input: {
  id: string;
  featured?: boolean;
  status?: "approved" | "pending" | "hidden";
}): Promise<SnadClosingQuote | null> {
  const patch: Partial<typeof snadContributions.$inferInsert> = {
    ...(input.featured !== undefined ? { featured: input.featured } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.featured === true ? { status: "approved" as const } : {}),
    ...(input.status === "hidden" ? { featured: false } : {}),
  };
  const [updated] = await db
    .update(snadContributions)
    .set(patch)
    .where(eq(snadContributions.id, input.id))
    .returning({
      id: snadContributions.id,
      text: snadContributions.text,
      locale: snadContributions.locale,
      canton: snadContributions.canton,
      source: snadContributions.source,
      status: snadContributions.status,
      featured: snadContributions.featured,
      createdAt: snadContributions.createdAt,
    });
  return updated ?? null;
}
