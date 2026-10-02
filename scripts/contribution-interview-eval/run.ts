// Persona evals for the two contribution interviewers — the end-of-dialogue
// quote interview and the MCQ "Other…" assist. Runs the real two-pass turn from
// server/draft-chat.ts (capture pass, then reply pass with the per-turn director
// note) against the live prompts, with an LLM role-playing the participant and a
// second one scoring the interviewer. See README.md.
//
//   pnpm eval:interviews
//   pnpm eval:interviews --packs=production,candidate --transcripts
//
// No database and no dev server: the prompt builders are pure string building,
// so nothing here touches snad.chats or writes an eval_run. Results print to
// stdout and, with --out, to a json file you are expected to throw away.

import { writeFileSync } from "node:fs";

import {
  CONTRIBUTION_MAX_LENGTH,
  SNAD_CONTRIBUTION_MODEL,
} from "@/deliberations/swiss-national-ai-dialogue/server/constants";
import type { SnadChatTurn } from "@/deliberations/swiss-national-ai-dialogue/types";

import {
  complete,
  INTERVIEWER_MODEL,
  JUDGE_MODEL,
  PARTICIPANT_MODEL,
  pool,
  type Msg,
} from "./gateway";
import {
  LEAVE_SENTINEL,
  participantSystemPrompt,
  PERSONAS,
  SCENARIOS,
  type Persona,
  type Scenario,
} from "./fixtures";
import { DIMENSIONS, judge, type Verdict } from "./judge";
import { metricsFor, parseEditorDraft, stripMarkerLine, type Turn } from "./metrics";
import { PACKS, type PromptPack, type TurnContext } from "./packs";

// server/draft-chat.ts keeps this local to the "other" branch; mirrored here.
const OTHER_MAX_LENGTH = 200;

// How many participant messages a run allows before it is cut off. Six is well
// past where a healthy exchange converges, so hitting the cap is itself a
// finding.
const MAX_EXCHANGES = 6;

const CONCURRENCY = 8;

type Run = {
  pack: string;
  scenario: string;
  persona: string;
  locale: string;
  turns: Turn[];
  finalDraft: string | null;
  endedBy: "participant" | "cap" | "script";
  metrics: Record<string, number>;
  verdict: Verdict | null;
};

