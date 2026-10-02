import { createHash } from "node:crypto";

import { eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { snadStudyVersions } from "./db-schema";

import { assertStudyDefinition } from "./schema";
import {
  productionContentSnapshot,
  productionPromptSnapshot,
} from "./production-snapshot";
import { ARCHETYPE_RULES } from "./archetype/scoring";
import { DEFAULT_CLOSING } from "../closing-default";
import type {
  LocalizedText,
  SnadActor,
  SnadOnboarding,
  SnadStudyDefinition,
  SnadTopic,
  StoredOpenerSpec,
} from "../types";

const t = (
  en: string,
  de: string,
  fr: string,
  it: string,
  rm: string,
): LocalizedText => ({ en, de, fr, it, rm });

const actorIdByTopic: Record<string, string> = {
  "daily-life": "topic-daily-life-v1",
  "swiss-or-foreign": "topic-swiss-or-foreign-v1",
  "languages-culture": "topic-languages-culture-v1",
  investing: "topic-investing-v1",
  accountability: "topic-accountability-v1",
};

type SnapshotTopic = Omit<SnadTopic, "actorId">;

const withOtherAssist = (spec: StoredOpenerSpec): StoredOpenerSpec =>
  spec.kind === "question" ? { ...spec, otherAssist: true } : spec;

const topics: SnadTopic[] = (
  productionContentSnapshot.topics as unknown as SnapshotTopic[]
).map((topic) => {
  const sequence = topic.openers.sequence
    .filter(
      (step) => !(step.mode === "always" && step.opener.kind === "interviewer"),
    )
    .map((step) =>
      step.mode === "always"
        ? { ...step, opener: withOtherAssist(step.opener) }
        : { ...step, pool: step.pool.map(withOtherAssist) },
    );
  return {
    key: topic.key,
    title: topic.title,
    blurb: topic.blurb,
    rationale: topic.rationale,
    actorId: actorIdByTopic[topic.key]!,
    openers: { sequence },
  };
});

const topicActors = Object.fromEntries(
  topics.map((topic) => {
    const actor: SnadActor = {
      id: topic.actorId,
      prompt: "",
      model: productionPromptSnapshot.chatModel,
    };
    return [actor.id, actor];
  }),
);

const feedbackActor: SnadActor = {
  id: "feedback-v1",
  prompt: productionContentSnapshot.feedbackPlan,
  model: productionPromptSnapshot.chatModel,
};

const wrapUpQuestions: StoredOpenerSpec[] = [
  {
    id: "wrapup-ai-frequency",
    kind: "question",
    multiSelect: false,
    header: t("AI use", "KI-Nutzung", "Usage de l'IA", "Uso dell'IA", "Diever da l'IA"),
    question: t(
      "How often do you use AI systems such as ChatGPT, Claude, Gemini, etc.?",
      "Wie oft nutzen Sie KI-Systeme wie ChatGPT, Claude, Gemini usw.?",
      "À quelle fréquence utilisez-vous des systèmes d'IA comme ChatGPT, Claude, Gemini, etc. ?",
      "Quanto spesso usi sistemi di IA come ChatGPT, Claude, Gemini, ecc.?",
      "Quant savens duvrais Vus sistems d'IA sco ChatGPT, Claude, Gemini etc.?",
    ),
    options: [
      {
        id: "ai-frequency-daily",
        label: t("Daily", "Täglich", "Tous les jours", "Ogni giorno", "Mintga di"),
      },
      {
        id: "ai-frequency-weekly",
        label: t("Weekly", "Wöchentlich", "Toutes les semaines", "Ogni settimana", "Mintga emna"),
      },
      {
        id: "ai-frequency-monthly",
        label: t("Monthly", "Monatlich", "Tous les mois", "Ogni mese", "Mintga mais"),
      },
      {
        id: "ai-frequency-rarely",
        label: t("Rarely", "Selten", "Rarement", "Raramente", "Darar"),
      },
      {
        id: "ai-frequency-never",
        label: t("Never", "Nie", "Jamais", "Mai", "Mai"),
      },
    ],
  },
  {
    id: "wrapup-ai-uses",
    kind: "question",
    multiSelect: true,
    otherAssist: true,
    visibleWhen: {
      openerId: "wrapup-ai-frequency",
      selected: ["ai-frequency-never"],
      negate: true,
    },
    header: t(
      "What you use it for",
      "Wofür Sie sie nutzen",
      "Vos usages",
      "Per cosa la usi",
      "Per tge Vus la duvrais",
    ),
    question: t(
      "What do you use AI for?",
      "Wofür nutzen Sie KI?",
      "Pour quoi utilisez-vous l'IA ?",
      "Per cosa usi l'IA?",
      "Per tge duvrais Vus l'IA?",
    ),
    options: [
      {
        id: "ai-uses-work",
        label: t(
          "Work and productivity",
          "Arbeit und Produktivität",
          "Travail et productivité",
          "Lavoro e produttività",
          "Lavur e productivitad",
        ),
      },
      {
        id: "ai-uses-learning",
        label: t(
          "Learning and answering questions",
          "Lernen und Fragen beantworten",
          "Apprendre et répondre à des questions",
          "Imparare e rispondere a domande",
          "Emprender e respunder dumondas",
        ),
      },
      {
        id: "ai-uses-writing",
        label: t(
          "Writing and creative projects",
          "Schreiben und kreative Projekte",
          "Écriture et projets créatifs",
          "Scrittura e progetti creativi",
          "Scriver e projects creativs",
        ),
      },
      {
        id: "ai-uses-coding",
        label: t(
          "Coding and technical tasks",
          "Programmieren und technische Aufgaben",
          "Programmation et tâches techniques",
          "Programmazione e compiti tecnici",
          "Programmar e incumbensas tecnicas",
        ),
      },
      {
        id: "ai-uses-everyday",
        label: t(
          "Everyday life and personal advice",
          "Alltag und persönliche Ratschläge",
          "Vie quotidienne et conseils personnels",
          "Vita quotidiana e consigli personali",
          "Mintgadi e cussegls persunals",
        ),
      },
      {
        id: "ai-uses-other",
        label: t("Other", "Andere", "Autre", "Altro", "Auter"),
        freeText: true,
      },
    ],
  },
  {
    id: "wrapup-ai-nonuse",
    kind: "question",
    multiSelect: false,
    otherAssist: true,
    visibleWhen: {
      openerId: "wrapup-ai-frequency",
      selected: ["ai-frequency-never"],
    },
    header: t("Why not", "Warum nicht", "Pourquoi pas", "Perché no", "Pertge betg"),
    question: t(
      "What's the main reason you don't use AI?",
      "Was ist der Hauptgrund, warum Sie keine KI nutzen?",
      "Quelle est la principale raison pour laquelle vous n'utilisez pas l'IA ?",
      "Qual è il motivo principale per cui non usi l'IA?",
      "Tge è la raschun principala per tge Vus na duvrais betg l'IA?",
    ),
    options: [
      {
        id: "ai-nonuse-not-needed",
        label: t(
          "I haven't needed it",
          "Ich habe sie nicht gebraucht",
          "Je n'en ai pas eu besoin",
          "Non ne ho avuto bisogno",
          "Jau n'hai betg dovrà ella",
        ),
      },
      {
        id: "ai-nonuse-distrust",
        label: t(
          "I don't trust it with my information",
          "Ich vertraue ihr meine Informationen nicht an",
          "Je ne lui fais pas confiance avec mes informations",
          "Non mi fido a darle le mie informazioni",
          "Jau na m'fid betg da fidar a l'IA mias infurmaziuns",
        ),
      },
      {
        id: "ai-nonuse-complicated",
        label: t(
          "It feels too complicated",
          "Es erscheint mir zu kompliziert",
          "Cela me paraît trop compliqué",
          "Mi sembra troppo complicato",
          "I ma para memia cumplitgà",
        ),
      },
      {
        id: "ai-nonuse-not-useful",
        label: t(
          "I tried it and it wasn't useful",
          "Ich habe es versucht und es war nicht nützlich",
          "J'ai essayé et ce n'était pas utile",
          "L'ho provata e non è stata utile",
          "Jau hai empruvà ed i n'era betg util",
        ),
      },
      {
        id: "ai-nonuse-concerns",
        label: t(
          "I have concerns about AI in general",
          "Ich habe generell Bedenken gegenüber KI",
          "J'ai des réserves sur l'IA en général",
          "Ho delle preoccupazioni sull'IA in generale",
          "Jau hai en general dubis envers l'IA",
        ),
      },
      {
        id: "ai-nonuse-other",
        label: t("Other", "Andere", "Autre", "Altro", "Auter"),
        freeText: true,
      },
    ],
  },
  {
    id: "wrapup-age",
    kind: "question",
    multiSelect: false,
    header: t("Age", "Alter", "Âge", "Età", "Vegliadetgna"),
    question: t(
      "How old are you?",
      "Wie alt sind Sie?",
      "Quel âge avez-vous ?",
      "Quanti anni hai?",
      "Quants onns avais Vus?",
    ),
    options: [
      {
        id: "age-under-25",
        label: t("Under 25", "Unter 25", "Moins de 25 ans", "Meno di 25 anni", "Sut 25"),
      },
      { id: "age-25-44", label: t("25–44", "25–44", "25–44", "25–44", "25–44") },
      { id: "age-45-64", label: t("45–64", "45–64", "45–64", "45–64", "45–64") },
      { id: "age-65-plus", label: t("65+", "65+", "65+", "65+", "65+") },
    ],
  },
  {
    id: "wrapup-field",
    kind: "question",
    multiSelect: false,
    header: t("Field", "Bereich", "Domaine", "Ambito", "Sectur"),
    question: t(
      "What field do you work or study in?",
      "In welchem Bereich arbeiten oder studieren Sie?",
      "Dans quel domaine travaillez-vous ou étudiez-vous ?",
      "In quale ambito lavori o studi?",
      "En tge sectur lavurais u studegiais Vus?",
    ),
    options: [
      {
        id: "field-technology",
        label: t(
          "Technology & digital services",
          "Technologie & digitale Dienste",
          "Technologie et services numériques",
          "Tecnologia e servizi digitali",
          "Tecnologia & servetschs digitals",
        ),
      },
      {
        id: "field-health",
        label: t(
          "Health & care",
          "Gesundheit & Pflege",
          "Santé et soins",
          "Salute e assistenza",
          "Sanadad & tgira",
        ),
      },
      {
        id: "field-education",
        label: t(
          "Education & research",
          "Bildung & Forschung",
          "Éducation et recherche",
          "Istruzione e ricerca",
          "Furmaziun & perscrutaziun",
        ),
      },
      {
        id: "field-law",
        label: t(
          "Law, policy & public administration",
          "Recht, Politik & öffentliche Verwaltung",
          "Droit, politique et administration publique",
          "Diritto, politica e amministrazione pubblica",
          "Dretg, politica & administraziun publica",
        ),
      },
      {
        id: "field-business",
        label: t(
          "Business & finance",
          "Wirtschaft & Finanzen",
          "Affaires et finance",
          "Economia e finanza",
          "Economia & finanzas",
        ),
      },
      {
        id: "field-media",
        label: t(
          "Media, arts & culture",
          "Medien, Kunst & Kultur",
          "Médias, arts et culture",
          "Media, arti e cultura",
          "Medias, art & cultura",
        ),
      },
      {
        id: "field-industry",
        label: t(
          "Industry, trade & manufacturing",
          "Industrie, Handel & Produktion",
          "Industrie, commerce et fabrication",
          "Industria, commercio e produzione",
          "Industria, commerzi & producziun",
        ),
      },
      {
        id: "field-nonprofit",
        label: t(
          "Non-profit & civil society",
          "Non-Profit & Zivilgesellschaft",
          "Sans but lucratif et société civile",
          "Non profit e società civile",
          "Senza finamira da gudogn & societad civila",
        ),
      },
      {
        id: "field-other",
        label: t("Other", "Andere", "Autre", "Altro", "Auter"),
        freeText: true,
      },
    ],
  },
];

// The canton start gate's copy. Editor-authored per locale from here on.
const onboarding: SnadOnboarding = {
  cantonQuestion: t(
    "Which canton do you consider your primary place of life?",
    "Welchen Kanton betrachten Sie als Ihren Hauptlebensmittelpunkt?",
    "Quel canton considérez-vous comme votre principal lieu de vie ?",
    "Quale cantone consideri il tuo principale luogo di vita?",
    "Tge chantun considerais Vus sco Voss lieu principal da viver?",
  ),
  cantonWhy: t(
    "This helps us show that we heard from a wide range of people across Switzerland.",
    "So können wir zeigen, dass wir von Menschen aus der ganzen Schweiz gehört haben.",
    "Cela nous aide à montrer que nous avons entendu des personnes de toute la Suisse.",
    "Questo ci aiuta a dimostrare che abbiamo ascoltato persone da tutta la Svizzera.",
    "Quai ans gida a mussar che nus avain udì da persunas da tut la Svizra.",
  ),
  continueLabel: t("Continue", "Weiter", "Continuer", "Continua", "Cuntinuar"),
};

export const snadStudyDefinition: SnadStudyDefinition = {
  id: "swiss-national-ai-dialogue",
  label: `${productionContentSnapshot.label} / ${productionPromptSnapshot.label}`,
  locales: ["en", "de", "fr", "it", "rm"],
  topics,
  aiActors: { ...topicActors, [feedbackActor.id]: feedbackActor },
  wrapUp: {
    feedbackActorId: feedbackActor.id,
    questions: wrapUpQuestions,
    closing: DEFAULT_CLOSING,
    archetypeRules: ARCHETYPE_RULES,
  },
  onboarding,
  drawHash: "mixed",
};

assertStudyDefinition(snadStudyDefinition);

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [
          key,
          canonicalize((value as Record<string, unknown>)[key]),
        ]),
    );
  }
  return value;
}

