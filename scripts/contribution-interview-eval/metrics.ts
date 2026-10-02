import { DRAFT_MARKER } from "@/deliberations/swiss-national-ai-dialogue/interviewer-prompts";

// ── Parsers, mirrored from server/draft-chat.ts ──────────────────────────────
// draft-chat.ts does not export these and cannot be imported here (it pulls in
// @/db). They are short and stable; if the runtime's parsing changes, change
// them here too or the harness stops measuring what ships.

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

export function parseEditorDraft(raw: string, maxLength: number): string | null {
  let text = raw.trim();
  const markerAt = text.lastIndexOf(DRAFT_MARKER);
  if (markerAt !== -1) text = text.slice(markerAt + DRAFT_MARKER.length);
  text = stripWrappingQuotes(text.trim());
  const normalized = text.replace(/[\s.!,;:—-]+$/u, "").toUpperCase();
  if (!text || normalized === "NONE") return null;
  return text.slice(0, maxLength).trim() || null;
}

// The reply pass should never emit a DRAFT: line, but the runtime strips one as
// a safety net, so the harness scores what a participant would actually see.
export function stripMarkerLine(full: string): string {
  if (full.startsWith(DRAFT_MARKER)) return "";
  const at = full.indexOf(`\n${DRAFT_MARKER}`);
  return (at === -1 ? full : full.slice(0, at)).trim();
}

// ── Mechanical metrics ──────────────────────────────────────────────────────
// Cheap, deterministic counts for the failures that are unambiguous. They catch
// regressions the judge scores softly, but they are not the whole picture: read
// transcripts (--transcripts) before believing any of it.

export type Turn = {
  role: "assistant" | "user";
  content: string;
  draft?: string | null;
};

const words = (text: string): string[] =>
  text.trim().split(/\s+/).filter(Boolean);

// Longest run of words shared by a reply and the contribution: the interviewer
// reading the card back out loud, which the card already shows them.
function longestSharedRun(a: string, b: string): number {
  const left = words(a.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ""));
  const right = words(b.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ""));
  let best = 0;
  const row = new Array<number>(right.length + 1).fill(0);
  for (let i = 1; i <= left.length; i += 1) {
    let previous = 0;
    for (let j = 1; j <= right.length; j += 1) {
      const current = row[j];
      row[j] = left[i - 1] === right[j - 1] ? previous + 1 : 0;
      best = Math.max(best, row[j]);
      previous = current;
    }
  }
  return best;
}

const READBACK_RUN = 6;

const PRAISE =
  /\b(interesting|great|good point|thank you for sharing|that'?s important|wonderful|valuable|insightful|powerful|appreciate)\b/i;

const FALSE_CLAIM =
  /\b(recorded|saved|captured|noted|stored|submitted|added to the wall|i(?:'ve| have) (?:updated|written|added))\b/i;

const WHY_PROBE = /\bwhy\b|what makes|what leads you/i;

export function metricsFor(input: {
  turns: Turn[];
  finalDraft: string | null;
}): Record<string, number> {
  // Skip the kickoff: it is fixed copy, not something the model chose.
  const replies = input.turns.filter((turn) => turn.role === "assistant").slice(1);
  const count = (test: (turn: Turn) => boolean) => replies.filter(test).length;
  const sentences = (text: string) => (text.match(/[.!?](\s|$)/g) ?? []).length;
  // The first reply that asks nothing: where the interviewer let go.
  const converged = replies.findIndex((turn) => !turn.content.includes("?"));
  return {
    replies: replies.length,
    questionRate: replies.length
      ? count((turn) => turn.content.includes("?")) / replies.length
      : 0,
    convergedAt: converged === -1 ? Number.NaN : converged + 1,
    whyProbes: count((turn) => WHY_PROBE.test(turn.content)),
    praise: count((turn) => PRAISE.test(turn.content)),
    falseClaims: count((turn) => FALSE_CLAIM.test(turn.content)),
    readbacks: count(
      (turn) =>
        Boolean(turn.draft) &&
        longestSharedRun(turn.content, turn.draft!) >= READBACK_RUN,
    ),
    overTwoSentences: count((turn) => sentences(turn.content) > 2),
    finalDraftWords: input.finalDraft ? words(input.finalDraft).length : 0,
    emptyDraft: input.finalDraft === null ? 1 : 0,
  };
}
