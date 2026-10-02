"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Globe } from "lucide-react";

import {
  setLocale,
  SWISS_LOCALES,
  useSwissLocale,
} from "../../i18n";

export function SwissLanguageToggle({
  className,
  variant = "responsive",
}: {
  className?: string;
  variant?: "responsive" | "inline";
}) {
  const locale = useSwissLocale();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const active = SWISS_LOCALES.find((l) => l.code === locale);
  const inlineOnly = variant === "inline";

  // Close on an outside click / Escape so the popover doesn't get stuck open.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${className ?? ""}`}>
      <div
        role="group"
        aria-label="Change language"
        className={
          inlineOnly
            ? "flex items-center gap-0.5"
            : "hidden items-center gap-0.5 sm:flex"
        }
      >
        {SWISS_LOCALES.map((l) => {
          const isActive = l.code === locale;
          return (
            <button
              key={l.code}
              type="button"
              lang={l.code}
              aria-label={l.label}
              aria-current={isActive ? "true" : undefined}
              onClick={() => setLocale(l.code)}
              className={`rounded-sm px-1.5 py-1 text-sm font-semibold uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--primary)_50%,transparent)] ${
                isActive
                  ? "text-foreground decoration-primary underline decoration-2 underline-offset-4"
                  : "text-foreground/50 hover:text-foreground"
              }`}
            >
              {l.code}
            </button>
          );
        })}
      </div>
      {!inlineOnly && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Change language"
          className="border-border text-foreground/80 hover:bg-muted flex h-9 items-center gap-1.5 rounded-full border bg-transparent px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--primary)_50%,transparent)] sm:hidden"
        >
          <Globe className="size-4" strokeWidth={2} aria-hidden="true" />
          <span className="uppercase">{active?.code ?? "en"}</span>
        </button>
      )}
      {!inlineOnly && open && (
        <div
          role="menu"
          className="animate-in fade-in slide-in-from-top-1 border-border bg-card absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-xl border py-1 shadow-lg duration-150 sm:hidden"
        >
          {SWISS_LOCALES.map((l) => {
            const isActive = l.code === locale;
            return (
              <button
                key={l.code}
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                onClick={() => {
                  setLocale(l.code);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors ${
                  isActive
                    ? "bg-primary/10 text-foreground"
                    : "text-foreground/80 hover:bg-primary/5"
                }`}
              >
                <span className="font-medium">{l.label}</span>
                {isActive && (
                  <Check className="text-primary size-4" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
