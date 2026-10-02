import { requireActivePartnerSession } from "../../_lib/session";
import { SignOutButton } from "../../_components/SignOutButton";

export const dynamic = "force-dynamic";

// The partner-facing study editor: the SAME editor as /admin/<slug>/editor,
// scoped by the verified session claim and writing through /api/partner/snad
// (each handler re-verifies the HMAC session).
export default async function PartnerStudyEditorPage() {
  await requireActivePartnerSession();
  const [{ StudyEditor }, { AdminTabs }] = await Promise.all([
    import("@/deliberations/swiss-national-ai-dialogue/admin/editor/StudyEditor"),
    import("@/deliberations/swiss-national-ai-dialogue/admin/shared"),
  ]);
  return (
    <main className="mx-auto max-w-[1100px] p-8">
      <div className="mb-2 flex justify-end">
        <SignOutButton />
      </div>
      <header className="mb-8">
        <h1 className="text-2xl font-bold">Swiss National AI Dialogue</h1>
        <AdminTabs surface="partner" current="settings" />
      </header>
      <StudyEditor apiBase="/api/partner/snad" />
    </main>
  );
}