export function hashStudyDefinition(
  definition: SnadStudyDefinition,
): string {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(definition)))
    .digest("hex");
}

export const snadStudyDefinitionHash = hashStudyDefinition(
  snadStudyDefinition,
);

async function selectActiveStudyVersion(): Promise<{
  id: string;
  definitionHash: string;
} | null> {
  const [active] = await db
    .select({
      id: snadStudyVersions.id,
      definitionHash: snadStudyVersions.definitionHash,
    })
    .from(snadStudyVersions)
    .where(eq(snadStudyVersions.isActive, true))
    .limit(1);
  return active ?? null;
}

export async function ensureCodeStudyVersion(): Promise<{
  id: string;
  definitionHash: string;
}> {
  const [existing] = await db
    .select({
      id: snadStudyVersions.id,
      definitionHash: snadStudyVersions.definitionHash,
    })
    .from(snadStudyVersions)
    .where(eq(snadStudyVersions.definitionHash, snadStudyDefinitionHash))
    .limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(snadStudyVersions)
    .values({
      definitionHash: snadStudyDefinitionHash,
      label: snadStudyDefinition.label,
      definition: snadStudyDefinition,
      createdBy: "code",
    })
    .onConflictDoNothing({ target: snadStudyVersions.definitionHash })
    .returning({
      id: snadStudyVersions.id,
      definitionHash: snadStudyVersions.definitionHash,
    });
  if (created) return created;

  const [raced] = await db
    .select({
      id: snadStudyVersions.id,
      definitionHash: snadStudyVersions.definitionHash,
    })
    .from(snadStudyVersions)
    .where(eq(snadStudyVersions.definitionHash, snadStudyDefinitionHash))
    .limit(1);
  if (!raced) throw new Error("failed to ensure SNAD study version");
  return raced;
}

