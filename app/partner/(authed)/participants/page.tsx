import { requireActivePartnerSession } from "../../_lib/session";
import { SignOutButton } from "../../_components/SignOutButton";

export const dynamic = "force-dynamic";

export default async function PartnerParticipantsPage() {
  await requireActivePartnerSession();
  const { SnadParticipantsView } = await import(
    "@/deliberations/swiss-national-ai-dialogue/admin/ParticipantsView"
  );
  return (
    <main className="mx-auto max-w-[1400px] p-8">
      <div className="mb-2 flex justify-end">
        <SignOutButton />
      </div>
      <SnadParticipantsView surface="partner" />
    </main>
  );
}
