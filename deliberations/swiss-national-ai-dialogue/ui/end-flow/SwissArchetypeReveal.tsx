"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";

import type {
  ArchetypeResult,
} from "../../server/archetype/compute";
import { PERSONA_AXES, type PersonaAxes } from "../../archetype";
import { personaDataUri } from "./archetype-art";
import { ArchetypeRadar } from "./ArchetypeRadar";
import { SwissPostEyebrow } from "./SwissPostScreen";
import { useSwissDict } from "../../i18n";

export function useArchetypeResult(): {
  settled: boolean;
  result: ArchetypeResult | null;
} {
  const [state, setState] = useState<{
    settled: boolean;
    result: ArchetypeResult | null;
  }>({ settled: false, result: null });
  const requestedRef = useRef(false);

  useEffect(() => {
    if (requestedRef.current) return;
    requestedRef.current = true;
    fetch("/api/snad/session?archetype=1")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { result?: ArchetypeResult | null } | null) => {
        setState({
          settled: true,
          result: data?.result?.archetype ? data.result : null,
        });
      })
      .catch(() => setState({ settled: true, result: null }));
  }, []);

  return state;
}

function tracksToAxes(
  result: ArchetypeResult,
  side: "you" | "ch",
): PersonaAxes {
  return Object.fromEntries(
    PERSONA_AXES.map((axis) => [
      axis,
      result.axes.find((track) => track.axis === axis)?.[side] ?? 50,
    ]),
  ) as PersonaAxes;
}

export function SwissArchetypeSection({ result }: { result: ArchetypeResult }) {
  const dict = useSwissDict();
  const t = dict.archetype;

  const name = t.names[result.archetype] ?? result.archetype;

  return (
    <>
      <div className="flex flex-col gap-3">
        <SwissPostEyebrow>{t.eyebrow}</SwissPostEyebrow>
        <motion.img
          src={personaDataUri(result.archetype)}
          alt=""
          className="w-28"
          initial={{ opacity: 0, scale: 0.7, rotate: -8 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 18 }}
        />
        <h2 className="font-display max-w-[16ch] text-[clamp(1.9rem,7vw,3rem)] font-bold leading-[1.04] tracking-[-0.02em] text-[var(--hero-foreground)]">
          {name}
        </h2>
        <p className="max-w-[46ch] text-[15px] leading-relaxed text-[color-mix(in_srgb,var(--hero-foreground)_72%,transparent)]">
          {t.descriptions[result.archetype] ?? ""}
        </p>
        {result.rarity && (
          <p className="font-mono text-[12px] text-[color-mix(in_srgb,var(--hero-foreground)_58%,transparent)]">
            {t.rarity.replace("{percent}", String(result.rarity.percent))}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          <ArchetypeRadar
            you={tracksToAxes(result, "you")}
            ch={tracksToAxes(result, "ch")}
            labels={t.axisLabels}
            className="mx-auto w-full max-w-[340px]"
          />
        </motion.div>
        <div className="text-muted-foreground flex justify-center gap-5 font-mono text-[11px]">
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="bg-primary inline-block size-2.5 rounded-full"
            />
            {dict.tradeoff.pollYou}
          </span>
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block size-2 rounded-full bg-[color-mix(in_srgb,var(--hero-foreground)_40%,transparent)]"
            />
            {dict.tradeoff.pollKicker}
          </span>
        </div>
      </div>
    </>
  );
}
