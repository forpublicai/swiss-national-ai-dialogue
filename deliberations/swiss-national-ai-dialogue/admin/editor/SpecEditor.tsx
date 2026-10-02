"use client";

import type { ReactNode } from "react";

import type {
  StoredOpenerOption,
  StoredOpenerSpec,
  VisibleWhen,
} from "../../types";

import { blankOption, uniqueId, type ConditionSource } from "./draft";
import {
  Badge,
  Field,
  LocalizedTextField,
  NumberInput,
  RowActions,
  SmallButton,
  TextArea,
  Toggle,
} from "./fields";

export const KIND_LABELS: Record<StoredOpenerSpec["kind"], string> = {
  binary: "Either / or",
  question: "Multiple choice",
  ranking: "Ranking",
  slider: "Slider",
  budget: "Budget split",
  interviewer: "Topic interview",
};

function OptionEditor({
  option,
  onChange,
  showExclusive,
  actions,
}: {
  option: StoredOpenerOption;
  onChange: (next: StoredOpenerOption) => void;
  showExclusive: boolean;
  actions?: ReactNode;
}) {
  const patch = (fn: (draft: StoredOpenerOption) => void) => {
    const next = structuredClone(option);
    fn(next);
    onChange(next);
  };
  return (
    <div className="border-border rounded-md border border-dashed p-2">
      {(showExclusive || actions) && (
        <div className="mb-2 flex items-center justify-end gap-3">
          {showExclusive && (
            <Toggle
              label={'"None of the above"-style (clears other picks)'}
              checked={option.exclusive ?? false}
              onChange={(exclusive) =>
                patch((draft) => {
                  if (exclusive) draft.exclusive = true;
                  else delete draft.exclusive;
                })
              }
            />
          )}
          {actions}
        </div>
      )}
      <div className="grid gap-2">
        <LocalizedTextField
          label="Option label"
          value={option.label}
          onChange={(locale, text) =>
            patch((draft) => void (draft.label[locale] = text))
          }
        />
        {option.description ? (
          <div>
            <LocalizedTextField
              label="Option description"
              value={option.description}
              onChange={(locale, text) =>
                patch((draft) => void (draft.description![locale] = text))
              }
            />
            <div className="mt-1">
              <SmallButton
                onClick={() => patch((draft) => void delete draft.description)}
                tone="danger"
              >
                Remove description
              </SmallButton>
            </div>
          </div>
        ) : (
          <div>
            <SmallButton
              onClick={() =>
                patch(
                  (draft) =>
                    void (draft.description = { en: "", de: "", fr: "", it: "" }),
                )
              }
            >
              + Description
            </SmallButton>
          </div>
        )}
      </div>
    </div>
  );
}

function OptionListEditor({
  specId,
  options,
  onChange,
  showExclusive,
  min,
}: {
  specId: string;
  options: StoredOpenerOption[];
  onChange: (next: StoredOpenerOption[]) => void;
  showExclusive: boolean;
  min: number;
}) {
  return (
    <div className="grid gap-2">
      {options.map((option, index) => (
        <OptionEditor
          key={index}
          option={option}
          showExclusive={showExclusive}
          onChange={(next) =>
            onChange(options.map((item, i) => (i === index ? next : item)))
          }
          actions={
            <RowActions
              onMoveUp={
                index > 0
                  ? () => {
                      const next = [...options];
                      [next[index - 1], next[index]] = [next[index]!, next[index - 1]!];
                      onChange(next);
                    }
                  : undefined
              }
              onMoveDown={
                index < options.length - 1
                  ? () => {
                      const next = [...options];
                      [next[index], next[index + 1]] = [next[index + 1]!, next[index]!];
                      onChange(next);
                    }
                  : undefined
              }
              onRemove={
                options.length > min
                  ? () => onChange(options.filter((_, i) => i !== index))
                  : undefined
              }
            />
          }
        />
      ))}
      <div>
        <SmallButton
          onClick={() =>
            onChange([
              ...options,
              blankOption(
                uniqueId(
                  `${specId}-${options.length + 1}`,
                  new Set(options.map((option) => option.id)),
                ),
              ),
            ])
          }
        >
          + Option
        </SmallButton>
      </div>
    </div>
  );
}

function shortenQuestion(question: string): string {
  const trimmed = question.trim() || "(untitled question)";
  return trimmed.length > 80 ? `${trimmed.slice(0, 80)}…` : trimmed;
}

