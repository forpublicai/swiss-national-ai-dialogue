import Link from "next/link";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { snadStudyVersions } from "../server/db-schema";

import { listParticipants } from "../server/participants";
import { listSnadPollSummaries } from "../server/polls";
import {
  listQuestionDiagnostics,
  type QuestionDiagnostic,
} from "../server/question-stats";
import {
  ensureActiveStudyVersion,
  parsePinnedStudyDefinition,
} from "../server/study";
import type { SnadStudyDefinition, StoredOpenerSpec } from "../types";
import { SnadThemeScope } from "../ThemedRoot";
import {
  QuestionResultCard,
  type ResultCardModel,
} from "./QuestionResultCard";
import { QuestionFunnel } from "./QuestionFunnel";
import { AdminTabs, adminBasePath, type AdminSurface } from "./shared";

export async function SnadQuestionsView({ surface }: { surface: AdminSurface }) {
  const base = adminBasePath(surface);
  const active = await ensureActiveStudyVersion();
  const [{ participants }, polls, diagnostics, [activeRow]] = await Promise.all([
    listParticipants(),
    listSnadPollSummaries(),
    listQuestionDiagnostics(),
    db
      .select({ definition: snadStudyVersions.definition })
      .from(snadStudyVersions)
      .where(eq(snadStudyVersions.id, active.id))
      .limit(1),
  ]);
  const definition = activeRow
    ? parsePinnedStudyDefinition(activeRow.definition)
    : null;
  if (!definition) {
    return <p className="text-muted-foreground text-sm">No active survey.</p>;
  }
  const pollByOpener = new Map(polls.map((poll) => [poll.openerId, poll]));
  const diagnosticByOpener = new Map(
    diagnostics.map((diagnostic) => [diagnostic.openerId, diagnostic]),
  );
  const topics = specsOf(definition);
  const questionById = new Map(
    topics.flatMap(({ specs }) =>
      specs.map((spec) => [spec.id, spec.question.en] as const),
    ),
  );

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-bold">Swiss National AI Dialogue</h1>
        <AdminTabs surface={surface} current="questions" />
      </header>

      <NeedsAttention
        diagnostics={diagnostics}
        questionById={questionById}
        base={base}
      />

      <section>
        <h2 className="text-lg font-bold">Results, question by question</h2>
        <p className="text-muted-foreground mb-4 mt-0.5 text-xs">
          Each question is shown the way participants see it after answering —
          same card, same reveal. The strip below each card carries its health:
          answers, skips, thumbs, and how one-sided the answers are. To change
          or replace a question, use{" "}
          <Link className="underline" href={`${base}/editor`}>
            Survey settings
          </Link>
          .
        </p>
        <SnadThemeScope>
          <div className="flex flex-col gap-6">
            {topics.map(({ topic, specs }) => (
              <section key={topic.key}>
                <h3 className="text-muted-foreground mb-3 text-[11px] font-semibold uppercase tracking-wider">
                  {topic.title}
                </h3>
                <div className="gap-4 [column-count:1] xl:[column-count:2]">
                  {specs.map((spec) => {
                    const model = toModel(spec);
                    if (!model) return null;
                    const poll = pollByOpener.get(spec.id) ?? null;
                    return (
                      <div
                        key={spec.id}
                        id={`q-${spec.id}`}
                        className="mb-4 break-inside-avoid scroll-mt-24"
                      >
                        <QuestionResultCard
                          model={model}
                          poll={poll ? { total: poll.total, values: poll.values } : null}
                          diagnostic={diagnosticByOpener.get(spec.id) ?? null}
                        />
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </SnadThemeScope>
      </section>

      <section>
        <h2 className="text-lg font-bold">Where participants stop</h2>
        <p className="text-muted-foreground mb-3 mt-0.5 text-xs">
          One row per question, in the order they are asked. “Reached” counts
          everyone who got at least this far; “stopped here” is how many never
          got past it.
        </p>
        <QuestionFunnel participants={participants} definition={definition} />
      </section>
    </div>
  );
}

const ATTENTION_MIN_ELIGIBLE = 30;

function NeedsAttention({
  diagnostics,
  questionById,
  base,
}: {
  diagnostics: QuestionDiagnostic[];
  questionById: Map<string, string>;
  base: string;
}) {
  const known = diagnostics.filter((diagnostic) =>
    questionById.has(diagnostic.openerId),
  );
  const skipped = known
    .filter(
      (diagnostic) =>
        diagnostic.eligible >= ATTENTION_MIN_ELIGIBLE && diagnostic.skipRate > 0,
    )
    .sort((left, right) => right.skipRate - left.skipRate)
    .slice(0, 5);
  const disliked = known
    .filter((diagnostic) => diagnostic.thumbsDown > 0)
    .sort((left, right) => right.thumbsDown - left.thumbsDown)
    .slice(0, 5);
  const oneSided = known
    .filter(
      (diagnostic) =>
        diagnostic.answered >= ATTENTION_MIN_ELIGIBLE &&
        (diagnostic.consensus ?? 0) >= 0.7,
    )
    .sort((left, right) => (right.consensus ?? 0) - (left.consensus ?? 0))
    .slice(0, 5);
  if (skipped.length === 0 && disliked.length === 0 && oneSided.length === 0) {
    return null;
  }
  return (
    <section>
      <h2 className="text-lg font-bold">Questions worth a look</h2>
      <p className="text-muted-foreground mb-3 mt-0.5 text-xs">
        High skips and thumbs-down suggest a question annoys or overwhelms;
        a one-sided result means near-everyone already agrees — the question
        yields little signal and its slot could carry a sharper trade-off.
      </p>
      <div className="grid gap-3 md:grid-cols-3">
        <AttentionList
          title="Most skipped"
          rows={skipped.map((diagnostic) => ({
            id: diagnostic.openerId,
            question: questionById.get(diagnostic.openerId) ?? diagnostic.openerId,
            metric: `${Math.round(diagnostic.skipRate * 100)}% skip`,
          }))}
        />
        <AttentionList
          title="Thumbs-down"
          rows={disliked.map((diagnostic) => ({
            id: diagnostic.openerId,
            question: questionById.get(diagnostic.openerId) ?? diagnostic.openerId,
            metric: `👎 ${diagnostic.thumbsDown} · 👍 ${diagnostic.thumbsUp}`,
          }))}
        />
        <AttentionList
          title="Everyone agrees"
          rows={oneSided.map((diagnostic) => ({
            id: diagnostic.openerId,
            question: questionById.get(diagnostic.openerId) ?? diagnostic.openerId,
            metric: `${Math.round((diagnostic.consensus ?? 0) * 100)}% one answer`,
          }))}
        />
      </div>
      <p className="text-muted-foreground mt-2 text-xs">
        Click a question to jump to its results; edit it in{" "}
        <Link className="underline" href={`${base}/editor`}>
          Survey settings
        </Link>
        .
      </p>
    </section>
  );
}

function AttentionList({
  title,
  rows,
}: {
  title: string;
  rows: { id: string; question: string; metric: string }[];
}) {
  return (
    <div className="border-border bg-card rounded-md border p-4">
      <p className="text-sm font-semibold">{title}</p>
      {rows.length === 0 ? (
        <p className="text-muted-foreground mt-2 text-xs">
          Nothing stands out.
        </p>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {rows.map((row) => (
            <li key={row.id} className="text-sm leading-snug">
              <a href={`#q-${row.id}`} className="group flex items-baseline gap-2">
                <span className="min-w-0 flex-1 truncate group-hover:underline">
                  {row.question}
                </span>
                <span className="text-muted-foreground shrink-0 font-mono text-[11px] tabular-nums">
                  {row.metric}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function specsOf(definition: SnadStudyDefinition) {
  return definition.topics.map((topic) => ({
    topic,
    specs: topic.openers.sequence
      .flatMap((step) => (step.mode === "always" ? [step.opener] : step.pool))
      .filter((spec) => spec.kind !== "interviewer"),
  }));
}

function toModel(spec: StoredOpenerSpec): ResultCardModel | null {
  if (spec.kind === "binary") {
    return {
      kind: "binary",
      id: spec.id,
      question: spec.question.en,
      optionA: {
        key: "a",
        label: spec.optionA.label.en,
        description: spec.optionA.description?.en,
      },
      optionB: {
        key: "b",
        label: spec.optionB.label.en,
        description: spec.optionB.description?.en,
      },
    };
  }
  if (spec.kind === "question") {
    return {
      kind: "question",
      id: spec.id,
      question: spec.question.en,
      multiSelect: spec.multiSelect,
      options: spec.options.map((option) => ({
        key: option.id,
        label: option.label.en,
        description: option.description?.en,
      })),
    };
  }
  if (spec.kind === "ranking") {
    return {
      kind: "ranking",
      id: spec.id,
      question: spec.question.en,
      options: spec.options.map((option) => ({
        key: option.id,
        label: option.label.en,
      })),
    };
  }
  if (spec.kind === "slider") {
    return {
      kind: "slider",
      id: spec.id,
      question: spec.question.en,
      minLabel: spec.minLabel.en,
      maxLabel: spec.maxLabel.en,
    };
  }
  if (spec.kind === "budget") {
    return {
      kind: "budget",
      id: spec.id,
      question: spec.question.en,
      total: spec.total,
      options: spec.options.map((option) => ({
        key: option.id,
        label: option.label.en,
      })),
    };
  }
  return null;
}
