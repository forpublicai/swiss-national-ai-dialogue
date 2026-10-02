"use client";

import { type CSSProperties, type ReactNode } from "react";

import { cn } from "@/components/ui";

import {
  binarySplit,
  budgetRows,
  mcqBars,
  rankingRows,
  sliderDistribution,
  type BinaryPollCounts,
  type BudgetPollCounts,
  type McqPollCounts,
  type RankingPollCounts,
  type SliderPollCounts,
} from "../ui/cards/opener-poll-math";
import {
  allLabelsTitled,
  OptionLabel,
  SwissCard,
  SwissOptionRow,
  SwissRevealFillRow,
} from "../ui/cards/SwissCardChrome";
import { SwissSliderCurve } from "../ui/cards/SwissSliderCurve";
import { MCQ_OTHER_SENTINEL, SLIDER_BIN_COUNT } from "../types";

export type ResultCardOption = {
  key: string;
  label: string;
  description?: string;
};

export type ResultCardModel = { id: string; question: string } & (
  | { kind: "binary"; optionA: ResultCardOption; optionB: ResultCardOption }
  | { kind: "question"; multiSelect: boolean; options: ResultCardOption[] }
  | { kind: "ranking"; options: ResultCardOption[] }
  | { kind: "slider"; minLabel: string; maxLabel: string }
  | { kind: "budget"; total: number; options: ResultCardOption[] }
);

export type ResultCardPoll = {
  total: number;
  values: Record<string, number>;
} | null;

export type ResultCardDiagnostic = {
  eligible: number;
  answered: number;
  skipped: number;
  skipRate: number;
  thumbsUp: number;
  thumbsDown: number;
  notes: { rating: "up" | "down"; note: string }[];
  consensus: number | null;
};

export function QuestionResultCard({
  model,
  poll,
  diagnostic,
}: {
  model: ResultCardModel;
  poll: ResultCardPoll;
  diagnostic: ResultCardDiagnostic | null;
}) {
  return (
    <div className="border-border bg-card flex flex-col gap-4 rounded-lg border p-5">
      <SwissCard question={model.question} className="!max-w-none">
        <div
          className="flex flex-col gap-4"
          style={{ "--tradeoff-accent": "var(--primary)" } as CSSProperties}
        >
          {poll && poll.total > 0 ? (
            <ResultBody model={model} poll={poll} />
          ) : (
            <p className="text-muted-foreground text-sm">No answers yet.</p>
          )}
        </div>
      </SwissCard>
      <DiagnosticStrip poll={poll} diagnostic={diagnostic} />
    </div>
  );
}

