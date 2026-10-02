"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Check } from "lucide-react";

import { cn, Textarea } from "@/components/ui";

import {
  trackQuestionAnswered,
  trackQuestionShown,
} from "../../analytics";
import { MCQ_OTHER_SENTINEL } from "../../types";

import type { AwaitingEventOf, CardRenderProps } from "../../types";
import {
  allLabelsTitled,
  SwissCard,
  SwissOpenerLead,
  SwissOptionRow,
} from "./SwissCardChrome";
import { type McqPollCounts, mcqBars } from "./opener-poll-math";
import {
  SwissOtherAnswerField,
  SwissOtherAssistChat,
  useOtherAssist,
} from "./SwissOtherAssist";
import { useOpenerPoll } from "./use-opener-poll";
import { useSwissDict } from "../../i18n";

type Question = AwaitingEventOf<"awaiting_user_question">["questions"][number];

type StructuredAnswer = {
  selected?: string[];
  other?: string;
  skipped?: true;
};
type AnswerValue = string | string[] | StructuredAnswer;

const SLUG = "swiss-national-ai-dialogue";

// shown-event dedupe across remounts, same pattern as the other opener cards.
const shownFired = new Set<string>();

export const SwissUserQuestionCard = ({
  event,
  answer,
  onAnswer,
  readOnly,
  autoCommit,
  onStepProgress,
  revealPolls,
  onSkip,
  // Left side of the same action row (the beta thumbs).
  actionsLead,
}: CardRenderProps<"awaiting_user_question"> & {
  autoCommit?: boolean;
  revealPolls?: boolean;
  onSkip?: () => void;
  actionsLead?: ReactNode;
}) => {
  const submitted =
    answer && typeof answer.answers === "object" && answer.answers !== null
      ? (answer.answers as Record<string, AnswerValue>)
      : null;

  const openerQuestion =
    event.theme?.trim() &&
    event.questions.length === 1 &&
    (event.questions[0]?.options?.length ?? 0) > 0
      ? event.questions[0]!
      : null;
  const selfSelected =
    openerQuestion && submitted
      ? pollKeys(submitted[openerQuestion.question], openerQuestion)
      : [];
  const pollArm = (revealPolls || !readOnly) && openerQuestion !== null;
  const othersPoll = useOpenerPoll<McqPollCounts>(
    "mcq",
    {
      openerId: event.opener_id,
      question: openerQuestion?.question ?? "",
    },
    pollArm,
  );

  const theme = event.theme?.trim() || "unknown";
  const openerQuestionText = openerQuestion?.question;
  useEffect(() => {
    if (
      readOnly ||
      submitted !== null ||
      !openerQuestionText ||
      shownFired.has(openerQuestionText)
    ) {
      return;
    }
    shownFired.add(openerQuestionText);
    trackQuestionShown({
      campaignSlug: SLUG,
      theme,
      openerId: event.opener_id ?? null,
      kind: "mcq",
    });
  }, [readOnly, submitted, openerQuestionText, event.opener_id, theme]);

  const submitAnswers = (answers: Record<string, AnswerValue>) => {
    if (openerQuestion) {
      trackQuestionAnswered({
        campaignSlug: SLUG,
        theme,
        openerId: event.opener_id ?? null,
        kind: "mcq",
      });
    }
    onAnswer({ answers });
  };

  const openerId = event.opener_id ?? null;
  const body = openerQuestion ? (
    <OpenerQuestionCard
      question={openerQuestion}
      openerId={openerId}
      value={submitted?.[openerQuestion.question]}
      readOnly={readOnly}
      poll={pollArm && submitted !== null ? othersPoll : null}
      selfSelected={selfSelected}
      onSubmit={(value) =>
        submitAnswers({ [openerQuestion.question]: value })
      }
      autoCommit={autoCommit}
      onSkip={onSkip}
      actionsLead={actionsLead}
    />
  ) : submitted !== null || readOnly ? (
    <AnsweredSummary questions={event.questions} answers={submitted} />
  ) : (
    <QuestionsPager
      questions={event.questions}
      openerId={openerId}
      onSubmit={submitAnswers}
      autoCommit={autoCommit}
      onStepProgress={onStepProgress}
    />
  );

  if (!event.lead) return body;
  return (
    <div className="flex w-full flex-col">
      <SwissOpenerLead text={event.lead} />
      {body}
    </div>
  );
};

