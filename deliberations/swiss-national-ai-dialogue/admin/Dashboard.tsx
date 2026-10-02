import type { ReactNode } from "react";
import Link from "next/link";

import {
  listParticipants,
  type ParticipantSummary,
} from "../server/participants";
import { listClosingQuotes } from "../server/quotes-admin";
import { ExportSection } from "./ExportSection";
import { NpsSection } from "./NpsSection";
import { SuggestionsSection } from "./SuggestionsSection";
import { WhoTookPart } from "./WhoTookPart";
import { AdminTabs, adminBasePath, formatDuration } from "./shared";

export async function SnadDashboard({
  surface,
}: {
  surface: "admin" | "partner";
}) {
  const base = adminBasePath(surface);
  const [{ participants, totalSessions }, quotes] = await Promise.all([
    listParticipants(),
    listClosingQuotes(),
  ]);

  const finished = participants.filter(
    (participant) => participant.progress.reachedFinale,
  );
  const reachedWrapUp = participants.filter(
    (participant) => participant.progress.step.phase === "wrap_up",
  );
  const scored = participants.filter((participant) => participant.nps !== null);
  const promoters = scored.filter((participant) => participant.nps! >= 9).length;
  const detractors = scored.filter((participant) => participant.nps! <= 6).length;
  const nps =
    scored.length > 0
      ? Math.round(((promoters - detractors) / scored.length) * 100)
      : null;
  const percent = (count: number) =>
    participants.length > 0
      ? Math.round((count / participants.length) * 100)
      : 0;

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-bold">Swiss National AI Dialogue</h1>
        <AdminTabs surface={surface} current="results" />
      </header>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Participants" value={String(totalSessions)} />
        <Stat
          label="Finished (saw the finale)"
          value={`${finished.length} (${percent(finished.length)}%)`}
        />
        <Stat
          label="Reached the wrap-up"
          value={`${reachedWrapUp.length} (${percent(reachedWrapUp.length)}%)`}
        />
        <Stat
          label="Median time to finish"
          value={medianCompletionTime(finished)}
        />
        <Stat
          label="NPS"
          value={
            nps === null ? "—" : `${nps > 0 ? "+" : ""}${nps} (n=${scored.length})`
          }
        />
        <Stat label="Closing quotes" value={String(quotes.length)} />
      </section>

      <Section
        title="Who took part"
        subtitle="Reach across cantons and languages, and the daily rhythm of participation."
      >
        <WhoTookPart participants={participants} />
      </Section>

      <Section
        title="How participants felt"
        subtitle="The finale's 0–10 score with every written comment."
      >
        <NpsSection participants={participants} />
      </Section>

      <Section
        title="What people want asked next"
        subtitle="The question each participant handed back to the dialogue, from the wrap-up's shape page."
      >
        <SuggestionsSection participants={participants} />
      </Section>

      <Section
        title="Download the data"
        subtitle="Everything on these pages as CSV, for your own analysis and visualizations."
      >
        <ExportSection surface={surface} />
      </Section>

      <p className="text-muted-foreground text-xs">
        Looking for per-question results and drop-off? They live under{" "}
        <Link className="underline" href={`${base}/questions`}>
          Questions
        </Link>
        ; individual journeys under{" "}
        <Link className="underline" href={`${base}/participants`}>
          Participants
        </Link>
        .
      </p>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="text-lg font-bold">{title}</h2>
      {subtitle && (
        <p className="text-muted-foreground mb-3 mt-0.5 text-xs">{subtitle}</p>
      )}
      {!subtitle && <div className="mb-3" />}
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-border bg-card rounded-md border px-3 py-2">
      <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
        {label}
      </p>
      <p className="mt-1 font-mono text-sm tabular-nums">{value}</p>
    </div>
  );
}

function medianCompletionTime(finished: ParticipantSummary[]): string {
  const durations = finished
    .map(
      (participant) =>
        participant.lastActiveAt.getTime() - participant.createdAt.getTime(),
    )
    .sort((left, right) => left - right);
  if (durations.length === 0) return "—";
  const median = durations[Math.floor(durations.length / 2)]!;
  return formatDuration(median);
}