export async function ensureActiveStudyVersion(): Promise<{
  id: string;
  definitionHash: string;
}> {
  const active = await selectActiveStudyVersion();
  if (active) return active;

  const seeded = await ensureCodeStudyVersion();
  try {
    await db
      .update(snadStudyVersions)
      .set({ isActive: true })
      .where(
        sql`${snadStudyVersions.id} = ${seeded.id} AND NOT EXISTS (SELECT 1 FROM ${snadStudyVersions} WHERE ${snadStudyVersions.isActive})`,
      );
  } catch {
    // A concurrent bootstrap won the partial unique index — read theirs.
  }
  const bootstrapped = await selectActiveStudyVersion();
  if (!bootstrapped) throw new Error("failed to activate SNAD study version");
  return bootstrapped;
}

const PARSED_DEFINITION_CACHE_MAX = 32;
const parsedDefinitionCache = new Map<string, SnadStudyDefinition>();

export function parsePinnedStudyDefinition(
  value: unknown,
  studyVersionId?: string,
): SnadStudyDefinition {
  if (studyVersionId) {
    const cached = parsedDefinitionCache.get(studyVersionId);
    if (cached) {
      parsedDefinitionCache.delete(studyVersionId);
      parsedDefinitionCache.set(studyVersionId, cached);
      return cached;
    }
  }
  const definition = value as SnadStudyDefinition;
  assertStudyDefinition(definition);
  if (studyVersionId) {
    if (parsedDefinitionCache.size >= PARSED_DEFINITION_CACHE_MAX) {
      const oldest = parsedDefinitionCache.keys().next().value;
      if (oldest !== undefined) parsedDefinitionCache.delete(oldest);
    }
    parsedDefinitionCache.set(studyVersionId, definition);
  }
  return definition;
}

export async function getPinnedDefinition(
  studyVersionId: string,
): Promise<SnadStudyDefinition> {
  const cached = parsedDefinitionCache.get(studyVersionId);
  if (cached) {
    parsedDefinitionCache.delete(studyVersionId);
    parsedDefinitionCache.set(studyVersionId, cached);
    return cached;
  }
  const [row] = await db
    .select({ definition: snadStudyVersions.definition })
    .from(snadStudyVersions)
    .where(eq(snadStudyVersions.id, studyVersionId))
    .limit(1);
  if (!row) throw new Error("SNAD study version not found");
  return parsePinnedStudyDefinition(row.definition, studyVersionId);
}
