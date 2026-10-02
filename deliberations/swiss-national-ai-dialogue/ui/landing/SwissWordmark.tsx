export function SwissWordmark({
  className,
  showByline = false,
}: {
  className?: string;
  showByline?: boolean;
}) {
  return (
    <span className={`flex flex-col gap-[3px] leading-none ${className ?? ""}`}>
      <span
        className="text-muted-foreground text-[10px] font-semibold uppercase leading-none tracking-[0.22em]"
        style={{ fontFamily: "var(--theme-font-display)" }}
      >
        Swiss National
      </span>
      <span
        className="text-foreground flex items-center text-[1.05rem] font-bold lowercase leading-none tracking-tight sm:text-[1.15rem]"
        style={{ fontFamily: "var(--theme-font-display)" }}
      >
        ai
        <span
          aria-hidden
          className="bg-primary mx-[0.16em] inline-block size-[0.32em] shrink-0 rounded-full"
        />
        dialogue
      </span>
      {showByline && (
        <span className="text-muted-foreground mt-1.5 text-[11px] font-medium uppercase tracking-wider">
          by Public AI
        </span>
      )}
    </span>
  );
}
