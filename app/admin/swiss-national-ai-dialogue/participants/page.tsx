import Link from "next/link";

import { SnadParticipantsView } from "@/deliberations/swiss-national-ai-dialogue/admin/ParticipantsView";

export const dynamic = "force-dynamic";

export default function SnadParticipantsPage() {
  return (
    <main className="mx-auto max-w-[1400px] p-8">
      <div className="mb-2">
        <Link className="text-secondary text-sm underline" href="/admin/swiss-national-ai-dialogue">
          ← Dashboard
        </Link>
      </div>
      <SnadParticipantsView surface="admin" />
    </main>
  );
}
