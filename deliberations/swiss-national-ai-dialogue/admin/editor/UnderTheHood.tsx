"use client";

import type { ReactNode } from "react";

import {
  PERSONA_AXES,
  PERSONA_ITEMS,
  type PersonaItem,
} from "../../archetype";
import { STRINGS, type SwissLocale } from "../../i18n-strings";
import {
  closingEditSystemPrompt,
  closingReplySystemPrompt,
  directorNote,
  otherEditSystemPrompt,
  otherReplySystemPrompt,
} from "../../interviewer-prompts";
import type { SnadChatTurn, SnadStudyDefinition } from "../../types";

import { Field } from "./fields";
import { allSpecs } from "./draft";

const readOnlyPreClass =
  "border-border bg-muted/40 text-muted-foreground max-h-80 overflow-auto whitespace-pre-wrap rounded-md border px-2 py-1.5 font-mono text-xs leading-relaxed";

const SAMPLE_CANTON = "ZH";

function PromptGroup({
  heading,
  blurb,
  children,
}: {
  heading: string;
  blurb: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <div>
        <p className="mb-0 text-xs font-bold">{heading}</p>
        <p className="text-muted-foreground text-xs">{blurb}</p>
      </div>
      {children}
    </div>
  );
}

const SAMPLE_PROBE = "«the question you last asked them»?";
const SAMPLE_HANDBACK = "«the message where you said you had nothing more to ask»";
const SAMPLE_SAID = "«what the participant just said»";

const SAMPLE_EXCHANGE: SnadChatTurn[] = [
  { role: "assistant", content: SAMPLE_PROBE },
  { role: "user", content: SAMPLE_SAID },
];

const SAMPLE_FULL_DRAFT =
  "«a contribution long enough to stand on its own, once they have had two or three turns to put it into their own words»";

const PHASE_SAMPLES: Array<[string, Parameters<typeof directorNote>[0]]> = [
  [
    "they only said hello",
    {
      draft: null,
      changedThisTurn: false,
      messages: [{ role: "assistant", content: SAMPLE_PROBE }, { role: "user", content: "Hello" }],
    },
  ],
  [
    "nothing captured yet",
    { draft: null, changedThisTurn: false, messages: SAMPLE_EXCHANGE },
  ],
  [
    "they asked a question instead of answering",
    {
      draft: null,
      changedThisTurn: false,
      messages: [
        ...SAMPLE_EXCHANGE,
        { role: "user", content: "what question is this?" },
      ],
    },
  ],
  [
    "still nothing landed — make it easier to answer",
    {
      draft: null,
      changedThisTurn: false,
      messages: [...SAMPLE_EXCHANGE, ...SAMPLE_EXCHANGE],
    },
  ],
  [
    "still thin — keep drawing them out",
    {
      draft: "«what the card holds so far»",
      changedThisTurn: true,
      messages: SAMPLE_EXCHANGE,
    },
  ],
  [
    "enough said — hand it back, door left open",
    {
      draft: SAMPLE_FULL_DRAFT,
      changedThisTurn: true,
      messages: [...SAMPLE_EXCHANGE, ...SAMPLE_EXCHANGE],
    },
  ],
  [
    "they kept talking after the hand-back, and added something",
    {
      draft: SAMPLE_FULL_DRAFT,
      changedThisTurn: true,
      messages: [
        ...SAMPLE_EXCHANGE,
        { role: "assistant", content: SAMPLE_HANDBACK },
        { role: "user", content: SAMPLE_SAID },
      ],
    },
  ],
  [
    "they asked to keep going after the hand-back",
    {
      draft: SAMPLE_FULL_DRAFT,
      changedThisTurn: false,
      messages: [
        ...SAMPLE_EXCHANGE,
        { role: "assistant", content: SAMPLE_HANDBACK },
        { role: "user", content: "I still want to chat" },
      ],
    },
  ],
  [
    "they are done — accept it",
    {
      draft: SAMPLE_FULL_DRAFT,
      changedThisTurn: false,
      messages: [...SAMPLE_EXCHANGE, { role: "user", content: "no" }],
    },
  ],
  [
    "they never had anything to say — let them off",
    {
      draft: null,
      changedThisTurn: false,
      messages: [
        ...SAMPLE_EXCHANGE,
        ...SAMPLE_EXCHANGE,
        { role: "user", content: "no" },
      ],
    },
  ],
];

