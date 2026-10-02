import { notFound } from "next/navigation";

import { requireActivePartnerSession } from "../../../../_lib/session";

export const dynamic = "force-dynamic";

export default async function PartnerParticipantModal({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireActivePartnerSession();
  const { id } = await params;
  const [{ ParticipantModal }, { ParticipantJourneyView }, { loadParticipantJourney }] =
    await Promise.all([
      import("@/deliberations/swiss-national-ai-dialogue/admin/ParticipantModal"),
      import("@/deliberations/swiss-national-ai-dialogue/admin/ParticipantJourney"),
      import("@/deliberations/swiss-national-ai-dialogue/server/participants"),
    ]);
  const journey = await loadParticipantJourney(id).catch(() => null);
  if (!journey) notFound();
  return (
    <ParticipantModal>
      <ParticipantJourneyView journey={journey} surface="partner" />
    </ParticipantModal>
  );
}
