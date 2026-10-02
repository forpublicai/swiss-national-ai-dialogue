import * as React from "react"
import { cn } from "@/lib/ui/utils"
import { textVariants } from "./text"

export function HeroContainer({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col min-h-screen [background:var(--hero-background)]",
        className
      )}
    >
      {children}
    </div>
  )
}

export function HeroHeading({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <h1
      className={cn(
        textVariants({ variant: "display" }),
        "text-[var(--hero-foreground)] [text-shadow:var(--hero-text-shadow)]",
        className
      )}
    >
      {children}
    </h1>
  )
}

export function HeroText({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        "text-[var(--hero-foreground)] [text-shadow:var(--hero-text-shadow)]",
        className
      )}
    >
      {children}
    </span>
  )
}

export function HeroCard({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "bg-card text-card-foreground overflow-hidden rounded-[var(--hero-card-radius)] border border-[var(--hero-card-border)] shadow-[var(--hero-card-shadow)]",
        className
      )}
    >
      {children}
    </div>
  )
}

export function useVoteColors() {
  return {
    agree: "var(--vote-agree)",
    disagree: "var(--vote-disagree)",
  }
}