type Draft = {
  selections: string[];
  otherSelected: boolean;
  otherText: string;
  text: string;
};

const emptyDraft: Draft = {
  selections: [],
  otherSelected: false,
  otherText: "",
  text: "",
};

function draftAnswer(
  q: Question,
  draft: Draft,
  otherStem = "",
): AnswerValue | null {
  if (!q.options || q.options.length === 0) {
    const text = draft.text.trim();
    return text ? text : null;
  }
  const otherRaw = draft.otherText.trim();
  const other = otherStem && otherRaw === otherStem.trim() ? "" : otherRaw;
  if (draft.otherSelected && !other) return null;
  const value: StructuredAnswer = {
    ...(draft.selections.length > 0 ? { selected: draft.selections } : {}),
    ...(draft.otherSelected ? { other } : {}),
  };
  if (!value.selected && value.other === undefined) return null;
  return value;
}

function QuestionsPager({
  questions,
  openerId,
  onSubmit,
  autoCommit,
  onStepProgress,
}: {
  questions: Question[];
  openerId: string | null;
  onSubmit: (answers: Record<string, AnswerValue>) => void;
  autoCommit?: boolean;
  onStepProgress?: (
    progress: { current: number; total: number; answered: boolean } | null,
  ) => void;
}) {
  const dict = useSwissDict();
  const t = dict.question;
  const otherStem = dict.assist.stem;
  const [drafts, setDrafts] = useState<Draft[]>(() =>
    questions.map(() => emptyDraft),
  );
  const [current, setCurrent] = useState(0);
  const [submittedLocal, setSubmittedLocal] = useState(false);

  const total = questions.length;
  useEffect(() => {
    if (!onStepProgress || submittedLocal || total <= 1) return;
    onStepProgress({ current: current + 1, total, answered: false });
    return () => onStepProgress(null);
  }, [onStepProgress, submittedLocal, current, total]);

  const patch = (patch: Partial<Draft>) => {
    if (submittedLocal) return;
    setDrafts((prev) =>
      prev.map((d, i) => (i === current ? { ...d, ...patch } : d)),
    );
  };

  const answers = questions.map((q, i) => draftAnswer(q, drafts[i]!, otherStem));
  const isLast = current === questions.length - 1;
  const question = questions[current]!;
  const ready = answers[current] !== null;

  const submit = (finalAnswers: (AnswerValue | null)[]) => {
    if (submittedLocal || finalAnswers.some((a) => a === null)) return;
    setSubmittedLocal(true);
    const record: Record<string, AnswerValue> = {};
    questions.forEach((q, i) => {
      record[q.question] = finalAnswers[i]!;
    });
    onSubmit(record);
  };

  const advance = () => setCurrent((c) => c + 1);

  const onPrimary = () => {
    if (submittedLocal || !ready) return;
    if (isLast) submit(answers);
    else advance();
  };

  const commitSelection = (label: string) => {
    if (submittedLocal) return;
    const next = drafts.map((d, i) =>
      i === current ? { ...d, selections: [label], otherSelected: false } : d,
    );
    setDrafts(next);
    if (!isLast) advance();
    else submit(questions.map((q, i) => draftAnswer(q, next[i]!, otherStem)));
  };

  const needsButton =
    !autoCommit ||
    question.multiSelect === true ||
    drafts[current]!.otherSelected ||
    (question.options?.length ?? 0) === 0;

  return (
    <SwissCard question={question.question}>
      <div
        className="flex flex-col gap-4"
        style={{ ["--tradeoff-accent" as string]: "var(--primary)" }}
      >
        {/* Keyed so the assist hook's chat resets with each pager step. */}
        <QuestionBody
          key={question.question}
          question={question}
          openerId={openerId}
          draft={drafts[current]!}
          onPatch={patch}
          onCommitSelection={autoCommit ? commitSelection : undefined}
        />

        {needsButton && (
          <button
            type="button"
            disabled={!ready}
            onClick={onPrimary}
            className={cn(
              "self-end rounded-md px-7 py-2.5 text-sm font-bold transition-all",
              ready
                ? "bg-primary hover:opacity-90 text-white"
                : "bg-muted text-muted-foreground cursor-not-allowed",
            )}
          >
            {isLast ? t.submit : t.next}
          </button>
        )}
      </div>
    </SwissCard>
  );
}

