# Contribution-interviewer evals

Persona evals for SNAD's two draft-refining interviewers: the **end-of-dialogue
quote interview** and the **MCQ "Other…" assist**. Both run the same two-pass
turn (`deliberations/swiss-national-ai-dialogue/server/draft-chat.ts`) but carry
their own prompts, and this harness exercises both against the live prompt
builders.

Written to answer one question: *does the interviewer know when to stop?* It was
built while fixing the version that never did.

## Running it

```bash

# score the prompts currently in git
pnpm eval:interviews

# read the conversations, which is where the real findings are
pnpm eval:interviews --transcripts

# one surface, one persona, while iterating fast
pnpm eval:interviews --scenarios=closing --personas=terse-banker --transcripts

# the fixed-script participants: a named regression, same words every run
pnpm eval:interviews --personas=scripted-locked-out --transcripts

# compare a change against production in one sweep (see "Trying a change")
pnpm eval:interviews --packs=production,candidate

# a non-English participant: the director notes stay English, replies must not
pnpm eval:interviews --lang=de --scenarios=closing

# same cells twice, when a difference looks like it might be noise
pnpm eval:interviews --repeat=2 --out=/tmp/sweep.json
```

Needs only `LLM_BASE_URL` + `LLM_API_KEY` from `.env.local` (the
`pnpm` script passes `--env-file`). **No database and no dev server**: the prompt
builders are pure string building, so nothing is written to `snad.chats` and no
`eval_run` row is created. A full sweep is 18 conversations, about 8 minutes.

Flags: `--packs`, `--scenarios`, `--personas`, `--lang`, `--repeat`,
`--transcripts`, `--out=<file>`. Models come from `EVAL_INTERVIEWER_MODEL`,
`EVAL_PARTICIPANT_MODEL`, `EVAL_JUDGE_MODEL`.

## Trying a change

`packs.ts` exports two arms. `production` calls the live builders; `candidate`
starts as a copy of it. Override any of its four seams, then run both:

```ts
export const candidate: PromptPack = {
  ...production,
  name: "candidate",
  director: (context) => myDirectorNote(replyState(context), noun(context.scenario)),
};
```

The four seams are the four prompts of one turn: `editSystem` and `editUser` for
the capture pass, `replySystem` for the reply pass's standing conduct, and
`director` for the per-turn instruction appended to the reply pass's messages.
Keep candidate edits uncommitted, or fold the winner into the real prompts.

## Reading the output

Judge dimensions (1-5, `claude-sonnet-4-6`): `probe_quality`, `convergence`,
`reads_the_room`, `one_voice`, `form`, `warmth`, `contribution_quality`.
`one_voice` is the seam-specific one: can the participant tell that a second
model call maintains the card? `warmth` is the counterweight: every other
dimension rewards restraint and `form` actively penalises praise, so a rubric
without it lets an arm optimise straight into curtness — which is how the tone in
an earlier version shipped. It scores how the interviewer treats the PERSON and explicitly
not what it says about the contribution, so warmth and `form` cannot be traded
off against each other.

Mechanical counts alongside them: interviewer turns, share of turns ending in a
question, the turn it first asked nothing, "why" probes, praise, false claims
("your answer has been recorded" — nothing is stored until the participant
presses the button), card readbacks, replies over two sentences, empty cards.

**The numbers rank arms; they do not explain anything.** Every real finding in
the earlier fix came from `--transcripts`: that the reply pass was reading the whole
card back, that the capture pass was concatenating remarks into a transcript,
and that a participant's quote contained a sentence copied out of the prompt's
own example. Expect single-dimension gaps under ~0.4 at n=18 to be noise, and
re-run with `--repeat=2` before believing one.

## Why the harness is shaped like this

- **The participant is a different model family** (`gpt-4o`). Apertus
  role-playing a participant while Apertus interviews produces a suspiciously
  cooperative conversation.
- **The personas are awkward on purpose.** A terse banker, a bored teen and an
  unsure granny expose probing past the point of value; an opinionated founder
  exposes accepting grand abstractions as a contribution; an
  already-finished teacher exposes an interviewer that cannot recognise a
  finished answer. A cooperative persona hides all five.
- **Two personas are fixed scripts**, not the simulator: `scripted-locked-out`
  (the real federal-vote exchange that an earlier version shipped a hand-back lockout on)
  and `scripted-nothing-to-say`. The simulator is noisy and cannot reproduce a
  specific opening, and a specific opening is where several of these regressions
  live. A `script` on a persona replaces the participant model entirely, so those
  cells vary only by the interviewer. The phase sequence underneath them is
  pinned separately and for free by
  `deliberations/swiss-national-ai-dialogue/tests/unit/interviewer-phases.test.ts`
  — reach for that first, and for the harness only when the question is how the
  model actually *words* a turn.
- **The turn order matches the runtime**: capture pass first, so the director
  note is derived from what actually landed on the card, then the reply pass.
  Getting this backwards makes the hand-back decisions incoherent.
- **The parsers in `metrics.ts` are copied** from `draft-chat.ts`, which cannot
  be imported here because it pulls in `@/db`. If the runtime's parsing of the
  capture pass changes, change them here too.

One load-bearing fact about the model, worth not rediscovering: **apertus
ignores a turn-level instruction placed in a system prompt and obeys the same
words as the last message.** Told from the system prompt to stop asking
questions, it kept interrogating in 4 probes out of 4; moved verbatim into a
trailing turn, 0 out of 4. That is why the per-turn move lives in
`directorNote()` and not in the brief.

One load-bearing fact about the **gateway**: it serves a cached response for a
byte-identical request body, so sampling the same state N times to measure
variance measures the cache and reports near-zero. Vary something semantically
null (trailing newlines on the system prompt) or the answer is an artefact. Doing
that showed reply variance is identical at the default temperature, 0.7 and 1.0 —
temperature is not the lever here. If a stock phrase repeats, it is because the
director note named the sentence; fix the note, not the sampling.
