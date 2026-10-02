import { PERSONA_AXES, type PersonaAxes, type PersonaKey } from "../../archetype";

const RED = "#c01f26";
const RED_DEEP = "#9a161c";
const INK = "#1f1c18";
const PAPER = "#fdfdfa";
const TINT = "#f0ece1";

function badge(content: string): string {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">`,
    `<circle cx="48" cy="48" r="46" fill="${TINT}"/>`,
    content,
    `<circle cx="48" cy="48" r="44.5" fill="none" stroke="${INK}" stroke-width="1.5" opacity="0.15"/>`,
    `<circle cx="48" cy="48" r="46" fill="none" stroke="${INK}" stroke-width="2"/>`,
    `</svg>`,
  ].join("");
}

export const PERSONA_ART: Record<PersonaKey, string> = {
  // Twin peaks, a rising sun, and a planted flag on the summit.
  pioneer: badge(
    [
      `<circle cx="66" cy="30" r="11" fill="${RED}"/>`,
      `<path d="M8 76 L38 32 L54 56 L66 42 L88 76 Z" fill="${INK}"/>`,
      `<path d="M38 32 L45 42 L38 46 L31 42 Z" fill="${PAPER}"/>`,
      `<rect x="37" y="14" width="2.5" height="20" fill="${INK}"/>`,
      `<path d="M39.5 15 h14 l-4 5 4 5 h-14 Z" fill="${RED}"/>`,
    ].join(""),
  ),
  // One bold peak with the guide's switchback route to a summit pennant.
  "mountain-guide": badge(
    [
      `<path d="M12 78 L48 20 L84 78 Z" fill="${INK}"/>`,
      `<path d="M48 20 L57 34 L48 40 L39 34 Z" fill="${PAPER}"/>`,
      `<path d="M48 40 L40 50 L56 58 L36 68 L52 78" fill="none" stroke="${PAPER}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="0.1 7"/>`,
      `<path d="M48 20 L48 8 L60 12 L48 16 Z" fill="${RED}"/>`,
    ].join(""),
  ),
  // A pocket watch, every safeguard in its place.
  watchmaker: badge(
    [
      `<rect x="43" y="12" width="10" height="7" rx="2" fill="${INK}"/>`,
      `<circle cx="48" cy="52" r="31" fill="${RED}"/>`,
      `<circle cx="48" cy="52" r="24" fill="${PAPER}"/>`,
      `<g fill="${INK}">`,
      `<rect x="46.8" y="30" width="2.4" height="6"/>`,
      `<rect x="46.8" y="68" width="2.4" height="6"/>`,
      `<rect x="26" y="50.8" width="6" height="2.4"/>`,
      `<rect x="64" y="50.8" width="6" height="2.4"/>`,
      `</g>`,
      `<path d="M48 52 L48 36" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>`,
      `<path d="M48 52 L59 58" stroke="${RED}" stroke-width="3.5" stroke-linecap="round"/>`,
      `<circle cx="48" cy="52" r="3" fill="${INK}"/>`,
    ].join(""),
  ),
  // The rescue dog: dark head, white blaze, droopy ears, barrel collar.
  "st-bernard": badge(
    [
      `<circle cx="48" cy="44" r="25" fill="${INK}"/>`,
      `<ellipse cx="25" cy="44" rx="8.5" ry="15" fill="${RED_DEEP}" transform="rotate(14 25 44)"/>`,
      `<ellipse cx="71" cy="44" rx="8.5" ry="15" fill="${RED_DEEP}" transform="rotate(-14 71 44)"/>`,
      `<path d="M48 21 q4.5 0 5.5 8 l1.5 11 q9 2 9 12 q0 13 -16 13 q-16 0 -16 -13 q0 -10 9 -12 l1.5 -11 q1 -8 5.5 -8 Z" fill="${PAPER}"/>`,
      `<circle cx="36.5" cy="40" r="4.2" fill="${PAPER}"/>`,
      `<circle cx="59.5" cy="40" r="4.2" fill="${PAPER}"/>`,
      `<circle cx="37" cy="40.5" r="2" fill="${INK}"/>`,
      `<circle cx="59" cy="40.5" r="2" fill="${INK}"/>`,
      `<ellipse cx="48" cy="52" rx="5" ry="4" fill="${INK}"/>`,
      `<path d="M48 56 q0 5 -5 6 M48 56 q0 5 5 6" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`,
      `<rect x="39" y="66" width="18" height="14" rx="5" fill="${RED}"/>`,
      `<rect x="45.7" y="68" width="4.6" height="10" fill="${PAPER}"/>`,
      `<rect x="43" y="70.7" width="10" height="4.6" fill="${PAPER}"/>`,
    ].join(""),
  ),
  // The fondue caquelon — warmth, welcome, and a Swiss cross on the pot.
  innkeeper: badge(
    [
      `<path d="M30 20 q4 8 0 14 M48 16 q4 8 0 14 M66 20 q4 8 0 14" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round" opacity="0.55"/>`,
      `<path d="M22 42 h52 l-4 24 q-2 10 -12 10 h-20 q-10 0 -12 -10 Z" fill="${RED}"/>`,
      `<rect x="14" y="42" width="14" height="5" rx="2.5" fill="${INK}"/>`,
      `<rect x="68" y="42" width="14" height="5" rx="2.5" fill="${INK}"/>`,
      `<rect x="45" y="50" width="6" height="16" fill="${PAPER}"/>`,
      `<rect x="40" y="55" width="16" height="6" fill="${PAPER}"/>`,
    ].join(""),
  ),
  // Shield and fir — guarding the valley.
  ranger: badge(
    [
      `<path d="M48 14 q14 6 26 6 v26 q0 22 -26 34 q-26 -12 -26 -34 V20 q12 0 26 -6 Z" fill="${INK}"/>`,
      `<path d="M48 19 q11 4.5 21 5.3 V46 q0 18 -21 28.6 Q27 64 27 46 V24.3 q10 -0.8 21 -5.3 Z" fill="${PAPER}"/>`,
      `<path d="M48 26 L58 42 h-6 L60 56 h-8 L60 70 H36 L44 56 h-8 L44 42 h-6 Z" fill="${RED}"/>`,
      `<rect x="45.5" y="70" width="5" height="8" fill="${INK}"/>`,
    ].join(""),
  ),
  // The alphorn sounding across the valley.
  "alphorn-player": badge(
    [
      `<rect x="12" y="23" width="12" height="10" rx="3" fill="${RED}" transform="rotate(18 18 28)"/>`,
      `<path d="M22 31 q26 6 32 32 q1.5 8 9 10" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round"/>`,
      `<path d="M58 74 l17 -13 q11 15 -9 21 Z" fill="${INK}"/>`,
      `<path d="M76 52 q4 -6 3 -13 M83 57 q6 -8 5 -18 M69 47 q3 -4 2.5 -9" fill="none" stroke="${RED}" stroke-width="3" stroke-linecap="round"/>`,
    ].join(""),
  ),
  // The stone viaduct — spans built to join shores.
  "bridge-builder": badge(
    [
      `<circle cx="30" cy="28" r="10" fill="${RED}"/>`,
      `<path d="M10 50 h76 v10 h-76 Z" fill="${INK}"/>`,
      `<path d="M14 60 h68 v22 h-68 Z" fill="${INK}"/>`,
      `<path d="M20 82 v-14 q0 -8 8 -8 q8 0 8 8 v14 Z" fill="${TINT}"/>`,
      `<path d="M40 82 v-14 q0 -8 8 -8 q8 0 8 8 v14 Z" fill="${TINT}"/>`,
      `<path d="M60 82 v-14 q0 -8 8 -8 q8 0 8 8 v14 Z" fill="${TINT}"/>`,
      `<rect x="10" y="46" width="76" height="4" fill="${RED}"/>`,
    ].join(""),
  ),
};

export function personaDataUri(key: PersonaKey): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(PERSONA_ART[key])}`;
}

export function radarPoint(
  index: number,
  value: number,
  cx: number,
  cy: number,
  radius: number,
): { x: number; y: number } {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / PERSONA_AXES.length;
  const r = (Math.max(0, Math.min(100, value)) / 100) * radius;
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

export function radarPolygonPoints(
  axes: PersonaAxes,
  cx: number,
  cy: number,
  radius: number,
): string {
  return PERSONA_AXES.map((axis, index) => {
    const { x, y } = radarPoint(index, axes[axis], cx, cy, radius);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

