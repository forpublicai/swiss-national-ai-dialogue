"use client";

import { useEffect, useRef, useState } from "react";

import {
  identifyLanguageWhenPermitted,
  trackLandingViewedWhenPermitted,
} from "../analytics";
import { getLocale } from "../i18n";
import { SnadDialogue } from "./conversation/SnadDialogue";
import { SnadLanding } from "./landing/SnadLanding";
import { SwissDevPanel } from "./landing/SwissDevPanel";
import { useEngagementHeartbeat } from "./useEngagementHeartbeat";
import type {
  SnadOnboarding,
  SnadSessionPayload,
  SnadWallEntry,
} from "../types";

const SLUG = "swiss-national-ai-dialogue";
const NAME = "Swiss National AI Dialogue";

const VIEW_PARAM = "view";
const DIALOGUE_VIEW = "dialogue";

function urlWithDialogueView(on: boolean): string {
  const url = new URL(window.location.href);
  if (on) url.searchParams.set(VIEW_PARAM, DIALOGUE_VIEW);
  else url.searchParams.delete(VIEW_PARAM);
  return url.toString();
}

function locationWantsDialogue(): boolean {
  return (
    new URLSearchParams(window.location.search).get(VIEW_PARAM) ===
    DIALOGUE_VIEW
  );
}

export function SnadRoot({
  initialView,
  initialSession,
  participantCount,
  cantonCounts,
  quotes,
  onboarding,
}: {
  initialView: "landing" | "dialogue";
  initialSession: SnadSessionPayload | null;
  participantCount: number;
  cantonCounts: { canton: string; count: number }[];
  quotes: SnadWallEntry[];
  onboarding: SnadOnboarding;
}) {
  const [view, setView] = useState<"landing" | "dialogue">(initialView);
  const [session, setSession] = useState(initialSession);
  const showLanding = view === "landing";

  useEngagementHeartbeat({ campaignSlug: SLUG, phase: view });

  useEffect(() => identifyLanguageWhenPermitted(getLocale()), []);

  const landingCtaKind = !session
    ? ("start" as const)
    : session.status === "completed"
      ? ("review" as const)
      : ("continue" as const);
  const landingCtaKindRef = useRef(landingCtaKind);
  landingCtaKindRef.current = landingCtaKind;
  const landingViewTracked = useRef(false);
  const landingViewedCleanup = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (view !== "landing" || landingViewTracked.current) return;
    landingViewTracked.current = true;
    landingViewedCleanup.current = trackLandingViewedWhenPermitted({
      campaignSlug: SLUG,
      kind: landingCtaKindRef.current,
    });
  }, [view]);
  useEffect(() => () => landingViewedCleanup.current?.(), []);

  const enterDialogue = () => {
    window.history.pushState(window.history.state, "", urlWithDialogueView(true));
    setView("dialogue");
  };
  const goHome = () => {
    window.history.pushState(window.history.state, "", urlWithDialogueView(false));
    setView("landing");
  };

  useEffect(() => {
    if (locationWantsDialogue()) {
      if (initialSession !== null && initialSession.status !== "completed") {
        setView("dialogue");
      } else {
        window.history.replaceState(
          window.history.state,
          "",
          urlWithDialogueView(false),
        );
      }
    }
    const onPopState = () => {
      setView(locationWantsDialogue() ? "dialogue" : "landing");
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [initialSession]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  return (
    <>
      <main className={showLanding ? undefined : "hidden"}>
        <SnadLanding
          slug={SLUG}
          name={NAME}
          session={session}
          participantCount={participantCount}
          cantonCounts={cantonCounts}
          quotes={quotes}
          onEnter={enterDialogue}
        />
      </main>
      <div className={showLanding ? "hidden" : "contents"}>
        <SnadDialogue
          initialSession={initialSession}
          participantCount={participantCount}
          onboarding={onboarding}
          active={!showLanding}
          onHome={goHome}
          onSessionUpdate={setSession}
        />
      </div>
      {process.env.NODE_ENV !== "production" && <SwissDevPanel />}
    </>
  );
}
