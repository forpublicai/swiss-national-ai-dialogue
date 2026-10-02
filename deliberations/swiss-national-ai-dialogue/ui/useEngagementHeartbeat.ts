import { useEffect, useRef } from "react";

import { trackEngagementHeartbeat } from "../analytics";

const HEARTBEAT_SECONDS = 15;
const IDLE_WINDOW_MS = 30_000;

export function useEngagementHeartbeat(params: {
  campaignSlug: string;
  phase: "landing" | "dialogue";
}) {
  const phaseRef = useRef(params.phase);
  phaseRef.current = params.phase;

  useEffect(() => {
    let lastActivityAt = Date.now();
    const bump = () => {
      lastActivityAt = Date.now();
    };
    const activityEvents = [
      "pointerdown",
      "pointermove",
      "keydown",
      "wheel",
      "touchstart",
      "scroll",
    ] as const;
    activityEvents.forEach((name) =>
      window.addEventListener(name, bump, { passive: true }),
    );
    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastActivityAt > IDLE_WINDOW_MS) return;
      trackEngagementHeartbeat({
        campaignSlug: params.campaignSlug,
        phase: phaseRef.current,
        seconds: HEARTBEAT_SECONDS,
      });
    }, HEARTBEAT_SECONDS * 1000);
    return () => {
      window.clearInterval(interval);
      activityEvents.forEach((name) => window.removeEventListener(name, bump));
    };
  }, [params.campaignSlug]);
}
