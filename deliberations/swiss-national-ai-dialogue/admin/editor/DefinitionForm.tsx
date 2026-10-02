"use client";

import type {
  OpenerStep,
  SnadActor,
  SnadOnboarding,
  SnadStudyDefinition,
  SnadTopic,
  StoredOpenerSpec,
} from "../../types";
import { PERSONA_OPENER_IDS } from "../../archetype";

import { DEFAULT_CLOSING } from "../../closing-default";
import { STAGE_TITLES, TOPIC_INTROS } from "../../i18n";
import {
  earlierOptionSources,
  earlierWrapUpSources,
  specsOfStep,
} from "./draft";
import {
  ArchetypeScoringView,
  InterviewerPromptsView,
  UiStringsView,
} from "./UnderTheHood";
import {
  Badge,
  Field,
  LocalizedTextField,
  ReadOnlyField,
  SectionCard,
  SmallButton,
  TextArea,
  TextInput,
} from "./fields";
import { KIND_LABELS, SpecEditor } from "./SpecEditor";

type Mutate = (fn: (definition: SnadStudyDefinition) => void) => void;

function ActorFields({
  actor,
  promptLabel,
  promptHint,
  modelHint,
}: {
  actor: SnadActor;
  promptLabel?: string;
  promptHint?: string;
  modelHint?: string;
}) {
  return (
    <div className="grid gap-3">
      {promptLabel && (
        <ReadOnlyField
          label={promptLabel}
          hint={promptHint}
          value={actor.prompt}
          tag="not used"
        />
      )}
      <ReadOnlyField label="Model" hint={modelHint} value={actor.model} tag="not used" />
    </div>
  );
}

function variantsHint(step: OpenerStep): string | null {
  if (step.mode === "rotate") {
    return "Each participant sees ONE of these variants — they rotate between participants.";
  }
  if (step.mode === "drawN") {
    return `Each participant sees ${step.n} of these ${step.pool.length} variants.`;
  }
  return null;
}

function shownCount(step: OpenerStep): number {
  return step.mode === "drawN" ? step.n : 1;
}

function questionPreview(spec: StoredOpenerSpec | undefined): string {
  const text = (spec?.question.en ?? "").trim() || "(untitled question)";
  return text.length > 80 ? `${text.slice(0, 80)}…` : text;
}

function StepEditor({
  topic,
  step,
  stepIndex,
  mutateTopic,
  archetypeOpenerIds,
}: {
  topic: SnadTopic;
  step: OpenerStep;
  stepIndex: number;
  mutateTopic: (fn: (draft: SnadTopic) => void) => void;
  archetypeOpenerIds: ReadonlySet<string>;
}) {
  const sources = earlierOptionSources(topic.openers.sequence, stepIndex);
  const specs = specsOfStep(step);
  const isPool = step.mode !== "always";
  const hint = variantsHint(step);
  const sharedKind = specs.every((spec) => spec.kind === specs[0]?.kind)
    ? specs[0]?.kind
    : null;

  return (
    <details className="border-border bg-background/50 rounded-md border">
      <summary className="flex cursor-pointer flex-wrap items-center gap-2 p-3">
        {isPool ? (
          <>
            <span className="text-sm font-medium">
              {specs.length} question variants
            </span>
            <Badge tone="info">
              shows {shownCount(step)} of {specs.length}
            </Badge>
            {sharedKind && <Badge>{KIND_LABELS[sharedKind]}</Badge>}
          </>
        ) : (
          <>
            {specs[0] && <Badge>{KIND_LABELS[specs[0].kind]}</Badge>}
            <span className="text-sm font-medium">{questionPreview(specs[0])}</span>
          </>
        )}
      </summary>
      <div className="border-t p-3">
        {hint && (
          <p className="text-muted-foreground mb-3 text-xs font-medium">{hint}</p>
        )}
        <div className="grid gap-3">
          {specs.map((spec, specIndex) => {
            const editor = (
              <SpecEditor
                spec={spec}
                sources={sources}
                archetypeReferenced={archetypeOpenerIds.has(spec.id)}
                onChange={(next) =>
                  mutateTopic((draft) => {
                    const target = draft.openers.sequence[stepIndex]!;
                    if (target.mode === "always") target.opener = next;
                    else target.pool[specIndex] = next;
                  })
                }
              />
            );
            if (specs.length === 1) return <div key={spec.id}>{editor}</div>;
            return (
              <details key={spec.id} className="border-border rounded-md border">
                <summary className="flex cursor-pointer flex-wrap items-baseline gap-2 p-3">
                  <span className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
                    Variant {specIndex + 1} of {specs.length}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {questionPreview(spec)}
                  </span>
                </summary>
                <div className="border-t p-3">{editor}</div>
              </details>
            );
          })}
        </div>
      </div>
    </details>
  );
}

