"use client";

import { motion, MotionConfig } from "motion/react";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/components/ui";

import { trackLandingCtaClicked } from "../../analytics";
import { SwissQuoteMap } from "../canton/SwissQuoteMap";
import { SwissFAQ } from "./SwissFAQ";
import { SwissFooter } from "./SwissFooter";
import { SwissHero } from "./SwissHero";
import { fill, useSwissDict } from "../../i18n";
import type { SnadSessionPayload, SnadWallEntry } from "../../types";

const COLUMN = "mx-auto w-full max-w-[600px] px-4 lg:max-w-[1280px] lg:px-8";

const SECTION_REVEAL = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-64px" },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
};

type CtaKind = "start" | "continue" | "review";

function Eyebrow({
  children,
  className,
  markClassName = "bg-primary",
}: {
  children: ReactNode;
  className?: string;
  markClassName?: string;
}) {
  return (
    <p
      className={cn(
        "flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.22em]",
        className,
      )}
    >
      <span aria-hidden className={cn("size-2 shrink-0", markClassName)} />
      {children}
    </p>
  );
}

function CtaButton({
  label,
  kind,
  slug,
  onEnter,
  variant = "red",
  testId,
}: {
  label: string;
  kind: CtaKind;
  slug: string;
  onEnter: () => void;
  variant?: "red" | "paper";
  testId?: string;
}) {
  return (
    <motion.button
      type="button"
      data-testid={testId}
      onClick={() => {
        trackLandingCtaClicked({ campaignSlug: slug, kind });
        onEnter();
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      className={cn(
        "group inline-flex items-center justify-center gap-2.5 rounded-lg px-9 py-4 text-base font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 lg:px-10 lg:text-lg",
        variant === "red"
          ? "bg-primary text-primary-foreground focus-visible:ring-ring focus-visible:ring-offset-background"
          : "bg-background text-foreground focus-visible:ring-background focus-visible:ring-offset-primary",
      )}
    >
      {label}
      <ArrowRight
        className="size-5 transition-transform group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </motion.button>
  );
}

export function SnadLanding({
  slug,
  name,
  session,
  participantCount,
  cantonCounts,
  quotes,
  onEnter,
}: {
  slug: string;
  name: string;
  session: SnadSessionPayload | null;
  participantCount: number;
  cantonCounts: { canton: string; count: number }[];
  quotes: SnadWallEntry[];
  onEnter: () => void;
}) {
  const dict = useSwissDict();

  const cta = !session
    ? { kind: "start" as const, label: dict.landing.start }
    : session.status === "completed"
      ? { kind: "review" as const, label: dict.landing.review }
      : { kind: "continue" as const, label: dict.landing.continue };

  return (
    <MotionConfig reducedMotion="user">
      <SwissHero slug={slug} interviewCount={participantCount}>
        <div className="flex w-full flex-col items-start gap-3">
          <CtaButton
            label={cta.label}
            kind={cta.kind}
            slug={slug}
            onEnter={onEnter}
            testId="landing-cta"
          />
          {cta.kind === "continue" && (
            <p className="text-muted-foreground max-w-[40ch] text-sm">
              {dict.landing.inProgress}
            </p>
          )}
        </div>
      </SwissHero>

      <section className="bg-background border-border w-full border-t">
        <motion.div {...SECTION_REVEAL} className={cn(COLUMN, "py-20 lg:py-28")}>
          <div className="flex gap-6 border-b border-border py-10 lg:gap-8 lg:py-12">
            <span className="font-display text-primary shrink-0 pt-2 text-base font-semibold tracking-wide">
              01
            </span>
            <div className="flex flex-col gap-3.5">
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-[0.2em]">
                {dict.landing.swissEyebrow}
              </p>
              <h2 className="font-display text-foreground max-w-[18ch] text-balance text-[clamp(1.625rem,4.6vw,2.75rem)] font-bold leading-[1.08] tracking-[-0.02em]">
                {dict.landing.swissStatement} {dict.landing.swissName}{" "}
                <span className="text-primary">Apertus.</span>
              </h2>
            </div>
          </div>
          <div className="flex gap-6 border-b border-border py-10 lg:gap-8 lg:py-12">
            <span className="font-display text-secondary shrink-0 pt-2 text-base font-semibold tracking-wide">
              02
            </span>
            <div className="flex flex-col gap-3.5">
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-[0.2em]">
                {dict.landing.otherAiEyebrow}
              </p>
              <p className="font-display text-secondary max-w-[26ch] text-balance text-[clamp(1.25rem,3.4vw,1.875rem)] font-medium leading-[1.32] tracking-[-0.01em]">
                {dict.landing.otherAi}
              </p>
            </div>
          </div>
          <div className="flex gap-6 pt-10 lg:gap-8 lg:pt-12">
            <span className="font-display text-primary shrink-0 pt-2 text-base font-semibold tracking-wide">
              03
            </span>
            <div className="flex flex-col items-start gap-4.5">
              <p className="text-primary text-xs font-semibold uppercase tracking-[0.2em]">
                {dict.landing.directEyebrow}
              </p>
              <h2 className="font-display text-foreground max-w-[20ch] text-balance text-[clamp(1.75rem,5vw,3rem)] font-bold leading-[1.06] tracking-[-0.02em]">
                {dict.landing.directHeading}
              </h2>
              <p className="text-foreground/72 max-w-[52ch] text-base leading-relaxed lg:text-xl">
                {dict.landing.directBody}
              </p>
              <CtaButton
                label={cta.label}
                kind={cta.kind}
                slug={slug}
                onEnter={onEnter}
              />
            </div>
          </div>
        </motion.div>
      </section>

      <section className="bg-background relative w-full overflow-hidden">
        <motion.div
          {...SECTION_REVEAL}
          className={cn(
            COLUMN,
            "relative z-10 flex flex-col gap-4 pt-16 lg:gap-5 lg:pt-24",
          )}
        >
          <Eyebrow className="text-muted-foreground">
            {dict.landing.mapEyebrow}
          </Eyebrow>
          <h2 className="font-display text-foreground max-w-[20ch] text-balance text-[clamp(1.875rem,4.5vw,3.5rem)] font-bold leading-[1.05] tracking-[-0.02em]">
            {dict.landing.mapHeading}
          </h2>
          <p className="text-muted-foreground max-w-[52ch] text-sm leading-relaxed lg:text-base">
            {dict.landing.mapSub}
          </p>
          {participantCount > 0 && (
            <p className="font-display text-primary text-lg font-bold lg:text-2xl">
              {fill(dict.landing.mapTotal, {
                count: participantCount.toLocaleString("de-CH"),
              })}
            </p>
          )}
        </motion.div>
        <motion.div
          {...SECTION_REVEAL}
          className={cn(COLUMN, "relative z-10 pb-14 pt-8 lg:pb-20 lg:pt-12")}
        >
          <SwissQuoteMap cantonCounts={cantonCounts} quotes={quotes} />
        </motion.div>
      </section>

      <div className="bg-card border-border w-full border-t">
        <div className="mx-auto w-full max-w-[600px] lg:max-w-[1280px]">
          <SwissFAQ campaignName={name} />
        </div>
        <SwissFooter name={name} />
      </div>
    </MotionConfig>
  );
}
