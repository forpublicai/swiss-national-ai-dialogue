import { notFound } from "next/navigation";

import { ParticipantModal } from "@/deliberations/swiss-national-ai-dialogue/admin/ParticipantModal";
import { ParticipantJourneyView } from "@/deliberations/swiss-national-ai-dialogue/admin/ParticipantJourney";
import { loadParticipantJourney } from "@/deliberations/swiss-national-ai-dialogue/server/participants";

export const dynamic = "force-dynamic";

export default async function SnadParticipantModal({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const journey = await loadParticipantJourney(id).catch(() => null);
  if (!journey) notFound();
  return (
    <ParticipantModal>
      <ParticipantJourneyView journey={journey} surface="admin" />
    </ParticipantModal>
  );
}
