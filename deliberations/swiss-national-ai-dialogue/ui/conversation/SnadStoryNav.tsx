"use client";

import { type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/components/ui";

import { useSwissDict } from "../../i18n";

function ArrowButton({
  direction,
  label,
  disabled,
  onClick,
  className,
}: {
  direction: "back" | "forward";
  label: string;
  disabled: boolean;
  onClick: () => void;
  className: string;
}) {
  const Chevron = direction === "back" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      aria-label={label}
      data-testid={`story-${direction}`}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "text-foreground/55 flex size-10 items-center justify-center transition-colors enabled:cursor-pointer enabled:hover:text-foreground",
        disabled && "invisible",
        className,
      )}
    >
      <Chevron aria-hidden className="size-6" />
    </button>
  );
}

export function SnadStoryNav({
  enabled,
  canBack,
  canForward,
  onBack,
  onForward,
  onResume,
  className,
  children,
}: {
  enabled: boolean;
  canBack: boolean;
  canForward: boolean;
  onBack: () => void;
  onForward: () => void;
  onResume: (() => void) | null;
  className?: string;
  children: ReactNode;
}) {
  const dict = useSwissDict();

  return (
    <div className={className}>
      {enabled && (
        <div className="flex items-center justify-between md:contents">
          <ArrowButton
            direction="back"
            label={dict.pager.previous}
            disabled={!canBack}
            onClick={onBack}
            className="md:fixed md:left-[max(0.75rem,calc(50%-21rem))] md:top-1/2 md:z-20 md:-translate-y-1/2"
          />
          <ArrowButton
            direction="forward"
            label={dict.pager.next}
            disabled={!canForward}
            onClick={onForward}
            className="md:fixed md:right-[max(0.75rem,calc(50%-21rem))] md:top-1/2 md:z-20 md:-translate-y-1/2"
          />
        </div>
      )}
      {children}
      {enabled && onResume && (
        <button
          type="button"
          data-testid="story-resume"
          onClick={onResume}
          className="animate-in fade-in slide-in-from-bottom-2 bg-foreground text-background fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-1/2 z-40 -translate-x-1/2 cursor-pointer rounded-full px-4 py-2 text-[13px] font-semibold shadow-lg duration-200 hover:opacity-90"
        >
          {dict.pager.resume}
        </button>
      )}
    </div>
  );
}