function TopicEditor({
  definition,
  topic,
  topicIndex,
  mutate,
  archetypeOpenerIds,
}: {
  definition: SnadStudyDefinition;
  topic: SnadTopic;
  topicIndex: number;
  mutate: Mutate;
  archetypeOpenerIds: ReadonlySet<string>;
}) {
  const mutateTopic = (fn: (draft: SnadTopic) => void) =>
    mutate((draft) => fn(draft.topics[topicIndex]!));
  const actor = definition.aiActors[topic.actorId];
  const shownTitle = STAGE_TITLES.en[topic.key] ?? topic.title;
  const intro = TOPIC_INTROS.en[topic.key];
  const shownDescription = intro
    ? `${intro.about} ${intro.purpose}`
    : topic.blurb;

  return (
    <details className="border-border bg-card rounded-md border">
      <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 p-4">
        <span className="font-semibold">
          {topicIndex + 1}. {shownTitle || "(untitled topic)"}
        </span>
      </summary>
      <div className="grid gap-3 border-t p-4">
        <ReadOnlyField
          label="Topic title"
          hint="set in code (i18n), keyed by topic and localized per language"
          value={shownTitle}
        />
        <ReadOnlyField
          label="Short description"
          hint="the intro shown under the title is set in code (i18n), not on this version"
          value={shownDescription}
        />

        <div>
          <p className="text-muted-foreground mb-2 text-[11px] font-semibold uppercase tracking-wider">
            Questions
          </p>
          <div className="grid gap-3">
            {topic.openers.sequence.map((step, stepIndex) => (
              <StepEditor
                key={step.id}
                topic={topic}
                step={step}
                stepIndex={stepIndex}
                mutateTopic={mutateTopic}
                archetypeOpenerIds={archetypeOpenerIds}
              />
            ))}
          </div>
        </div>

        <details>
          <summary className="text-muted-foreground cursor-pointer text-xs">
            Advanced
          </summary>
          <div className="mt-2 grid gap-3">
            <Field label="Internal rationale" hint="never shown to participants; an editing note kept with this version">
              <TextArea
                value={topic.rationale}
                rows={2}
                ariaLabel={`Rationale for topic ${topic.key}`}
                onChange={(rationale) =>
                  mutateTopic((draft) => void (draft.rationale = rationale))
                }
              />
            </Field>
            {actor ? (
              <ActorFields
                actor={actor}
                modelHint="not used at runtime; per-topic AI interviewers are retired"
              />
            ) : (
              <p className="text-destructive text-xs">
                Missing actor &lsquo;{topic.actorId}&rsquo; — this fails
                validation.
              </p>
            )}
          </div>
        </details>
      </div>
    </details>
  );
}

const ONBOARDING_BEATS: { key: keyof SnadOnboarding; label: string }[] = [
  { key: "cantonQuestion", label: "Canton question" },
  { key: "cantonWhy", label: "Canton subtitle" },
  { key: "continueLabel", label: "Continue button" },
];

