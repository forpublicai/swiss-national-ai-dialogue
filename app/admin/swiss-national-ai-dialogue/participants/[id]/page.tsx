import { notFound } from "next/navigation";

import { ParticipantJourneyView } from "@/deliberations/swiss-national-ai-dialogue/admin/ParticipantJourney";
import { loadParticipantJourney } from "@/deliberations/swiss-national-ai-dialogue/server/participants";

export const dynamic = "force-dynamic";

export default async function SnadParticipantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const journey = await loadParticipantJourney(id).catch(() => null);
  if (!journey) notFound();
  return (
    <main className="mx-auto max-w-[1000px] p-8">
      <ParticipantJourneyView journey={journey} surface="admin" />
    </main>
  );
}
