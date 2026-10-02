"use client";

import { cn } from "@/components/ui";

import { useSwissDict } from "../../i18n";

export const WALL_AUTO_ADVANCE_MS = 9000;

export function RetryLine({
  onRetry,
  className,
}: {
  onRetry: () => void;
  className?: string;
}) {
  const dict = useSwissDict();
  return (
    <p className={cn("text-muted-foreground text-sm", className)}>
      {dict.errorRetry.message}{" "}
      <button
        type="button"
        onClick={onRetry}
        className="text-primary font-semibold underline underline-offset-2"
      >
        {dict.errorRetry.retry}
      </button>
    </p>
  );
}
