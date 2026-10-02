import { useSyncExternalStore } from "react";

import { identifyLanguage } from "./analytics";
import type { LocalizedText, SnadOnboarding } from "./types";

export {
  STRINGS,
  TOPIC_INTROS,
  type FaqEntry,
  type SwissDict,
  type SwissLocale,
  type TopicIntroCopy,
} from "./i18n-strings";
import { STRINGS, type SwissDict, type SwissLocale } from "./i18n-strings";

function isSwissLocale(value: string | null): value is SwissLocale {
  return (
    value === "de" ||
    value === "fr" ||
    value === "it" ||
    value === "en" ||
    value === "rm"
  );
}

export const SWISS_LOCALES: {
  code: SwissLocale;
  label: string;
  flag: string;
  greeting: string;
}[] = [
  { code: "de", label: "Deutsch", flag: "🇨🇭", greeting: "Grüezi" },
  { code: "fr", label: "Français", flag: "🇨🇭", greeting: "Bonjour" },
  { code: "it", label: "Italiano", flag: "🇨🇭", greeting: "Buongiorno" },
  { code: "rm", label: "Rumantsch", flag: "🇨🇭", greeting: "Allegra" },
  { code: "en", label: "English", flag: "🇬🇧", greeting: "Hello" },
];

const LOCALE_KEY = "swiss-locale";
const CHOSEN_KEY = "swiss-locale-chosen";

let current: SwissLocale = "en";
let chosen = false;
let resolved = false;
const listeners = new Set<() => void>();

function detectBrowserLocale(): SwissLocale {
  try {
    const langs =
      navigator.languages && navigator.languages.length > 0
        ? navigator.languages
        : [navigator.language];
    for (const l of langs) {
      const code = l.slice(0, 2).toLowerCase();
      if (isSwissLocale(code)) return code;
    }
  } catch {
    // navigator unavailable — fall through.
  }
  return "en";
}

function readInitial(): { locale: SwissLocale; chosen: boolean } {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("lang");
    if (isSwissLocale(fromUrl)) {
      try {
        window.localStorage.setItem(LOCALE_KEY, fromUrl);
        window.localStorage.setItem(CHOSEN_KEY, "1");
      } catch {
        // best-effort
      }
      return { locale: fromUrl, chosen: true };
    }
    const stored = window.localStorage.getItem(LOCALE_KEY);
    const wasChosen = window.localStorage.getItem(CHOSEN_KEY) === "1";
    if (isSwissLocale(stored)) return { locale: stored, chosen: wasChosen };
  } catch {
    // storage unavailable — fall through to browser default.
  }
  return { locale: detectBrowserLocale(), chosen: false };
}

function ensureResolved(): void {
  if (resolved || typeof window === "undefined") return;
  const init = readInitial();
  current = init.locale;
  chosen = init.chosen;
  resolved = true;
}

function emit(): void {
  for (const l of listeners) l();
}

export function getLocale(): SwissLocale {
  ensureResolved();
  return current;
}

export function getLocaleChosen(): boolean {
  ensureResolved();
  return chosen;
}

export function setLocale(next: SwissLocale): void {
  ensureResolved();
  const changed = current !== next || !chosen;
  current = next;
  chosen = true;
  try {
    window.localStorage.setItem(LOCALE_KEY, next);
    window.localStorage.setItem(CHOSEN_KEY, "1");
  } catch {
    // best-effort
  }
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("lang", next);
    window.history.replaceState({}, "", url);
  } catch {
    // non-fatal — state still updates below.
  }
  if (changed) {
    identifyLanguage(next);
    emit();
  }
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getServerSnapshot(): SwissLocale {
  return "en";
}

export function useSwissLocale(): SwissLocale {
  return useSyncExternalStore(subscribe, getLocale, getServerSnapshot);
}

export type LocalizedOnboarding = Record<
  "cantonQuestion" | "cantonWhy" | "continueLabel",
  string
>;

export function localizeOnboarding(
  onboarding: SnadOnboarding,
  locale: SwissLocale,
): LocalizedOnboarding {
  const pick = (text: LocalizedText) => text[locale]?.trim() || text.en;
  return {
    cantonQuestion: pick(onboarding.cantonQuestion),
    cantonWhy: pick(onboarding.cantonWhy),
    continueLabel: pick(onboarding.continueLabel),
  };
}

function getChosenServerSnapshot(): boolean {
  return false;
}

export function useSwissLocaleChosen(): boolean {
  return useSyncExternalStore(
    subscribe,
    getLocaleChosen,
    getChosenServerSnapshot,
  );
}

export function getDict(locale: SwissLocale): SwissDict {
  return STRINGS[locale] ?? STRINGS.en;
}

// Convenience: the active locale's full dictionary (typed, structured access).
export function useSwissDict(): SwissDict {
  return getDict(useSwissLocale());
}

// Lightweight {token} interpolation for the handful of templated strings.
export function fill(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    k in vars ? String(vars[k]) : `{${k}}`,
  );
}

