"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Link as LinkIcon } from "lucide-react";

import { Button } from "@/components/ui";

import {
  trackArchetypeRevealed,
  trackShareClicked,
} from "../../analytics";

import { WALL_AUTO_ADVANCE_MS } from "../cards/SwissContributionCard";
import type { ArchetypeResult } from "../../server/archetype/compute";
import type { EndConfirmCardProps } from "../../types";
import {
  SwissArchetypeSection,
  useArchetypeResult,
} from "./SwissArchetypeReveal";
import { SwissClosingInterview } from "./SwissClosingInterview";
import { SwissDemographicsScreen } from "./SwissDemographics";
import { SwissNpsForm } from "./SwissNpsForm";
import { SwissPostScreen } from "./SwissPostScreen";
import { SwissShapeQuestion } from "./SwissShapeQuestion";
import {
  WRAP_UP_CLOSING_MARKER,
  WRAP_UP_FINALE_MARKER,
  WRAP_UP_SHAPE_MARKER,
  reportWrapUpProgress,
} from "./wrap-up-progress";
import { useSwissDict } from "../../i18n";

type Step = "demographics" | "shape" | "closing" | "ack";

const DEMOGRAPHICS_DONE_KEY = "swiss-demographics-done";

function readDemographicsDone(): boolean {
  try {
    return window.localStorage.getItem(DEMOGRAPHICS_DONE_KEY) === "1";
  } catch {
    return false;
  }
}

