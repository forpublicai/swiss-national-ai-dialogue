"use client";

import { useEffect, useState } from "react";

import type { SnadClosingQuote } from "../types";

const QUOTES_URL_BY_SURFACE = {
  admin: "/api/admin/snad/quotes",
  partner: "/api/partner/snad/quotes",
} as const;

export function QuotesPanel({
  surface,
}: {
  surface: keyof typeof QUOTES_URL_BY_SURFACE;
}) {
  const quotesUrl = QUOTES_URL_BY_SURFACE[surface];
  const [quotes, setQuotes] = useState<SnadClosingQuote[] | null>(null);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(quotesUrl)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: { quotes: SnadClosingQuote[] }) => {
        if (!cancelled) setQuotes(data.quotes);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [quotesUrl]);

  const update = async (
    id: string,
    patch: { featured?: boolean; status?: SnadClosingQuote["status"] },
  ) => {
    setBusyId(id);
    try {
      const response = await fetch(quotesUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      if (!response.ok) throw new Error("update_failed");
      const { quote } = (await response.json()) as { quote: SnadClosingQuote };
      setQuotes(
        (current) =>
          current?.map((item) => (item.id === quote.id ? quote : item)) ?? null,
      );
    } catch {
      setError(true);
    } finally {
      setBusyId(null);
    }
  };

  if (error) {
    return <p className="text-destructive text-sm">Failed to load quotes.</p>;
  }
  if (quotes === null) {
    return <p className="text-muted-foreground text-sm">Loading quotes…</p>;
  }
  if (quotes.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No closing-interview quotes yet. They appear here as participants
        finish the dialogue.
      </p>
    );
  }

  const featuredCount = quotes.filter((quote) => quote.featured).length;
  return (
    <div className="grid gap-3">
      <p className="text-muted-foreground text-sm">
        {featuredCount} of {quotes.length} quote(s) featured on the public
        quote wall.
      </p>
      <div className="border-border overflow-x-auto rounded-md border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/60 text-xs">
            <tr>
              <th className="px-3 py-2 font-semibold">Quote</th>
              <th className="px-3 py-2 font-semibold">Canton</th>
              <th className="px-3 py-2 font-semibold">Language</th>
              <th className="px-3 py-2 font-semibold">Moderation</th>
              <th className="px-3 py-2 font-semibold">Wall</th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y align-top">
            {quotes.map((quote) => (
              <tr key={quote.id} className={quote.status === "hidden" ? "opacity-50" : ""}>
                <td className="max-w-[42rem] px-3 py-2 leading-relaxed">
                  {quote.text}
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  {quote.canton ?? "—"}
                </td>
                <td className="px-3 py-2 font-mono text-xs">{quote.locale}</td>
                <td className="px-3 py-2 text-xs">
                  <span
                    className={
                      quote.status === "approved"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : quote.status === "pending"
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-muted-foreground"
                    }
                  >
                    {quote.status}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busyId === quote.id}
                      onClick={() =>
                        void update(quote.id, { featured: !quote.featured })
                      }
                      className={
                        quote.featured
                          ? "bg-primary rounded-full px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                          : "border-border hover:border-primary/50 rounded-full border px-3 py-1 text-xs font-semibold disabled:opacity-50"
                      }
                    >
                      {quote.featured ? "Featured" : "Feature"}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === quote.id}
                      onClick={() =>
                        void update(quote.id, {
                          status:
                            quote.status === "hidden" ? "approved" : "hidden",
                        })
                      }
                      className="text-muted-foreground hover:text-foreground px-1 py-1 text-xs font-semibold disabled:opacity-50"
                    >
                      {quote.status === "hidden" ? "Unhide" : "Hide"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