function QuestionBody({
  question: q,
  openerId,
  draft,
  onPatch,
  onCommitSelection,
}: {
  question: Question;
  openerId: string | null;
  draft: Draft;
  onPatch: (patch: Partial<Draft>) => void;
  onCommitSelection?: (label: string) => void;
}) {
  const dict = useSwissDict();
  const t = dict.question;
  const multi = q.multiSelect === true;
  const maxSelect = q.maxSelect;
  const exclusiveLabels = new Set(
    (q.options ?? []).filter((o) => o.exclusive).map((o) => o.label),
  );
  const multiCaption =
    maxSelect !== undefined ? null : dict.multiSelect.selectAll;
  const otherAssistOn = q.otherAssist === true && openerId !== null;
  const assist = useOtherAssist({
    openerId,
    text: draft.otherText,
    onText: (text) => onPatch({ otherText: text }),
    onResume: () => onPatch({ otherSelected: true }),
  });
  const primeStem = assist.primeStem;
  useEffect(() => {
    if (otherAssistOn && draft.otherSelected) primeStem();
  }, [otherAssistOn, draft.otherSelected, primeStem]);

  if (!q.options || q.options.length === 0) {
    return (
      <Textarea
        value={draft.text}
        onChange={(e) => onPatch({ text: e.target.value })}
        rows={3}
        placeholder={t.textPlaceholder}
        aria-label={q.question}
        className="border-input bg-card focus-visible:ring-ring min-h-[3rem] resize-none rounded-md border px-3.5 py-2.5 !text-[16px] leading-relaxed focus-visible:outline-none focus-visible:ring-2"
      />
    );
  }

  const toggle = (label: string) => {
    if (multi) {
      if (draft.selections.includes(label)) {
        onPatch({ selections: draft.selections.filter((s) => s !== label) });
        return;
      }
      if (exclusiveLabels.has(label)) {
        onPatch({ selections: [label], otherSelected: false, otherText: "" });
        return;
      }
      const base = draft.selections.filter((s) => !exclusiveLabels.has(s));
      const picked = base.length + (draft.otherSelected ? 1 : 0);
      if (maxSelect !== undefined && picked >= maxSelect) {
        if (base.length !== draft.selections.length) onPatch({ selections: base });
        return;
      }
      onPatch({ selections: [...base, label] });
    } else if (onCommitSelection) {
      onCommitSelection(label);
    } else {
      onPatch({ selections: [label], otherSelected: false });
    }
  };

  const toggleOther = () => {
    if (!multi) {
      onPatch({ otherSelected: true, selections: [] });
      return;
    }
    if (draft.otherSelected) {
      onPatch({ otherSelected: false });
      return;
    }
    const base = draft.selections.filter((s) => !exclusiveLabels.has(s));
    if (maxSelect !== undefined && base.length >= maxSelect) return;
    onPatch({ selections: base, otherSelected: true });
  };

  return (
    <div className="flex flex-col gap-1">
      {multi && multiCaption && (
        <p className="text-muted-foreground text-[13px] leading-snug">
          {multiCaption}
        </p>
      )}
      <div
        className="flex flex-col gap-1"
        role={multi ? "group" : "radiogroup"}
        aria-label={q.question}
      >
        {q.options.map((option) => (
          <SwissOptionRow
            key={option.label}
            multi={multi}
            selected={draft.selections.includes(option.label)}
            split={allLabelsTitled((q.options ?? []).map((o) => o.label))}
            onClick={() => toggle(option.label)}
            label={option.label}
            description={option.description}
          />
        ))}
        <SwissOptionRow
          multi={multi}
          selected={draft.otherSelected}
          onClick={toggleOther}
          label={t.other}
          muted
          expansion={
            otherAssistOn ? (
              <SwissOtherAnswerField
                assist={assist}
                selected={draft.otherSelected}
                onActivate={() => {
                  if (!draft.otherSelected) toggleOther();
                }}
              />
            ) : undefined
          }
        />
      </div>

      {draft.otherSelected &&
        (otherAssistOn ? (
          <SwissOtherAssistChat assist={assist} />
        ) : (
          <div className="flex flex-col gap-1.5">
            <p className="text-muted-foreground text-[13px] leading-snug">
              {t.otherPrompt}
            </p>
            <Textarea
              value={draft.otherText}
              onChange={(e) => onPatch({ otherText: e.target.value })}
              rows={2}
              placeholder={t.otherPlaceholder}
              aria-label={`${t.other}: ${q.question}`}
              autoFocus
              className="border-input bg-card focus-visible:ring-ring min-h-[3rem] resize-none rounded-md border px-3.5 py-2.5 !text-[16px] leading-relaxed focus-visible:outline-none focus-visible:ring-2"
            />
          </div>
        ))}
    </div>
  );
}

