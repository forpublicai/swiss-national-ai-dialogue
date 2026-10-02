"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";

import { Button, Textarea, cn } from "@/components/ui";

export function SnadComposer({
  disabled,
  onSend,
  placeholder,
  ariaLabel,
  className,
}: {
  disabled: boolean;
  onSend: (message: string) => void;
  placeholder: string;
  ariaLabel: string;
  className?: string;
}) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (disabled || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    ref.current?.focus({ preventScroll: true });
  }, [disabled]);

  useEffect(() => {
    const textarea = ref.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [value]);

  useEffect(() => {
    if (disabled) return;
    const focusComposer = (event: KeyboardEvent) => {
      const textarea = ref.current;
      if (!textarea || document.activeElement === textarea) return;
      const active = document.activeElement;
      if (
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        active instanceof HTMLSelectElement ||
        (active instanceof HTMLElement && active.isContentEditable)
      ) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key.length !== 1) return;
      textarea.focus({ preventScroll: true });
    };
    document.addEventListener("keydown", focusComposer);
    return () => document.removeEventListener("keydown", focusComposer);
  }, [disabled]);

  const submit = () => {
    const message = value.trim();
    if (!message || disabled) return;
    onSend(message);
    setValue("");
  };

  return (
    <div
      className={cn(
        "border-border bg-card/90 focus-within:border-ring/60 focus-within:ring-ring/40 flex items-end gap-1.5 rounded-lg border px-2 py-1.5 shadow-sm backdrop-blur-md transition focus-within:ring-2",
        className,
      )}
    >
      <Textarea
        ref={ref}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            submit();
          }
        }}
        disabled={disabled}
        rows={1}
        placeholder={disabled ? "" : placeholder}
        aria-label={ariaLabel}
        className="placeholder:text-muted-foreground/70 min-h-[36px] flex-1 resize-none appearance-none overflow-hidden !rounded-none !border-0 !bg-transparent px-3 py-1.5 text-[16px] leading-relaxed !shadow-none outline-none focus:outline-none focus-visible:outline-none focus-visible:!shadow-none focus-visible:ring-0"
      />
      <Button
        type="button"
        size="sm"
        onClick={submit}
        disabled={disabled || !value.trim()}
        aria-label="Send message"
        className="min-h-11 min-w-11 rounded-full sm:min-h-0 sm:min-w-0 sm:px-3"
      >
        <Send aria-hidden />
        <span className="sr-only sm:not-sr-only">Send</span>
      </Button>
    </div>
  );
}
