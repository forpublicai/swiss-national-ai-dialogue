import type { ReactNode } from "react";
import localFont from "next/font/local";

import { SnadCookieConsentMount } from "./ui/landing/SnadCookieConsentMount";
import styles from "./theme.module.css";

const snadSans = localFont({
  src: [
    {
      path: "../../node_modules/@fontsource/public-sans/files/public-sans-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../node_modules/@fontsource/public-sans/files/public-sans-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../node_modules/@fontsource/public-sans/files/public-sans-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../node_modules/@fontsource/public-sans/files/public-sans-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-snad-sans",
  display: "swap",
});

const snadDisplay = localFont({
  src: [
    {
      path: "./fonts/nbinternationalprocg-regular-webfont.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/nbinternationalprocg-medium-webfont.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/nbinternationalprocg-bold-webfont.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-snad-display",
  display: "swap",
});

export function SnadThemeScope({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      data-theme-root="swiss-national-ai-dialogue"
      className={`${snadSans.variable} ${snadDisplay.variable} ${styles.root} ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

export function SnadThemedRoot({ children }: { children: ReactNode }) {
  return (
    <div
      data-theme-root="swiss-national-ai-dialogue"
      data-cookie-consent="required"
      className={`${snadSans.variable} ${snadDisplay.variable} ${styles.root}`}
    >
      <SnadCookieConsentMount />
      <style>{
        'html:has([data-theme-root="swiss-national-ai-dialogue"]),html:has([data-theme-root="swiss-national-ai-dialogue"]) body{background-color:#f6f6f6}'
      }</style>
      {children}
    </div>
  );
}
