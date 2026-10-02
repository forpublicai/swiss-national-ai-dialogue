"use client";

import { motion } from "motion/react";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties } from "react";

import { cn, HeroContainer } from "@/components/ui";

import type { LandingHeroProps } from "../../types";
import { SwissFlag } from "./SwissFlag";
import { SwissLanguageToggle } from "./SwissLanguageToggle";
import { SwissWordmark } from "./SwissWordmark";
import { fill, useSwissDict } from "../../i18n";

const HERO_TRANSITION = { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const };

function useCollapseWhileKeyboardOpen(enabled: boolean) {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    if (!enabled) {
      setCollapsed(false);
      return;
    }
    const vv = window.visualViewport;
    if (!vv) return;
    const onViewport = () => {
      setCollapsed(window.innerHeight - vv.height > 120);
    };
    onViewport();
    vv.addEventListener("resize", onViewport);
    vv.addEventListener("scroll", onViewport);
    return () => {
      vv.removeEventListener("resize", onViewport);
      vv.removeEventListener("scroll", onViewport);
    };
  }, [enabled]);
  return collapsed;
}

function ScrollCue({ label }: { label: string }) {
  const [atTop, setAtTop] = useState(true);
  useEffect(() => {
    const onScroll = () => setAtTop(window.scrollY < 48);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      tabIndex={atTop ? 0 : -1}
      aria-hidden={!atTop}
      onClick={(event) =>
        event.currentTarget.parentElement?.nextElementSibling?.scrollIntoView({
          behavior: "smooth",
        })
      }
      className={cn(
        "text-foreground/70 hover:text-foreground focus-visible:ring-ring absolute inset-x-0 bottom-4 z-10 mx-auto flex w-fit flex-col items-center gap-1 rounded-md px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] transition-opacity duration-300 focus-visible:outline-none focus-visible:ring-2",
        !atTop && "pointer-events-none opacity-0",
      )}
    >
      {label}
      <ChevronDown
        className="text-primary size-6 motion-safe:animate-bounce"
        aria-hidden="true"
      />
    </button>
  );
}

export function SwissHero({
  slug,
  interviewCount,
  children,
  inInterview = false,
  onHome,
  headerExtra,
}: LandingHeroProps) {
  const pathname = usePathname();
  const homeHref = pathname === "/" ? "/" : `/${slug}`;
  const dict = useSwissDict();
  const showCount = interviewCount > 0;
  const collapsed = useCollapseWhileKeyboardOpen(inInterview);

  const headerRef = useRef<HTMLElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  useEffect(() => {
    const el = headerRef.current;
    if (!inInterview || !el) return;
    const measure = () => setHeaderHeight(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [inInterview]);

  return (
    <HeroContainer className="relative min-h-svh overflow-x-clip">
      <header
        ref={headerRef}
        className={cn(
          inInterview
            ? // Translucent paper + blur so chat bubbles and cards passing
              "bg-background/80 sticky top-0 z-50 w-full py-3 backdrop-blur-md transition-transform duration-300 ease-out motion-reduce:transition-none"
            : // Same vertical padding as the in-interview bar so the wordmark
              // doesn't jump when the landing↔dialogue view switches.
              "relative z-50 w-full shrink-0 bg-transparent py-3",
          inInterview && collapsed && "-translate-y-full",
        )}
      >
        <div className="mx-auto flex w-full max-w-[600px] items-center justify-between gap-2 px-4 lg:max-w-[1280px] lg:px-8">
          <Link
            href={homeHref}
            aria-label="Swiss National AI Dialogue — back to the start"
            onClick={
              onHome
                ? (event) => {
                    event.preventDefault();
                    onHome();
                  }
                : undefined
            }
            className="flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--primary)_50%,transparent)]"
          >
            <SwissFlag className="size-8 shrink-0" />
            <SwissWordmark />
          </Link>
          {inInterview && headerExtra ? headerExtra : <SwissLanguageToggle />}
        </div>
      </header>

      <div
        className={
          inInterview
            ? "relative z-10 mx-auto flex w-full max-w-[600px] flex-1 flex-col gap-6 px-4 lg:max-w-[1280px] lg:gap-8 lg:px-8"
            : "relative z-10 mx-auto flex w-full max-w-[600px] flex-1 flex-col gap-8 px-4 pb-24 lg:max-w-[1280px] lg:gap-10 lg:px-8"
        }
        style={
          inInterview
            ? ({
                "--chat-sticky-top": collapsed ? "0px" : `${headerHeight}px`,
              } as CSSProperties)
            : undefined
        }
      >
        {!inInterview && (
          <motion.div
            layout
            transition={HERO_TRANSITION}
            className="flex w-full flex-1 flex-col justify-center gap-10 py-14 lg:gap-14 lg:py-16"
          >
            <div className="flex w-full flex-col items-start gap-5 lg:gap-7">
              <h1 className="font-display text-foreground w-full text-[clamp(2.75rem,9.5vw,6.5rem)] font-bold leading-[0.95] tracking-[-0.03em]">
                <span className="block text-balance">
                  {dict.landing.headlineTop}
                </span>
                <span className="text-primary block text-balance">
                  {dict.landing.headlineBottom}
                </span>
              </h1>
              <p className="text-foreground/75 max-w-[46ch] text-base leading-relaxed lg:text-xl">
                {dict.landing.heroTagline}
              </p>
            </div>
            <div className="flex w-full flex-col items-start gap-5">
              {children}
              <div className="flex flex-col items-start gap-1.5">
                {showCount && (
                  <p className="text-foreground text-sm font-semibold">
                    {fill(dict.hero.participants, {
                      count: interviewCount.toLocaleString("de-CH"),
                    })}
                  </p>
                )}
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-[0.14em]">
                  {dict.hero.credibility}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {inInterview && (
          <div className="mx-auto flex w-full max-w-[760px] flex-1 flex-col">
            {children}
          </div>
        )}
      </div>
      {!inInterview && <ScrollCue label={dict.landing.scrollHint} />}
    </HeroContainer>
  );
}
