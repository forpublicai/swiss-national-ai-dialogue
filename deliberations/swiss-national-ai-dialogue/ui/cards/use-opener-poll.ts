"use client";

import { useEffect, useState } from "react";

import type { OpenerResponseKind } from "../../types";

const pollCache = new Map<string, unknown>();
const settledKeys = new Set<string>();
const inFlight = new Map<string, Promise<void>>();

function loadPoll(
  cacheKey: string,
  kind: OpenerResponseKind,
  key: { openerId?: string; question: string },
): Promise<void> {
  if (pollCache.has(cacheKey) || settledKeys.has(cacheKey)) {
    return Promise.resolve();
  }
  const existing = inFlight.get(cacheKey);
  if (existing) return existing;
  const params = key.openerId
    ? `opener_id=${encodeURIComponent(key.openerId)}`
    : `question=${encodeURIComponent(key.question)}`;
  const request = fetch(`/api/snad/polls?${params}&kind=${kind}`)
    .then((r) => (r.ok ? r.json() : null))
    .then((data: { poll?: unknown } | null) => {
      if (data?.poll) pollCache.set(cacheKey, data.poll);
    })
    .catch(() => {
      // Best-effort: no reveal is better than a blocked card — but the
      // attempt still counts as settled so a gated auto-advance isn't stuck.
    })
    .finally(() => {
      settledKeys.add(cacheKey);
      inFlight.delete(cacheKey);
    });
  inFlight.set(cacheKey, request);
  return request;
}

export function useOpenerPoll<T>(
  kind: OpenerResponseKind,
  key: { openerId?: string; question: string },
  enabled: boolean,
): T | null {
  const { openerId, question } = key;
  const cacheKey = `${kind}:${openerId ?? question}`;
  const [poll, setPoll] = useState<T | null>(
    () => (pollCache.get(cacheKey) as T | undefined) ?? null,
  );
  useEffect(() => {
    if (!enabled || poll !== null) return;
    let cancelled = false;
    void loadPoll(cacheKey, kind, { openerId, question }).then(() => {
      if (cancelled) return;
      const cached = pollCache.get(cacheKey) as T | undefined;
      if (cached !== undefined) setPoll(cached);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, poll, cacheKey, question, openerId, kind]);
  return poll;
}

export function useOpenerPollSettled(
  kind: OpenerResponseKind | undefined,
  key: { openerId?: string; question: string } | undefined,
  enabled: boolean,
): boolean {
  const cacheKey = kind && key ? `${kind}:${key.openerId ?? key.question}` : null;
  const [, forceTick] = useState(0);
  const settled = cacheKey === null || settledKeys.has(cacheKey);
  useEffect(() => {
    if (!enabled || !cacheKey) return;
    if (settledKeys.has(cacheKey)) {
      forceTick((tick) => tick + 1);
      return;
    }
    const interval = window.setInterval(() => {
      if (settledKeys.has(cacheKey)) {
        window.clearInterval(interval);
        forceTick((tick) => tick + 1);
      }
    }, 100);
    return () => window.clearInterval(interval);
  }, [enabled, cacheKey]);
  return settled;
}
