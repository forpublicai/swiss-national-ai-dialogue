import Link from "next/link";
import { ThumbsDown, ThumbsUp } from "lucide-react";

import { cn } from "@/components/ui";

import type {
  JourneyStep,
  JourneyTopic,
  JourneyWrapUpAnswer,
  ParticipantJourney,
} from "../server/participants";
import { progressLabel } from "../server/progress";
import type {
  SnadChatTurn,
  SnadOption,
  SnadQuestionVerdict,
  SnadSequenceStep,
} from "../types";
import {
  adminBasePath,
  formatDuration,
  formatTimeOnTask,
  type AdminSurface,
} from "./shared";

export function ParticipantJourneyView({
  journey,
  surface,
}: {
  journey: ParticipantJourney;
  surface: AdminSurface;
}) {
  const base = adminBasePath(surface);
  const { session } = journey;
  return (
    <div className="flex flex-col gap-8">
      <header>
        <Link
          className="text-secondary text-sm underline"
          href={`${base}/participants`}
        >
          ← All participants
        </Link>
        <div className="mt-3 flex flex-wrap items-baseline gap-3">
          <h1 className="text-2xl font-bold">
            Participant · {formatDate(session.createdAt)}
          </h1>
          {journey.progress.reachedFinale ? (
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              Finished in{" "}
              {formatDuration(
                session.lastActiveAt.getTime() - session.createdAt.getTime(),
              )}
            </span>
          ) : (
            <span className="bg-amber-500/10 rounded-full px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
              Stopped at {progressLabel(journey.progress)}
            </span>
          )}
        </div>
        <dl className="text-muted-foreground mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs">
          <MetaItem label="Language" value={languageLabel(session)} />
          <MetaItem label="Canton" value={session.canton ?? "—"} />
          <MetaItem
            label="Active time"
            value={`${formatDuration(session.activeMs)} (of ${formatDuration(session.elapsedMs)} elapsed)`}
          />
          <MetaItem label="Last active" value={formatDate(session.lastActiveAt)} />
          <MetaItem label="Survey version" value={journey.versionLabel} />
          {session.archetype && (
            <MetaItem label="Archetype" value={session.archetype} />
          )}
          <MetaItem label="ID" value={session.id} mono />
        </dl>
      </header>

      <section>
        <h2 className="text-lg font-bold">What they did</h2>
        <p className="text-muted-foreground mb-3 text-xs">
          Times are measured from the previous recorded step, and read as blank
          across a break longer than 30 minutes. Sessions from before per-question
          timing shipped show one figure for a whole topic instead.
        </p>
        <div className="grid gap-3">
          {journey.topics.map((topic, index) => (
            <TopicCard
              key={topic.key}
              topic={topic}
              index={index}
              primaryLocale={session.startLocale ?? session.locale}
            />
          ))}
          <WrapUpCard journey={journey} />
        </div>
      </section>
    </div>
  );
}

function MetaItem({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex gap-1">
      <dt className="font-semibold">{label}:</dt>
      <dd className={mono ? "font-mono" : undefined}>{value}</dd>
    </div>
  );
}