async function runConversation(
  pack: PromptPack,
  scenario: Scenario,
  persona: Persona,
): Promise<Omit<Run, "metrics" | "verdict">> {
  const maxLength =
    scenario.mode === "other" ? OTHER_MAX_LENGTH : CONTRIBUTION_MAX_LENGTH;
  // What the chat row would hold. The closing exchange stores its kickoff as a
  // real turn; the "other" assist does not, so its kickoff only ever appears in
  // the reply pass's message list.
  const stored: SnadChatTurn[] =
    scenario.mode === "closing"
      ? [{ role: "assistant", content: scenario.kickoff }]
      : [];
  const turns: Turn[] = [{ role: "assistant", content: scenario.kickoff }];
  let draft: string | null = null;
  let endedBy: Run["endedBy"] = persona.script ? "script" : "cap";

  // A scripted persona replaces the simulator: the same words every run, so a
  // specific regression stays checkable. It runs out of script instead of
  // emitting the leave sentinel.
  const cap = persona.script ? persona.script.length : MAX_EXCHANGES;

  for (let exchange = 1; exchange <= cap; exchange += 1) {
    const participantHistory: Msg[] = turns.map((turn) => ({
      role: turn.role === "assistant" ? "user" : "assistant",
      content: turn.content,
    }));
    const system = participantSystemPrompt(scenario, persona);
    let said = persona.script
      ? persona.script[exchange - 1]
      : await complete({
          model: PARTICIPANT_MODEL,
          system,
          messages: participantHistory,
          temperature: 0.9,
        });
    // A first-message walkout is simulator noise, not a finding: retry once.
    if (!persona.script && exchange === 1 && (!said || said.includes(LEAVE_SENTINEL))) {
      said = await complete({
        model: PARTICIPANT_MODEL,
        system: `${system}\n\nThis is your FIRST message. Say what your character would say. ${LEAVE_SENTINEL} is not allowed yet.`,
        messages: participantHistory,
        temperature: 1,
      });
    }
    if (!said || said.includes(LEAVE_SENTINEL)) {
      endedBy = "participant";
      break;
    }
    stored.push({ role: "user", content: said });
    turns.push({ role: "user", content: said });

    // ── Capture pass, exactly as the runtime orders it: it runs first so the
    // director note can be derived from what actually landed on the card.
    const captureContext: TurnContext = {
      scenario,
      messages: stored,
      currentDraft: draft,
      nextDraft: draft,
      changedThisTurn: false,
    };
    const captured = await complete({
      model: INTERVIEWER_MODEL,
      system: pack.editSystem(captureContext),
      messages: [{ role: "user", content: pack.editUser(captureContext) }],
    });
    // NONE (or a transient failure) leaves the standing draft alone, so a
    // captured contribution never regresses to empty.
    const nextDraft: string | null = parseEditorDraft(captured, maxLength) ?? draft;
    const changedThisTurn = nextDraft !== draft;
    draft = nextDraft;

    // ── Reply pass: standing conduct in the system prompt, the turn's move in
    // a trailing director turn that is never persisted or shown.
    const replyContext: TurnContext = {
      scenario,
      messages: stored,
      currentDraft: captureContext.currentDraft,
      nextDraft,
      changedThisTurn,
    };
    const lead: Msg[] =
      scenario.mode === "other"
        ? [{ role: "assistant", content: scenario.kickoff }]
        : [
            {
              role: "user",
              content:
                "The participant has finished every topic of the dialogue. The exchange below has already opened with your introduction and your closing question — continue it, following your brief.",
            },
          ];
    const reply = stripMarkerLine(
      await complete({
        model: INTERVIEWER_MODEL,
        system: pack.replySystem(replyContext),
        messages: [
          ...lead,
          ...stored.map((turn) => ({ role: turn.role, content: turn.content }) as Msg),
          { role: "user", content: pack.director(replyContext) },
        ],
      }),
    );
    stored.push({ role: "assistant", content: reply });
    turns.push({ role: "assistant", content: reply, draft });
  }

  return {
    pack: pack.name,
    scenario: scenario.key,
    persona: persona.key,
    locale: scenario.locale,
    turns,
    finalDraft: draft,
    endedBy,
  };
}

// ── Reporting ───────────────────────────────────────────────────────────────

function mean(values: number[]): string {
  const usable = values.filter((value) => Number.isFinite(value));
  if (usable.length === 0) return "—";
  return (usable.reduce((sum, value) => sum + value, 0) / usable.length).toFixed(2);
}

function report(runs: Run[], packNames: string[]): void {
  for (const name of packNames) {
    // A run where the participant never spoke scored nothing: simulator noise
    // that would otherwise drag an arm down by a whole point.
    const mine = runs.filter((run) => run.pack === name && run.metrics.replies > 0);
    const skipped = runs.filter(
      (run) => run.pack === name && run.metrics.replies === 0,
    ).length;
    console.log(
      `\n### ${name}  (n=${mine.length}${skipped > 0 ? `, ${skipped} discarded: participant never spoke` : ""})`,
    );
    console.log(
      DIMENSIONS.map(
        (dimension) =>
          `${dimension} ${mean(mine.map((run) => run.verdict?.scores?.[dimension] ?? Number.NaN))}`,
      ).join("  ·  "),
    );
    const metric = (key: string) => mean(mine.map((run) => run.metrics[key]));
    console.log(
      [
        `replies ${metric("replies")}`,
        `question-rate ${metric("questionRate")}`,
        `converged-at ${metric("convergedAt")}`,
        `why-probes ${metric("whyProbes")}`,
        `praise ${metric("praise")}`,
        `false-claims ${metric("falseClaims")}`,
        `readbacks ${metric("readbacks")}`,
        `>2-sentences ${metric("overTwoSentences")}`,
        `draft-words ${metric("finalDraftWords")}`,
        `empty-drafts ${mine.filter((run) => run.metrics.emptyDraft === 1).length}`,
      ].join("  ·  "),
    );
    const worst = mine
      .filter((run) => run.verdict)
      .sort(
        (a, b) =>
          DIMENSIONS.reduce((sum, d) => sum + (a.verdict!.scores[d] ?? 0), 0) -
          DIMENSIONS.reduce((sum, d) => sum + (b.verdict!.scores[d] ?? 0), 0),
      )
      .slice(0, 3);
    if (worst.length > 0) {
      console.log("worst runs:");
      for (const run of worst) {
        console.log(`  ${run.scenario} · ${run.persona}: ${run.verdict!.worst_moment}`);
        console.log(`    fix: ${run.verdict!.fix}`);
      }
    }
  }
}

