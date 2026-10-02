"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type RefObject,
} from "react";

export function useSnadKeyboardViewport(
  composerRef: RefObject<HTMLDivElement | null>,
  maskRef: RefObject<HTMLDivElement | null>,
) {
  const [debug, setDebug] = useState(false);
  const keyboardOpenRef = useRef(false);
  const lastKeyboardHeightRef = useRef(0);
  const preLiftRef = useRef(0);
  const preLiftTimerRef = useRef(0);
  const touchActiveRef = useRef(false);
  const clampsRef = useRef(0);

  useEffect(() => {
    setDebug(new URLSearchParams(window.location.search).has("vvdebug"));
  }, []);

  useEffect(() => {
    const on = () => {
      touchActiveRef.current = true;
    };
    const off = () => {
      touchActiveRef.current = false;
    };
    window.addEventListener("touchstart", on, { passive: true });
    window.addEventListener("touchend", off, { passive: true });
    window.addEventListener("touchcancel", off, { passive: true });
    return () => {
      window.removeEventListener("touchstart", on);
      window.removeEventListener("touchend", off);
      window.removeEventListener("touchcancel", off);
    };
  }, []);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    let animationFrame = 0;
    let open = false;
    let settleFrames = 0;
    let blankFrames = 0;
    let lastViewportHeight = viewport.height;
    let lastViewportTop = viewport.offsetTop;
    let heldInset = 0;
    let openViewportHeight = 0;

    const composerFocused = () => {
      const composer = composerRef.current;
      const active = document.activeElement;
      return (
        !!composer &&
        active instanceof HTMLElement &&
        composer.contains(active) &&
        (active.tagName === "TEXTAREA" || active.tagName === "INPUT")
      );
    };
    const maxScrollY = () =>
      Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const blankBelow = () =>
      Math.round(
        viewport.offsetTop +
          viewport.height -
          (document.documentElement.getBoundingClientRect().top +
            document.documentElement.scrollHeight),
      );
    const apply = () => {
      const gap = window.innerHeight - viewport.height;
      const held =
        open &&
        gap <= 120 &&
        viewport.height < openViewportHeight + 30 &&
        composerFocused();
      const nowOpen = gap > 120 || held;
      if (nowOpen !== open) {
        open = nowOpen;
        keyboardOpenRef.current = nowOpen;
        blankFrames = 0;
        settleFrames = nowOpen ? 0 : 60;
        if (nowOpen) preLiftRef.current = 0;
      }
      if (open && !held) {
        lastKeyboardHeightRef.current = gap;
        openViewportHeight = viewport.height;
      }
      const inset = open
        ? held
          ? heldInset
          : Math.max(
              0,
              Math.round(
                window.innerHeight - viewport.height - viewport.offsetTop,
              ),
            )
        : preLiftRef.current;
      if (open) heldInset = inset;
      if (composerRef.current) {
        composerRef.current.style.bottom = inset > 0 ? `${inset}px` : "";
      }
      if (maskRef.current) {
        maskRef.current.style.height = inset > 0 ? `${inset}px` : "";
      }

      const blank = blankBelow();
      const viewportStill =
        viewport.height === lastViewportHeight &&
        viewport.offsetTop === lastViewportTop;
      lastViewportHeight = viewport.height;
      lastViewportTop = viewport.offsetTop;
      if (
        !touchActiveRef.current &&
        viewportStill &&
        (blank > 1 || window.scrollY > maxScrollY() + 1)
      ) {
        blankFrames += 1;
        if (blankFrames > 8) {
          window.scrollTo(
            0,
            Math.max(
              0,
              Math.min(window.scrollY - Math.max(blank, 0), maxScrollY()),
            ),
          );
          clampsRef.current += 1;
          blankFrames = 0;
        }
      } else {
        blankFrames = 0;
      }
      if (!open && settleFrames > 0) settleFrames -= 1;
      animationFrame =
        open || settleFrames > 0 || (blank > 1 && window.scrollY > 0)
          ? window.requestAnimationFrame(apply)
          : 0;
    };
    const onChange = () => {
      if (!animationFrame) apply();
    };

    onChange();
    viewport.addEventListener("resize", onChange);
    viewport.addEventListener("scroll", onChange);
    window.addEventListener("resize", onChange);
    const watchdog = window.setInterval(onChange, 300);
    return () => {
      viewport.removeEventListener("resize", onChange);
      viewport.removeEventListener("scroll", onChange);
      window.removeEventListener("resize", onChange);
      window.clearInterval(watchdog);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(preLiftTimerRef.current);
    };
  }, [composerRef, maskRef]);

  const onFocus = useCallback(
    (event: FocusEvent<HTMLDivElement>) => {
      const element = event.currentTarget;
      if (window.matchMedia("(hover: none)").matches) {
        const keyboardHeight = lastKeyboardHeightRef.current;
        if (keyboardHeight > 0 && !keyboardOpenRef.current) {
          preLiftRef.current = keyboardHeight;
          element.style.bottom = `${keyboardHeight}px`;
          if (maskRef.current) {
            maskRef.current.style.height = `${keyboardHeight}px`;
          }
          window.clearTimeout(preLiftTimerRef.current);
          preLiftTimerRef.current = window.setTimeout(() => {
            preLiftRef.current = 0;
            if (!keyboardOpenRef.current && composerRef.current) {
              composerRef.current.style.bottom = "";
              if (maskRef.current) maskRef.current.style.height = "";
            }
          }, 900);
        }
        return;
      }
      const rect = element.getBoundingClientRect();
      if (rect.bottom < window.innerHeight - 4) {
        element.scrollIntoView({ behavior: "smooth", block: "end" });
      }
    },
    [composerRef, maskRef],
  );

  return { clampsRef, debug, onFocus };
}