function ResultBody({
  model,
  poll,
}: {
  model: ResultCardModel;
  poll: NonNullable<ResultCardPoll>;
}) {
  if (model.kind === "binary") {
    const counts: BinaryPollCounts = {
      total: poll.total,
      sides: [poll.values.a ?? 0, poll.values.b ?? 0],
    };
    const split = binarySplit(counts, null);
    const titled = allLabelsTitled([model.optionA.label, model.optionB.label]);
    return (
      <div className="flex flex-col gap-2">
        {([
          [model.optionA, split.a],
          [model.optionB, split.b],
        ] as const).map(([option, share], index) => (
          <div key={option.key} className="flex flex-col gap-2">
            {index === 1 && (
              <span className="text-muted-foreground self-center text-center text-[13px] lowercase">
                or
              </span>
            )}
            <SwissOptionRow
              multi={false}
              locked
              selected={false}
              split={titled}
              onClick={() => {}}
              label={option.label}
              description={option.description}
              result={{ count: share.count, pct: share.pct }}
            />
          </div>
        ))}
      </div>
    );
  }

  if (model.kind === "question") {
    const counts: McqPollCounts = { total: poll.total, options: poll.values };
    const { bars } = mcqBars(counts, [], model.options);
    const titled = allLabelsTitled(model.options.map((option) => option.label));
    const descriptions = new Map(
      model.options.map((option) => [option.key, option.description]),
    );
    return (
      <div className="flex flex-col gap-1">
        {bars.map((bar) => (
          <SwissOptionRow
            key={bar.key}
            multi={model.multiSelect}
            locked
            selected={false}
            split={titled && bar.key !== MCQ_OTHER_SENTINEL}
            onClick={() => {}}
            label={bar.key === MCQ_OTHER_SENTINEL ? "Other…" : bar.label}
            description={descriptions.get(bar.key)}
            result={{ count: bar.count, pct: bar.pct }}
          />
        ))}
      </div>
    );
  }

  if (model.kind === "slider") {
    const counts: SliderPollCounts = {
      total: poll.total,
      bins: Array.from(
        { length: SLIDER_BIN_COUNT },
        (_, bin) => poll.values[String(bin)] ?? 0,
      ),
    };
    const dist = sliderDistribution(counts, null);
    return (
      <div className="relative py-4">
        <div aria-hidden className="absolute inset-x-0 -top-2 bottom-1/2">
          <SwissSliderCurve
            bins={dist.bars.map((bar) => bar.count)}
            youPosition={null}
          />
        </div>
        <div className="bg-border relative h-2 rounded-full" />
        <div className="text-muted-foreground mt-3 flex items-start justify-between gap-6 text-[13px] leading-snug">
          <span className="max-w-[45%]">{model.minLabel}</span>
          <span className="max-w-[45%] text-right">{model.maxLabel}</span>
        </div>
      </div>
    );
  }

  if (model.kind === "ranking") {
    const counts: RankingPollCounts = { total: poll.total, meanRank: poll.values };
    const { rows } = rankingRows(counts, null, model.options);
    const labelByKey = new Map(
      model.options.map((option) => [option.key, option.label]),
    );
    const titled = allLabelsTitled(model.options.map((option) => option.label));
    const rowCount = model.options.length;
    return (
      <div className="flex flex-col">
        {rows.map((row, index) => {
          const pct =
            rowCount > 1
              ? (1 - (row.meanRank - 1) / (rowCount - 1)) * 100
              : 100;
          return (
            <SwissRevealFillRow
              key={row.key}
              reveal={{ pct, mine: false }}
              className={cn("border-border border-b", index === 0 && "border-t")}
            >
              <div className="flex items-center gap-3 py-3">
                <span className="text-muted-foreground w-5 shrink-0 text-center font-mono text-[15px] font-bold">
                  {index + 1}
                </span>
                <span className="text-foreground min-w-0 flex-1 text-[16px] font-medium leading-snug">
                  {titled ? (
                    <OptionLabel label={labelByKey.get(row.key) ?? row.key} />
                  ) : (
                    (labelByKey.get(row.key) ?? row.key)
                  )}
                </span>
                <span className="text-muted-foreground shrink-0 whitespace-nowrap text-[11px]">
                  avg rank {row.meanRank}
                </span>
              </div>
            </SwissRevealFillRow>
          );
        })}
      </div>
    );
  }

  const counts: BudgetPollCounts = { total: poll.total, sums: poll.values };
  const { rows } = budgetRows(counts, null, model.options);
  return (
    <div className="flex flex-col">
      {rows.map((row, index) => (
        <SwissRevealFillRow
          key={row.key}
          reveal={{
            pct: Math.min(100, (row.average / model.total) * 100),
            mine: false,
          }}
          className={cn(
            "text-muted-foreground border-border border-b",
            index === 0 && "border-t",
          )}
        >
          <div className="flex items-center justify-between gap-3 py-3">
            <span className="min-w-0 flex-1 text-[16px] font-medium leading-snug">
              {row.label}
            </span>
            <span className="shrink-0 whitespace-nowrap font-mono text-[13px] tabular-nums">
              ⌀ {row.average} / {model.total}
            </span>
          </div>
        </SwissRevealFillRow>
      ))}
    </div>
  );
}

function DiagnosticStrip({
  poll,
  diagnostic,
}: {
  poll: ResultCardPoll;
  diagnostic: ResultCardDiagnostic | null;
}) {
  const answered = diagnostic?.answered ?? poll?.total ?? 0;
  const consensusPct =
    diagnostic?.consensus != null ? Math.round(diagnostic.consensus * 100) : null;
  return (
    <div className="border-border flex flex-wrap items-center gap-2 border-t pt-3">
      <Chip>{answered} answered</Chip>
      {diagnostic && diagnostic.eligible > 0 && (
        <Chip
          tone={
            diagnostic.skipRate >= 0.15
              ? "bad"
              : diagnostic.skipRate >= 0.08
                ? "warn"
                : "plain"
          }
        >
          {diagnostic.skipped} skipped ({Math.round(diagnostic.skipRate * 100)}%)
        </Chip>
      )}
      {diagnostic && (diagnostic.thumbsUp > 0 || diagnostic.thumbsDown > 0) && (
        <Chip
          tone={diagnostic.thumbsDown > diagnostic.thumbsUp ? "bad" : "plain"}
        >
          👍 {diagnostic.thumbsUp} · 👎 {diagnostic.thumbsDown}
        </Chip>
      )}
      {consensusPct !== null && answered >= 20 && (
        <Chip tone={consensusPct >= 85 ? "bad" : consensusPct >= 70 ? "warn" : "plain"}>
          {consensusPct >= 70
            ? `one-sided: ${consensusPct}% behind one answer`
            : `top answer ${consensusPct}%`}
        </Chip>
      )}
      {diagnostic && diagnostic.notes.length > 0 && (
        <details className="w-full">
          <summary className="text-muted-foreground cursor-pointer text-xs">
            {diagnostic.notes.length} written note
            {diagnostic.notes.length === 1 ? "" : "s"} on this question
          </summary>
          <ul className="mt-2 flex flex-col gap-1.5">
            {diagnostic.notes.map((note, index) => (
              <li key={index} className="text-muted-foreground text-xs">
                <span className="mr-1.5">{note.rating === "up" ? "👍" : "👎"}</span>
                {note.note}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function Chip({
  children,
  tone = "plain",
}: {
  children: ReactNode;
  tone?: "plain" | "warn" | "bad";
}) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 font-mono text-[11px] tabular-nums",
        tone === "bad" &&
          "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
        tone === "warn" &&
          "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
        tone === "plain" && "bg-muted text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}
