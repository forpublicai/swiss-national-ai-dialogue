import type { CSSProperties } from "react";

import { PERSONA_AXES, type PersonaAxes, type PersonaAxis } from "../../archetype";
import { radarPoint, radarPolygonPoints } from "./archetype-art";

const CX = 190;
const CY = 158;
const RADIUS = 104;
const LABEL_RADIUS = 124;

const GRID_STROKE = "color-mix(in srgb, var(--hero-foreground) 16%, transparent)";
const CH_STROKE = "color-mix(in srgb, var(--hero-foreground) 42%, transparent)";

function gridAxes(fraction: number): PersonaAxes {
  return Object.fromEntries(
    PERSONA_AXES.map((axis) => [axis, fraction * 100]),
  ) as PersonaAxes;
}

function labelPlacement(index: number): {
  x: number;
  y: number;
  textAnchor: "start" | "middle" | "end";
  dominantBaseline: "auto" | "hanging";
} {
  const { x, y } = radarPoint(index, 100, CX, CY, LABEL_RADIUS);
  const cos = Math.cos(-Math.PI / 2 + (index * 2 * Math.PI) / PERSONA_AXES.length);
  return {
    x,
    y,
    textAnchor: cos > 0.35 ? "start" : cos < -0.35 ? "end" : "middle",
    dominantBaseline: y < CY ? "auto" : "hanging",
  };
}

export function ArchetypeRadar({
  you,
  ch,
  labels,
  className,
  style,
}: {
  you: PersonaAxes;
  ch: PersonaAxes | null;
  labels: Record<PersonaAxis, string>;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 380 316"
      role="img"
      className={className}
      style={style}
    >
      {[1 / 3, 2 / 3, 1].map((fraction) => (
        <polygon
          key={fraction}
          points={radarPolygonPoints(gridAxes(fraction), CX, CY, RADIUS)}
          fill="none"
          stroke={GRID_STROKE}
          strokeWidth="1"
        />
      ))}
      {PERSONA_AXES.map((axis, index) => {
        const { x, y } = radarPoint(index, 100, CX, CY, RADIUS);
        return (
          <line
            key={axis}
            x1={CX}
            y1={CY}
            x2={x}
            y2={y}
            stroke={GRID_STROKE}
            strokeWidth="1"
          />
        );
      })}
      {ch && (
        <polygon
          points={radarPolygonPoints(ch, CX, CY, RADIUS)}
          fill="none"
          stroke={CH_STROKE}
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
      )}
      <polygon
        points={radarPolygonPoints(you, CX, CY, RADIUS)}
        fill="var(--primary)"
        fillOpacity="0.2"
        stroke="var(--primary)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {PERSONA_AXES.map((axis, index) => {
        const { x, y } = radarPoint(index, you[axis], CX, CY, RADIUS);
        return <circle key={axis} cx={x} cy={y} r="4" fill="var(--primary)" />;
      })}
      {PERSONA_AXES.map((axis, index) => {
        const placement = labelPlacement(index);
        return (
          <text
            key={axis}
            x={placement.x}
            y={placement.y}
            textAnchor={placement.textAnchor}
            dominantBaseline={placement.dominantBaseline}
            fontSize="12.5"
            fontWeight="600"
            fill="var(--hero-foreground)"
            opacity="0.75"
          >
            {labels[axis]}
          </text>
        );
      })}
    </svg>
  );
}
