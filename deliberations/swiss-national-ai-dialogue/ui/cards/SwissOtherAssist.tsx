"use client";

import { Fragment, useEffect, useRef } from "react";
import { Check } from "lucide-react";
import { motion } from "motion/react";

import { cn } from "@/components/ui";

import { SnadComposer } from "../conversation/SnadComposer";
import { RetryLine } from "./SwissContributionCard";
import { useSwissDict } from "../../i18n";
import { useDraftChat, type DraftChat } from "../conversation/use-draft-chat";
import styles from "./other-underline.module.css";

const EASE = [0.22, 1, 0.36, 1] as const;
const SUGGESTION_MAX_LENGTH = 200;

export type OtherAssist = DraftChat;

export function useOtherAssist({
  openerId,
  text,
  onText,
  onResume,
}: {
  openerId: string | null;
  text: string;
  onText: (text: string) => void;
  // Reveal the Other answer field when a reload surfaces a stored draft.
  onResume?: () => void;
}): OtherAssist {
  const dict = useSwissDict();
  return useDraftChat({
    mode: "other",
    openerId,
    onResume,
    text,
    onText,
    kickoffText: dict.assist.kickoff,
    stemText: dict.assist.stem,
  });
}

export function SwissOtherAnswerField({
  assist,
  selected,
  onActivate,
}: {
  assist: OtherAssist;
  selected: boolean;
  onActivate: () => void;
}) {
  const dict = useSwissDict();
  const fieldRef = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    field.style.height = "auto";
    field.style.height = `${field.scrollHeight}px`;
  }, [assist.text]);

  return (
    <div className="min-w-0 flex-1 py-1.5 pl-1 pr-3">
      <div className={cn("relative", assist.processing && styles.processing)}>
        <span aria-hidden className={styles.line} />
        <textarea
          ref={fieldRef}
          rows={1}
          value={assist.text}
          onChange={(event) => assist.onManualEdit(event.target.value)}
          onFocus={onActivate}
          onBlur={() => assist.commitDraft()}
          maxLength={SUGGESTION_MAX_LENGTH}
          placeholder={dict.question.otherPlaceholder}
          aria-label={dict.assist.suggestionLabel}
          data-testid="other-assist-suggestion"
          className={cn(
            "text-foreground placeholder:text-muted-foreground block w-full resize-none overflow-hidden break-words border-b bg-transparent px-1 pb-0.5 text-[16px] leading-relaxed outline-none transition-colors",
            assist.processing
              ? "border-transparent"
              : selected
                ? "border-[color:var(--primary)]"
                : "border-border focus:border-[color:var(--primary)]",
          )}
        />
      </div>
    </div>
  );
}

export function SwissOtherAssistChat({ assist }: { assist: OtherAssist }) {
  const dict = useSwissDict();
  const t = dict.assist;

  const threadRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const thread = threadRef.current;
    if (thread) thread.scrollTop = thread.scrollHeight;
  }, [assist.turns, assist.silentEditsAfter, assist.status]);

  return (
    <motion.div
      data-testid="other-assist"
      aria-label={t.title}
      className="mt-1"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
    >
      <div className="border-border bg-card flex flex-col rounded-2xl border shadow-sm">
        <div
          ref={threadRef}
          className="flex max-h-48 flex-col gap-2.5 overflow-y-auto px-4 pb-3 pt-3.5"
          aria-live="polite"
        >
          {assist.turns.map((turn, i) => (
            <Fragment key={i}>
              <div
                className={cn(
                  "whitespace-pre-wrap text-[14px] leading-relaxed",
                  turn.role === "assistant"
                    ? "text-foreground max-w-[42ch] self-start"
                    : "bg-primary/10 text-foreground max-w-[85%] self-end rounded-2xl px-3.5 py-2.5",
                )}
              >
                {turn.content}
              </div>
              {assist.silentEditsAfter.includes(i + 1) && (
                <div className="text-muted-foreground flex items-center gap-1.5 self-start text-[13px]">
                  <Check aria-hidden className="text-primary size-3.5" strokeWidth={3} />
                  {t.editedNote}
                </div>
              )}
            </Fragment>
          ))}
          {assist.status === "loading" && (
            <div className="self-start py-1">
              <span className="bg-primary inline-block size-2 animate-pulse rounded-full" />
            </div>
          )}
          {assist.status === "error" && <RetryLine onRetry={assist.retry} />}
        </div>
        <div aria-hidden className="bg-border/60 mx-4 h-px" />
        <SnadComposer
          disabled={assist.status === "loading"}
          onSend={assist.send}
          placeholder={t.placeholder}
          ariaLabel={t.title}
          className="border-0 bg-transparent px-2.5 py-2 shadow-none backdrop-blur-none focus-within:border-transparent focus-within:ring-0"
        />
      </div>
    </motion.div>
  );
}