function OnboardingSection({
  definition,
  mutate,
}: {
  definition: SnadStudyDefinition;
  mutate: Mutate;
}) {
  const onboarding = definition.onboarding;
  if (!onboarding) {
    return (
      <SectionCard
        title="Onboarding"
        subtitle="The canton question shown before the dialogue starts."
      >
        <p className="text-muted-foreground text-sm">
          This version predates editable onboarding copy. Publish once on the
          current app version to start editing it here.
        </p>
      </SectionCard>
    );
  }
  return (
    <SectionCard
      title="Onboarding"
      subtitle="The canton question shown before the dialogue starts."
      defaultOpen={false}
    >
      <div className="grid gap-3">
        {ONBOARDING_BEATS.map((beat) => (
          <LocalizedTextField
            key={beat.key}
            label={beat.label}
            value={onboarding[beat.key]}
            onChange={(locale, text) =>
              mutate((draft) => {
                draft.onboarding![beat.key][locale] = text;
              })
            }
          />
        ))}
      </div>
    </SectionCard>
  );
}

function WrapUpQuestionsSection({
  definition,
  mutate,
  archetypeOpenerIds,
}: {
  definition: SnadStudyDefinition;
  mutate: Mutate;
  archetypeOpenerIds: ReadonlySet<string>;
}) {
  const questions = definition.wrapUp.questions ?? [];
  if (questions.length === 0) return null;
  return (
    <div>
      <p className="text-muted-foreground mb-2 text-[11px] font-semibold uppercase tracking-wider">
        1. Wrap-up questions ({questions.length})
      </p>
      <div className="grid gap-3">
        {questions.map((spec, index) => (
          <details
            key={spec.id}
            className="border-border bg-background/50 rounded-md border"
          >
            <summary className="flex cursor-pointer flex-wrap items-center gap-2 p-3">
              <Badge>{KIND_LABELS[spec.kind]}</Badge>
              <span className="text-sm font-medium">
                {questionPreview(spec)}
              </span>
            </summary>
            <div className="border-t p-3">
              <SpecEditor
                spec={spec}
                sources={earlierWrapUpSources(questions, index)}
                archetypeReferenced={archetypeOpenerIds.has(spec.id)}
                onChange={(next) =>
                  mutate((draft) => {
                    draft.wrapUp.questions![index] = next;
                  })
                }
              />
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

function ClosingSection({
  definition,
  mutate,
}: {
  definition: SnadStudyDefinition;
  mutate: Mutate;
}) {
  const closing = definition.wrapUp.closing;
  if (!closing) {
    return (
      <div className="grid gap-2">
        <p className="text-muted-foreground mb-0 text-[11px] font-semibold uppercase tracking-wider">
          2. Closing interview
        </p>
        <p className="text-muted-foreground text-sm">
          This version has no closing interview (the quote-wall conversation
          before the archetype reveal) — participants get the legacy finale
          feedback chat instead.
        </p>
        <div>
          <SmallButton
            onClick={() =>
              mutate((draft) => {
                draft.wrapUp.closing = structuredClone(DEFAULT_CLOSING);
              })
            }
          >
            + Add the closing interview
          </SmallButton>
        </div>
      </div>
    );
  }
  return (
    <div className="grid gap-3">
      <p className="text-muted-foreground mb-0 text-[11px] font-semibold uppercase tracking-wider">
        2. Closing interview
      </p>
      <LocalizedTextField
        label="Opening question"
        value={closing.question}
        multiline
        onChange={(locale, text) =>
          mutate((draft) => {
            draft.wrapUp.closing!.question[locale] = text;
          })
        }
      />
      <p className="text-muted-foreground text-xs">
        The quote interviewer&rsquo;s own prompts are code-managed; read them
        under &ldquo;AI interviewer prompts&rdquo; below.
      </p>
      <div>
        <SmallButton
          tone="danger"
          onClick={() =>
            mutate((draft) => {
              delete draft.wrapUp.closing;
            })
          }
        >
          Remove the closing interview
        </SmallButton>
      </div>
    </div>
  );
}

export function DefinitionForm({
  definition,
  notes,
  mutate,
  onNotesChange,
}: {
  definition: SnadStudyDefinition;
  notes: string;
  mutate: Mutate;
  onNotesChange: (notes: string) => void;
}) {
  const archetypeOpenerIds = PERSONA_OPENER_IDS;
  const feedbackActor = definition.aiActors[definition.wrapUp.feedbackActorId];

  return (
    <div className="grid gap-6">
      <SectionCard
        title="Name this change"
        subtitle="Shown in the version history so you can find and restore it later."
      >
        <div className="grid gap-3 lg:grid-cols-2">
          <Field label="Name">
            <TextInput
              value={definition.label}
              ariaLabel="Version label"
              onChange={(label) => mutate((draft) => void (draft.label = label))}
            />
          </Field>
          <Field label="Notes" hint="optional — why you made this change">
            <TextArea
              value={notes}
              rows={2}
              ariaLabel="Version notes"
              onChange={onNotesChange}
            />
          </Field>
        </div>
      </SectionCard>

      <OnboardingSection definition={definition} mutate={mutate} />

      <SectionCard
        title="Survey topics & questions"
        subtitle="Edit each question's settings, wording, and options, in the language picked at the top."
      >
        <div className="grid gap-3">
          {definition.topics.map((topic, topicIndex) => (
            <TopicEditor
              key={topic.key}
              definition={definition}
              topic={topic}
              topicIndex={topicIndex}
              mutate={mutate}
              archetypeOpenerIds={archetypeOpenerIds}
            />
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Wrap-up"
        subtitle="What happens after the last topic, in the order the participant meets it: the wrap-up questions, then the closing interview, then the archetype finale."
        defaultOpen={false}
      >
        <WrapUpQuestionsSection
          definition={definition}
          mutate={mutate}
          archetypeOpenerIds={archetypeOpenerIds}
        />

        <ClosingSection definition={definition} mutate={mutate} />

        {feedbackActor ? (
          <div>
            <p className="text-muted-foreground mb-2 text-[11px] font-semibold uppercase tracking-wider">
              {definition.wrapUp.closing
                ? "Interview model"
                : "Feedback interview"}
            </p>
            <ActorFields
              actor={feedbackActor}
              promptLabel={
                definition.wrapUp.closing
                  ? undefined
                  : "Feedback interview prompt (English)"
              }
              promptHint={
                definition.wrapUp.closing
                  ? undefined
                  : "legacy feedback-interview plan, kept on versions with no closing interview. The current runtime uses the closing interview instead and does not read this."
              }
              modelHint="the closing interview is pinned in code to Apertus (server/constants.ts); this value is not read at runtime."
            />
          </div>
        ) : (
          <p className="text-destructive text-xs">
            Missing feedback actor &lsquo;{definition.wrapUp.feedbackActorId}
            &rsquo; — this fails validation.
          </p>
        )}

        <details>
          <summary className="text-muted-foreground cursor-pointer text-xs">
            3. Archetype finale — how it is scored (advanced)
          </summary>
          <div className="mt-2">
            <ArchetypeScoringView definition={definition} />
          </div>
        </details>
      </SectionCard>

      <SectionCard
        title="AI interviewer prompts"
        subtitle="Code-managed and read-only: the prompts behind BOTH AI interviewers — the end-of-dialogue quote interviewer and the “Other…” popup on multiple-choice questions. They share an engine but not their prompts. Edited in the codebase and reviewed by pull request, not here."
        defaultOpen={false}
      >
        <InterviewerPromptsView />
      </SectionCard>

      <SectionCard
        title="App interface text"
        subtitle="Code-managed and read-only: the app's fixed interface copy in all five languages, separate from the survey questions above."
        defaultOpen={false}
      >
        <UiStringsView />
      </SectionCard>
    </div>
  );
}
