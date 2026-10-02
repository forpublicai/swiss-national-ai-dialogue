"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/components/ui";

import { BorderBeam } from "../border-beam";

import {
  trackInterviewerOffered,
  trackInterviewerReplied,
} from "../../analytics";

import { RetryLine, WALL_AUTO_ADVANCE_MS } from "../cards/SwissContributionCard";
import { SwissQuoteWall } from "../quotes/SwissQuoteCards";
import { SnadComposer } from "../conversation/SnadComposer";
import { useDraftChat } from "../conversation/use-draft-chat";
import { useSnadKeyboardViewport } from "../conversation/use-snad-keyboard-viewport";
import { usePausableHold } from "../use-pausable-hold";
import { SwissPostScreen } from "./SwissPostScreen";
import { useSwissDict } from "../../i18n";
import type { SnadSessionPayload, SnadWallEntry } from "../../types";

const CLOSING_TOPIC_KEY = "closing";
const QUOTE_MAX_LENGTH = 600;

export function SwissClosingInterview({
  slug,
  session,
  onSession,
  onDone,
  onWallShown,
  paused,
  advanceSignal,
}: {
  slug: string;
  session: SnadSessionPayload;
  onSession: (session: SnadSessionPayload) => void;
  onDone: () => void;
  onWallShown: (shown: boolean) => void;
  paused: boolean;
  advanceSignal: number;
}) {
  const dict = useSwissDict();
  const t = dict.closing;
  const feedbackCopy = dict.feedbackChat;
  const reduceMotion = useReducedMotion();

  const [draft, setDraft] = useState(session.closing?.draft ?? "");
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [wall, setWall] = useState<SnadWallEntry[] | null>(null);
  const [ownText, setOwnText] = useState("");

  const chat = useDraftChat({
    mode: "closing",
    onSession,
    text: draft,
    onText: setDraft,
    kickoffText: "",
    stemText: t.placeholder,
    initialTurns: session.feedbackChat,
  });
  const { turns, streaming, silentEditsAfter, send, retry } = chat;
  const error = chat.status === "error";

  const primeStem = chat.primeStem;
  useEffect(() => {
    if (session.closing?.resolved) return;
    primeStem();
  }, [session.closing?.resolved, primeStem]);

  const composerRef = useRef<HTMLDivElement>(null);
  const keyboardMaskRef = useRef<HTMLDivElement>(null);
  const keyboard = useSnadKeyboardViewport(composerRef, keyboardMaskRef);

  const threadEndRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    threadEndRef.current?.scrollIntoView?.({ block: "nearest" });
  }, [turns, streaming]);

  const quoteRef = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    const textarea = quoteRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [draft]);

  const offeredRef = useRef(false);
  useEffect(() => {
    if (offeredRef.current) return;
    if (streaming || error || turns.length > 0) {
      offeredRef.current = true;
      trackInterviewerOffered({
        campaignSlug: slug,
        context: "closing",
        ref: null,
      });
    }
  }, [streaming, error, turns.length, slug]);
  const replyCountRef = useRef(0);

  const submitMessage = (message: string) => {
    replyCountRef.current += 1;
    trackInterviewerReplied({
      campaignSlug: slug,
      context: "closing",
      ref: null,
      turnIndex: replyCountRef.current,
    });
    send(message);
  };

  const post = async (body: Record<string, unknown>) => {
    const response = await fetch("/api/snad/contribution", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic_key: CLOSING_TOPIC_KEY, ...body }),
    });
    if (!response.ok) throw new Error("closing_request_failed");
    return response.json();
  };

  const lastResolveRef = useRef<"submit" | "skip">("submit");
  const resolve = async (operation: "submit" | "skip") => {
    if (busy) return;
    chat.settle();
    lastResolveRef.current = operation;
    setBusy(true);
    setFailed(false);
    const text = draftRef.current.trim();
    try {
      const result = (await post({
        operation,
        ...(operation === "submit" ? { text } : {}),
      })) as { session: SnadSessionPayload; wall: SnadWallEntry[] };
      onSession(result.session);
      if (operation === "submit") {
        setOwnText(text);
        setWall(result.wall);
      } else {
        onDone();
      }
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (
      !session.closing?.resolved ||
      !session.closing.contribution ||
      wall !== null
    )
      return;
    let cancelled = false;
    void fetch("/api/snad/contribution", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operation: "wall", topic_key: CLOSING_TOPIC_KEY }),
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { wall?: SnadWallEntry[] | null } | null) => {
        if (cancelled) return;
        setOwnText(session.closing?.contribution ?? "");
        setWall(data?.wall ?? []);
      })
      .catch(() => {
        // Best-effort: the finale is still reachable either way.
      });
    return () => {
      cancelled = true;
    };
  }, [session.closing?.resolved, session.closing?.contribution, wall]);

  const revealText =
    ownText ||
    (session.closing?.resolved ? session.closing.contribution ?? "" : "");
  const revealShown = wall !== null || revealText.length > 0;

  useEffect(() => {
    onWallShown(revealShown);
    return () => onWallShown(false);
  }, [revealShown, onWallShown]);

  usePausableHold({
    onDone,
    ms: WALL_AUTO_ADVANCE_MS,
    armed: revealShown,
    paused,
    resetKey: "closing-wall",
  });
  const advanceSeenRef = useRef(advanceSignal);
  useEffect(() => {
    const seen = advanceSeenRef.current;
    advanceSeenRef.current = advanceSignal;
    if (advanceSignal > seen && revealShown) onDone();
  }, [advanceSignal, revealShown, onDone]);

  if (revealShown) {
    return (
      <div className="my-auto w-full">
        <SwissPostScreen>
        <div className="flex flex-col gap-1.5">
          <p className="font-display text-pretty text-[clamp(1.2rem,3.6vw,1.7rem)] font-bold leading-[1.25] tracking-[-0.02em] text-[var(--hero-foreground)]">
            {revealText ? t.wallTitle : t.wallHeading}
          </p>
          {revealText && (
            <p className="text-muted-foreground text-[13px] font-semibold uppercase tracking-wider">
              {t.wallHeading}
            </p>
          )}
        </div>
        <SwissQuoteWall ownText={revealText} canton={session.canton} wall={wall} />
        </SwissPostScreen>
      </div>
    );
  }

  if (session.closing?.resolved) {
    return (
      <div className="my-auto w-full">
        <SwissPostScreen>{null}</SwissPostScreen>
      </div>
    );
  }

  const processing = chat.processing;
  const ready = !busy && !chat.isStem && (chat.animating || draft.trim().length > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="flex min-w-0 flex-1 flex-col gap-5"
    >
      <div
        className="mx-auto flex w-full max-w-xl flex-col gap-3 pt-8"
        role="log"
        aria-live="polite"
      >
        {turns.map((turn, i) => (
          <Fragment key={i}>
            <div
              className={cn(
                "whitespace-pre-wrap text-[15px] leading-relaxed",
                turn.role === "assistant"
                  ? "font-display max-w-[38ch] self-start text-[19px] font-semibold leading-snug text-[var(--hero-foreground)]"
                  : "bg-primary/10 text-foreground max-w-[85%] self-end rounded-2xl px-4 py-3",
              )}
            >
              {turn.content}
              {streaming &&
                i === turns.length - 1 &&
                turn.role === "assistant" && (
                  <span className="bg-primary ml-1 inline-block size-2 animate-pulse rounded-full align-middle" />
                )}
            </div>
            {silentEditsAfter.includes(i + 1) && (
              <div className="flex items-center gap-1.5 self-start text-[13px] text-[color-mix(in_srgb,var(--hero-foreground)_70%,transparent)]">
                <Check aria-hidden className="text-primary size-3.5" strokeWidth={3} />
                {dict.assist.editedNote}
              </div>
            )}
          </Fragment>
        ))}
        {streaming && turns[turns.length - 1]?.role !== "assistant" && (
          <div className="self-start py-1">
            <span className="bg-primary inline-block size-2 animate-pulse rounded-full" />
          </div>
        )}
        {error && (
          <p className="text-sm text-[color-mix(in_srgb,var(--hero-foreground)_70%,transparent)]">
            {feedbackCopy.errorMessage}{" "}
            <button
              type="button"
              onClick={retry}
              className="text-primary font-medium underline underline-offset-2"
            >
              {feedbackCopy.retry}
            </button>
          </p>
        )}
        <div ref={threadEndRef} />
      </div>

      <div
        ref={composerRef}
        data-testid="closing-island"
        onFocus={keyboard.onFocus}
        className="sticky bottom-0 mt-auto w-full bg-gradient-to-t from-background via-background to-transparent pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-6"
      >
        <div
          ref={keyboardMaskRef}
          aria-hidden
          className="bg-background pointer-events-none absolute inset-x-0 top-full"
        />
        <div className="mx-auto flex w-full max-w-[34rem] flex-col gap-2">
          <BorderBeam
            size="md"
            colorVariant="swiss"
            theme="light"
            borderRadius={26}
            active={processing && !reduceMotion}
            className="shadow-sm"
          >
            <div className="border-border bg-card relative flex flex-col gap-3 rounded-[26px] border px-5 pb-4 pt-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-primary text-[12px] font-bold uppercase tracking-wider">
                  {t.kicker}
                </p>
                <span
                  aria-hidden
                  className="text-primary/30 font-display -mt-1 text-3xl font-bold leading-none"
                >
                  &rdquo;
                </span>
              </div>
              <textarea
                ref={quoteRef}
                value={draft}
                onChange={(event) => chat.onManualEdit(event.target.value)}
                onBlur={chat.commitDraft}
                maxLength={QUOTE_MAX_LENGTH}
                rows={1}
                placeholder={t.placeholder}
                aria-label={t.kicker}
                data-testid="closing-quote-text"
                className="text-foreground placeholder:text-muted-foreground border-border block w-full resize-none overflow-hidden border-b bg-transparent px-1 pb-2 text-[17px] leading-relaxed outline-none transition-colors focus:border-[color:var(--primary)]"
              />
              {failed && (
                <RetryLine
                  onRetry={() => void resolve(lastResolveRef.current)}
                />
              )}
              <div className="flex items-center justify-between gap-4">
                <p className="text-muted-foreground min-w-0 flex-1 text-[12px] leading-snug">
                  {t.anonymous}
                </p>
                <div className="flex shrink-0 items-center gap-3">
                  <button
                    type="button"
                    data-testid="closing-quote-skip"
                    onClick={() => void resolve("skip")}
                    disabled={busy}
                    className="text-muted-foreground hover:text-foreground rounded-md px-1 py-1 text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {t.skip}
                  </button>
                  <button
                    type="button"
                    data-testid="closing-quote-submit"
                    onClick={() => void resolve("submit")}
                    disabled={!ready}
                    className={cn(
                      "rounded-full px-5 py-2.5 text-sm font-bold transition-all",
                      ready
                        ? "bg-primary hover:opacity-90 text-white"
                        : "bg-muted text-muted-foreground cursor-not-allowed",
                    )}
                  >
                    {t.submit}
                  </button>
                </div>
              </div>
            </div>
          </BorderBeam>
          <SnadComposer
            disabled={streaming}
            onSend={submitMessage}
            placeholder={feedbackCopy.placeholder}
            ariaLabel={feedbackCopy.title}
          />
        </div>
      </div>
    </motion.div>
  );
}
