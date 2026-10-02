"use client";

import { Fragment, useEffect, useMemo, useRef } from "react";
import { motion } from "motion/react";

export const EASE = [0.22, 1, 0.36, 1] as const;

export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export function WordsReveal({
  text,
  entered,
  baseDelay = 0,
  instant = false,
  className,
}: {
  text: string;
  entered: boolean;
  baseDelay?: number;
  instant?: boolean;
  className?: string;
}) {
  const reduced = useRef(false);
  useEffect(() => {
    reduced.current = prefersReducedMotion();
  }, []);
  const lines = useMemo(
    () => text.split("\n").map((line) => line.split(/\s+/).filter(Boolean)),
    [text],
  );
  let wordIndex = 0;
  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden className={className}>
        {lines.map((words, li) => (
          <span key={li} className="block">
            {words.map((word) => {
              const i = wordIndex++;
              return (
                <Fragment key={i}>
                  <motion.span
                    className="inline-block"
                    initial={false}
                    animate={
                      entered
                        ? { opacity: 1, y: 0, filter: "blur(0px)" }
                        : { opacity: 0, y: 18, filter: "blur(8px)" }
                    }
                    transition={
                      reduced.current || instant
                        ? { duration: 0 }
                        : {
                            duration: 0.3,
                            ease: EASE,
                            delay: entered ? baseDelay + i * 0.025 : 0,
                          }
                    }
                  >
                    {word}
                  </motion.span>{" "}
                </Fragment>
              );
            })}
          </span>
        ))}
      </span>
    </>
  );
}
