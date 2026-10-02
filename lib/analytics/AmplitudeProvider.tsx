"use client";

import { useEffect } from "react";

import { initializeAmplitude } from "@/lib/analytics/amplitude";
import {
  canWeTrackAnalytics,
  hasConsentDecision,
  onConsentChange,
} from "@/lib/analytics/cookies";

// One-shot initialiser mounted in app/layout.tsx so the SDK boots once per
// session before any tracked component fires its first event. Renders null —
// the only side effect is `amplitude.init`. Skipping the init when the public
// key is absent (local dev) is handled inside initializeAmplitude.
//
// Consent gating: a surface that requires prior consent marks its root
// wrapper with `data-cookie-consent="required"` (present in the SSR HTML, so
// this effect reads it with no race — e.g. the Swiss dialogue's SnadThemedRoot).
// On those surfaces Amplitude + session replay stay OFF until the participant
// grants analytics consent via the banner; on every other surface init runs
// immediately as before (the opt-out `canWeTrackAnalytics` gate still guards
// each event). initializeAmplitude is idempotent, so re-firing on a later
// consent change is safe.
export function AmplitudeProvider() {
  useEffect(() => {
    const consentRequired =
      typeof document !== "undefined" &&
      document.querySelector('[data-cookie-consent="required"]') !== null;

    if (!consentRequired) {
      initializeAmplitude();
      return;
    }

    const initIfAllowed = () => {
      if (hasConsentDecision() && canWeTrackAnalytics()) initializeAmplitude();
    };
    initIfAllowed();
    return onConsentChange(initIfAllowed);
  }, []);
  return null;
}
