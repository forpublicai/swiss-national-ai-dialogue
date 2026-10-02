import type { CSSProperties, ReactNode } from "react";

// The root <html> uses the "ideas-for-change" token set, whose warm body
// gradient suits participant pages but not the admin. Re-scope the admin to
// the neutral "default" theme over an opaque background.
//
// Two token overrides on top of "default": the default theme's --secondary is
// a near-white zinc (it's a button-background role), but the admin uses
// `text-secondary` as its link colour everywhere — near-white links are
// invisible on white. Restore a readable blue, and darken --muted-foreground
// a touch so secondary text clears contrast on the white background. Because
// theme.css maps the colour utilities with `@theme inline`, overriding the
// raw vars here cascades to every `text-secondary` / `text-muted-foreground`
// utility in the admin.
const ADMIN_TOKENS = {
  "--secondary": "#2563eb",
  "--secondary-foreground": "#ffffff",
  "--muted-foreground": "oklch(0.44 0.02 265)",
} as CSSProperties;

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div
      data-theme="default"
      style={ADMIN_TOKENS}
      className="bg-background text-foreground min-h-screen"
    >
      {children}
    </div>
  );
}
