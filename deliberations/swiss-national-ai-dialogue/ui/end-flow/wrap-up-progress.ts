"use client";

export const WRAP_UP_EMAIL_MARKER = "@email";
export const WRAP_UP_SHAPE_MARKER = "@shape";
export const WRAP_UP_CLOSING_MARKER = "@closing";
export const WRAP_UP_FINALE_MARKER = "@finale";

export function reportWrapUpProgress(marker: string): void {
  void fetch("/api/snad/session", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ operation: "wrapup_progress", marker }),
  }).catch(() => {});
}
