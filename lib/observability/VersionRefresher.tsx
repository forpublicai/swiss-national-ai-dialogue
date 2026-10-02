"use client";

import { useEffect } from "react";

// The deployment id baked into THIS bundle at build time (see next.config.ts).
// A newer deploy serves a different id from /api/version; on a safe moment we
// reload so a long-lived tab (mobile tab-freeze, bfcache) stops running JS
// that's days or weeks stale. No UI — the reload is the only side-effect, so
// this stays i18n-free and chrome-free.
const BUILD_ID = process.env.NEXT_PUBLIC_DEPLOYMENT_ID;

const MIN_CHECK_GAP_MS = 60_000;
const POLL_MS = 15 * 60_000;
const LONG_ABSENCE_MS = 30 * 60_000;

// A quest conversation is open (URL is ?q=<key>) or the participant is typing
// in the composer / editing a card — either way a reload would interrupt an
// active interview, so it's not a safe moment.
function isInterviewActive(): boolean {
  if (new URLSearchParams(window.location.search).has("q")) return true;
  const el = document.activeElement;
  if (!el) return false;
  return (
    el.tagName === "TEXTAREA" ||
    el.tagName === "INPUT" ||
    (el as HTMLElement).isContentEditable
  );
}

export function VersionRefresher() {
  useEffect(() => {
    if (!BUILD_ID) return;

    let lastCheck = 0;
    let hiddenAt = 0;

    const check = async (longAbsence: boolean) => {
      const now = Date.now();
      if (now - lastCheck < MIN_CHECK_GAP_MS) return;
      lastCheck = now;
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const { id } = (await res.json()) as { id: string | null };
        if (!id || id === BUILD_ID) return;
        // A tab hidden longer than the abandonment window is a dead session —
        // safe to reload even mid-conversation. A briefly-hidden tab that's
        // still mid-interview is left alone; the next safe check catches it.
        if (longAbsence || !isInterviewActive()) window.location.reload();
      } catch {
        // Offline / parse error / server hiccup — never surfaced, retried later.
      }
    };

    const wasLongAbsence = () =>
      hiddenAt > 0 && Date.now() - hiddenAt > LONG_ABSENCE_MS;

    const onVisibility = () => {
      if (document.visibilityState !== "visible") {
        hiddenAt = Date.now();
        return;
      }
      void check(wasLongAbsence());
    };

    const onPageShow = (event: PageTransitionEvent) => {
      // Only bfcache restores run stale JS; a fresh navigation already has the
      // latest bundle.
      if (event.persisted) void check(wasLongAbsence());
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", onPageShow);
    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible") void check(false);
    }, POLL_MS);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", onPageShow);
      window.clearInterval(poll);
    };
  }, []);

  return null;
}
