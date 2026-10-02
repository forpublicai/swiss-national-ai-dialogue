import {
  closingEditSystemPrompt,
  closingReplySystemPrompt,
  directorNote,
  editTranscriptTurn,
  otherEditSystemPrompt,
  otherReplySystemPrompt,
} from "@/deliberations/swiss-national-ai-dialogue/interviewer-prompts";
import { LANGUAGE_NAME } from "@/deliberations/swiss-national-ai-dialogue/server/constants";
import type { SnadChatTurn } from "@/deliberations/swiss-national-ai-dialogue/types";

import type { Scenario } from "./fixtures";

// ── Prompt packs: what a run is measuring ───────────────────────────────────
// `production` calls the live prompt builders, so a plain run scores whatever
// is currently in git. To try a change, edit `candidate` below (it starts as a
// copy of production), then compare the two in one sweep:
//
//   pnpm eval:interviews --packs=production,candidate
//
// Keep the candidate edits uncommitted, or fold them into production once they
// win. A pack has three seams because the turn has three prompts: the capture
// pass's system prompt, its user turn, and the reply pass's system prompt, plus
// the per-turn director note appended to the reply pass's messages.

export type TurnContext = {
  scenario: Scenario;
  // The stored exchange, the participant's latest message last. For "closing"
  // this includes the kickoff as its first turn, exactly as the chat row does.
  messages: SnadChatTurn[];
  // The contribution before this turn's capture pass.
  currentDraft: string | null;
  // The contribution after it, and whether it moved.
  nextDraft: string | null;
  changedThisTurn: boolean;
};

export type PromptPack = {
  name: string;
  editSystem(context: TurnContext): string;
  editUser(context: TurnContext): string;
  replySystem(context: TurnContext): string;
  director(context: TurnContext): string;
};

const noun = (scenario: Scenario) =>
  scenario.mode === "other" ? ("answer" as const) : ("quote" as const);

const replyState = (context: TurnContext) => ({
  draft: context.nextDraft,
  changedThisTurn: context.changedThisTurn,
  messages: context.messages,
});

export const production: PromptPack = {
  name: "production",
  editSystem: ({ scenario, currentDraft }) =>
    scenario.mode === "other"
      ? otherEditSystemPrompt({
          locale: scenario.locale,
          question: scenario.question,
          options: scenario.options,
          currentAnswer: currentDraft,
        })
      : closingEditSystemPrompt({ locale: scenario.locale, currentDraft }),
  editUser: ({ scenario, messages }) =>
    editTranscriptTurn({
      messages,
      language: LANGUAGE_NAME[scenario.locale],
      noun: noun(scenario),
    }),
  replySystem: ({ scenario }) =>
    scenario.mode === "other"
      ? otherReplySystemPrompt({
          locale: scenario.locale,
          question: scenario.question,
          options: scenario.options,
        })
      : closingReplySystemPrompt({
          locale: scenario.locale,
          canton: scenario.canton,
          question: scenario.question,
        }),
  director: (context) =>
    directorNote(
      replyState(context),
      noun(context.scenario),
      context.scenario.question,
    ),
};

// Your work-in-progress arm. Override any of the four seams; everything you do
// not override behaves exactly like production. For example, to try a different
// hand-back:
//
//   director: (context) =>
//     production.director(context).replace("Do not begin with \"Thank you\".", ""),
export const candidate: PromptPack = {
  ...production,
  name: "candidate",
};

export const PACKS: PromptPack[] = [production, candidate];
