import * as amplitude from "@amplitude/analytics-browser";
import { plugin as engagementPlugin } from "@amplitude/engagement-browser";
import { sessionReplayPlugin } from "@amplitude/plugin-session-replay-browser";

import { canWeTrackAnalytics } from "@/lib/analytics/cookies";
import { getClientEnv } from "@/lib/env";

// Surface tag stamped on every event.
const SOURCE = "elicitation_experiment";

let isInitialized = false;

export const initializeAmplitude = () => {
  if (isInitialized || typeof window === "undefined") return amplitude;
  const key = getClientEnv().AMPLITUDE_ID.trim();
  // Local dev without a key is a no-op; trackEvent below checks isInitialized.
  if (!key) return amplitude;
  amplitude.add(
    sessionReplayPlugin({
      sampleRate: 0.3,
    }),
  );
  amplitude.add(engagementPlugin());
  amplitude.init(key, undefined, {
    defaultTracking: false,
    autocapture: {
      attribution: true,
      pageViews: false,
      sessions: false,
      formInteractions: false,
      fileDownloads: false,
      elementInteractions: false,
    },
  });
  isInitialized = true;
  return amplitude;
};

// The single send seam. Every deliberation's event vocabulary (the trackXxx
// helpers) lives in that slice's analytics.ts and calls through here — this
// module is transport only: SDK init, consent gating, and the source stamp.
export const trackEvent = (
  eventName: string,
  properties?: Record<string, unknown>,
) => {
  if (typeof window === "undefined" || !isInitialized) return;
  if (!canWeTrackAnalytics()) return;
  amplitude.track(eventName, {
    ...properties,
    source: SOURCE,
    timestamp: new Date().toISOString(),
    user_id: amplitude.getUserId(),
  });
};

// Set user properties (Amplitude identify). Same transport contract as
// trackEvent — no-op before init or without analytics consent. Slices use this
// for segmentation dimensions (canton, reply language) that should tag every
// event rather than live as their own event.
export const setUserProperties = (
  properties: Record<string, string | number | boolean>,
) => {
  if (typeof window === "undefined" || !isInitialized) return;
  if (!canWeTrackAnalytics()) return;
  const identify = new amplitude.Identify();
  Object.entries(properties).forEach(([key, value]) => identify.set(key, value));
  amplitude.identify(identify);
};

