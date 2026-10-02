"use client";

import { type CSSProperties, useEffect, useState, type ReactNode } from "react";

import { cn } from "@/components/ui";

import {
  trackQuestionAnswered,
  trackQuestionShown,
} from "../../analytics";

import type { CardRenderProps } from "../../types";
import {
  allLabelsTitled,
  SwissCard,
  SwissOpenerLead,
  SwissOptionRow,
} from "./SwissCardChrome";
import { type BinaryPollCounts, binarySplit } from "./opener-poll-math";
import { useOpenerPoll } from "./use-opener-poll";
import { useSwissDict } from "../../i18n";

const SLUG = "swiss-national-ai-dialogue";

const shownFired = new Set<string>();

export const SwissBinaryChoiceCard = ({
  event,
  answer,
  onAnswer,
  readOnly,
  autoCommit,
  revealPolls,
  // The quiet grey per-question skip beside the confirm slot.
  onSkip,
  // Left side of the same action row (the beta thumbs).
  actionsLead,
}: CardRenderProps<"awaiting_binary_choice"> & {
  autoCommit?: boolean;
  revealPolls?: boolean;
  onSkip?: () => void;
  actionsLead?: ReactNode;
}) => {
  const dict = useSwissDict();
  const t = dict.tradeoff;

  const committedChoice =
    answer?.choice === "a" || answer?.choice === "b"
      ? (answer.choice as "a" | "b")
      : null;
  const committedElaborate = answer?.elaborate === true;
  const resolved = committedChoice !== null || committedElaborate;
  const locked = Boolean(readOnly) || resolved;

  const [picked, setPicked] = useState<"a" | "b" | null>(null);
  const theme = event.theme?.trim() || "unknown";
  const trackParams = {
    campaignSlug: SLUG,
    theme,
    openerId: event.opener_id ?? null,
    kind: "binary" as const,
  };

  useEffect(() => {
    if (readOnly || resolved || shownFired.has(event.question)) return;
    shownFired.add(event.question);
    trackQuestionShown({
      campaignSlug: SLUG,
      theme,
      openerId: event.opener_id ?? null,
      kind: "binary",
    });
  }, [readOnly, resolved, event.question, event.opener_id, theme]);

  const pick = (side: "a" | "b") => {
    if (locked) return;
    setPicked(side);
    if (autoCommit) {
      trackQuestionAnswered({
        ...trackParams,
        position: side === "a" ? 0 : 100,
      });
      onAnswer({
        choice: side,
        choice_label: side === "a" ? event.option_a.label : event.option_b.label,
      });
    }
  };

  const confirm = () => {
    if (locked || picked === null) return;
    const choice_label =
      picked === "a" ? event.option_a.label : event.option_b.label;
    trackQuestionAnswered({
      ...trackParams,
      position: picked === "a" ? 0 : 100,
    });
    onAnswer({ choice: picked, choice_label });
  };

  const pollArm = revealPolls || !readOnly;
  const othersPoll = useOpenerPoll<BinaryPollCounts>(
    "binary",
    { openerId: event.opener_id, question: event.question },
    pollArm,
  );
  const split = othersPoll ? binarySplit(othersPoll, committedChoice) : null;
  const showSplit = pollArm && resolved && split !== null && split.total > 0;

  const shownSide = resolved ? committedChoice : picked;
  const titledOptions = allLabelsTitled([
    event.option_a.label,
    event.option_b.label,
  ]);

  return (
    <>
      {event.lead ? <SwissOpenerLead text={event.lead} /> : null}
      <SwissCard question={event.question}>
        <div
          className="flex flex-col gap-4"
          style={
            {
              "--tradeoff-accent": "var(--primary)",
            } as CSSProperties
          }
        >
          <div className="flex flex-col gap-2" role="radiogroup" aria-label={event.question}>
            {(["a", "b"] as const).map((side) => {
              const option = side === "a" ? event.option_a : event.option_b;
              const share =
                showSplit && split ? (side === "a" ? split.a : split.b) : null;
              return (
                <div key={side} className="flex flex-col gap-2">
                  {side === "b" && (
                    <span
                      aria-hidden
                      className="text-muted-foreground self-center text-center text-[13px] lowercase"
                    >
                      {t.or}
                    </span>
                  )}
                  <SwissOptionRow
                    multi={false}
                    locked={locked}
                    selected={shownSide === side}
                    dimmed={resolved && !showSplit && shownSide !== side}
                    split={titledOptions}
                    onClick={() => pick(side)}
                    label={option.label}
                    description={option.description}
                    result={
                      share ? { count: share.count, pct: share.pct } : null
                    }
                  />
                </div>
              );
            })}
          </div>

          {(actionsLead || (!locked && (!autoCommit || onSkip))) && (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center">{actionsLead}</div>
              <div className="flex items-center gap-4">
              {!locked && onSkip && (
                <button
                  type="button"
                  data-testid="question-skip"
                  onClick={onSkip}
                  className="text-muted-foreground hover:text-foreground rounded-md px-1 py-1 text-sm font-medium transition-colors"
                >
                  {dict.question.skip}
                </button>
              )}
              {!autoCommit && !locked && (
                <button
                  type="button"
                  disabled={picked === null}
                  onClick={confirm}
                  className={cn(
                    "rounded-md px-6 py-2 text-sm font-bold transition-all",
                    picked !== null
                      ? "bg-[var(--tradeoff-accent)] text-white hover:opacity-90"
                      : "bg-muted text-muted-foreground cursor-not-allowed",
                  )}
                >
                  {t.confirm}
                </button>
              )}
              </div>
            </div>
          )}

          {committedElaborate && (
            <p className="text-muted-foreground self-center text-center text-[12px]">
              {t.choseToExplain}
            </p>
          )}

        </div>
      </SwissCard>
    </>
  );
};