export const STAGE_TITLES: Record<SwissLocale, Record<string, string>> = {
  en: {
    "daily-life": "Daily life",
    "swiss-or-foreign": "Swiss or foreign?",
    "languages-culture": "Languages & culture",
    investing: "Investing in AI",
    accountability: "When it goes wrong",
    sovereignty: "Sovereignty",
    "personal-info": "Privacy",
    "your-influence": "Control & accountability",
    "your-topic": "Your topic",
  },
  de: {
    "daily-life": "Alltag",
    "swiss-or-foreign": "Schweizerisch oder international?",
    "languages-culture": "Sprachen & Kultur",
    investing: "Investitionen in KI",
    accountability: "Wenn etwas schiefgeht",
    sovereignty: "Souveränität",
    "personal-info": "Privatsphäre",
    "your-influence": "Kontrolle & Verantwortung",
    "your-topic": "Ihr Thema",
  },
  fr: {
    "daily-life": "Quotidien",
    "swiss-or-foreign": "Suisse ou étrangère ?",
    "languages-culture": "Langues & culture",
    investing: "Investir dans l'IA",
    accountability: "Quand ça tourne mal",
    sovereignty: "Souveraineté",
    "personal-info": "Vie privée",
    "your-influence": "Contrôle & responsabilité",
    "your-topic": "Votre sujet",
  },
  it: {
    "daily-life": "Vita quotidiana",
    "swiss-or-foreign": "Svizzera o straniera?",
    "languages-culture": "Lingue & cultura",
    investing: "Investire nell'IA",
    accountability: "Quando qualcosa va storto",
    sovereignty: "Sovranità",
    "personal-info": "Privacy",
    "your-influence": "Controllo & responsabilità",
    "your-topic": "Il tuo tema",
  },
  rm: {
    "daily-life": "Vita da mintgadi",
    "swiss-or-foreign": "Svizra u estra?",
    "languages-culture": "Linguas & cultura",
    investing: "Investir en l'IA",
    accountability: "Cur ch'i va mal",
    sovereignty: "Suveranitad",
    "personal-info": "Sfera privata",
    "your-influence": "Controll & responsabladad",
    "your-topic": "Voss tema",
  },
};

export const STAGE_DESCRIPTIONS: Record<SwissLocale, Record<string, string>> = {
  en: {
    "daily-life":
      "How AI already shows up in your life, how often you reach for it, and how you want it to behave when it answers you.",
    sovereignty:
      "Whether it matters that Switzerland builds its own AI — independence, democratic oversight, and the languages and values it must carry.",
    accountability:
      "Who should steer how Swiss AI behaves, where its limits belong in consequential decisions, and who answers when it causes harm.",
    "personal-info":
      "How much Apertus should know and remember about you, where assistance ends and overreach begins — and where its effort should go.",
  },
  de: {
    "daily-life":
      "Wie KI heute schon in Ihrem Leben vorkommt, wie oft Sie sie nutzen, und wie sie sich Ihnen gegenüber verhalten soll.",
    sovereignty:
      "Ob es zählt, dass die Schweiz eine eigene KI baut — Unabhängigkeit, demokratische Kontrolle, und welche Sprachen und Werte sie tragen muss.",
    accountability:
      "Wer lenken soll, wie sich die Schweizer KI verhält, wo ihre Grenzen bei folgenreichen Entscheiden liegen, und wer haftet, wenn sie Schaden anrichtet.",
    "personal-info":
      "Wie viel Apertus über Sie wissen und sich merken darf, wo Hilfe endet und Übergriff beginnt — und wohin sein Aufwand fliessen soll.",
  },
  fr: {
    "daily-life":
      "Comment l'IA est déjà présente dans votre vie, à quelle fréquence vous l'utilisez, et comment elle devrait se comporter avec vous.",
    sovereignty:
      "S'il importe que la Suisse construise sa propre IA — indépendance, contrôle démocratique, et les langues et valeurs qu'elle doit porter.",
    accountability:
      "Qui devrait orienter le comportement de l'IA suisse, où placer ses limites dans les décisions importantes, et qui répond quand elle cause un tort.",
    "personal-info":
      "Ce qu'Apertus peut savoir et retenir de vous, où l'aide s'arrête et où commence l'ingérence — et où son effort doit aller.",
  },
  it: {
    "daily-life":
      "Come l'IA è già presente nella tua vita, quanto spesso la usi, e come dovrebbe comportarsi con te.",
    sovereignty:
      "Se conta che la Svizzera costruisca la propria IA — indipendenza, controllo democratico, e le lingue e i valori che deve portare.",
    accountability:
      "Chi dovrebbe orientare il comportamento dell'IA svizzera, dove porre i suoi limiti nelle decisioni importanti, e chi risponde quando causa un danno.",
    "personal-info":
      "Quanto Apertus può sapere e ricordare di te, dove finisce l'aiuto e inizia l'invadenza — e dove deve andare il suo impegno.",
  },
  rm: {
    "daily-life":
      "Co che l'IA cumpara gia en Vossa vita, quant savens che Vus la duvrais, e co ch'ella duess sa cumportar cun Vus cur ch'ella As respunda.",
    sovereignty:
      "Sche quai importa ch'la Svizra construescha sia atgna IA — independenza, controll democratic, e las linguas e valurs ch'ella sto purtar.",
    accountability:
      "Tgi che duess manar co ch'l'IA svizra sa cumporta, nua ch'ses limits appartegnan en decisiuns cun consequenzas, e tgi che responda cur ch'ella chaschuna donn.",
    "personal-info":
      "Quant che Apertus duess savair e sa regurdar da Vus, nua ch'agid finescha e surpassament cumenza — e nua che ses sforz duess ir.",
  },
};
