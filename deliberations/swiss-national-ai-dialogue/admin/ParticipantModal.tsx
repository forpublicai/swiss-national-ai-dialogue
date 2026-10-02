"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

export function ParticipantModal({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") router.back();
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [router]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:p-8"
      onClick={() => router.back()}
    >
      <div
        className="bg-background border-border relative my-4 w-full max-w-[1000px] rounded-lg border shadow-xl sm:my-8"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={() => router.back()}
          className="text-muted-foreground hover:bg-muted hover:text-foreground absolute right-3 top-3 z-10 rounded-md p-1.5"
        >
          <X className="size-5" />
        </button>
        <div className="p-6 sm:p-8">{children}</div>
      </div>
    </div>
  );
}
