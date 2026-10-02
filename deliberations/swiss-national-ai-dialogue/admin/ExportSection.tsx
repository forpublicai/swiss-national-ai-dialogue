import type { AdminSurface } from "./shared";

const EXPORTS = [
  {
    kind: "sessions",
    label: "Sessions",
    detail: "One row per participant: status, canton, language, NPS, timings.",
  },
  {
    kind: "answers",
    label: "Answers",
    detail:
      "One row per question answered (long format), including per-question skips.",
  },
  {
    kind: "quotes",
    label: "Quotes",
    detail: "Every contribution with its moderation status and featured flag.",
  },
  {
    kind: "chats",
    label: "Chat transcripts",
    detail:
      "The closing-interview and “Other…” conversations, one row per message.",
  },
] as const;

export function ExportSection({ surface }: { surface: AdminSurface }) {
  const apiBase =
    surface === "partner" ? "/api/partner/snad/export" : "/api/admin/snad/export";
  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {EXPORTS.map((entry) => (
          <a
            key={entry.kind}
            href={`${apiBase}/${entry.kind}`}
            download
            className="border-border bg-card hover:border-primary/50 group rounded-md border p-4 transition-colors"
          >
            <p className="text-sm font-semibold group-hover:underline">
              {entry.label} <span aria-hidden>↓</span>
            </p>
            <p className="text-muted-foreground mt-1 text-xs">{entry.detail}</p>
          </a>
        ))}
      </div>
      <p className="text-muted-foreground mt-2 text-xs">
        CSV files, UTF-8 — they open directly in Excel, Numbers and Google
        Sheets. Participant emails are never included in exports.
      </p>
    </div>
  );
}
