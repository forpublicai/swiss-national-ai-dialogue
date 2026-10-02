import type { ReactNode } from "react";

import { cn } from "@/components/ui";

import type { ParticipantSummary } from "../server/participants";

const CANTONS: [code: string, name: string, populationK: number][] = [
  ["ZH", "Zürich", 1594],
  ["BE", "Bern", 1063],
  ["VD", "Vaud", 840],
  ["AG", "Aargau", 726],
  ["SG", "St. Gallen", 525],
  ["GE", "Genève", 517],
  ["LU", "Luzern", 424],
  ["VS", "Valais", 358],
  ["TI", "Ticino", 354],
  ["FR", "Fribourg", 341],
  ["BL", "Basel-Landschaft", 296],
  ["TG", "Thurgau", 296],
  ["SO", "Solothurn", 282],
  ["GR", "Graubünden", 202],
  ["BS", "Basel-Stadt", 196],
  ["NE", "Neuchâtel", 175],
  ["SZ", "Schwyz", 166],
  ["ZG", "Zug", 132],
  ["SH", "Schaffhausen", 85],
  ["JU", "Jura", 74],
  ["AR", "Appenzell A.Rh.", 56],
  ["NW", "Nidwalden", 45],
  ["GL", "Glarus", 42],
  ["OW", "Obwalden", 39],
  ["UR", "Uri", 37],
  ["AI", "Appenzell I.Rh.", 16],
];

const LANGUAGES: [code: string, name: string, color: string][] = [
  ["de", "German", "#2a78d6"],
  ["en", "English", "#eb6834"],
  ["fr", "French", "#1baf7a"],
  ["it", "Italian", "#eda100"],
  ["rm", "Romansh", "#e87ba4"],
];

const DAILY_WINDOW_DAYS = 14;

export function WhoTookPart({
  participants,
}: {
  participants: ParticipantSummary[];
}) {
  const byCanton = new Map<string, number>();
  participants.forEach((participant) => {
    if (!participant.canton) return;
    byCanton.set(participant.canton, (byCanton.get(participant.canton) ?? 0) + 1);
  });
  const covered = CANTONS.filter(([code]) => (byCanton.get(code) ?? 0) > 0);
  const missing = CANTONS.filter(([code]) => (byCanton.get(code) ?? 0) === 0);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-6">
        <CantonCoverage byCanton={byCanton} coveredCount={covered.length} missing={missing} />
        <CantonList byCanton={byCanton} />
      </div>
      <div className="flex flex-col gap-6">
        <LanguageSplit participants={participants} />
        <DailyRhythm participants={participants} />
      </div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="border-border bg-card rounded-md border p-4">
      <p className="text-sm font-semibold">{title}</p>
      {subtitle && (
        <p className="text-muted-foreground mt-0.5 text-xs">{subtitle}</p>
      )}
      <div className="mt-3">{children}</div>
    </div>
  );
}

function CantonCoverage({
  byCanton,
  coveredCount,
  missing,
}: {
  byCanton: Map<string, number>;
  coveredCount: number;
  missing: [string, string, number][];
}) {
  return (
    <Panel
      title={`Canton coverage: ${coveredCount} of 26`}
      subtitle={
        missing.length === 0
          ? "Every canton has at least one participant."
          : `Still missing: ${missing.map(([, name]) => name).join(", ")}.`
      }
    >
      <div className="grid grid-cols-[repeat(13,minmax(0,1fr))] gap-1">
        {CANTONS.map(([code, name]) => {
          const count = byCanton.get(code) ?? 0;
          return (
            <span
              key={code}
              title={`${name}: ${count} participant${count === 1 ? "" : "s"}`}
              className={cn(
                "rounded-sm py-1 text-center font-mono text-[10px] font-semibold",
                count > 0
                  ? "bg-muted text-foreground shadow-[inset_0_-2px_0_var(--primary)]"
                  : "border-border text-muted-foreground/60 border border-dashed",
              )}
            >
              {code}
            </span>
          );
        })}
      </div>
    </Panel>
  );
}

function CantonList({ byCanton }: { byCanton: Map<string, number> }) {
  const outside = byCanton.get("non-ch") ?? 0;
  const rows = CANTONS.map(([code, name, populationK]) => ({
    code,
    name,
    populationK,
    count: byCanton.get(code) ?? 0,
  })).sort((left, right) => right.count - left.count);
  const max = Math.max(1, ...rows.map((row) => row.count));
  return (
    <Panel
      title="Participants by canton"
      subtitle="All 26 cantons, most participants first. The right column normalizes by canton size."
    >
      <div className="grid gap-1.5">
        {rows.map((row) => (
          <div
            key={row.code}
            className="grid grid-cols-[minmax(7rem,12rem)_1fr_2.5rem_4rem] items-center gap-3"
          >
            <span className="truncate text-sm" title={row.name}>
              {row.name}
            </span>
            <div className="bg-muted h-2.5 overflow-hidden rounded-sm">
              <div
                className="bg-primary/70 h-full rounded-sm"
                style={{ width: `${(row.count / max) * 100}%` }}
              />
            </div>
            <span className="text-right font-mono text-xs tabular-nums">
              {row.count}
            </span>
            <span className="text-muted-foreground text-right font-mono text-[10px] tabular-nums">
              {row.count > 0
                ? `${(row.count / (row.populationK / 100)).toFixed(1)}/100k`
                : "—"}
            </span>
          </div>
        ))}
        {outside > 0 && (
          <p className="text-muted-foreground mt-1 text-xs">
            Plus {outside} participant{outside === 1 ? "" : "s"} from outside
            Switzerland.
          </p>
        )}
      </div>
    </Panel>
  );
}

