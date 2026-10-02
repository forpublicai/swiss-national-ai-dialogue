import { complete, JUDGE_MODEL } from "./gateway";
import type { Turn } from "./metrics";

// The rubric judges the INTERVIEWER, and each dimension names the failure it is
// looking for — a rubric that only says "rate the quality" scores everything a 3.
// one_voice is the seam-specific one: the participant must never be able to tell
// that a second model call is maintaining the card. warmth is here because every
// other dimension rewards restraint and `form` actively penalises praise, so a
// rubric without it lets an arm optimise straight into curtness — which is how
// the tone an earlier version shipped. It is scored on how the interviewer treats the
// person, explicitly NOT on anything it says about the contribution, so the two
// cannot be gamed against each other.
const SYSTEM = `You are evaluating an AI INTERVIEWER whose only job is to help one survey participant put a short contribution into their own words. The contribution is shown to the participant in an editable card beside the chat; the interviewer never writes the card itself and must never read it back. The interviewer cannot end the exchange (the participant submits or skips) but it CAN and SHOULD tell the participant it has no more questions and stop asking them.

Judge the INTERVIEWER only, never the participant. Score each dimension 1-5 (1 = bad, 3 = acceptable, 5 = excellent):

- probe_quality: are its questions varied, specific and genuinely useful, each one going after something the contribution actually lacks? Penalise formulaic "why do you think that?" loops, repeated shapes of question, jargon, and probing for its own sake.
- convergence: does it recognise when the contribution is good enough and hand control back cleanly, instead of pressing on? Penalise interrogation past the point of value AND premature giving up on a one-word non-answer. Judge only what the interviewer does on its OWN initiative: if it had stopped asking and the participant then carried on talking or asked to keep going, picking the conversation back up is CORRECT and must not be penalised here — the participant reopened it, and refusing them would be the failure. What counts against it is resuming unprompted, or stopping while the participant is clearly still working.
- reads_the_room: does it back off with terse, unsure, or done-talking participants, accept "I don't know", and never push a third time?
- one_voice: does it read as a single, seamless interviewer? Penalise any sign of a hidden second process: quoting or restating the contribution text back at them, narrating that something was written / updated / saved, replying as if nothing was said when the participant said something substantive, crediting them with content they did not give, or acting confused about what has been captured. Simply inviting them to add their contribution when they are ready, or reminding them it is theirs to change, is FINE and is not a leak — the failure is restating the text or narrating the machinery.
- form: two short sentences maximum, one question at a time, no praise or evaluation, warm and neutral, no tool syntax, no reading the contribution back.
- warmth: does it sound like a friendly, helpful person rather than a form? A greeting gets greeted back; someone who says they are unsure gets told that is fine and gets an easier question to answer; someone who has said enough is let go kindly with the door left open, not dismissed. Penalise curtness, clinical or bureaucratic phrasing, and a bare "I have no more questions for you" with nothing human around it. Warmth here is about how it treats the PERSON, never about what it says about their words: praising, complimenting or evaluating the contribution is a form failure and must NOT raise this score. An interviewer that is friendly while saying nothing at all about the quality of the contribution is the 5.
- contribution_quality: judged on the FINAL contribution text — is it faithful to what the participant said, self-contained, and worth publishing? Penalise anything invented, anything the participant never said, a contribution left thin when they gave more, one that reads as a list of separate remarks rather than one statement, or one left empty when they clearly expressed a view.

Reply with ONLY minified JSON:
{"scores":{"probe_quality":n,"convergence":n,"reads_the_room":n,"one_voice":n,"form":n,"warmth":n,"contribution_quality":n},"worst_moment":"one sentence quoting the weakest interviewer message","fix":"one sentence naming the prompt rule that would fix it"}`;

export type Verdict = {
  scores: Record<string, number>;
  worst_moment: string;
  fix: string;
};

export const DIMENSIONS = [
  "probe_quality",
  "convergence",
  "reads_the_room",
  "one_voice",
  "form",
  "warmth",
  "contribution_quality",
] as const;

export async function judge(input: {
  turns: Turn[];
  finalDraft: string | null;
  personaBrief: string;
  endedBy: "participant" | "cap" | "script";
}): Promise<Verdict | null> {
  const transcript = input.turns
    .map((turn, index) => {
      const speaker = turn.role === "assistant" ? "INTERVIEWER" : "PARTICIPANT";
      // Labelled as out-of-band, or the judge scores the annotation itself as
      // the interviewer leaking the card into the chat.
      const card =
        turn.role === "assistant" && index > 0
          ? `\n   (annotation for you only, invisible to both of them — the contribution card after this turn: ${turn.draft ?? "(empty)"})`
          : "";
      return `${speaker}: ${turn.content}${card}`;
    })
    .join("\n\n");
  const raw = await complete({
    model: JUDGE_MODEL,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          `Participant character: ${input.personaBrief}`,
          `Exchange ended because: ${
        input.endedBy === "participant"
          ? "the participant chose to stop"
          : input.endedBy === "script"
            ? "this participant is a fixed script and ran out of lines — draw no conclusion from how it ends"
            : "the harness turn cap was reached"
      }`,
          transcript,
          `FINAL CONTRIBUTION: ${input.finalDraft ?? "(empty)"}`,
        ].join("\n\n"),
      },
    ],
  });
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as Verdict;
  } catch {
    return null;
  }
}
