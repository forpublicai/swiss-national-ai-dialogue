"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

export function SwissPostScreen({ children }: { children: ReactNode }) {
  return (
    <motion.div
      className="flex w-full flex-col"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="mx-auto flex w-full max-w-xl flex-col gap-7 py-8">
        {children}
      </div>
    </motion.div>
  );
}

export function SwissPostEyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[color-mix(in_srgb,var(--hero-foreground)_60%,transparent)]">
      {children}
    </p>
  );
}
