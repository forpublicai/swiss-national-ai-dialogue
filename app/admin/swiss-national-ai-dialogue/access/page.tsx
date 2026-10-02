import Link from "next/link";

import { AccessKeys } from "@/deliberations/swiss-national-ai-dialogue/admin/AccessKeys";
import { AdminTabs } from "@/deliberations/swiss-national-ai-dialogue/admin/shared";

export const dynamic = "force-dynamic";

export default function SnadAccessPage() {
  return (
    <main className="mx-auto max-w-[1100px] p-8">
      <div className="mb-2">
        <Link className="text-secondary text-sm underline" href="/admin/swiss-national-ai-dialogue">
          ← Dashboard
        </Link>
      </div>
      <header className="mb-8">
        <h1 className="text-2xl font-bold">Swiss National AI Dialogue</h1>
        <AdminTabs surface="admin" current="access" />
      </header>
      <AccessKeys />
    </main>
  );
}