function printTranscripts(runs: Run[]): void {
  for (const run of runs) {
    console.log(
      `\n===== ${run.pack} · ${run.scenario} · ${run.persona} · ${run.locale} (ended: ${run.endedBy})`,
    );
    for (const turn of run.turns) {
      console.log(`${turn.role === "assistant" ? "AI  " : "YOU "}| ${turn.content}`);
      if (turn.role === "assistant" && turn.draft !== undefined) {
        console.log(`      [card] ${turn.draft ?? "(empty)"}`);
      }
    }
    if (run.verdict) console.log(`  scores: ${JSON.stringify(run.verdict.scores)}`);
  }
}

// ── CLI ─────────────────────────────────────────────────────────────────────

function list(argv: string[], flag: string): string[] | null {
  const raw = argv.find((arg) => arg.startsWith(`--${flag}=`))?.split("=")[1];
  return raw ? raw.split(",") : null;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const packNames = list(argv, "packs");
  const packs = packNames
    ? PACKS.filter((pack) => packNames.includes(pack.name))
    : [PACKS[0]];
  const scenarioKeys = list(argv, "scenarios");
  const personaKeys = list(argv, "personas");
  const locale = argv.find((arg) => arg.startsWith("--lang="))?.split("=")[1];
  const out = argv.find((arg) => arg.startsWith("--out="))?.split("=")[1];
  const repeat = Number(
    argv.find((arg) => arg.startsWith("--repeat="))?.split("=")[1] ?? "1",
  );

  if (packs.length === 0) {
    throw new Error(`no such pack — available: ${PACKS.map((p) => p.name).join(", ")}`);
  }
  const scenarios = (
    scenarioKeys
      ? SCENARIOS.filter((scenario) => scenarioKeys.includes(scenario.key))
      : SCENARIOS
  ).map((scenario) =>
    locale ? { ...scenario, locale: locale as Scenario["locale"] } : scenario,
  );
  const personas = personaKeys
    ? PERSONAS.filter((persona) => personaKeys.includes(persona.key))
    : PERSONAS;

  const jobs = Array.from({ length: Math.max(1, repeat) }).flatMap(() =>
    packs.flatMap((pack) =>
      scenarios.flatMap((scenario) =>
        personas.map((persona) => ({ pack, scenario, persona })),
      ),
    ),
  );
  console.error(
    `${jobs.length} conversations · interviewer ${INTERVIEWER_MODEL} (app pins ${SNAD_CONTRIBUTION_MODEL}) · participant ${PARTICIPANT_MODEL} · judge ${JUDGE_MODEL}`,
  );

  const runs = await pool(jobs, CONCURRENCY, async (job, index) => {
    const conversation = await runConversation(job.pack, job.scenario, job.persona);
    const metrics = metricsFor(conversation);
    const verdict =
      metrics.replies > 0
        ? await judge({
            turns: conversation.turns,
            finalDraft: conversation.finalDraft,
            personaBrief: job.persona.brief,
            endedBy: conversation.endedBy,
          })
        : null;
    console.error(
      `  [${index + 1}/${jobs.length}] ${job.pack.name} · ${job.scenario.key} · ${job.persona.key}`,
    );
    return { ...conversation, metrics, verdict } satisfies Run;
  });

  if (argv.includes("--transcripts")) printTranscripts(runs);
  report(runs, packs.map((pack) => pack.name));
  if (out) {
    writeFileSync(out, JSON.stringify(runs, null, 2));
    console.error(`\nwrote ${out}`);
  }
}

void main();
