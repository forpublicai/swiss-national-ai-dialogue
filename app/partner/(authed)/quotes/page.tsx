import { requireActivePartnerSession } from "../../_lib/session";
import { SignOutButton } from "../../_components/SignOutButton";

export const dynamic = "force-dynamic";

// The partner-facing quote curation: the SAME panel as /admin/<slug>/quotes,
// writing through /api/partner/snad (each handler re-verifies the session).
export default async function PartnerQuotesPage() {
  await requireActivePartnerSession();
  const [{ QuotesPanel }, { AdminTabs }] = await Promise.all([
    import("@/deliberations/swiss-national-ai-dialogue/admin/QuotesPanel"),
    import("@/deliberations/swiss-national-ai-dialogue/admin/shared"),
  ]);
  return (
    <main className="mx-auto max-w-[1100px] p-8">
      <div className="mb-2 flex justify-end">
        <SignOutButton />
      </div>
      <header className="mb-8">
        <h1 className="text-2xl font-bold">Swiss National AI Dialogue</h1>
        <AdminTabs surface="partner" current="quotes" />
      </header>
      <QuotesPanel surface="partner" />
    </main>
  );
}