function LanguageSplit({
  participants,
}: {
  participants: ParticipantSummary[];
}) {
  const rows = LANGUAGES.map(([code, name, color]) => {
    const cohort = participants.filter(
      (participant) => (participant.startLocale ?? participant.locale) === code,
    );
    const finished = cohort.filter(
      (participant) => participant.progress.reachedFinale,
    ).length;
    return { code, name, color, count: cohort.length, finished };
  }).filter((row) => row.count > 0);
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  const switched = participants.filter(
    (participant) => participant.languageSwitched,
  ).length;

  let offset = 0;
  const slices = rows.map((row) => {
    const start = offset;
    offset += (row.count / Math.max(1, total)) * 100;
    return { ...row, start, end: offset };
  });

  return (
    <Panel
      title="Start language"
      subtitle="Share of participants by the language they began in, with each cohort's finish rate."
    >
      <div className="flex items-center gap-5">
        <svg viewBox="0 0 42 42" className="size-28 shrink-0 -rotate-90">
          {slices.map((slice) => (
            <circle
              key={slice.code}
              cx="21"
              cy="21"
              r="15.9155"
              fill="none"
              stroke={slice.color}
              strokeWidth="7"
              strokeDasharray={`${Math.max(0.2, slice.end - slice.start - 0.6)} ${100 - (slice.end - slice.start - 0.6)}`}
              strokeDashoffset={-slice.start - 0.3}
            >
              <title>{`${slice.name}: ${slice.count} (${Math.round((slice.count / Math.max(1, total)) * 100)}%)`}</title>
            </circle>
          ))}
        </svg>
        <div className="grid flex-1 gap-1.5">
          {rows.map((row) => (
            <div key={row.code} className="flex items-baseline gap-2 text-sm">
              <span
                aria-hidden
                className="size-2.5 shrink-0 self-center rounded-[3px]"
                style={{ background: row.color }}
              />
              <span className="min-w-16">{row.name}</span>
              <span className="font-mono text-xs tabular-nums">
                {Math.round((row.count / Math.max(1, total)) * 100)}%
              </span>
              <span className="text-muted-foreground font-mono text-[11px] tabular-nums">
                {row.count} · {row.count > 0 ? Math.round((row.finished / row.count) * 100) : 0}% finish
              </span>
            </div>
          ))}
        </div>
      </div>
      {switched > 0 && (
        <p className="text-muted-foreground mt-3 text-xs">
          {switched} participant{switched === 1 ? "" : "s"} switched language
          mid-dialogue.
        </p>
      )}
    </Panel>
  );
}

function DailyRhythm({
  participants,
}: {
  participants: ParticipantSummary[];
}) {
  const byDay = new Map<string, { sessions: number; finished: number }>();
  participants.forEach((participant) => {
    const day = participant.createdAt.toISOString().slice(0, 10);
    const entry = byDay.get(day) ?? { sessions: 0, finished: 0 };
    entry.sessions += 1;
    if (participant.progress.reachedFinale) entry.finished += 1;
    byDay.set(day, entry);
  });
  const days = [...byDay.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-DAILY_WINDOW_DAYS);
  if (days.length === 0) return null;
  const max = Math.max(1, ...days.map(([, value]) => value.sessions));

  return (
    <Panel
      title="Sessions per day"
      subtitle={`Last ${days.length} day${days.length === 1 ? "" : "s"}; the solid share finished the dialogue.`}
    >
      <div className="flex h-32 items-end gap-1.5">
        {days.map(([day, value]) => (
          <div
            key={day}
            className="flex h-full flex-1 flex-col justify-end"
            title={`${day}: ${value.sessions} sessions, ${value.finished} finished`}
          >
            <span className="text-muted-foreground mb-0.5 text-center font-mono text-[9px] tabular-nums">
              {value.sessions}
            </span>
            <div
              className="flex flex-col gap-px overflow-hidden rounded-t-sm"
              style={{ height: `${(value.sessions / max) * 100}%` }}
            >
              <span
                className="bg-primary/25 block w-full"
                style={{ flex: value.sessions - value.finished }}
              />
              <span
                className="bg-primary/80 block w-full"
                style={{ flex: value.finished }}
              />
            </div>
            <span className="text-muted-foreground mt-1 truncate text-center font-mono text-[9px]">
              {day.slice(5)}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