function VisibleWhenEditor({
  visibleWhen,
  onChange,
  sources,
}: {
  visibleWhen: VisibleWhen | undefined;
  onChange: (next: VisibleWhen | undefined) => void;
  sources: ConditionSource[];
}) {
  const source = sources.find((item) => item.openerId === visibleWhen?.openerId);
  return (
    <div>
      <Toggle
        label="Only show this question when an earlier answer matches"
        checked={visibleWhen !== undefined}
        onChange={(enabled) => {
          if (!enabled) return onChange(undefined);
          const first = sources[0];
          onChange(
            first
              ? { openerId: first.openerId, selected: [first.options[0]!.id] }
              : { openerId: "", selected: [] },
          );
        }}
      />
      {visibleWhen && (
        <div className="mt-2 grid gap-2">
          {sources.length === 0 && (
            <p className="text-destructive text-xs">
              No earlier question in this topic has selectable options — this
              condition cannot work.
            </p>
          )}
          <Field label="Depends on this earlier question">
            <select
              className="border-border bg-background w-full rounded-md border px-2 py-1.5 text-xs"
              value={visibleWhen.openerId}
              aria-label="visibleWhen opener"
              onChange={(event) =>
                onChange({
                  openerId: event.target.value,
                  selected: [],
                  ...(visibleWhen.negate ? { negate: true } : {}),
                })
              }
            >
              <option value="">— pick an earlier question —</option>
              {sources.map((item) => (
                <option key={item.openerId} value={item.openerId}>
                  {shortenQuestion(item.question)}
                </option>
              ))}
            </select>
          </Field>
          {source && (
            <Field label="Shown when the answer includes">
              <div className="flex flex-wrap gap-3">
                {source.options.map((option) => (
                  <Toggle
                    key={option.id}
                    label={option.label.trim() || option.id}
                    checked={visibleWhen.selected.includes(option.id)}
                    onChange={(checked) =>
                      onChange({
                        ...visibleWhen,
                        selected: checked
                          ? [...visibleWhen.selected, option.id]
                          : visibleWhen.selected.filter((id) => id !== option.id),
                      })
                    }
                  />
                ))}
              </div>
            </Field>
          )}
          <Toggle
            label="Flip it: show when the answer does NOT match"
            checked={visibleWhen.negate ?? false}
            onChange={(negate) =>
              onChange({
                openerId: visibleWhen.openerId,
                selected: visibleWhen.selected,
                ...(negate ? { negate: true } : {}),
              })
            }
          />
        </div>
      )}
    </div>
  );
}

