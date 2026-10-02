/**
 * Regression test for ELICITATION-EXPERIMENT-G: Safari configured to block all
 * cookies throws `SecurityError: The operation is insecure.` (DOMException 18)
 * on the `window.localStorage` property access itself. lib/analytics/cookies.ts
 * is read from AmplitudeProvider, which is mounted in the root layout, so an
 * unguarded access crashed the whole React tree on the participant's first
 * paint — a real iOS visitor to dialogue.publicai.ch could not use the app.
 */

import {
  canWeTrackAnalytics,
  canWeTrackMarketing,
  getConsentPrefs,
  hasConsentDecision,
  setConsentPrefs,
} from "@/lib/analytics/cookies";

const STORAGE_KEY = "cookie-preferences";

const blockAllCookiesLikeSafari = () => {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    get() {
      throw new DOMException("The operation is insecure.", "SecurityError");
    },
  });
};

const allowStorage = () => {
  const store = new Map<string, string>();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    },
  });
};

describe("cookie consent with storage blocked by the browser", () => {
  const originalLocalStorage = Object.getOwnPropertyDescriptor(
    window,
    "localStorage",
  );

  afterEach(() => {
    if (originalLocalStorage) {
      Object.defineProperty(window, "localStorage", originalLocalStorage);
    }
  });

  it("reading a decision does not throw", () => {
    blockAllCookiesLikeSafari();

    expect(() => hasConsentDecision()).not.toThrow();

    expect(hasConsentDecision()).toBe(false);
  });

  it("treats an unreadable store as no decision, so consent-gated analytics stays off", () => {
    blockAllCookiesLikeSafari();

    const decided = hasConsentDecision();

    expect(decided).toBe(false);
    expect(getConsentPrefs()).toBeNull();
  });

  it("keeps the opt-out gates permissive so surfaces without a banner still track", () => {
    blockAllCookiesLikeSafari();

    expect(canWeTrackAnalytics()).toBe(true);
    expect(canWeTrackMarketing()).toBe(true);
  });

  it("recording a decision does not throw when the store is unwritable", () => {
    blockAllCookiesLikeSafari();

    expect(() =>
      setConsentPrefs({ analytics: true, marketing: false }),
    ).not.toThrow();
  });

  it("still notifies listeners after an unwritable decision so gated init re-checks", () => {
    blockAllCookiesLikeSafari();
    const listener = jest.fn();
    window.addEventListener("cookie-consent-change", listener);

    setConsentPrefs({ analytics: true, marketing: true });

    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener("cookie-consent-change", listener);
  });
});

describe("cookie consent with storage available", () => {
  const originalLocalStorage = Object.getOwnPropertyDescriptor(
    window,
    "localStorage",
  );

  beforeEach(allowStorage);

  afterEach(() => {
    if (originalLocalStorage) {
      Object.defineProperty(window, "localStorage", originalLocalStorage);
    }
  });

  it("round-trips a recorded decision", () => {
    setConsentPrefs({ analytics: false, marketing: true });

    const prefs = getConsentPrefs();

    expect(hasConsentDecision()).toBe(true);
    expect(prefs).toEqual({ analytics: false, marketing: true });
    expect(canWeTrackAnalytics()).toBe(false);
    expect(canWeTrackMarketing()).toBe(true);
  });

  it("ignores a corrupt payload rather than throwing", () => {
    window.localStorage.setItem(STORAGE_KEY, "{not json");

    const prefs = getConsentPrefs();

    expect(prefs).toBeNull();
    expect(hasConsentDecision()).toBe(false);
  });
});
