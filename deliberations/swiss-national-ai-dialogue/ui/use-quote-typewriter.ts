"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const UNWRITE_TICK_MS = 12;
const WRITE_TICK_MS = 16;

export function useQuoteTypewriter(apply: (text: string) => void) {
  const timerRef = useRef(0);
  const targetRef = useRef<string | null>(null);
  const [animating, setAnimating] = useState(false);

  const stop = useCallback(() => {
    window.clearTimeout(timerRef.current);
    targetRef.current = null;
    setAnimating(false);
  }, []);
  useEffect(() => stop, [stop]);

  const settle = useCallback(() => {
    const target = targetRef.current;
    stop();
    if (target !== null) apply(target);
  }, [apply, stop]);

  const run = useCallback(
    (from: string, to: string) => {
      window.clearTimeout(timerRef.current);
      if (from === to) return;
      targetRef.current = to;
      setAnimating(true);
      let prefix = 0;
      while (
        prefix < from.length &&
        prefix < to.length &&
        from[prefix] === to[prefix]
      ) {
        prefix += 1;
      }
      // Chunk sizes scale with the diff so a full rewrite stays ~2s.
      const unwriteChunk = Math.max(1, Math.ceil((from.length - prefix) / 40));
      const writeChunk = Math.max(1, Math.ceil((to.length - prefix) / 110));
      let current = from;
      let phase: "unwrite" | "write" =
        current.length > prefix ? "unwrite" : "write";
      const tick = () => {
        if (phase === "unwrite") {
          current = current.slice(
            0,
            Math.max(prefix, current.length - unwriteChunk),
          );
          apply(current);
          if (current.length <= prefix) phase = "write";
          timerRef.current = window.setTimeout(tick, UNWRITE_TICK_MS);
        } else if (current.length < to.length) {
          current = to.slice(0, current.length + writeChunk);
          apply(current);
          timerRef.current = window.setTimeout(tick, WRITE_TICK_MS);
        } else {
          targetRef.current = null;
          setAnimating(false);
        }
      };
      tick();
    },
    [apply],
  );

  return { animating, run, settle, stop, targetRef };
}
