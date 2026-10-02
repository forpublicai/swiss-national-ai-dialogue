import { SnadDashboard } from "@/deliberations/swiss-national-ai-dialogue/admin/Dashboard";

export const dynamic = "force-dynamic";

export default function EditSnadDeliberationPage() {
  return (
    <main className="mx-auto max-w-[1400px] p-8">
      <SnadDashboard surface="admin" />
    </main>
  );
}