function describeAnswer(value: AnswerValue | undefined): string | null {
  if (value === undefined) return null;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.join(", ");
  if (value.skipped === true) return null;
  const parts = [
    ...(value.selected ?? []),
    ...(value.other ? [value.other] : []),
  ];
  return parts.length > 0 ? parts.join(", ") : null;
}

function OpenerQuestionCard({
  question: q,
  openerId,
  value,
  readOnly,
  poll,
  selfSelected,
  onSubmit,
  autoCommit,
  onSkip,
  actionsLead,
}: {
  question: Question;
  openerId: string | null;
  value: AnswerValue | undefined;
  readOnly?: boolean;
  poll: McqPollCounts | null;
  selfSelected: string[];
  onSubmit: (value: AnswerValue) => void;
  autoCommit?: boolean;
  onSkip?: () => void;
  actionsLead?: ReactNode;
}) {
  const dict = useSwissDict();
  const multi = q.multiSelect === true;
  const options = q.options ?? [];
  const maxSelect = q.maxSelect;
  const exclusiveLabels = new Set(
    options.filter((o) => o.exclusive).map((o) => o.label),
  );
  const multiCaption =
    maxSelect !== undefined ? null : dict.multiSelect.selectAll;

  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [submittedLocal, setSubmittedLocal] = useState(false);
  const otherAssistOn = q.otherAssist === true && openerId !== null;
  const otherStem = dict.assist.stem;
  const assist = useOtherAssist({
    openerId,
    text: draft.otherText,
    onText: (text) => setDraft((d) => ({ ...d, otherText: text })),
    onResume: () => setDraft((d) => ({ ...d, otherSelected: true })),
  });

  const structured =
    value !== undefined && typeof value === "object" && !Array.isArray(value)
      ? value
      : null;
  const answered = value !== undefined;
  const skipped = structured?.skipped === true;
  const selectedLabels = answered
    ? typeof value === "string"
      ? [value]
      : Array.isArray(value)
        ? value
        : (structured?.selected ?? [])
    : draft.selections;
  const otherSelected = answered
    ? structured?.other !== undefined
    : draft.otherSelected;
  const locked = answered || submittedLocal || Boolean(readOnly);
  const anyChoice = selectedLabels.length > 0 || otherSelected || skipped;

  const primeStem = assist.primeStem;
  useEffect(() => {
    if (otherAssistOn && !locked && draft.otherSelected) primeStem();
  }, [otherAssistOn, locked, draft.otherSelected, primeStem]);

  const reveal = poll && !skipped
    ? mcqBars(
        poll,
        selfSelected,
        options.map((o) => ({ key: o.id ?? o.label, label: o.label })),
      )
    : null;
  const showBars = reveal !== null && reveal.total > 0;
  const barByKey = new Map((reveal?.bars ?? []).map((bar) => [bar.key, bar]));
  const rowResult = (key: string) =>
    showBars ? (barByKey.get(key) ?? { count: 0, pct: 0 }) : null;

  const submit = (next: Draft) => {
    const answer = draftAnswer(q, next, otherStem);
    if (locked || answer === null) return;
    setSubmittedLocal(true);
    onSubmit(answer);
  };

  const toggle = (label: string) => {
    if (locked) return;
    if (multi) {
      const isExclusive = exclusiveLabels.has(label);
      setDraft((d) => {
        if (d.selections.includes(label)) {
          return { ...d, selections: d.selections.filter((s) => s !== label) };
        }
        // Selecting an "(exclusive)" option ("None") clears every other pick.
        if (isExclusive) {
          return { ...d, selections: [label], otherSelected: false, otherText: "" };
        }
        const base = d.selections.filter((s) => !exclusiveLabels.has(s));
        const picked = base.length + (d.otherSelected ? 1 : 0);
        if (maxSelect !== undefined && picked >= maxSelect) {
          return { ...d, selections: base };
        }
        return { ...d, selections: [...base, label] };
      });
    } else if (autoCommit) {
      const next = { ...draft, selections: [label], otherSelected: false };
      setDraft(next);
      submit(next);
    } else {
      setDraft((d) => ({ ...d, selections: [label], otherSelected: false }));
    }
  };
  const toggleOther = () => {
    if (locked) return;
    setDraft((d) => {
      if (!multi) return { ...d, otherSelected: true, selections: [] };
      if (d.otherSelected) return { ...d, otherSelected: false };
      const base = d.selections.filter((s) => !exclusiveLabels.has(s));
      if (maxSelect !== undefined && base.length >= maxSelect) return d;
      return { ...d, selections: base, otherSelected: true };
    });
  };

  const ready = draftAnswer(q, draft, otherStem) !== null;
  const needsButton = !autoCommit || multi || draft.otherSelected;

  return (
    <SwissCard question={q.question}>
      <div
        className="flex flex-col gap-4"
        style={{ ["--tradeoff-accent" as string]: "var(--primary)" }}
      >
        <div className="flex flex-col gap-1">
          {multi && multiCaption && (
            <p className="text-muted-foreground text-[13px] leading-snug">
              {multiCaption}
            </p>
          )}
          <div
            className="flex flex-col gap-1"
            role={multi ? "group" : "radiogroup"}
            aria-label={q.question}
          >
            {options.map((option) => {
              const selected = selectedLabels.includes(option.label);
              const result = rowResult(option.id ?? option.label);
              return (
                <SwissOptionRow
                  key={option.label}
                  multi={multi}
                  locked={locked}
                  selected={selected}
                  dimmed={locked && anyChoice && result === null && !selected}
                  split={allLabelsTitled(options.map((o) => o.label))}
                  onClick={() => toggle(option.label)}
                  label={option.label}
                  description={option.description}
                  result={result}
                />
              );
            })}
            <SwissOptionRow
              multi={multi}
              locked={locked}
              selected={otherSelected}
              dimmed={locked && anyChoice && !showBars && !otherSelected}
              muted
              onClick={toggleOther}
              label={dict.question.other}
              description={answered ? structured?.other : undefined}
              result={rowResult(MCQ_OTHER_SENTINEL)}
              expansion={
                otherAssistOn
                  ? !locked && (
                      <SwissOtherAnswerField
                        assist={assist}
                        selected={otherSelected}
                        onActivate={() => {
                          if (!draft.otherSelected) toggleOther();
                        }}
                      />
                    )
                  : undefined
              }
            />
          </div>

          {draft.otherSelected &&
            !locked &&
            (otherAssistOn ? (
              <SwissOtherAssistChat assist={assist} />
            ) : (
              <div className="mt-1 flex flex-col gap-1.5">
                <p className="text-muted-foreground text-[13px] leading-snug">
                  {dict.question.otherPrompt}
                </p>
                <Textarea
                  value={draft.otherText}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, otherText: e.target.value }))
                  }
                  rows={2}
                  placeholder={dict.question.otherPlaceholder}
                  aria-label={`${dict.question.other}: ${q.question}`}
                  autoFocus
                  className="border-input bg-card focus-visible:ring-ring min-h-[3rem] resize-none rounded-md border px-3.5 py-2.5 !text-[16px] leading-relaxed focus-visible:outline-none focus-visible:ring-2"
                />
              </div>
            ))}
        </div>

        {(needsButton || (onSkip && !locked) || actionsLead) && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center">{actionsLead}</div>
            <div className="flex items-center gap-4">
            {onSkip && !locked && (
              <button
                type="button"
                data-testid="question-skip"
                onClick={onSkip}
                className="text-muted-foreground hover:text-foreground rounded-md px-1 py-1 text-sm font-medium transition-colors"
              >
                {dict.question.skip}
              </button>
            )}
            {needsButton && (
              <button
                type="button"
                disabled={!ready || locked}
                onClick={() => submit(draft)}
                className={cn(
                  "rounded-md px-7 py-2.5 text-sm font-bold transition-all",
                  ready
                    ? "bg-primary hover:opacity-90 text-white"
                    : "bg-muted text-muted-foreground cursor-not-allowed",
                  locked && "invisible",
                )}
              >
                {dict.question.submit}
              </button>
            )}
            </div>
          </div>
        )}

      </div>
    </SwissCard>
  );
}

