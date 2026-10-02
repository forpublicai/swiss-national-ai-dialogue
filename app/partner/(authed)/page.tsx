import { requireActivePartnerSession } from "../_lib/session";
import { SignOutButton } from "../_components/SignOutButton";

export const dynamic = "force-dynamic";

// The partner dashboard: the SAME per-deliberation dashboard as
// /admin/<slug>, with the slug taken from the verified session claim — never
// from the URL — and the global-only affordances hidden. The partner surface
// serves exactly one deliberation (the SNAD slice); other slugs 404.
export default async function PartnerDashboardPage() {
  await requireActivePartnerSession();
  const { SnadDashboard } = await import(
    "@/deliberations/swiss-national-ai-dialogue/admin/Dashboard"
  );
  return (
    <main className="mx-auto max-w-[1400px] p-8">
      <div className="mb-2 flex justify-end">
        <SignOutButton />
      </div>
      <SnadDashboard surface="partner" />
    </main>
  );
}
