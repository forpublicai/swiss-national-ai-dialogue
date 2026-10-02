"use client";

import { useEffect, useState } from "react";

const PIECE_COUNT = 28;
const COLORS = ["var(--primary)", "#8F1015", "#111111", "#D9D9D5"];

type Piece = {
  left: number;
  delay: number;
  duration: number;
  drift: number;
  spin: number;
  color: string;
  width: number;
  height: number;
};

function makePieces(): Piece[] {
  return Array.from({ length: PIECE_COUNT }, (_, index) => ({
    left: Math.random() * 100,
    delay: Math.random() * 250,
    duration: 1100 + Math.random() * 700,
    drift: (Math.random() - 0.5) * 120,
    spin: (Math.random() - 0.5) * 720,
    color: COLORS[index % COLORS.length]!,
    width: 5 + Math.random() * 4,
    height: 8 + Math.random() * 6,
  }));
}

export function SnadConfetti() {
  const [pieces, setPieces] = useState<Piece[] | null>(null);
  useEffect(() => {
    const reduced =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (!reduced) setPieces(makePieces());
  }, []);
  if (!pieces) return null;

  return (
    <div
      aria-hidden
      data-testid="snad-confetti"
      className="pointer-events-none fixed inset-0 z-40 overflow-hidden"
    >
      <style>{`@keyframes snad-confetti-fall {
        0% { transform: translate3d(0, -4vh, 0) rotate(0deg); opacity: 1; }
        80% { opacity: 1; }
        100% { transform: translate3d(var(--drift), 88vh, 0) rotate(var(--spin)); opacity: 0; }
      }`}</style>
      {pieces.map((piece, index) => (
        <span
          key={index}
          className="absolute top-0 block rounded-[1px]"
          style={{
            left: `${piece.left}%`,
            width: piece.width,
            height: piece.height,
            backgroundColor: piece.color,
            ["--drift" as string]: `${piece.drift}px`,
            ["--spin" as string]: `${piece.spin}deg`,
            animation: `snad-confetti-fall ${piece.duration}ms cubic-bezier(0.25,0.4,0.45,1) ${piece.delay}ms forwards`,
            opacity: 0,
          }}
        />
      ))}
    </div>
  );
}