function AnsweredSummary({
  questions,
  answers,
}: {
  questions: Question[];
  answers: Record<string, AnswerValue> | null;
}) {
  return (
    <SwissCard question={questions[0]?.question ?? ""}>
      <div className="flex flex-col gap-3">
        {questions.map((q, i) => {
          const main = describeAnswer(answers?.[q.question]);
          return (
            <div key={q.question} className="flex flex-col gap-0.5">
              {i > 0 && (
                <p className="text-card-foreground text-sm font-medium leading-snug">
                  {q.question}
                </p>
              )}
              <p className="text-[color:var(--primary)] flex items-start gap-1.5 text-[15px] font-semibold leading-snug">
                {main !== null && (
                  <Check aria-hidden className="mt-0.5 size-4 shrink-0" />
                )}
                <span>{main ?? "—"}</span>
              </p>
            </div>
          );
        })}
      </div>
    </SwissCard>
  );
}

function pollKeys(
  value: AnswerValue | undefined,
  question: Question,
): string[] {
  const labels = (() => {
    if (typeof value === "string") return value ? [value] : [];
    if (Array.isArray(value)) return value;
    if (!value || value.skipped === true) return [];
    const selected = value.selected ?? [];
    return value.other ? [...selected, MCQ_OTHER_SENTINEL] : selected;
  })();
  const idByLabel = new Map(
    (question.options ?? []).flatMap((o) =>
      o.id ? [[o.label, o.id] as const] : [],
    ),
  );
  return labels.map((label) => idByLabel.get(label) ?? label);
}