export function SwissEndConfirmCard({
  submitted,
  disabled,
  event,
  onSubmit,
  slug,
  session,
  onSession,
  onStepProgress,
  onHome,
  peek,
  paused,
  advanceSignal,
}: EndConfirmCardProps) {
  const mountedSubmittedRef = useRef(submitted);
  const [step, setStep] = useState<Step | null>(
    mountedSubmittedRef.current ? null : "demographics",
  );
  const archetype = useArchetypeResult();
  const finalizedRef = useRef(false);
  const [demographicsPage, setDemographicsPage] = useState(0);
  const [demographicsSkipped, setDemographicsSkipped] = useState<number[]>([]);
  const [shapeResolvedHere, setShapeResolvedHere] = useState(false);
  const [shapeTextHere, setShapeTextHere] = useState<string | null>(null);
  const shapeResolved = shapeResolvedHere || Boolean(session?.shape.resolved);
  const shapeText = shapeTextHere ?? session?.shape.text ?? null;
  const [closingWallShown, setClosingWallShown] = useState(false);

  const questionCount = (session?.wrapUpQuestions ?? []).filter(
    (wrapUpStep) => wrapUpStep.kind === "question",
  ).length;
  const shapePage = questionCount + 2;
  const closingPage = shapePage + 1;
  const totalPages = closingPage + (session?.closing ? 1 : 0) + 1;
  const currentPage =
    step === "shape"
      ? shapePage
      : step === "closing"
        ? closingPage
        : step === "ack"
          ? totalPages - 1
          : demographicsPage < 0
            ? 0
            : Math.min(demographicsPage + 1, questionCount + 1);
  useEffect(() => {
    if (!onStepProgress) return;
    const wallShown = step === "closing" && closingWallShown;
    onStepProgress({
      current: currentPage + 1,
      total: totalPages,
      answered: wallShown,
      ...(wallShown ? { fillMs: WALL_AUTO_ADVANCE_MS } : {}),
      navigable: step !== null,
      ...(demographicsSkipped.length ? { skipped: demographicsSkipped } : {}),
    });
    return () => onStepProgress(null);
  }, [
    onStepProgress,
    currentPage,
    totalPages,
    step,
    demographicsSkipped,
    closingWallShown,
  ]);

  const reportedRef = useRef(new Set<string>());
  const reachWrapUpPage = useCallback((marker: string) => {
    if (reportedRef.current.has(marker)) return;
    reportedRef.current.add(marker);
    reportWrapUpProgress(marker);
  }, []);
  useEffect(() => {
    if (step === "shape") reachWrapUpPage(WRAP_UP_SHAPE_MARKER);
    if (step === "closing") reachWrapUpPage(WRAP_UP_CLOSING_MARKER);
    if (step === "ack") reachWrapUpPage(WRAP_UP_FINALE_MARKER);
  }, [step, reachWrapUpPage]);

  useEffect(() => {
    if (mountedSubmittedRef.current || finalizedRef.current || disabled) return;
    finalizedRef.current = true;
    onSubmit({ summaryText: event.summary ?? "" });
  }, [disabled, event.summary, onSubmit]);

  const stepAfterShape = (): Step =>
    session?.closing && !session.closing.resolved && onSession
      ? "closing"
      : "ack";

  const stepAfterDemographics = (): Step =>
    shapeResolved ? stepAfterShape() : "shape";

  useEffect(() => {
    if (!mountedSubmittedRef.current) return;
    setStep(readDemographicsDone() ? stepAfterDemographics() : "demographics");
    // Entry-step resolution runs once, off the mount-time session snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markDemographicsDone = () => {
    try {
      window.localStorage.setItem(DEMOGRAPHICS_DONE_KEY, "1");
    } catch {
      // Private-mode storage failure just means a reload re-asks once.
    }
    setStep(stepAfterDemographics());
  };

  const demographicsMaxPage = questionCount + 1;
  const displayStep: Step | null =
    peek != null && step != null
      ? peek <= demographicsMaxPage
        ? "demographics"
        : peek === shapePage
          ? "shape"
          : session?.closing && peek === closingPage
            ? "closing"
            : step
      : step;

  if (step === null) return <SwissPostScreen>{null}</SwissPostScreen>;

  const closingPeeking = step !== "closing";
  return (
    <>
      <div className={displayStep === "demographics" ? "my-auto w-full" : "hidden"}>
        <SwissDemographicsScreen
          slug={slug}
          questions={session?.wrapUpQuestions ?? []}
          initialAnswers={session?.wrapUpAnswers ?? {}}
          onPage={setDemographicsPage}
          onReached={reachWrapUpPage}
          onSkippedChange={setDemographicsSkipped}
          onDone={markDemographicsDone}
          peek={displayStep === "demographics" ? peek : null}
        />
      </div>
      {displayStep === "shape" && (
        <div className="my-auto w-full">
          <SwissShapeQuestion
            initialText={shapeText}
            readOnly={step !== "shape" && shapeText !== null}
            onResolve={(text) => {
              setShapeResolvedHere(true);
              setShapeTextHere(text);
            }}
            onDone={() => {
              if (step === "shape") setStep(stepAfterShape());
            }}
          />
        </div>
      )}
      {displayStep === "closing" && session && onSession && (
        <SwissClosingInterview
          slug={slug}
          session={session}
          onSession={onSession}
          onDone={() => setStep("ack")}
          onWallShown={setClosingWallShown}
          paused={Boolean(paused) || closingPeeking}
          advanceSignal={advanceSignal ?? 0}
        />
      )}
      {displayStep === "ack" && (
        <div className="my-auto w-full">
          <SwissFinale slug={slug} archetype={archetype} onHome={onHome} />
        </div>
      )}
    </>
  );
}

function SwissFinale({
  slug,
  archetype,
  onHome,
}: {
  slug: string;
  archetype: { settled: boolean; result: ArchetypeResult | null };
  onHome?: () => void;
}) {
  const dict = useSwissDict();
  const ack = dict.ack;
  const [copied, setCopied] = useState(false);

  const archetypeId = archetype.result?.archetype ?? null;
  const revealedRef = useRef(false);
  useEffect(() => {
    if (archetypeId && !revealedRef.current) {
      revealedRef.current = true;
      trackArchetypeRevealed({ campaignSlug: slug, archetype: archetypeId });
    }
  }, [archetypeId, slug]);

  const copyLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}`;
    try {
      await navigator.clipboard.writeText(url);
      trackShareClicked({ campaignSlug: slug, method: "clipboard" });
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard denied — leave the button as-is rather than blow up.
    }
  };

  return (
    <SwissPostScreen>
      {archetype.result && <SwissArchetypeSection result={archetype.result} />}

      <div className="flex flex-col gap-3">
        <p className="max-w-[46ch] text-[15px] leading-relaxed text-[color-mix(in_srgb,var(--hero-foreground)_72%,transparent)]">
          {ack.body}
        </p>
        <Button
          type="button"
          variant="primary"
          size="lg"
          onClick={copyLink}
          aria-live="polite"
          className="w-full"
        >
          {copied ? (
            <Check aria-hidden="true" />
          ) : (
            <LinkIcon aria-hidden="true" />
          )}
          <span>{copied ? ack.shareCopied : ack.copyLink}</span>
        </Button>
      </div>

      <SwissNpsForm />

      {onHome && (
        <button
          type="button"
          data-testid="finale-back-home"
          onClick={onHome}
          className="self-start rounded-md text-sm font-medium text-[color-mix(in_srgb,var(--hero-foreground)_60%,transparent)] underline-offset-2 transition-colors hover:text-[var(--hero-foreground)] hover:underline"
        >
          {ack.backHome}
        </button>
      )}
    </SwissPostScreen>
  );
}
