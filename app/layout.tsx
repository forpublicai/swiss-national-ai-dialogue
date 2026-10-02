import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { headers } from "next/headers";

import { AmplitudeProvider } from "@/lib/analytics/AmplitudeProvider";
import { getServerEnv } from "@/lib/env";
import { VersionRefresher } from "@/lib/observability/VersionRefresher";
import "./globals.css";

// Favicon + apple-touch-icon are picked up automatically from `app/favicon.ico`
// and `app/apple-icon.png` via Next.js's file-based metadata convention.
export const metadata: Metadata = {
  title: "Swiss National AI Dialogue",
  description: "Share your views on AI in Switzerland in a short dialogue.",
};

// We deliberately do NOT set `maximumScale: 1`. iOS Safari auto-zooms when a
// focused form control's computed font-size is < 16px, and pinning the scale
// was the old way to suppress that — but it also disables pinch-zoom, which
// fails an axe-core accessibility check. Instead we keep zoom enabled and
// enforce a 16px input floor on touch viewports in globals.css, so focusing an
// input never triggers the zoom in the first place.
//
// `interactiveWidget: "resizes-content"` tells the browser to shrink the
// layout viewport when the on-screen keyboard opens. Without it, mobile
// Safari leaves the layout viewport at full height and overlays the
// keyboard on top — pushing fixed/sticky-bottom elements (our composer)
// above the visible area and shoving the rest of the page upward. With
// it, `100vh` and `sticky bottom-0` resolve against the keyboard-trimmed
// viewport, so the composer lands flush above the keyboard and the chat
// thread doesn't jump.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
};

// Global font defaults. The dialogue's own layout wraps children in its
// ThemedRoot, which sets its brand fonts and tokens.
const commissioner = localFont({
  src: [
    {
      path: "../node_modules/@fontsource/commissioner/files/commissioner-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../node_modules/@fontsource/commissioner/files/commissioner-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../node_modules/@fontsource/commissioner/files/commissioner-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../node_modules/@fontsource/commissioner/files/commissioner-latin-800-normal.woff2",
      weight: "800",
      style: "normal",
    },
  ],
  variable: "--font-commissioner",
  display: "swap",
});

const merriweather = localFont({
  src: [
    {
      path: "../node_modules/@fontsource/merriweather/files/merriweather-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../node_modules/@fontsource/merriweather/files/merriweather-latin-400-italic.woff2",
      weight: "400",
      style: "italic",
    },
    {
      path: "../node_modules/@fontsource/merriweather/files/merriweather-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../node_modules/@fontsource/merriweather/files/merriweather-latin-700-italic.woff2",
      weight: "700",
      style: "italic",
    },
  ],
  variable: "--font-merriweather",
  display: "swap",
});

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  // Runtime env injection. NEXT_PUBLIC_* vars in Next.js are
  // string-replaced into the CLIENT BUNDLE at `next build` time, so any
  // value provided only at pod-runtime (e.g. container env vars) never reaches the browser. The server
  // render below IS at runtime, so `process.env.*` returns the live pod
  // values — we serialize them into `window.__ENV__` for the client. The
  // client code reads from there instead of `process.env.*` (see `lib/env.ts`).
  const runtimeEnv = getServerEnv();

  return (
    <html
      lang="en"
      data-theme="ideas-for-change"
      // Force light everywhere: the `light` class disables every
      // `prefers-color-scheme: dark` token block in @deliberations/ui (they all
      // gate on `:not(.light)`), and `color-scheme: light` keeps native UI
      // (scrollbars, form controls) light too. This product has no dark mode.
      className={`light ${commissioner.variable} ${merriweather.variable}`}
      style={{ colorScheme: "light" }}
    >
      <head>
        {/*
          Browsers strip the `nonce` attribute from script tags after the CSP
          check passes, which causes a hydration mismatch on every render
          (server: nonce="abc"; client: nonce=""). suppressHydrationWarning is
          React's documented escape hatch for exactly this case.
        */}
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `window.__ENV__=${JSON.stringify(runtimeEnv)}`,
          }}
        />
      </head>
      {/* min-h-svh, not -screen: on iOS `100vh` is the toolbars-MINIMIZED
          viewport, giving every page ~40px of scroll slack that lets
          otherwise-fitting pages scroll content under sticky chrome. */}
      <body className="bg-background text-foreground min-h-svh antialiased">
        <AmplitudeProvider />
        <VersionRefresher />
        {children}
      </body>
    </html>
  );
}
