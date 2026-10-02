"use client";

import { useId } from "react";

import { sliderCurvePaths } from "./opener-poll-math";

export function SwissSliderCurve({
  bins,
  youPosition,
}: {
  bins: number[];
  youPosition: number | null;
}) {
  const gradientId = useId();
  const paths = sliderCurvePaths(bins);
  if (!paths) return null;
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="h-full w-full"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop
            offset="0"
            stopColor="var(--tradeoff-accent)"
            stopOpacity="0.28"
          />
          <stop
            offset="1"
            stopColor="var(--tradeoff-accent)"
            stopOpacity="0.02"
          />
        </linearGradient>
      </defs>
      <path d={paths.area} fill={`url(#${gradientId})`} />
      <path
        d={paths.line}
        fill="none"
        stroke="var(--tradeoff-accent)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {youPosition !== null && (
        <line
          x1={youPosition}
          x2={youPosition}
          y1="4"
          y2="100"
          stroke="var(--tradeoff-accent)"
          strokeWidth="2"
          strokeOpacity="0.55"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  );
}
