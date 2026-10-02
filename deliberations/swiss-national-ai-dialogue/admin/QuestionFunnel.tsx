import { cn } from "@/components/ui";

import type { ParticipantSummary } from "../server/participants";
import { studyStepList, type StudyStep } from "../server/progress";
import type { SnadStudyDefinition } from "../types";

type FunnelRow = {
  step: StudyStep;
  reached: number;
  stoppedHere: number;
  isFinale: boolean;
};

function funnelRows(
  participants: ParticipantSummary[],
  definition: SnadStudyDefinition,
): { rows: FunnelRow[]; started: number; unplaced: number } {
  const steps = studyStepList(definition);
  const indexById = new Map(steps.map((step, index) => [step.id, index]));
  const stoppedAt = steps.map(() => 0);
  let unplaced = 0;
  participants.forEach((participant) => {
    const index = indexById.get(participant.progress.step.id);
    if (index === undefined) {
      unplaced += 1;
      return;
    }
    stoppedAt[index] += 1;
  });
  // reached[k] = everyone whose furthest step is k or later.
  let remaining = participants.length - unplaced;
  const rows = steps.map((step, index) => {
    const reached = remaining;
    remaining -= stoppedAt[index]!;
    return {
      step,
      reached,
      stoppedHere: stoppedAt[index]!,
      isFinale: index === steps.length - 1,
    };
  });
  return { rows, started: participants.length - unplaced, unplaced };
}

export function QuestionFunnel({
  participants,
  definition,
}: {
  participants: ParticipantSummary[];
  definition: SnadStudyDefinition;
}) {
  const { rows, started, unplaced } = funnelRows(participants, definition);
  if (started === 0) {
    return <p className="text-muted-foreground text-sm">No participants yet.</p>;
  }
  const groups = rows.reduce((byGroup, row) => {
    const bucket = byGroup.get(row.step.groupKey) ?? [];
    bucket.push(row);
    byGroup.set(row.step.groupKey, bucket);
    return byGroup;
  }, new Map<string, FunnelRow[]>());
  // The single worst question in the study, so the eye lands on it first.
  const worstLoss = Math.max(
    ...rows.map((row) => (row.isFinale ? 0 : row.stoppedHere)),
  );

  return (
    <div className="grid gap-3">
      {[...groups.values()].map((group) => (
        <FunnelGroup
          key={group[0]!.step.groupKey}
          rows={group}
          started={started}
          worstLoss={worstLoss}
        />
      ))}
      {unplaced > 0 && (
        <p className="text-muted-foreground text-xs">
          {unplaced} participant{unplaced === 1 ? "" : "s"} answered a survey
          version whose questions no longer exist, and are left out of the rows
          above.
        </p>
      )}
    </div>
  );
}

function FunnelGroup({
  rows,
  started,
  worstLoss,
}: {
  rows: FunnelRow[];
  started: number;
  worstLoss: number;
}) {
  const head = rows[0]!.step;
  const entered = rows[0]!.reached;
  const lost = rows.reduce(
    (total, row) => total + (row.isFinale ? 0 : row.stoppedHere),
    0,
  );
  return (
    <details className="border-border bg-card rounded-md border" open>
      <summary className="flex cursor-pointer flex-wrap items-baseline justify-between gap-2 p-4">
        <span className="font-semibold">
          {head.phase === "wrap_up"
            ? head.groupTitle
            : `${head.groupIndex}. ${head.groupTitle}`}
        </span>
        <span className="text-muted-foreground font-mono text-xs tabular-nums">
          {entered} reached
          {entered > 0 && lost > 0 && (
            <span className="ml-2 text-amber-700 dark:text-amber-400">
              −{lost} stopped here ({Math.round((lost / entered) * 100)}%)
            </span>
          )}
        </span>
      </summary>
      <div className="grid gap-1.5 border-t p-4">
        {rows.map((row) => (
          <FunnelRowBar
            key={row.step.id}
            row={row}
            started={started}
            worstLoss={worstLoss}
          />
        ))}
      </div>
    </details>
  );
}

function FunnelRowBar({
  row,
  started,
  worstLoss,
}: {
  row: FunnelRow;
  started: number;
  worstLoss: number;
}) {
  const { step } = row;
  const isWorst = worstLoss > 0 && row.stoppedHere === worstLoss;
  return (
    <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_5rem_6rem] items-center gap-3">
      <span className="text-muted-foreground font-mono text-xs">
        Q{step.number}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm" title={step.question}>
          {stepTitle(step)}
        </p>
        <div className="bg-muted mt-1 h-2 overflow-hidden rounded-sm">
          <div
            className="bg-primary h-full rounded-sm"
            style={{ width: `${(row.reached / started) * 100}%` }}
          />
        </div>
      </div>
      <span
        className="text-right font-mono text-sm tabular-nums"
        title="Participants who got at least this far"
      >
        {row.reached}
      </span>
      {row.isFinale ? (
        <span
          className="text-right font-mono text-xs tabular-nums text-emerald-700 dark:text-emerald-400"
          title="Participants who reached the last page of the dialogue"
        >
          {row.reached > 0 ? `✓ ${row.reached}` : "—"}
        </span>
      ) : (
        <span
          className={cn(
            "text-right font-mono text-xs tabular-nums",
            row.stoppedHere === 0
              ? "text-muted-foreground"
              : isWorst
                ? "font-bold text-rose-600 dark:text-rose-400"
                : "text-amber-700 dark:text-amber-400",
          )}
          title="Participants who never got past this question, as a share of those who reached it"
        >
          {row.stoppedHere > 0
            ? `−${row.stoppedHere} (${Math.round((row.stoppedHere / Math.max(1, row.reached)) * 100)}%)`
            : "—"}
        </span>
      )}
    </div>
  );
}

function stepTitle(step: StudyStep): string {
  if (step.kind === "share_more") return "Talk to the AI about this topic?";
  const suffix = step.variants > 1 ? ` (1 of ${step.variants} variants)` : "";
  return `${step.question || "(untitled question)"}${suffix}`;
}