export function SpecEditor({
  spec,
  onChange,
  sources,
  archetypeReferenced,
}: {
  spec: StoredOpenerSpec;
  onChange: (next: StoredOpenerSpec) => void;
  sources: ConditionSource[];
  archetypeReferenced: boolean;
}) {
  const patch = (fn: (draft: StoredOpenerSpec) => void) => {
    const next = structuredClone(spec);
    fn(next);
    onChange(next);
  };
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{KIND_LABELS[spec.kind]}</Badge>
        {archetypeReferenced && <Badge tone="info">used for archetype scoring</Badge>}
      </div>

      <div className="border-border bg-muted/30 grid gap-3 rounded-md border p-3">
        <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
          Settings
        </p>
        {spec.kind === "question" && (
          <div className="flex flex-wrap items-center gap-4">
            <Toggle
              label="Allow picking several options"
              checked={spec.multiSelect}
              onChange={(multiSelect) =>
                patch((draft) => {
                  if (draft.kind !== "question") return;
                  draft.multiSelect = multiSelect;
                  if (!multiSelect) delete draft.maxSelect;
                })
              }
            />
            <Toggle
              label={'AI helps write the "Other" answer (popup chat)'}
              checked={spec.otherAssist ?? false}
              onChange={(otherAssist) =>
                patch((draft) => {
                  if (draft.kind !== "question") return;
                  if (otherAssist) draft.otherAssist = true;
                  else delete draft.otherAssist;
                })
              }
            />
            {spec.multiSelect && (
              <Field label="Max picks" hint="blank = unbounded">
                <NumberInput
                  value={spec.maxSelect ?? 0}
                  min={0}
                  max={8}
                  ariaLabel={`Max picks for ${spec.id}`}
                  onChange={(value) =>
                    patch((draft) => {
                      if (draft.kind !== "question") return;
                      if (value >= 1) draft.maxSelect = value;
                      else delete draft.maxSelect;
                    })
                  }
                />
              </Field>
            )}
          </div>
        )}
        {spec.kind === "budget" && (
          <Field label="Points to distribute">
            <NumberInput
              value={spec.total}
              min={2}
              max={100}
              ariaLabel={`Budget total for ${spec.id}`}
              onChange={(total) =>
                patch((draft) => {
                  if (draft.kind === "budget") draft.total = total;
                })
              }
            />
          </Field>
        )}
        <VisibleWhenEditor
          visibleWhen={spec.visibleWhen}
          sources={sources.filter((source) => source.openerId !== spec.id)}
          onChange={(visibleWhen) =>
            patch((draft) => {
              if (visibleWhen) draft.visibleWhen = visibleWhen;
              else delete draft.visibleWhen;
            })
          }
        />
      </div>

      <LocalizedTextField
        label={
          spec.kind === "interviewer"
            ? "Invitation to talk (the talk/skip card copy)"
            : "Question"
        }
        value={spec.question}
        multiline
        onChange={(locale, text) =>
          patch((draft) => void (draft.question[locale] = text))
        }
      />

      {(spec.kind === "question" || spec.kind === "ranking") && (
        <LocalizedTextField
          label="Card header"
          value={spec.header}
          onChange={(locale, text) =>
            patch((draft) => {
              if (draft.kind === "question" || draft.kind === "ranking") {
                draft.header[locale] = text;
              }
            })
          }
        />
      )}

      {spec.kind === "binary" && (
        <div className="grid gap-2 lg:grid-cols-2">
          <OptionEditor
            option={spec.optionA}
            showExclusive={false}
            onChange={(next) =>
              patch((draft) => {
                if (draft.kind === "binary") draft.optionA = next;
              })
            }
          />
          <OptionEditor
            option={spec.optionB}
            showExclusive={false}
            onChange={(next) =>
              patch((draft) => {
                if (draft.kind === "binary") draft.optionB = next;
              })
            }
          />
        </div>
      )}

      {(spec.kind === "question" ||
        spec.kind === "ranking" ||
        spec.kind === "budget") && (
        <OptionListEditor
          specId={spec.id}
          options={spec.options}
          min={2}
          showExclusive={spec.kind === "question"}
          onChange={(options) =>
            patch((draft) => {
              if (
                draft.kind === "question" ||
                draft.kind === "ranking" ||
                draft.kind === "budget"
              ) {
                draft.options = options;
              }
            })
          }
        />
      )}

      {spec.kind === "ranking" && (
        <div>
          {spec.followUp ? (
            <div className="grid gap-1">
              <LocalizedTextField
                label="Follow-up prompt"
                value={spec.followUp}
                onChange={(locale, text) =>
                  patch((draft) => {
                    if (draft.kind === "ranking") draft.followUp![locale] = text;
                  })
                }
              />
              <div>
                <SmallButton
                  tone="danger"
                  onClick={() =>
                    patch((draft) => {
                      if (draft.kind === "ranking") delete draft.followUp;
                    })
                  }
                >
                  Remove follow-up
                </SmallButton>
              </div>
            </div>
          ) : (
            <SmallButton
              onClick={() =>
                patch((draft) => {
                  if (draft.kind === "ranking") {
                    draft.followUp = { en: "", de: "", fr: "", it: "" };
                  }
                })
              }
            >
              + Optional free-text follow-up
            </SmallButton>
          )}
        </div>
      )}

      {spec.kind === "slider" && (
        <div className="grid gap-2 lg:grid-cols-2">
          <LocalizedTextField
            label="Left end label"
            value={spec.minLabel}
            onChange={(locale, text) =>
              patch((draft) => {
                if (draft.kind === "slider") draft.minLabel[locale] = text;
              })
            }
          />
          <LocalizedTextField
            label="Right end label"
            value={spec.maxLabel}
            onChange={(locale, text) =>
              patch((draft) => {
                if (draft.kind === "slider") draft.maxLabel[locale] = text;
              })
            }
          />
        </div>
      )}

      {spec.kind === "interviewer" && (
        <Field
          label="Topic interview prompt (English)"
          hint="the AI's full instructions for the conversation at the end of this topic — participants never see it. Write it in English; the AI is told separately to reply in the participant's chosen language."
        >
          <TextArea
            value={spec.probe}
            rows={12}
            ariaLabel={`Interview prompt for ${spec.id}`}
            onChange={(probe) =>
              patch((draft) => {
                if (draft.kind === "interviewer") draft.probe = probe;
              })
            }
          />
        </Field>
      )}
    </div>
  );
}
