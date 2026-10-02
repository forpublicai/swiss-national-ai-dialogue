"use client";

import { useCallback, useEffect, useState } from "react";

import type {
  SnadStudyDefinition,
  SnadStudyVersionSummary,
  SnadStudyWarning,
} from "../../types";

import { DefinitionForm } from "./DefinitionForm";
import { diffDefinitions, type DiffEntry } from "./diff";
import { EditorLocaleProvider, LocaleTabs, SmallButton } from "./fields";

type View =
  | { mode: "home" }
  | { mode: "inspect"; id: string }
  | {
      mode: "edit";
      sourceLabel: string;
      definition: SnadStudyDefinition;
      notes: string;
    };

async function readError(response: Response): Promise<string[]> {
  const body = (await response.json().catch(() => null)) as {
    errors?: string[];
    error?: string;
  } | null;
  if (body?.errors?.length) return body.errors;
  return [body?.error ?? `request failed (${response.status})`];
}

function WarningList({ warnings }: { warnings: SnadStudyWarning[] }) {
  if (warnings.length === 0) return null;
  return (
    <ul className="grid gap-1">
      {warnings.map((warning, index) => (
        <li
          key={index}
          className={`rounded-md px-3 py-2 text-xs ${
            warning.severity === "warning"
              ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {warning.severity === "warning" ? "⚠ " : "ℹ "}
          {warning.message}
        </li>
      ))}
    </ul>
  );
}

function ErrorList({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null;
  return (
    <ul className="grid gap-1" aria-label="Validation errors">
      {errors.map((error, index) => (
        <li
          key={index}
          className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-xs"
        >
          {error}
        </li>
      ))}
    </ul>
  );
}

function DiffTable({ entries }: { entries: DiffEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Identical to the live version.
      </p>
    );
  }
  const shorten = (value: string | null) =>
    value === null
      ? "—"
      : value.length > 160
        ? `${value.slice(0, 160)}…`
        : value;
  return (
    <div className="border-border max-h-96 overflow-auto rounded-md border">
      <table className="w-full min-w-[640px] text-left text-xs">
        <thead className="bg-muted/60 sticky top-0">
          <tr>
            <th className="px-3 py-2 font-semibold">What</th>
            <th className="px-3 py-2 font-semibold">Live</th>
            <th className="px-3 py-2 font-semibold">This version</th>
          </tr>
        </thead>
        <tbody className="divide-border divide-y align-top">
          {entries.map((entry, index) => (
            <tr key={index}>
              <td className="max-w-56 break-words px-3 py-2 font-mono text-[11px]">
                {entry.path}
              </td>
              <td className="max-w-72 whitespace-pre-wrap break-words px-3 py-2">
                {shorten(entry.before)}
              </td>
              <td className="max-w-72 whitespace-pre-wrap break-words px-3 py-2">
                {shorten(entry.after)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatDate(value: string | Date): string {
  return new Intl.DateTimeFormat("en-CH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function StudyEditor({ apiBase }: { apiBase: string }) {
  const [versions, setVersions] = useState<SnadStudyVersionSummary[]>([]);
  const [view, setView] = useState<View>({ mode: "home" });
  const [inspected, setInspected] = useState<{
    summary: SnadStudyVersionSummary;
    definition: SnadStudyDefinition;
  } | null>(null);
  const [activeDefinition, setActiveDefinition] =
    useState<SnadStudyDefinition | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<SnadStudyWarning[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmingPublish, setConfirmingPublish] = useState(false);
  const [confirmingRestore, setConfirmingRestore] = useState<string | null>(
    null,
  );

  const refresh = useCallback(async () => {
    const response = await fetch(`${apiBase}/study-versions`);
    if (!response.ok) {
      setErrors(await readError(response));
      return [] as SnadStudyVersionSummary[];
    }
    const body = (await response.json()) as {
      versions: SnadStudyVersionSummary[];
    };
    setVersions(body.versions);
    return body.versions;
  }, [apiBase]);

  const fetchVersion = useCallback(
    async (id: string) => {
      const response = await fetch(`${apiBase}/study-versions/${id}`);
      if (!response.ok) {
        setErrors(await readError(response));
        return null;
      }
      return (await response.json()) as {
        summary: SnadStudyVersionSummary;
        definition: SnadStudyDefinition;
      };
    },
    [apiBase],
  );

  const reloadActive = useCallback(async () => {
    const list = await refresh();
    const active = list.find((version) => version.isActive);
    if (active) {
      const full = await fetchVersion(active.id);
      if (full) setActiveDefinition(full.definition);
    }
    return list;
  }, [refresh, fetchVersion]);

  useEffect(() => {
    void reloadActive();
  }, [reloadActive]);

  const clearMessages = () => {
    setErrors([]);
    setWarnings([]);
    setNotice(null);
    setConfirmingPublish(false);
    setConfirmingRestore(null);
  };

  const inspect = async (id: string) => {
    clearMessages();
    const full = await fetchVersion(id);
    if (!full) return;
    setInspected(full);
    setView({ mode: "inspect", id });
  };

  const startEditing = (
    definition: SnadStudyDefinition,
    sourceLabel: string,
  ) => {
    clearMessages();
    setView({
      mode: "edit",
      sourceLabel,
      definition: structuredClone(definition),
      notes: "",
    });
  };

  const activate = async (id: string): Promise<boolean> => {
    const response = await fetch(`${apiBase}/study-versions/${id}/activate`, {
      method: "POST",
    });
    if (!response.ok) {
      setErrors(await readError(response));
      return false;
    }
    const body = (await response.json()) as { warnings: SnadStudyWarning[] };
    setWarnings(body.warnings);
    return true;
  };

  const restore = async (id: string) => {
    clearMessages();
    setBusy(true);
    try {
      if (!(await activate(id))) return;
      setNotice(
        "Version restored. New participants get it from now on; participants mid-survey keep the version they started with.",
      );
      await reloadActive();
      setView({ mode: "home" });
    } finally {
      setBusy(false);
      setConfirmingRestore(null);
    }
  };

  const save = async (
    definition: SnadStudyDefinition,
    notes: string,
  ): Promise<string | null> => {
    const response = await fetch(`${apiBase}/study-versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ definition, notes: notes.trim() || null }),
    });
    if (!response.ok) {
      setErrors(await readError(response));
      return null;
    }
    const body = (await response.json()) as {
      id: string;
      warnings: SnadStudyWarning[];
    };
    setWarnings(body.warnings);
    return body.id;
  };

  const saveDraft = async (definition: SnadStudyDefinition, notes: string) => {
    clearMessages();
    setBusy(true);
    try {
      const id = await save(definition, notes);
      if (!id) return;
      setNotice(
        "Saved to the version history WITHOUT publishing — participants still get the live version. Publish it from the history when ready.",
      );
      await reloadActive();
      setView({ mode: "home" });
    } finally {
      setBusy(false);
    }
  };

  const publish = async (definition: SnadStudyDefinition, notes: string) => {
    clearMessages();
    setBusy(true);
    try {
      const id = await save(definition, notes);
      if (!id) return;
      if (!(await activate(id))) return;
      setNotice(
        "Published. New participants get your changes from now on; participants mid-survey keep the version they started with.",
      );
      await reloadActive();
      setView({ mode: "home" });
    } finally {
      setBusy(false);
      setConfirmingPublish(false);
    }
  };

  const activeVersion = versions.find((version) => version.isActive) ?? null;

  return (
    <div className="flex flex-col gap-6">
      {notice && (
        <p className="rounded-md bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">
          {notice}
        </p>
      )}
      <ErrorList errors={errors} />
      <WarningList warnings={warnings} />

      {view.mode === "home" && (
        <div className="grid gap-6">
          <div className="border-border bg-card rounded-md border p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
                  Live now
                </p>
                <p className="mt-1 font-semibold">
                  {activeVersion?.label ?? "Loading…"}
                </p>
                {activeVersion && (
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    created {formatDate(activeVersion.createdAt)} ·{" "}
                    {activeVersion.sessionCount} participant(s) so far
                  </p>
                )}
              </div>
              <SmallButton
                tone="primary"
                disabled={!activeDefinition}
                onClick={() =>
                  activeDefinition &&
                  startEditing(activeDefinition, activeVersion?.label ?? "live")
                }
              >
                Edit survey
              </SmallButton>
            </div>
            <p className="text-muted-foreground mt-3 text-xs">
              Changes only reach participants when you publish. Every publish is
              kept in the history below, so you can always restore an earlier
              version.
            </p>
          </div>

          <details>
            <summary className="cursor-pointer text-sm font-semibold">
              Version history
            </summary>
            <div className="border-border mt-3 overflow-x-auto rounded-md border">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="bg-muted/60">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Name</th>
                    <th className="px-3 py-2 font-semibold">Created</th>
                    <th className="px-3 py-2 font-semibold">By</th>
                    <th className="px-3 py-2 font-semibold">Participants</th>
                    <th className="px-3 py-2 font-semibold">Notes</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                    <th className="px-3 py-2 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-border divide-y align-top">
                  {versions.map((version) => (
                    <tr key={version.id}>
                      <td className="px-3 py-2 font-medium">{version.label}</td>
                      <td className="whitespace-nowrap px-3 py-2">
                        {formatDate(version.createdAt)}
                      </td>
                      <td className="px-3 py-2">{version.createdBy}</td>
                      <td className="px-3 py-2 tabular-nums">
                        {version.sessionCount}
                      </td>
                      <td className="max-w-56 break-words px-3 py-2">
                        {version.notes ?? "—"}
                      </td>
                      <td className="px-3 py-2">
                        {version.isActive ? (
                          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-semibold text-emerald-700 dark:text-emerald-400">
                            Live
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          <SmallButton onClick={() => void inspect(version.id)}>
                            View
                          </SmallButton>
                          {!version.isActive &&
                            (confirmingRestore === version.id ? (
                              <>
                                <SmallButton
                                  tone="primary"
                                  disabled={busy}
                                  onClick={() => void restore(version.id)}
                                >
                                  Confirm restore
                                </SmallButton>
                                <SmallButton
                                  onClick={() => setConfirmingRestore(null)}
                                >
                                  Cancel
                                </SmallButton>
                              </>
                            ) : (
                              <SmallButton
                                onClick={() => setConfirmingRestore(version.id)}
                              >
                                Restore…
                              </SmallButton>
                            ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {versions.length === 0 && (
                    <tr>
                      <td
                        className="text-muted-foreground px-3 py-4 text-center"
                        colSpan={7}
                      >
                        No versions yet — the first participant session seeds
                        the code snapshot.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}

      {view.mode === "inspect" && inspected && (
        <div className="grid gap-4">
          <div>
            <SmallButton
              onClick={() => {
                clearMessages();
                setView({ mode: "home" });
              }}
            >
              ← Back
            </SmallButton>
          </div>
          <div className="border-border bg-card rounded-md border p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-semibold">{inspected.summary.label}</h3>
              <time className="text-muted-foreground text-xs">
                {formatDate(inspected.summary.createdAt)}
              </time>
            </div>
            <p className="text-muted-foreground mt-2 text-xs">
              created by {inspected.summary.createdBy} ·{" "}
              {inspected.summary.sessionCount} participant(s) on this version
            </p>
            {inspected.summary.notes && (
              <p className="mt-2 text-xs">{inspected.summary.notes}</p>
            )}
            <div className="mt-3 flex gap-2">
              <SmallButton
                tone="primary"
                onClick={() =>
                  startEditing(inspected.definition, inspected.summary.label)
                }
              >
                Edit a copy of this version
              </SmallButton>
              {!inspected.summary.isActive &&
                (confirmingRestore === inspected.summary.id ? (
                  <>
                    <SmallButton
                      tone="primary"
                      disabled={busy}
                      onClick={() => void restore(inspected.summary.id)}
                    >
                      Confirm restore
                    </SmallButton>
                    <SmallButton onClick={() => setConfirmingRestore(null)}>
                      Cancel
                    </SmallButton>
                  </>
                ) : (
                  <SmallButton
                    onClick={() => setConfirmingRestore(inspected.summary.id)}
                  >
                    Restore…
                  </SmallButton>
                ))}
            </div>
          </div>
          <section>
            <h4 className="mb-2 text-sm font-bold">
              What differs from the live version
            </h4>
            {inspected.summary.isActive ? (
              <p className="text-muted-foreground text-sm">
                This is the live version.
              </p>
            ) : activeDefinition ? (
              <DiffTable
                entries={diffDefinitions(
                  activeDefinition,
                  inspected.definition,
                )}
              />
            ) : (
              <p className="text-muted-foreground text-sm">
                No live version to compare against.
              </p>
            )}
          </section>
        </div>
      )}

      {view.mode === "edit" && (
        <EditorLocaleProvider>
          <div className="grid gap-4">
            <p className="bg-muted text-muted-foreground rounded-md px-3 py-2 text-xs">
              You are editing a copy of <strong>{view.sourceLabel}</strong>.
              Nothing changes for participants until you publish.
            </p>
            <div className="border-border bg-card sticky top-0 z-20 rounded-md border p-3 shadow-sm">
              <LocaleTabs />
            </div>
            <DefinitionForm
              definition={view.definition}
              notes={view.notes}
              onNotesChange={(notes) => setView({ ...view, notes })}
              mutate={(fn) =>
                setView((previous) => {
                  if (previous.mode !== "edit") return previous;
                  const definition = structuredClone(previous.definition);
                  fn(definition);
                  return { ...previous, definition };
                })
              }
            />
            {activeDefinition && (
              <details>
                <summary className="text-muted-foreground cursor-pointer text-xs">
                  Review your changes vs the live version
                </summary>
                <div className="mt-2">
                  <DiffTable
                    entries={diffDefinitions(activeDefinition, view.definition)}
                  />
                </div>
              </details>
            )}
            <div className="border-border bg-card sticky bottom-0 flex flex-wrap items-center gap-2 rounded-md border p-3">
              {confirmingPublish ? (
                <>
                  <span className="text-xs font-medium">
                    Publish to participants now?
                  </span>
                  <SmallButton
                    tone="primary"
                    disabled={busy}
                    onClick={() => void publish(view.definition, view.notes)}
                  >
                    Confirm publish
                  </SmallButton>
                  <SmallButton onClick={() => setConfirmingPublish(false)}>
                    Cancel
                  </SmallButton>
                </>
              ) : (
                <>
                  <SmallButton
                    tone="primary"
                    disabled={busy}
                    onClick={() => setConfirmingPublish(true)}
                  >
                    Publish…
                  </SmallButton>
                  <SmallButton
                    disabled={busy}
                    onClick={() => void saveDraft(view.definition, view.notes)}
                  >
                    Save without publishing
                  </SmallButton>
                  <SmallButton
                    onClick={() => {
                      clearMessages();
                      setView({ mode: "home" });
                    }}
                  >
                    Discard changes
                  </SmallButton>
                </>
              )}
            </div>
          </div>
        </EditorLocaleProvider>
      )}
    </div>
  );
}
