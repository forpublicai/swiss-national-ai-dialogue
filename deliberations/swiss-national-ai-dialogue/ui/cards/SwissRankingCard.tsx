"use client";

import {
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { GripVertical } from "lucide-react";

import { cn, Textarea } from "@/components/ui";

import {
  trackQuestionAnswered,
  trackQuestionShown,
} from "../../analytics";

import type { AwaitingEventOf } from "../../types";
import {
  allLabelsTitled,
  OptionLabel,
  SwissCard,
  SwissRevealFillRow,
} from "./SwissCardChrome";
import { rankingRows, type RankingPollCounts } from "./opener-poll-math";
import { useOpenerPoll } from "./use-opener-poll";
import { useSwissDict } from "../../i18n";

type RankingStep = Extract<
  AwaitingEventOf<"awaiting_opener_sequence">["steps"][number],
  { kind: "ranking" }
>;

const SLUG = "swiss-national-ai-dialogue";

const DRAG_THRESHOLD = 6;

const shownFired = new Set<string>();

function optionKey(o: { id?: string; label: string }): string {
  return o.id ?? o.label;
}

function committedOrder(answer: Record<string, unknown> | null): string[] | null {
  const raw = answer?.order;
  if (!Array.isArray(raw)) return null;
  const order = raw.filter((v): v is string => typeof v === "string" && v.length > 0);
  return order.length > 0 ? order : null;
}

export function SwissRankingCard({
  step,
  theme,
  answer,
  onAnswer,
  readOnly,
  revealPolls,
  // Left side of the same action row (the question-feedback thumbs).
  actionsLead,
}: {
  step: RankingStep;
  theme?: string;
  answer: Record<string, unknown> | null;
  onAnswer: (result: Record<string, unknown>) => void;
  readOnly?: boolean;
  revealPolls?: boolean;
  actionsLead?: ReactNode;
}) {
  const dict = useSwissDict();
  const t = dict.ranking;

  const committed = committedOrder(answer);
  const resolved = committed !== null;
  const locked = Boolean(readOnly) || resolved;

  const labelByKey = new Map(step.options.map((o) => [optionKey(o), o.label]));
  const titledOptions = allLabelsTitled(step.options.map((o) => o.label));
  const descByKey = new Map(
    step.options.map((o) => [optionKey(o), o.description]),
  );

  const [order, setOrder] = useState<string[]>(
    () => committed ?? step.options.map(optionKey),
  );
  const [otherText, setOtherText] = useState("");
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartYRef = useRef(0);
  const dragMovedRef = useRef(false);

  const themeSlug = theme?.trim() || "unknown";
  useEffect(() => {
    if (readOnly || resolved || shownFired.has(step.question)) return;
    shownFired.add(step.question);
    trackQuestionShown({
      campaignSlug: SLUG,
      theme: themeSlug,
      openerId: step.opener_id ?? null,
      kind: "ranking",
    });
  }, [readOnly, resolved, step.question, step.opener_id, themeSlug]);

  const orderFromPointer = (key: string, clientY: number): string[] | null => {
    const rows = containerRef.current?.querySelectorAll<HTMLElement>(
      "[data-rank-key]",
    );
    if (!rows || rows.length === 0) return null;
    const others = Array.from(rows).filter((r) => r.dataset.rankKey !== key);
    const idx = others.filter((r) => {
      const rect = r.getBoundingClientRect();
      return clientY > rect.top + rect.height / 2;
    }).length;
    const next = others.map((r) => r.dataset.rankKey!);
    next.splice(idx, 0, key);
    return next;
  };

  const startDrag = (key: string) => (e: ReactPointerEvent) => {
    if (locked) return;
    setDraggingKey(key);
    dragStartYRef.current = e.clientY;
    dragMovedRef.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onDragMove = (e: ReactPointerEvent) => {
    if (!draggingKey) return;
    if (
      !dragMovedRef.current &&
      Math.abs(e.clientY - dragStartYRef.current) < DRAG_THRESHOLD
    ) {
      return;
    }
    dragMovedRef.current = true;
    const next = orderFromPointer(draggingKey, e.clientY);
    if (!next) return;
    setOrder((prev) =>
      next.length === prev.length && next.every((k, i) => k === prev[i])
        ? prev
        : next,
    );
  };
  const endDrag = () => {
    setDraggingKey(null);
    dragMovedRef.current = false;
  };

  // Keyboard reorder from the grip (accessibility + precision).
  const nudge = (key: string, delta: number) => {
    if (locked) return;
    setOrder((prev) => {
      const from = prev.indexOf(key);
      const to = Math.max(0, Math.min(prev.length - 1, from + delta));
      if (from < 0 || from === to) return prev;
      const next = [...prev];
      next.splice(from, 1);
      next.splice(to, 0, key);
      return next;
    });
  };

  const submit = () => {
    if (locked) return;
    trackQuestionAnswered({
      campaignSlug: SLUG,
      theme: themeSlug,
      openerId: step.opener_id ?? null,
      kind: "ranking",
    });
    const other = otherText.trim();
    onAnswer({ order, ...(other ? { other } : {}) });
  };

  const pollArm = revealPolls || !readOnly;
  const othersPoll = useOpenerPoll<RankingPollCounts>(
    "ranking",
    { openerId: step.opener_id, question: step.question },
    pollArm,
  );
  const reveal = othersPoll
    ? rankingRows(
        othersPoll,
        committed,
        step.options.map((o) => ({ key: optionKey(o), label: o.label })),
      )
    : null;
  const showReveal = pollArm && resolved && reveal !== null && reveal.total > 0;
  const rowCount = step.options.length;

  return (
    <SwissCard question={step.question}>
      <div
        className="flex flex-col gap-4"
        style={{ ["--tradeoff-accent" as string]: "var(--primary)" }}
      >
        {!readOnly && (
          <p
            className={cn(
              "text-muted-foreground text-[13px] leading-snug",
              resolved && "invisible",
            )}
          >
            {t.hint}
          </p>
        )}

        {showReveal && reveal ? (
          <div className="flex flex-col">
            {reveal.rows.map((row, i) => {
              const pct =
                rowCount > 1
                  ? (1 - (row.meanRank - 1) / (rowCount - 1)) * 100
                  : 100;
              return (
                <SwissRevealFillRow
                  key={row.key}
                  reveal={{ pct, mine: false }}
                  className={cn("border-border border-b", i === 0 && "border-t")}
                >
                  <div className="flex items-center gap-3 py-3">
                    <span className="text-muted-foreground w-5 shrink-0 text-center font-mono text-[15px] font-bold">
                      {i + 1}
                    </span>
                    <span className="text-foreground min-w-0 flex-1 text-[16px] font-medium leading-snug">
                      {titledOptions ? (
                        <OptionLabel label={labelByKey.get(row.key) ?? row.key} />
                      ) : (
                        (labelByKey.get(row.key) ?? row.key)
                      )}
                    </span>
                    <span className="text-muted-foreground shrink-0 whitespace-nowrap text-[11px]">
                      {t.crowd} {row.meanRank}
                      {row.yourRank !== null && (
                        <span className="text-[color:var(--primary)] font-semibold">
                          {" · "}
                          {t.yours} {row.yourRank}
                        </span>
                      )}
                    </span>
                  </div>
                </SwissRevealFillRow>
              );
            })}
          </div>
        ) : (
          <div
            ref={containerRef}
            className="flex flex-col gap-2"
            onPointerMove={onDragMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            {order.map((key, i) => {
              const description = descByKey.get(key);
              const dragging = draggingKey === key;
              return (
                <div
                  key={key}
                  data-rank-key={key}
                  className={cn(
                    "border-border bg-card flex items-center gap-3 rounded-md border px-3 py-3 transition-shadow",
                    dragging && "shadow-md",
                    locked && "opacity-90",
                  )}
                >
                  <span className="w-5 shrink-0 text-center font-mono text-[15px] font-bold text-[color:var(--primary)]">
                    {i + 1}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-foreground text-[16px] font-medium leading-snug">
                      {titledOptions ? (
                        <OptionLabel label={labelByKey.get(key) ?? key} />
                      ) : (
                        (labelByKey.get(key) ?? key)
                      )}
                    </span>
                    {description && (
                      <span className="text-muted-foreground text-[13px] leading-snug">
                        {description}
                      </span>
                    )}
                  </span>
                  {!locked && (
                    <button
                      type="button"
                      aria-label={`${labelByKey.get(key) ?? key} — reorder`}
                      className="text-muted-foreground hover:text-foreground shrink-0 cursor-grab touch-none rounded p-1 active:cursor-grabbing"
                      onPointerDown={startDrag(key)}
                      onPointerMove={onDragMove}
                      onPointerUp={endDrag}
                      onPointerCancel={endDrag}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowUp") {
                          e.preventDefault();
                          nudge(key, -1);
                        } else if (e.key === "ArrowDown") {
                          e.preventDefault();
                          nudge(key, 1);
                        }
                      }}
                    >
                      <GripVertical className="size-5" aria-hidden />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {step.follow_up && !locked && (
          <Textarea
            value={otherText}
            onChange={(e) => setOtherText(e.target.value)}
            rows={2}
            placeholder={step.follow_up}
            aria-label={step.follow_up}
            className="border-input bg-card focus-visible:ring-ring min-h-[3rem] resize-none rounded-md border px-3.5 py-2.5 !text-[16px] leading-relaxed focus-visible:outline-none focus-visible:ring-2"
          />
        )}

        {(actionsLead || !readOnly) && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center">{actionsLead}</div>
            {!readOnly && (
              <button
                type="button"
                onClick={submit}
                className={cn(
                  "bg-primary rounded-md px-6 py-2 text-sm font-bold text-white transition-all hover:opacity-90",
                  resolved && "invisible",
                )}
              >
                {t.submit}
              </button>
            )}
          </div>
        )}
      </div>
    </SwissCard>
  );
}
