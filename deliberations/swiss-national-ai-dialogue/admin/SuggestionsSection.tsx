import { LANGUAGE_NAME } from "../server/constants";
import type { ParticipantSummary } from "../server/participants";

export function SuggestionsSection({
  participants,
}: {
  participants: ParticipantSummary[];
}) {
  const suggestions = participants.flatMap((participant) =>
    participant.shapeSuggestion
      ? [
          {
            text: participant.shapeSuggestion,
            locale: participant.startLocale ?? participant.locale,
            canton: participant.canton,
          },
        ]
      : [],
  );
  const reached = participants.filter((participant) =>
    REACHED_SHAPE_KINDS.has(participant.progress.step.kind),
  ).length;

  if (suggestions.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No suggested questions yet.
      </p>
    );
  }

  return (
    <div className="border-border bg-card rounded-md border p-4">
      <p className="text-sm font-semibold">
        {suggestions.length} suggested question
        {suggestions.length === 1 ? "" : "s"}
        {reached > 0 && (
          <span className="text-muted-foreground ml-1 font-normal">
            from {reached} participants who reached the page
          </span>
        )}
      </p>
      <ul className="mt-3 flex max-h-96 flex-col gap-2 overflow-y-auto pr-1">
        {suggestions.map((suggestion, index) => (
          <li key={index} className="flex items-start gap-2.5 text-sm">
            <span className="text-muted-foreground mt-0.5 w-7 shrink-0 text-center font-mono text-[11px] font-semibold uppercase">
              {suggestion.canton ?? "—"}
            </span>
            <span className="min-w-0">
              {suggestion.text}
              <span className="text-muted-foreground ml-1.5 text-[11px]">
                {LANGUAGE_NAME[
                  suggestion.locale as keyof typeof LANGUAGE_NAME
                ]?.split(" ")[0] ?? suggestion.locale}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const REACHED_SHAPE_KINDS = new Set(["shape", "closing", "finale"]);