export function InterviewerPromptsView() {
  const closingQuestion = "«the dialogue's closing question»";
  const closingReply = closingReplySystemPrompt({
    locale: "en",
    canton: SAMPLE_CANTON,
    question: closingQuestion,
  });
  const closingEdit = closingEditSystemPrompt({
    locale: "en",
    currentDraft: null,
  });
  const question = "«the multiple-choice question the participant is answering»";
  const options = ["«listed option 1»", "«listed option 2»", "«…»"];
  const otherReply = otherReplySystemPrompt({ locale: "en", question, options });
  const otherEdit = otherEditSystemPrompt({
    locale: "en",
    question,
    options,
    currentAnswer: null,
  });
  const directorNotes = (noun: "answer" | "quote") =>
    PHASE_SAMPLES.map(
      ([label, state]) =>
        `— ${label} —\n${directorNote(state, noun, noun === "quote" ? closingQuestion : question)}`,
    ).join("\n\n");
  return (
    <div className="grid gap-4">
      <p className="text-muted-foreground text-xs">
        Each interviewer runs TWO model passes per turn: a conversation pass that
        always replies, and a separate capture pass that writes the card (or
        answers NONE when nothing usable has been said yet). The two interviewers
        share that engine but NOT their prompts. The conversation pass is steered
        turn by turn by a director note appended to the exchange, never shown to
        the participant &mdash; it is what decides whether the interviewer asks
        one more question or stops and hands the contribution back.
      </p>
      <PromptGroup
        heading="Quote interviewer (end of dialogue)"
        blurb={`The closing conversation that fills the quote card before the archetype reveal. Shown with a sample canton (${SAMPLE_CANTON}) and before anything is captured.`}
      >
        <Field
          label="Quote interviewer — conversation prompt"
          hint="the standing rules for the pass that always replies and never touches the quote card. The reply-language section adapts to the participant."
        >
          <pre className={readOnlyPreClass}>{closingReply}</pre>
        </Field>
        <Field
          label="Quote interviewer — per-turn director notes"
          hint="appended to the exchange as the last message, never shown to the participant. This is where the interviewer is told to probe, to stop, or to accept a non-answer."
        >
          <pre className={readOnlyPreClass}>{directorNotes("quote")}</pre>
        </Field>
        <Field
          label="Quote interviewer — quote-capture prompt"
          hint="the separate pass that maintains the quote card or answers NONE, including the quote form rules."
        >
          <pre className={readOnlyPreClass}>{closingEdit}</pre>
        </Field>
      </PromptGroup>
      <PromptGroup
        heading="MCQ “Other…” popup"
        blurb="The assist inside the “Other…” field on a multiple-choice question. Built per question from its localized wording and options; the «placeholders» are filled from the question the participant is on."
      >
        <Field
          label="MCQ “Other…” — conversation prompt"
          hint="the pass that always replies to the participant in the “Other” popup."
        >
          <pre className={readOnlyPreClass}>{otherReply}</pre>
        </Field>
        <Field
          label="MCQ “Other…” — per-turn director notes"
          hint="appended to the exchange as the last message, never shown to the participant."
        >
          <pre className={readOnlyPreClass}>{directorNotes("answer")}</pre>
        </Field>
        <Field
          label="MCQ “Other…” — answer-capture prompt"
          hint="the separate pass that writes the participant's answer into the field or answers NONE."
        >
          <pre className={readOnlyPreClass}>{otherEdit}</pre>
        </Field>
      </PromptGroup>
    </div>
  );
}

function mappingDescription(item: PersonaItem): string {
  if (item.kind === "options") {
    return Object.entries(item.scoreByOption)
      .map(([option, score]) => `${option} → ${score}`)
      .join("\n");
  }
  if (item.kind === "scale") {
    return `low end → ${item.low}, high end → ${item.high}`;
  }
  return `rank of “${item.optionId}”: 1st → 100, last → 0`;
}