function TopicCard({
  topic,
  index,
  primaryLocale,
}: {
  topic: JourneyTopic;
  index: number;
  primaryLocale: string;
}) {
  const reached = topic.state !== "not_reached";
  const answeredInOtherLanguage =
    topic.answeredLocale != null && topic.answeredLocale !== primaryLocale;
  return (
    <article
      className={`border-border rounded-md border ${reached ? "bg-card" : "bg-muted/30"}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b p-4 pb-3">
        <h3 className={`font-semibold ${reached ? "" : "text-muted-foreground"}`}>
          {index + 1}. {topic.title}
        </h3>
        <div className="flex items-center gap-2">
          {answeredInOtherLanguage && (
            <span className="text-muted-foreground text-[11px] font-medium uppercase">
              Answered in {topic.answeredLocale}
            </span>
          )}
          <TopicTimeOnTask topic={topic} />
          <TopicStateBadge topic={topic} />
        </div>
      </div>
      {reached && (
        <div className="grid gap-4 p-4">
          {topic.steps.map((step, stepIndex) => (
            <StepAnswer key={stepIndex} entry={step} />
          ))}
          {topic.shareMore && (
            <p className="text-muted-foreground text-xs">
              Asked to share more:{" "}
              {topic.shareMore === "talk"
                ? "chose to talk with the AI"
                : "chose to move on"}
            </p>
          )}
          {topic.chat.length > 0 && (
            <ChatTranscript
              title={`Conversation with the AI${topic.chatStatus === "active" ? " (unfinished)" : ""}`}
              turns={topic.chat}
            />
          )}
        </div>
      )}
    </article>
  );
}

function TopicTimeOnTask({ topic }: { topic: JourneyTopic }) {
  if (topic.durationMs === null) return null;
  const timed = topic.steps.filter((entry) => entry.durationMs !== null).length;
  const total = formatTimeOnTask(topic.durationMs);
  return (
    <span
      data-testid="topic-time"
      className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 font-mono text-[11px] tabular-nums"
      title={
        timed > 0
          ? `${total} across ${timed} timed ${timed === 1 ? "question" : "questions"}, summed from each question's own time`
          : `${total} from the previous recorded step to answering this topic — all of its questions together. This session predates per-question timing.`
      }
    >
      {total}
      {timed > 0 && (
        <span className="ml-1 font-sans">
          / {timed} {timed === 1 ? "question" : "questions"}
        </span>
      )}
    </span>
  );
}

function TopicStateBadge({ topic }: { topic: JourneyTopic }) {
  if (topic.state === "answered") {
    return (
      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
        Answered
      </span>
    );
  }
  if (topic.state === "skipped") {
    return (
      <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium">
        Skipped
      </span>
    );
  }
  if (topic.state === "dropped_here") {
    const stopped = topic.steps.find((entry) => entry.droppedHere);
    return (
      <span className="bg-amber-500/10 rounded-full px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
        {stopped ? `Stopped at Q${stopped.number}` : "Stopped here"}
      </span>
    );
  }
  return (
    <span className="text-muted-foreground text-xs">Not reached</span>
  );
}

function StepAnswer({ entry }: { entry: JourneyStep }) {
  return (
    <div
      className={
        entry.droppedHere
          ? "border-l-2 border-amber-500/60 pl-3 -ml-3"
          : undefined
      }
    >
      <div className="flex items-baseline gap-2">
        <span className="text-muted-foreground shrink-0 font-mono text-xs">
          Q{entry.number}
        </span>
        <p className="text-sm font-medium">{questionOf(entry.step)}</p>
        {entry.durationMs !== null && (
          <span
            data-testid="question-time"
            className="text-muted-foreground shrink-0 font-mono text-[11px] tabular-nums"
            title="Time from the previous recorded step to answering this question"
          >
            {formatTimeOnTask(entry.durationMs)}
          </span>
        )}
      </div>
      <div className="mt-1 pl-7">
        <AnswerValue entry={entry} />
        {entry.droppedHere && <StoppedHere />}
      </div>
      {entry.otherChat.length > 0 && (
        <div className="mt-2">
          <ChatTranscript
            title="“Other…” answer shaped with the AI"
            turns={entry.otherChat}
          />
        </div>
      )}
      {entry.feedback && <QuestionVerdict feedback={entry.feedback} />}
    </div>
  );
}

function QuestionVerdict({ feedback }: { feedback: SnadQuestionVerdict }) {
  const Icon =
    feedback.rating === "up"
      ? ThumbsUp
      : feedback.rating === "down"
        ? ThumbsDown
        : null;
  return (
    <div className="text-muted-foreground mt-2 flex items-start gap-2 text-xs">
      {Icon && (
        <Icon
          className={cn(
            "mt-0.5 size-3.5 shrink-0",
            feedback.rating === "up" ? "text-emerald-600" : "text-rose-600",
          )}
          aria-label={
            feedback.rating === "up"
              ? "Rated a good question"
              : "Rated a poor question"
          }
        />
      )}
      <span>
        <span className="font-medium">Feedback on this question</span>
        {feedback.note && <>: “{feedback.note}”</>}
      </span>
    </div>
  );
}

