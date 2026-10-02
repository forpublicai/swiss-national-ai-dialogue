import Link from "next/link";

import { SnadQuestionsView } from "@/deliberations/swiss-national-ai-dialogue/admin/QuestionsView";

export const dynamic = "force-dynamic";

export default function SnadQuestionsPage() {
  return (
    <main className="mx-auto max-w-[1400px] p-8">
      <div className="mb-2">
        <Link className="text-secondary text-sm underline" href="/admin/swiss-national-ai-dialogue">
          ← Dashboard
        </Link>
      </div>
      <SnadQuestionsView surface="admin" />
    </main>
  );
}
