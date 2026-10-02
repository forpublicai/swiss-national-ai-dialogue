"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { SnadChatTurn, SnadSessionPayload } from "../../types";
import { useQuoteTypewriter } from "../use-quote-typewriter";

export type DraftChat = {
  turns: SnadChatTurn[];
  // The artifact text (echo of the controlled value the card owns).
  text: string;
  processing: boolean;
  streaming: boolean;
  animating: boolean;
  onManualEdit: (value: string) => void;
  // Jump the typewriter to its target immediately (before submitting the draft).
  settle: () => void;
  silentEditsAfter: number[];
  status: "idle" | "loading" | "error";
  send: (content: string) => void;
  retry: () => void;
  // Blur-sync the current draft (best-effort; no model turn).
  commitDraft: () => void;
  primeStem: () => void;
  isStem: boolean;
};

type OtherMode = {
  mode: "other";
  openerId: string | null;
  onResume?: () => void;
};

type ClosingMode = {
  mode: "closing";
  onSession: (session: SnadSessionPayload) => void;
};

type StreamEvent =
  | { type: "text_delta"; delta: string }
  | { type: "draft_update"; draft: string }
  | { type: "done"; session?: SnadSessionPayload }
  | { type: "error"; message: string };

export function useDraftChat(
  input: {
    text: string;
    onText: (text: string) => void;
    // The client-copy opening shown as the first assistant turn.
    kickoffText: string;
    stemText?: string;
    // Resume: the stored thread to seed from (closing = session.feedbackChat).
    initialTurns?: SnadChatTurn[];
  } & (OtherMode | ClosingMode),
): DraftChat {
  const { text, onText, kickoffText } = input;
  const stemTextRef = useRef(input.stemText);
  stemTextRef.current = input.stemText;

  const seedTurns = (): SnadChatTurn[] =>
    input.mode === "closing" && (input.initialTurns?.length ?? 0) > 0
      ? input.initialTurns!
      : [{ role: "assistant", content: kickoffText }];

  const [turns, setTurns] = useState<SnadChatTurn[]>(seedTurns);
  const [silentEditsAfter, setSilentEditsAfter] = useState<number[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const failedRef = useRef<{ message?: string; kickoff?: boolean } | null>(null);
  const turnsRef = useRef(turns);
  turnsRef.current = turns;

  const textRef = useRef(text);
  textRef.current = text;
  const manualEditRef = useRef(false);
  const applyText = useCallback(
    (next: string) => {
      textRef.current = next;
      onText(next);
    },
    [onText],
  );
  const {
    animating,
    run: runTypewriter,
    settle: settleTypewriter,
    stop: stopTypewriter,
    targetRef,
  } = useQuoteTypewriter(applyText);

  const isUntouchedStem = (): boolean => {
    const stem = stemTextRef.current?.trim();
    if (!stem) return false;
    if (animating) return targetRef.current?.trim() === stem;
    return !manualEditRef.current && textRef.current.trim() === stem;
  };
  const primeStem = useCallback(() => {
    const stem = stemTextRef.current;
    if (!stem || manualEditRef.current || targetRef.current !== null) return;
    const current = textRef.current;
    if (current === stem || (current !== "" && !stem.startsWith(current))) return;
    runTypewriter(current, stem);
  }, [runTypewriter, targetRef]);

  const request = async (payload: { message?: string; kickoff?: boolean }) => {
    if (status === "loading") return;
    const message = payload.message?.trim();
    const base = turnsRef.current;
    const optimistic = message
      ? [...base, { role: "user" as const, content: message }]
      : base;
    setTurns(optimistic);
    setStatus("loading");
    failedRef.current = payload;

    let assistant = "";
    let gotDraft = false;
    const outgoingDraft = isUntouchedStem() ? "" : textRef.current;
    try {
      const body =
        input.mode === "other"
          ? {
              mode: "other" as const,
              opener_id: input.openerId,
              message,
              draft: outgoingDraft,
            }
          : {
              mode: "closing" as const,
              ...payload,
              ...(message ? { draft: outgoingDraft } : {}),
            };
      const response = await fetch("/api/snad/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok || !response.body) throw new Error("chat_failed");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let boundary = buffer.indexOf("\n\n");
        while (boundary !== -1) {
          const frame = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          const dataLine = frame
            .split("\n")
            .find((line) => line.startsWith("data:"));
          const raw = dataLine?.slice(5).trim();
          if (raw) {
            const event = JSON.parse(raw) as StreamEvent;
            if (event.type === "text_delta") {
              assistant += event.delta;
              setTurns([...optimistic, { role: "assistant", content: assistant }]);
            } else if (event.type === "draft_update") {
              gotDraft = true;
              if (!manualEditRef.current) {
                runTypewriter(textRef.current, event.draft);
              }
            } else if (event.type === "done") {
              failedRef.current = null;
              if (input.mode === "closing" && event.session) {
                input.onSession(event.session);
              }
            } else {
              throw new Error(event.message);
            }
          }
          boundary = buffer.indexOf("\n\n");
        }
      }
      if (!assistant.trim() && gotDraft) {
        setSilentEditsAfter((prev) => [...prev, optimistic.length]);
      }
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  };

  const send = (content: string) => {
    settleTypewriter();
    manualEditRef.current = false;
    void request({ message: content });
  };

  const retry = () => {
    const failed = failedRef.current;
    if (!failed) return;
    // Drop the optimistic user turn a failed send left dangling before retrying.
    setTurns((current) =>
      failed.message && current.at(-1)?.role === "user"
        ? current.slice(0, -1)
        : current,
    );
    void request(failed);
  };

  const onManualEdit = (value: string) => {
    manualEditRef.current = true;
    stopTypewriter();
    applyText(value);
  };

  const commitDraft = useCallback(() => {
    if (isUntouchedStem()) return;
    const draft = textRef.current;
    if (input.mode === "other") {
      if (!input.openerId) return;
      void fetch("/api/snad/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "other",
          opener_id: input.openerId,
          operation: "draft",
          draft,
        }),
      }).catch(() => {});
      return;
    }
    void fetch("/api/snad/contribution", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operation: "draft", topic_key: "closing", draft }),
    }).catch(() => {});
    // `input` is a fresh object each render; the mode + key are stable enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input.mode, input.mode === "other" ? input.openerId : null]);

  const kickoffRef = useRef<string | null>(null);
  useEffect(() => {
    if (input.mode !== "closing") return;
    const key = input.mode;
    if (turnsRef.current.length > 1 || kickoffRef.current === key) return;
    if ((input.initialTurns?.length ?? 0) > 0) return;
    kickoffRef.current = key;
    void request({ kickoff: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input.mode]);

  // Other: resume the stored thread + in-progress answer on mount.
  const openerId = input.mode === "other" ? input.openerId : null;
  const onResume = input.mode === "other" ? input.onResume : undefined;
  useEffect(() => {
    if (input.mode !== "other" || !openerId) return;
    let cancelled = false;
    void fetch("/api/snad/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "other", opener_id: openerId, operation: "load" }),
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { turns: SnadChatTurn[]; draft: string | null } | null) => {
        if (cancelled || !data) return;
        if (data.turns.length === 0 && !data.draft) return;
        setTurns([{ role: "assistant", content: kickoffText }, ...data.turns]);
        if (data.draft && !manualEditRef.current) {
          applyText(data.draft);
          onResume?.();
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openerId]);

  return {
    turns,
    text,
    processing: status === "loading" || animating,
    streaming: status === "loading",
    animating,
    onManualEdit,
    settle: settleTypewriter,
    silentEditsAfter,
    status,
    send,
    retry,
    commitDraft,
    primeStem,
    isStem: isUntouchedStem(),
  };
}
