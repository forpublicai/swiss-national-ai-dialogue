import type { CSSProperties, ReactNode } from "react";

// Mirrors AdminLayout (app/admin/layout.tsx): the partner surface is the
// same internal, scientific tool re-scoped to the neutral zinc "default"
// theme, with the same two token overrides (readable link blue + darker
// muted text on the white background). See the admin layout for the full
// rationale.
const PARTNER_TOKENS = {
  "--secondary": "#2563eb",
  "--secondary-foreground": "#ffffff",
  "--muted-foreground": "oklch(0.44 0.02 265)",
} as CSSProperties;

export default function PartnerLayout({ children }: { children: ReactNode }) {
  return (
    <div
      data-theme="default"
      style={PARTNER_TOKENS}
      className="bg-background text-foreground min-h-screen"
    >
      {children}
    </div>
  );
}
