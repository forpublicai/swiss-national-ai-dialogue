"use client";

import { useEffect, useState } from "react";

import {
  hasConsentDecision,
  onConsentReopen,
  setConsentPrefs,
  type ConsentPrefs,
} from "@/lib/analytics/cookies";

import { SwissCookieBanner } from "./SwissCookieBanner";

export function SnadCookieConsentMount() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(!hasConsentDecision());
    return onConsentReopen(() => setOpen(true));
  }, []);

  if (!open) return null;
  const decide = (prefs: ConsentPrefs) => {
    setConsentPrefs(prefs);
    setOpen(false);
  };
  return <SwissCookieBanner onDecision={decide} />;
}
