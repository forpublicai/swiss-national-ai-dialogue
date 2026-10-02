import Link from "next/link";

export type AdminSurface = "admin" | "partner";

export function adminBasePath(surface: AdminSurface): string {
  return surface === "partner" ? "/partner" : "/admin/swiss-national-ai-dialogue";
}

export function formatDuration(milliseconds: number): string {
  const minutes = Math.round(milliseconds / 60000);
  if (minutes < 1) return "<1 min";
  if (minutes < 90) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours} h ${minutes % 60} min`;
}

export function formatTimeOnTask(milliseconds: number): string {
  const seconds = Math.round(milliseconds / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder === 0 ? `${minutes}m` : `${minutes}m ${remainder}s`;
}

export function AdminTabs({
  surface,
  current,
}: {
  surface: AdminSurface;
  current: "results" | "questions" | "participants" | "settings" | "quotes" | "access";
}) {
  const base = adminBasePath(surface);
  const tabs = [
    { key: "results", label: "Overview", href: base },
    { key: "questions", label: "Questions", href: `${base}/questions` },
    { key: "participants", label: "Participants", href: `${base}/participants` },
    { key: "settings", label: "Survey settings", href: `${base}/editor` },
    { key: "quotes", label: "Quotes", href: `${base}/quotes` },
    ...(surface === "admin"
      ? [{ key: "access", label: "Access", href: `${base}/access` } as const]
      : []),
  ] as const;
  return (
    <nav className="border-border mt-4 flex gap-1 border-b">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={
            tab.key === current
              ? "border-primary -mb-px border-b-2 px-3 py-2 text-sm font-semibold"
              : "text-muted-foreground hover:text-foreground px-3 py-2 text-sm"
          }
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