export function ArchetypeScoringView({
  definition,
}: {
  definition: SnadStudyDefinition;
}) {
  const present = new Set(allSpecs(definition).map((spec) => spec.id));
  const byAxis = PERSONA_AXES.map((axis) => ({
    axis,
    items: PERSONA_ITEMS.filter((item) => item.axis === axis),
  }));
  return (
    <div className="grid gap-2">
      <p className="text-muted-foreground text-xs">
        The participant&rsquo;s AI-personality profile is six 0&ndash;100 axes,
        each averaged from the mapped questions they actually answered. The model
        is code-managed and read-only here; a question missing from this version
        simply contributes nothing to its axis.
      </p>
      <div className="border-border overflow-x-auto rounded-md border">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/60">
            <tr>
              <th className="px-3 py-2 font-semibold">Axis</th>
              <th className="px-3 py-2 font-semibold">Question id</th>
              <th className="px-3 py-2 font-semibold">Mapping</th>
              <th className="px-3 py-2 font-semibold">In this version</th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {byAxis.flatMap(({ axis, items }) =>
              items.map((item, index) => (
                <tr key={`${axis}-${item.openerId}-${index}`}>
                  {index === 0 && (
                    <td
                      className="px-3 py-2 align-top font-semibold capitalize"
                      rowSpan={items.length}
                    >
                      {axis}
                    </td>
                  )}
                  <td className="px-3 py-2 align-top font-mono">
                    {item.openerId}
                  </td>
                  <td className="px-3 py-2 align-top whitespace-pre-wrap">
                    {mappingDescription(item)}
                  </td>
                  <td className="px-3 py-2 align-top">
                    {present.has(item.openerId) ? (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        present
                      </span>
                    ) : (
                      <span className="text-muted-foreground font-semibold">
                        absent
                      </span>
                    )}
                  </td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type StringRow = { path: string; values: Record<SwissLocale, string> };

function getByPath(root: unknown, path: string): string {
  const value = path
    .split(".")
    .reduce<unknown>(
      (node, key) =>
        node && typeof node === "object"
          ? (node as Record<string, unknown>)[key]
          : undefined,
      root,
    );
  return typeof value === "string" ? value : "";
}

function flattenStringPaths(node: unknown, prefix: string): string[] {
  if (typeof node === "string") return [prefix];
  if (Array.isArray(node)) {
    return node.flatMap((item, index) =>
      flattenStringPaths(item, `${prefix}.${index}`),
    );
  }
  if (node && typeof node === "object") {
    return Object.entries(node).flatMap(([key, value]) =>
      flattenStringPaths(value, prefix ? `${prefix}.${key}` : key),
    );
  }
  return [];
}

const UI_STRING_LOCALES: SwissLocale[] = ["en", "de", "fr", "it", "rm"];

// Read-only browser over the static app-interface translations (i18n-strings).
// Global and code-managed — not part of any study version.
export function UiStringsView() {
  const rows: StringRow[] = flattenStringPaths(STRINGS.en, "").map((path) => ({
    path,
    values: Object.fromEntries(
      UI_STRING_LOCALES.map((locale) => [locale, getByPath(STRINGS[locale], path)]),
    ) as Record<SwissLocale, string>,
  }));
  return (
    <div className="grid gap-2">
      <p className="text-muted-foreground text-xs">
        The app&rsquo;s interface text — buttons, labels, headings, FAQ, stage
        names — in all five languages. Code-managed and read-only ({rows.length}{" "}
        strings). English is canonical; de/fr/it/rm are machine-drafted pending
        native review.
      </p>
      <div className="border-border max-h-96 overflow-auto rounded-md border">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/60 sticky top-0">
            <tr>
              <th className="px-3 py-2 font-semibold">Key</th>
              {UI_STRING_LOCALES.map((locale) => (
                <th key={locale} className="px-3 py-2 font-semibold uppercase">
                  {locale}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {rows.map((row) => (
              <tr key={row.path}>
                <td className="text-muted-foreground px-3 py-2 align-top font-mono">
                  {row.path}
                </td>
                {UI_STRING_LOCALES.map((locale) => (
                  <td key={locale} className="px-3 py-2 align-top">
                    {row.values[locale] || (
                      <span className="text-muted-foreground italic">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
