import { requireActivePartnerSession } from "../../_lib/session";
import { SignOutButton } from "../../_components/SignOutButton";

export const dynamic = "force-dynamic";

export default async function PartnerQuestionsPage() {
  await requireActivePartnerSession();
  const { SnadQuestionsView } = await import(
    "@/deliberations/swiss-national-ai-dialogue/admin/QuestionsView"
  );
  return (
    <main className="mx-auto max-w-[1400px] p-8">
      <div className="mb-2 flex justify-end">
        <SignOutButton />
      </div>
      <SnadQuestionsView surface="partner" />
    </main>
  );
}
