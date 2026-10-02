import { cn } from "@/components/ui";

import { LANGUAGE_NAME } from "../server/constants";
import type { ParticipantSummary } from "../server/participants";

type NpsBand = "detractor" | "passive" | "promoter";

function bandOf(score: number): NpsBand {
  if (score >= 9) return "promoter";
  if (score >= 7) return "passive";
  return "detractor";
}

const BAND_FILL: Record<NpsBand, string> = {
  promoter: "bg-emerald-500/80",
  passive: "bg-muted-foreground/40",
  detractor: "bg-rose-400/80",
};

const BAND_CHIP: Record<NpsBand, string> = {
  promoter:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  passive: "bg-muted text-muted-foreground",
  detractor: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
};

export function NpsSection({
  participants,
}: {
  participants: ParticipantSummary[];
}) {
  const scored = participants.filter(
    (participant) => participant.nps !== null,
  );
  if (scored.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No NPS answers yet.</p>
    );
  }
  const counts = Array.from(
    { length: 11 },
    (_, score) =>
      scored.filter((participant) => participant.nps === score).length,
  );
  const max = Math.max(1, ...counts);
  const promoters = scored.filter((p) => bandOf(p.nps!) === "promoter").length;
  const passives = scored.filter((p) => bandOf(p.nps!) === "passive").length;
  const detractors = scored.filter(
    (p) => bandOf(p.nps!) === "detractor",
  ).length;
  const nps = Math.round(((promoters - detractors) / scored.length) * 100);
  const mean =
    scored.reduce((sum, participant) => sum + participant.nps!, 0) /
    scored.length;
  const comments = participants
    .filter((participant) => participant.npsComment?.trim())
    .map((participant) => ({
      nps: participant.nps,
      locale: participant.startLocale ?? participant.locale,
      comment: participant.npsComment!.trim(),
    }));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="border-border bg-card rounded-md border p-4">
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-bold tabular-nums">
            {nps > 0 ? `+${nps}` : nps}
          </span>
          <span className="text-muted-foreground text-xs">
            NPS · {scored.length} answers · mean {mean.toFixed(1)}/10
          </span>
        </div>
        <div className="mt-4 flex h-24 items-end gap-1">
          {counts.map((count, score) => (
            <div
              key={score}
              className="flex h-full flex-1 flex-col justify-end"
              title={`${score}: ${count} answer${count === 1 ? "" : "s"}`}
            >
              <div
                className={cn(
                  "min-h-px w-full rounded-t-sm",
                  BAND_FILL[bandOf(score)],
                )}
                style={{ height: `${(count / max) * 100}%` }}
              />
              <span className="text-muted-foreground mt-1 text-center font-mono text-[9px] tabular-nums">
                {score}
              </span>
            </div>
          ))}
        </div>
        <div className="text-muted-foreground mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <span>
            <i aria-hidden className="mr-1.5 inline-block size-2 rounded-[2px] bg-rose-400/80" />
            detractors {detractors} ({Math.round((detractors / scored.length) * 100)}%)
          </span>
          <span>
            <i aria-hidden className="bg-muted-foreground/40 mr-1.5 inline-block size-2 rounded-[2px]" />
            passives {passives} ({Math.round((passives / scored.length) * 100)}%)
          </span>
          <span>
            <i aria-hidden className="mr-1.5 inline-block size-2 rounded-[2px] bg-emerald-500/80" />
            promoters {promoters} ({Math.round((promoters / scored.length) * 100)}%)
          </span>
        </div>
      </div>

      <div className="border-border bg-card rounded-md border p-4">
        <p className="text-sm font-semibold">
          Written feedback ({comments.length})
        </p>
        <ul className="mt-3 flex max-h-72 flex-col gap-2 overflow-y-auto pr-1">
          {comments.map((comment, index) => (
            <li key={index} className="flex items-start gap-2.5 text-sm">
              <span
                className={cn(
                  "mt-0.5 w-7 shrink-0 rounded px-1 text-center font-mono text-[11px] font-semibold tabular-nums",
                  comment.nps !== null
                    ? BAND_CHIP[bandOf(comment.nps)]
                    : "bg-muted text-muted-foreground",
                )}
              >
                {comment.nps ?? "—"}
              </span>
              <span className="min-w-0">
                {comment.comment}
                <span className="text-muted-foreground ml-1.5 text-[11px]">
                  {LANGUAGE_NAME[comment.locale as keyof typeof LANGUAGE_NAME]?.split(" ")[0] ?? comment.locale}
                </span>
              </span>
            </li>
          ))}
          {comments.length === 0 && (
            <li className="text-muted-foreground text-sm">
              No written feedback yet.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
