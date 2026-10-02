"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Loader2 } from "lucide-react";

import { Button, Input, Label } from "@/components/ui";

type AccessKey = {
  id: string;
  label: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

const ACCESS_KEYS_ENDPOINT = "/api/admin/snad/access-keys";

export function AccessKeys() {
  const [keys, setKeys] = useState<AccessKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [freshKey, setFreshKey] = useState<{ label: string; key: string } | null>(
    null,
  );

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(ACCESS_KEYS_ENDPOINT);
      if (!res.ok) throw new Error("failed");
      const json = (await res.json()) as { keys: AccessKey[] };
      setKeys(json.keys);
    } catch {
      setError("Couldn't load access keys.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = label.trim();
    if (!trimmed || creating) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch(ACCESS_KEYS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: trimmed }),
      });
      if (!res.ok) throw new Error("failed");
      const json = (await res.json()) as { label: string; key: string };
      setFreshKey({ label: json.label, key: json.key });
      setLabel("");
      await load();
    } catch {
      setError("Couldn't create the key.");
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (key: AccessKey) => {
    if (
      !window.confirm(
        `Revoke "${key.label}"? Anyone signed in with this key is locked out immediately and it can never be used again.`,
      )
    ) {
      return;
    }
    setError(null);
    try {
      const res = await fetch(
        `${ACCESS_KEYS_ENDPOINT}/${encodeURIComponent(key.id)}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("failed");
      await load();
    } catch {
      setError("Couldn't revoke the key.");
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="text-lg font-bold">Create an access key</h2>
        <p className="text-muted-foreground mb-3 mt-0.5 text-xs">
          Give each person their own key so /partner sign-ins are attributable
          and can be revoked individually. The key is shown once — copy it now
          and share it securely.
        </p>
        <form onSubmit={create} className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-[16rem] flex-1 flex-col gap-1.5">
            <Label htmlFor="access-key-label">Name</Label>
            <Input
              id="access-key-label"
              placeholder="e.g. Alex (partner)"
              value={label}
              maxLength={120}
              onChange={(e) => setLabel(e.target.value)}
              disabled={creating}
            />
          </div>
          <Button type="submit" variant="primary" disabled={creating || !label.trim()}>
            {creating && <Loader2 className="size-4 animate-spin" />}
            Create key
          </Button>
        </form>
        {freshKey && <FreshKeyBanner label={freshKey.label} value={freshKey.key} />}
      </section>

      <section>
        <h2 className="text-lg font-bold">Keys</h2>
        <p className="text-muted-foreground mb-3 mt-0.5 text-xs">
          Revoked keys are kept for the record but can no longer sign in.
        </p>
        {error && (
          <p className="text-destructive mb-3 text-sm" role="alert">
            {error}
          </p>
        )}
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : keys.length === 0 ? (
          <p className="text-muted-foreground text-sm">No keys yet.</p>
        ) : (
          <div className="border-border overflow-x-auto rounded-md border">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-muted/60 text-xs">
                <tr>
                  <th className="px-3 py-2 font-semibold">Name</th>
                  <th className="px-3 py-2 font-semibold">Created</th>
                  <th className="px-3 py-2 font-semibold">Last used</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {keys.map((key) => (
                  <tr key={key.id}>
                    <td className="px-3 py-2 font-medium">{key.label}</td>
                    <td className="text-muted-foreground whitespace-nowrap px-3 py-2">
                      {formatDate(key.createdAt)}
                    </td>
                    <td className="text-muted-foreground whitespace-nowrap px-3 py-2">
                      {key.lastUsedAt ? formatDate(key.lastUsedAt) : "Never"}
                    </td>
                    <td className="px-3 py-2">
                      {key.revokedAt ? (
                        <span className="text-muted-foreground rounded-full bg-zinc-500/10 px-2 py-0.5 text-xs font-medium">
                          Revoked {formatDate(key.revokedAt)}
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {!key.revokedAt && (
                        <button
                          type="button"
                          className="text-destructive whitespace-nowrap text-xs font-medium underline"
                          onClick={() => revoke(key)}
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function FreshKeyBanner({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div className="border-primary/40 bg-primary/5 mt-4 rounded-md border p-4">
      <p className="text-sm font-semibold">Key for “{label}” created</p>
      <p className="text-muted-foreground mt-0.5 text-xs">
        Copy it now — you won&apos;t be able to see it again.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <code className="border-border bg-background flex-1 overflow-x-auto rounded-md border px-3 py-2 font-mono text-sm">
          {value}
        </code>
        <Button type="button" variant="secondary" onClick={copy}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-CH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
