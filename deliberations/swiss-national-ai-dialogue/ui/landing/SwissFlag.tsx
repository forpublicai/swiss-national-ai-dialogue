import { cn } from "@/components/ui";

export function SwissFlag({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      role="img"
      aria-label="Swiss flag"
      className={cn(
        "transition-transform duration-300 ease-out motion-safe:hover:scale-110",
        className,
      )}
    >
      <rect x="0" y="0" width="32" height="32" rx="7" fill="var(--primary)" />
      <rect x="13" y="6" width="6" height="20" rx="0.5" fill="#ffffff" />
      <rect x="6" y="13" width="20" height="6" rx="0.5" fill="#ffffff" />
    </svg>
  );
}
