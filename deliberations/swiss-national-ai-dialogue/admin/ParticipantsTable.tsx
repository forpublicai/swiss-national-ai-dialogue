"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import type { ParticipantSummary } from "../server/participants";
import type { ParticipantProgress } from "../server/progress";
import { formatDuration } from "./shared";

export function ParticipantsTable({
  participants,
  base,
  totalSessions,
}: {
  participants: ParticipantSummary[];
  base: string;
  totalSessions: number;
}) {
  const router = useRouter();
  if (participants.length === 0) {
    return <p className="text-muted-foreground text-sm">No participants yet.</p>;
  }
  return (
    <div className="border-border overflow-x-auto rounded-md border">
      <table className="w-full min-w-[1280px] text-left text-sm">
        <thead className="bg-muted/60 text-xs">
          <tr>
            <th className="px-3 py-2 font-semibold">Started</th>
            <th className="px-3 py-2 font-semibold">Language · Canton</th>
            <th className="px-3 py-2 font-semibold">Topics answered</th>
            <th className="px-3 py-2 font-semibold">Other chats</th>
            <th className="px-3 py-2 font-semibold">NPS</th>
            <th
              className="px-3 py-2 font-semibold"
              title="The free text written alongside the NPS score at the finale. Optional, so most scores have none."
            >
              Written feedback
            </th>
            <th className="px-3 py-2 font-semibold">Quote interviewer</th>
            <th className="px-3 py-2 font-semibold">Time spent</th>
            <th className="px-3 py-2 font-semibold">How far they got</th>
            <th className="px-3 py-2 font-semibold">Last active</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody className="divide-border divide-y">
          {participants.map((participant) => {
            const href = `${base}/participants/${participant.id}`;
            return (
              <tr
                key={participant.id}
                className="hover:bg-muted/40 cursor-pointer"
                onClick={() => router.push(href)}
              >
                <td className="whitespace-nowrap px-3 py-2">
                  {formatDate(participant.createdAt)}
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <LanguageCanton participant={participant} />
                </td>
                <td className="px-3 py-2 font-mono tabular-nums">
                  {participant.answeredTopics}/{participant.totalTopics}
                </td>
                <td
                  className="whitespace-nowrap px-3 py-2 tabular-nums"
                  title="MCQ 'Other…' answers the participant shaped with the AI"
                >
                  {participant.otherChatCount > 0 ? (
                    participant.otherChatCount
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td
                  className="whitespace-nowrap px-3 py-2 tabular-nums"
                  title="Net Promoter Score (0–10) given at the finale"
                >
                  {participant.nps !== null ? (
                    <span>
                      {participant.nps}
                      <span className="text-muted-foreground">/10</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="max-w-xs px-3 py-2" title={participant.npsComment ?? undefined}>
                  {participant.npsComment ? (
                    <span className="line-clamp-2">{participant.npsComment}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td
                  className="whitespace-nowrap px-3 py-2 tabular-nums"
                  title="Participant replies in the end-of-dialogue quote interview (assistant turns and skip messages excluded)"
                >
                  {participant.quoteInterviewReplies > 0 ? (
                    formatReplies(participant.quoteInterviewReplies)
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td
                  className="text-muted-foreground whitespace-nowrap px-3 py-2"
                  title={`Active time, excluding idle gaps over 30 min. Total elapsed: ${formatDuration(participant.elapsedMs)}.`}
                >
                  {participant.activeMs > 0
                    ? formatDuration(participant.activeMs)
                    : "—"}
                </td>
                <td className="px-3 py-2">
                  <StatusBadge progress={participant.progress} />
                </td>
                <td className="text-muted-foreground whitespace-nowrap px-3 py-2">
                  {formatDate(participant.lastActiveAt)}
                </td>
                <td className="px-3 py-2" onClick={(event) => event.stopPropagation()}>
                  <Link
                    className="text-secondary whitespace-nowrap text-xs font-medium underline"
                    href={href}
                  >
                    View →
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {totalSessions > participants.length && (
        <p className="text-muted-foreground border-border border-t px-3 py-2 text-xs">
          Showing the {participants.length} most recent of {totalSessions}{" "}
          participants.
        </p>
      )}
    </div>
  );
}

function LanguageCanton({ participant }: { participant: ParticipantSummary }) {
  const { locale, startLocale, endLocale, canton, languageSwitched } =
    participant;
  const startEndDiffer =
    startLocale != null && endLocale != null && startLocale !== endLocale;
  const language = startEndDiffer
    ? `${startLocale}→${endLocale}`
    : (startLocale ?? locale);
  const showSwitchMarker = languageSwitched && !startEndDiffer;
  const title = startEndDiffer
    ? `Started in ${startLocale!.toUpperCase()}, finished in ${endLocale!.toUpperCase()}`
    : showSwitchMarker
      ? "Answered in more than one language"
      : undefined;
  return (
    <span className="inline-flex items-baseline gap-1.5" title={title}>
      <span className="uppercase">
        {language}
        {canton ? ` · ${canton}` : ""}
      </span>
      {showSwitchMarker && (
        <span className="text-muted-foreground text-[10px] font-medium">⇄</span>
      )}
    </span>
  );
}

function formatReplies(count: number): string {
  return `${count} ${count === 1 ? "reply" : "replies"}`;
}

function StatusBadge({ progress }: { progress: ParticipantProgress }) {
  if (progress.reachedFinale) {
    return (
      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
        Finished
      </span>
    );
  }
  const { step } = progress;
  return (
    <span
      className="bg-amber-500/10 inline-block rounded-full px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400"
      title={step.question}
    >
      {step.phase === "wrap_up"
        ? step.groupTitle
        : `${step.groupIndex}. ${step.groupTitle}`}
      <span className="ml-1 font-mono tabular-nums">
        Q{step.number}/{step.groupTotal}
      </span>
    </span>
  );
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-CH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}