function StoppedHere() {
  return (
    <p className="mt-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
      Stopped here
    </p>
  );
}

function questionOf(step: SnadSequenceStep): string {
  return "question" in step && step.question ? step.question : "(untitled question)";
}

function NoAnswer() {
  return <p className="text-muted-foreground text-sm italic">Not answered</p>;
}

function optionLabel(options: SnadOption[], value: string): string {
  const match = options.find(
    (option) => option.id === value || option.label === value,
  );
  return match?.label ?? value;
}

function AnswerValue({ entry }: { entry: JourneyStep }) {
  const { step, answer } = entry;
  if (!answer || typeof answer !== "object") return <NoAnswer />;
  const value = answer as Record<string, unknown>;

  if (step.kind === "binary") {
    const choice = value.choice === "a" ? step.option_a : value.choice === "b" ? step.option_b : null;
    if (!choice) return <NoAnswer />;
    return <AnswerChips values={[choice.label]} />;
  }

  if (step.kind === "question") {
    if (value.skipped === true) {
      return <p className="text-muted-foreground text-sm italic">Skipped</p>;
    }
    const selected = Array.isArray(value.selected)
      ? value.selected.filter((item): item is string => typeof item === "string")
      : [];
    const other = typeof value.other === "string" ? value.other.trim() : "";
    if (selected.length === 0 && !other) return <NoAnswer />;
    return (
      <div className="grid gap-1">
        {selected.length > 0 && (
          <AnswerChips
            values={selected.map((item) => optionLabel(step.options, item))}
          />
        )}
        {other && <Quote text={`Other: ${other}`} />}
      </div>
    );
  }

  if (step.kind === "ranking") {
    const order = Array.isArray(value.order)
      ? value.order.filter((item): item is string => typeof item === "string")
      : [];
    if (order.length === 0) return <NoAnswer />;
    const other = typeof value.other === "string" ? value.other.trim() : "";
    return (
      <div className="grid gap-1">
        <ol className="grid gap-0.5">
          {order.map((item, index) => (
            <li key={index} className="flex items-baseline gap-2 text-sm">
              <span className="text-muted-foreground w-4 text-right font-mono text-xs">
                {index + 1}.
              </span>
              {optionLabel(step.options, item)}
            </li>
          ))}
        </ol>
        {other && <Quote text={other} />}
      </div>
    );
  }

  if (step.kind === "slider") {
    const position = typeof value.position === "number" ? value.position : null;
    if (position === null) return <NoAnswer />;
    return (
      <div className="max-w-md">
        <div className="bg-muted relative h-2 rounded-full">
          <div
            className="bg-primary absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ left: `${position}%` }}
          />
        </div>
        <div className="text-muted-foreground mt-1 flex justify-between text-xs">
          <span>{step.min_label}</span>
          <span>{step.max_label}</span>
        </div>
      </div>
    );
  }

  if (step.kind === "budget") {
    const allocation =
      value.allocation && typeof value.allocation === "object"
        ? Object.entries(value.allocation as Record<string, unknown>).filter(
            (pair): pair is [string, number] =>
              typeof pair[1] === "number" && pair[1] > 0,
          )
        : [];
    if (allocation.length === 0) return <NoAnswer />;
    return (
      <div className="grid max-w-md gap-1">
        {allocation.map(([label, units]) => (
          <div key={label} className="grid grid-cols-[1fr_auto] gap-3 text-sm">
            <span>{optionLabel(step.options, label)}</span>
            <span className="font-mono text-xs tabular-nums">
              {units} / {step.total}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <p className="text-muted-foreground break-all font-mono text-xs">
      {JSON.stringify(answer)}
    </p>
  );
}

function AnswerChips({ values }: { values: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((value, index) => (
        <span
          key={index}
          className="bg-primary/10 rounded-full px-2.5 py-0.5 text-sm"
        >
          {value}
        </span>
      ))}
    </div>
  );
}

function Quote({ text }: { text: string }) {
  return (
    <p className="border-border bg-muted/40 rounded-md border-l-2 px-3 py-1.5 text-sm">
      {text}
    </p>
  );
}

function ChatTranscript({
  title,
  turns,
}: {
  title: string;
  turns: SnadChatTurn[];
}) {
  return (
    <div>
      <p className="text-muted-foreground mb-2 text-[11px] font-semibold uppercase tracking-wider">
        {title}
      </p>
      <div className="grid gap-2">
        {turns.map((turn, index) => (
          <div
            key={index}
            className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
              turn.role === "user"
                ? "bg-primary/10 justify-self-end"
                : "bg-muted justify-self-start"
            }`}
          >
            <span className="text-muted-foreground mr-2 text-[10px] font-semibold uppercase">
              {turn.role === "user" ? "Participant" : "AI"}
            </span>
            {turn.content}
          </div>
        ))}
      </div>
    </div>
  );
}

function WrapUpCard({ journey }: { journey: ParticipantJourney }) {
  const { progress } = journey;
  const reachedWrapUp = progress.step.phase === "wrap_up";
  return (
    <article
      className={`border-border rounded-md border ${reachedWrapUp ? "bg-card" : "bg-muted/30"}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b p-4 pb-3">
        <h3 className={`font-semibold ${reachedWrapUp ? "" : "text-muted-foreground"}`}>
          Wrap-up & closing
        </h3>
        {!reachedWrapUp ? (
          <span className="text-muted-foreground text-xs">Not reached</span>
        ) : progress.reachedFinale ? (
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            Reached the finale
          </span>
        ) : (
          <span
            className="bg-amber-500/10 rounded-full px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400"
            title={progress.step.question}
          >
            Stopped at page {progress.step.number} of {progress.step.groupTotal}
          </span>
        )}
      </div>
      {reachedWrapUp && (
        <div className="grid gap-6 p-4">
          <WrapUpAnswers answers={journey.wrapUpAnswers} />
          {journey.shapeSuggestion && (
            <NextQuestion suggestion={journey.shapeSuggestion} />
          )}
          {journey.nps && <NpsAnswer nps={journey.nps} />}
          <QuoteInterview
            turns={journey.quoteInterview}
            quote={journey.closingQuote}
          />
          {journey.email && <EmailOptIn email={journey.email} />}
        </div>
      )}
    </article>
  );
}

function NextQuestion({ suggestion }: { suggestion: string }) {
  return (
    <div>
      <p className="text-sm font-medium">
        Their question for the next round
        <span className="text-muted-foreground ml-1 font-normal">
          (what they want the dialogue to ask)
        </span>
      </p>
      <div className="mt-1">
        <Quote text={suggestion} />
      </div>
    </div>
  );
}

function NpsAnswer({
  nps,
}: {
  nps: NonNullable<ParticipantJourney["nps"]>;
}) {
  return (
    <div>
      <p className="text-sm font-medium">
        Net Promoter Score
        <span className="text-muted-foreground ml-1 font-normal">
          (how likely to recommend)
        </span>
      </p>
      <div className="mt-1 grid gap-1">
        <span className="bg-primary/10 w-fit rounded-full px-2.5 py-0.5 text-sm font-semibold tabular-nums">
          {nps.score} / 10
        </span>
        {nps.comment && <Quote text={nps.comment} />}
      </div>
    </div>
  );
}

function QuoteInterview({
  turns,
  quote,
}: {
  turns: SnadChatTurn[];
  quote: ParticipantJourney["closingQuote"];
}) {
  if (turns.length === 0 && !quote) {
    return (
      <p className="text-muted-foreground text-sm">No quote interview.</p>
    );
  }
  return (
    <div className="grid gap-3">
      {turns.length > 0 && (
        <ChatTranscript title="Quote interview (with the AI)" turns={turns} />
      )}
      {quote && <ProducedQuote quote={quote} />}
    </div>
  );
}

function ProducedQuote({
  quote,
}: {
  quote: NonNullable<ParticipantJourney["closingQuote"]>;
}) {
  return (
    <div>
      <p className="text-muted-foreground mb-2 text-[11px] font-semibold uppercase tracking-wider">
        Quote written for the wall
      </p>
      <Quote text={quote.text} />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <QuoteStatusBadge status={quote.status} />
        {quote.featured && (
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            Featured
          </span>
        )}
        {quote.canton && (
          <span className="text-muted-foreground text-[11px] font-medium uppercase">
            {quote.canton}
          </span>
        )}
      </div>
    </div>
  );
}

function QuoteStatusBadge({
  status,
}: {
  status: NonNullable<ParticipantJourney["closingQuote"]>["status"];
}) {
  if (status === "approved") {
    return (
      <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium">
        Approved
      </span>
    );
  }
  if (status === "hidden") {
    return (
      <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium">
        Hidden
      </span>
    );
  }
  return (
    <span className="bg-amber-500/10 rounded-full px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
      Pending moderation
    </span>
  );
}

function EmailOptIn({ email }: { email: string }) {
  return (
    <div>
      <p className="flex items-center gap-2 text-sm font-medium">
        Results email
        <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
          Personal data
        </span>
      </p>
      <div className="mt-1">
        <Quote text={email} />
      </div>
    </div>
  );
}

function WrapUpAnswers({ answers }: { answers: JourneyWrapUpAnswer[] }) {
  const answered = answers.filter(
    (entry) =>
      (entry.answer && typeof entry.answer === "object") || entry.droppedHere,
  );
  if (answered.length === 0) return null;
  return (
    <div className="grid gap-3">
      {answered.map((entry, index) => (
        <WrapUpAnswerRow key={index} entry={entry} />
      ))}
    </div>
  );
}

function WrapUpAnswerRow({ entry }: { entry: JourneyWrapUpAnswer }) {
  const { step, answer } = entry;
  if (step.kind !== "question") return null;
  const value = answer as Record<string, unknown>;
  const choice = typeof value.choice === "string" ? value.choice : null;
  const other = typeof value.other === "string" ? value.other.trim() : "";
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="text-muted-foreground shrink-0 font-mono text-xs">
          Q{entry.number}
        </span>
        <p className="text-sm font-medium">{questionOf(step)}</p>
        {entry.durationMs !== null && (
          <span
            className="text-muted-foreground shrink-0 font-mono text-[11px] tabular-nums"
            title="Time from the previous recorded step to answering this question"
          >
            {formatTimeOnTask(entry.durationMs)}
          </span>
        )}
      </div>
      <div className="mt-1 grid gap-1 pl-7">
        {choice && <AnswerChips values={[optionLabel(step.options, choice)]} />}
        {other && <Quote text={`Other: ${other}`} />}
        {!choice && !other && <NoAnswer />}
        {entry.droppedHere && <StoppedHere />}
      </div>
      {entry.otherChat.length > 0 && (
        <div className="mt-2">
          <ChatTranscript
            title="“Other…” answer shaped with the AI"
            turns={entry.otherChat}
          />
        </div>
      )}
    </div>
  );
}

function languageLabel(session: ParticipantJourney["session"]): string {
  const { locale, startLocale, endLocale } = session;
  if (startLocale != null && endLocale != null && startLocale !== endLocale) {
    return `${startLocale.toUpperCase()} → ${endLocale.toUpperCase()}`;
  }
  return (startLocale ?? locale).toUpperCase();
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-CH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}
