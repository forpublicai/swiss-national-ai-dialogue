"use client";

import { useEffect, useRef, type RefObject } from "react";

export function SnadVvDebugOverlay({
  composerRef,
  clampsRef,
}: {
  composerRef: RefObject<HTMLDivElement | null>;
  clampsRef: RefObject<number>;
}) {
  const boxRef = useRef<HTMLPreElement | null>(null);

  useEffect(() => {
    let animationFrame = 0;
    const tick = () => {
      animationFrame = window.requestAnimationFrame(tick);
      const element = boxRef.current;
      if (!element) return;
      const viewport = window.visualViewport;
      const documentElement = document.documentElement;
      const rect = documentElement.getBoundingClientRect();
      const maxScroll = Math.max(
        0,
        documentElement.scrollHeight - window.innerHeight,
      );
      const viewportHeight = viewport?.height ?? Number.NaN;
      const viewportTop = viewport?.offsetTop ?? Number.NaN;
      const blank = Math.round(
        viewportTop + viewportHeight - (rect.top + documentElement.scrollHeight),
      );
      const keyboardOpen = viewport
        ? window.innerHeight - viewport.height > 120
        : false;
      element.style.transform = `translate(${viewport?.offsetLeft ?? 0}px, ${viewportTop || 0}px)`;
      element.textContent = [
        `scrollY ${window.scrollY.toFixed(1)} / max ${maxScroll}`,
        `innerH ${window.innerHeight}  vvH ${viewportHeight.toFixed(1)}`,
        `vvTop ${viewportTop.toFixed(1)}  docTop ${rect.top.toFixed(1)}`,
        `drift ${(-rect.top - window.scrollY).toFixed(1)}  blank ${blank}`,
        `kb ${keyboardOpen ? "OPEN" : "closed"}  lift ${
          composerRef.current?.style.bottom || "0"
        }`,
        `clamps ${clampsRef.current}`,
      ].join("\n");
    };
    animationFrame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [clampsRef, composerRef]);

  return (
    <pre
      ref={boxRef}
      data-testid="vv-debug"
      className="pointer-events-none fixed left-1 top-1 z-[100] rounded bg-black/75 px-2 py-1.5 font-mono text-[10px] leading-snug text-lime-300"
    />
  );
}
