"use client";

import { ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { useState } from "react";

export function SwissDevPanel() {
  const [open, setOpen] = useState(false);

  if (process.env.NODE_ENV === "production") return null;

  const newConversation = () => {
    const go = () => window.location.assign(window.location.href);
    fetch("/api/snad/session", { method: "DELETE" }).then(go, go);
  };

  return (
    <div className="fixed left-1/2 top-0 z-[90] flex -translate-x-1/2 flex-col items-center">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Developer tools"
        title="Developer tools"
        className="border-border bg-card/85 text-muted-foreground hover:text-foreground flex h-5 w-14 items-center justify-center rounded-b-md border border-t-0 shadow-sm backdrop-blur transition-colors"
      >
        {open ? (
          <ChevronUp className="size-3.5" aria-hidden="true" />
        ) : (
          <ChevronDown className="size-3.5" aria-hidden="true" />
        )}
      </button>
      {open && (
        <div className="border-border bg-card animate-in fade-in slide-in-from-top-1 mt-1 flex items-center gap-2 rounded-xl border p-1.5 shadow-lg duration-150">
          <button
            type="button"
            onClick={newConversation}
            className="border-border text-muted-foreground hover:text-foreground inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors"
          >
            <RotateCcw className="size-3" aria-hidden="true" />
            New conversation
          </button>
        </div>
      )}
    </div>
  );
}
