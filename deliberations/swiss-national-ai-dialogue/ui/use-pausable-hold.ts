"use client";

import { useEffect, useRef } from "react";

export function usePausableHold({
  onDone,
  ms,
  armed,
  paused,
  resetKey,
}: {
  onDone: () => void;
  ms: number;
  armed: boolean;
  paused: boolean;
  resetKey: unknown;
}) {
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const remainingRef = useRef(ms);
  const keyRef = useRef(resetKey);
  if (keyRef.current !== resetKey) {
    keyRef.current = resetKey;
    remainingRef.current = ms;
  }
  useEffect(() => {
    if (!armed || paused) return;
    const startedAt = Date.now();
    const timer = window.setTimeout(
      () => onDoneRef.current(),
      remainingRef.current,
    );
    return () => {
      window.clearTimeout(timer);
      if (keyRef.current !== resetKey) return;
      remainingRef.current = Math.max(
        0,
        remainingRef.current - (Date.now() - startedAt),
      );
    };
  }, [armed, paused, resetKey]);
}
