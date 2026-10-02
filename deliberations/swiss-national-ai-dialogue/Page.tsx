import { getMapQuotes } from "./server/contributions";
import {
  hydrateOwnedSession,
  loadOnboardingCopy,
  loadSnadCantonCounts,
  loadSnadParticipantCount,
} from "./server/sessions";
import { SnadRoot } from "./ui/SnadRoot";

const displayOr = <T,>(load: Promise<T>, fallback: T): Promise<T> =>
  load.catch((error: unknown) => {
    console.error("[snad] landing display data failed, degrading", error);
    return fallback;
  });

export async function SnadPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const [
    { view },
    initialSession,
    participantCount,
    cantonCounts,
    quotes,
    onboarding,
  ] = await Promise.all([
    searchParams,
    hydrateOwnedSession(),
    displayOr(loadSnadParticipantCount(), 0),
    displayOr(loadSnadCantonCounts(), []),
    displayOr(getMapQuotes(), []),
    loadOnboardingCopy(),
  ]);
  const initialView =
    view === "dialogue" &&
    initialSession !== null &&
    initialSession.status !== "completed"
      ? ("dialogue" as const)
      : ("landing" as const);
  return (
    <SnadRoot
      initialView={initialView}
      initialSession={initialSession}
      participantCount={participantCount}
      cantonCounts={cantonCounts}
      quotes={quotes}
      onboarding={onboarding}
    />
  );
}
