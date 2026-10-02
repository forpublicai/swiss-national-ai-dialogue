// Cookie-consent state. Two consumption shapes:
//
//   - The `canWeTrack*` gates (read on every tracked event) — absent decision
//     defaults to ALLOW, the opt-out model surfaces without a banner rely on.
//   - The consent-required plumbing (`hasConsentDecision`, `getConsentPrefs`,
//     `setConsentPrefs`, `onConsentChange`) — used by surfaces that require
//     prior consent (e.g. the Swiss dialogue, whose SnadThemedRoot marks
//     `data-cookie-consent="required"`). There an ABSENT decision means "not decided
//     yet" (analytics stays off until the participant chooses), which is why
//     the gate default and `hasConsentDecision` are deliberately separate: the
//     gate answers "may I send this event", the decision check answers "has the
//     participant chosen at all".
//
// A single localStorage key holds both categories so the mechanism already
// covers marketing (Meta Pixel) even where the UI only surfaces analytics.

const STORAGE_KEY = "cookie-preferences";
const CONSENT_CHANGE_EVENT = "cookie-consent-change";
const CONSENT_REOPEN_EVENT = "cookie-consent-reopen";

export type ConsentCategory = "analytics" | "marketing";
export type ConsentPrefs = { analytics: boolean; marketing: boolean };

const readPrefs = (): Partial<ConsentPrefs> | null => {
  if (typeof window === "undefined") return null;
  // Safari with "Block All Cookies" throws SecurityError on the localStorage
  // property access itself, not just on the read — so the access is inside the
  // try, and an unreadable store reads as "no decision".
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as Partial<ConsentPrefs>;
  } catch {
    return null;
  }
};

const areCookiesEnabled = (category: ConsentCategory): boolean => {
  const prefs = readPrefs();
  if (!prefs) return true;
  return prefs[category] !== false;
};

export const canWeTrackMarketing = () => areCookiesEnabled("marketing");

export const canWeTrackAnalytics = () => areCookiesEnabled("analytics");

// True once the participant has made an explicit cookie choice (accept OR
// reject). Consent-required surfaces gate analytics init on this — an absent
// decision means "not yet chosen", not "allowed".
export const hasConsentDecision = (): boolean => readPrefs() !== null;

export const getConsentPrefs = (): ConsentPrefs | null => {
  const prefs = readPrefs();
  if (!prefs) return null;
  return {
    analytics: prefs.analytics !== false,
    marketing: prefs.marketing !== false,
  };
};

export const setConsentPrefs = (prefs: ConsentPrefs): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Nowhere to persist the choice, so it can't be remembered across loads.
    // Still notify: the banner dismisses either way, and consent-gated init
    // re-reads (and correctly stays off, since the decision is unreadable).
  }
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGE_EVENT));
};

// Subscribe to consent decisions — same tab via the CustomEvent, other tabs via
// the native storage event. Returns an unsubscribe.
export const onConsentChange = (cb: () => void): (() => void) => {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  const storageHandler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) cb();
  };
  window.addEventListener(CONSENT_CHANGE_EVENT, handler);
  window.addEventListener("storage", storageHandler);
  return () => {
    window.removeEventListener(CONSENT_CHANGE_EVENT, handler);
    window.removeEventListener("storage", storageHandler);
  };
};

// Re-open the banner after a decision was already made (the footer's "Manage
// cookies" affordance) so a participant can withdraw or change consent.
export const requestConsentReopen = (): void => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CONSENT_REOPEN_EVENT));
};

export const onConsentReopen = (cb: () => void): (() => void) => {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener(CONSENT_REOPEN_EVENT, handler);
  return () => window.removeEventListener(CONSENT_REOPEN_EVENT, handler);
};
