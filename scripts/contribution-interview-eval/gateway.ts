// Raw OpenAI-compat transport for the harness. Deliberately NOT @/lib/ai — the
// harness talks to the same OpenAI-compatible endpoint the app does, but with no db, no
// session, and no Next.js request context, so it stays a plain fetch.

import { SNAD_CONTRIBUTION_MODEL } from "../../deliberations/swiss-national-ai-dialogue/server/constants";

export type Msg =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string };

// The interviewer runs on the model the app pins for this flow
// (SNAD_CONTRIBUTION_MODEL), reached through LLM_BASE_URL (a gateway that
// also serves the participant and judge models). The participant runs
// on a different family on purpose: apertus role-playing a participant while
// apertus interviews produces a suspiciously cooperative conversation.
export const INTERVIEWER_MODEL =
  process.env.EVAL_INTERVIEWER_MODEL ?? SNAD_CONTRIBUTION_MODEL;
export const PARTICIPANT_MODEL = process.env.EVAL_PARTICIPANT_MODEL ?? "gpt-4o";
export const JUDGE_MODEL = process.env.EVAL_JUDGE_MODEL ?? "claude-sonnet-4-6";

const RETRIES = 4;

export async function complete(input: {
  model: string;
  system: string;
  messages: Msg[];
  temperature?: number;
}): Promise<string> {
  const baseUrl = process.env.LLM_BASE_URL;
  const apiKey = process.env.LLM_API_KEY;
  if (!baseUrl || !apiKey) {
    throw new Error(
      "LLM_BASE_URL and LLM_API_KEY are required — run with --env-file=.env.local",
    );
  }
  for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: input.model,
          stream: false,
          ...(input.temperature === undefined
            ? {}
            : { temperature: input.temperature }),
          messages: [
            { role: "system", content: input.system },
            ...input.messages,
          ],
        }),
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(`${response.status} ${detail}`.slice(0, 300));
      }
      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      return data.choices?.[0]?.message?.content?.trim() ?? "";
    } catch (error) {
      if (attempt === RETRIES) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
    }
  }
  return "";
}

// Bounded concurrency: the gateway rate-limits, and a whole sweep fired at once
// gets a wall of 429s.
export async function pool<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      for (;;) {
        const index = cursor;
        cursor += 1;
        if (index >= items.length) return;
        results[index] = await worker(items[index], index);
      }
    }),
  );
  return results;
}
