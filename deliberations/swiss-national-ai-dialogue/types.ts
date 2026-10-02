import type { ComponentType, ReactNode } from "react";

import type { ConsentPrefs } from "@/lib/analytics/cookies";

export type SnadLocale = "en" | "de" | "fr" | "it" | "rm";

export type LocalizedText = Record<"en" | "de" | "fr" | "it", string> &
  Record<string, string>;

export type VisibleWhen = {
  openerId: string;
  selected: string[];
  negate?: boolean;
};

export type StoredOpenerOption = {
  id: string;
  label: LocalizedText;
  description?: LocalizedText;
  exclusive?: boolean;
  freeText?: boolean;
};

export type StoredOpenerSpec = {
  id: string;
  visibleWhen?: VisibleWhen;
} & (
  | {
      kind: "binary";
      question: LocalizedText;
      optionA: StoredOpenerOption;
      optionB: StoredOpenerOption;
    }
  | {
      kind: "question";
      header: LocalizedText;
      question: LocalizedText;
      multiSelect: boolean;
      maxSelect?: number;
      otherAssist?: boolean;
      shuffleOptions?: boolean;
      options: StoredOpenerOption[];
    }
  | {
      kind: "ranking";
      header: LocalizedText;
      question: LocalizedText;
      options: StoredOpenerOption[];
      followUp?: LocalizedText;
    }
  | {
      kind: "slider";
      question: LocalizedText;
      minLabel: LocalizedText;
      maxLabel: LocalizedText;
    }
  | {
      kind: "budget";
      question: LocalizedText;
      total: number;
      options: StoredOpenerOption[];
    }
  | {
      kind: "interviewer";
      question: LocalizedText;
      probe: string;
    }
);

export type OpenerStep = { id: string } &
  (
    | { mode: "always"; opener: StoredOpenerSpec }
    | { mode: "rotate"; pool: StoredOpenerSpec[] }
    | { mode: "drawN"; n: number; pool: StoredOpenerSpec[] }
  );

export type TopicOpenersConfig = { sequence: OpenerStep[] };

export type SnadTopic = {
  key: string;
  title: string;
  blurb: string;
  rationale: string;
  plan?: string;
  actorId: string;
  openers: TopicOpenersConfig;
};

export type SnadOption = {
  id?: string;
  label: string;
  description?: string;
  // "(exclusive)" option (e.g. "None"): clears/blocks the rest.
  exclusive?: boolean;
  // "Other…" option that reveals a free-text box (wrap-up demographics).
  freeText?: boolean;
};

export type SnadSequenceStep =
  | {
      kind: "binary";
      opener_id?: string;
      visibleWhen?: VisibleWhen;
      question: string;
      option_a: SnadOption;
      option_b: SnadOption;
    }
  | {
      kind: "question";
      opener_id?: string;
      visibleWhen?: VisibleWhen;
      header: string;
      question: string;
      multiSelect?: boolean;
      // Cap on multi-select picks ("pick up to N"); absent = unbounded.
      maxSelect?: number;
      otherAssist?: boolean;
      options: SnadOption[];
    }
  | {
      kind: "ranking";
      opener_id?: string;
      visibleWhen?: VisibleWhen;
      header: string;
      question: string;
      options: SnadOption[];
      follow_up?: string;
    }
  | {
      kind: "slider";
      opener_id?: string;
      visibleWhen?: VisibleWhen;
      question: string;
      min_label: string;
      max_label: string;
    }
  | {
      kind: "budget";
      opener_id?: string;
      visibleWhen?: VisibleWhen;
      question: string;
      total: number;
      options: SnadOption[];
    }
  | { kind: "share_more"; opener_id?: string; question?: string };

export type SnadOpenerSequenceEvent = {
  type: "awaiting_opener_sequence";
  tool_use_id: string;
  steps: SnadSequenceStep[];
  theme?: string;
  lead?: string;
};

export type SnadBinaryChoiceEvent = {
  type: "awaiting_binary_choice";
  tool_use_id: string;
  question: string;
  option_a: SnadOption;
  option_b: SnadOption;
  theme?: string;
  opener_id?: string;
  lead?: string;
};

export type SnadUserQuestionEvent = {
  type: "awaiting_user_question";
  tool_use_id: string;
  questions: {
    question: string;
    header: string;
    options?: SnadOption[];
    multiSelect?: boolean;
    // Cap on multi-select picks ("pick up to N"); absent = unbounded.
    maxSelect?: number;
    otherAssist?: boolean;
  }[];
  theme?: string;
  opener_id?: string;
  lead?: string;
};

export type SnadCardEvent =
  | SnadOpenerSequenceEvent
  | SnadBinaryChoiceEvent
  | SnadUserQuestionEvent
  | {
      type: "awaiting_canton_selection";
      tool_use_id: string;
      counts: { canton: string; count: number }[];
    };

export type AwaitingEventOf<T extends SnadCardEvent["type"]> = Extract<
  SnadCardEvent,
  { type: T }
>;

export type CardStepProgress = {
  current: number;
  total: number;
  answered: boolean;
  fillMs?: number;
  skipped?: number[];
  navigable?: boolean;
};

export type CardRenderProps<T extends SnadCardEvent["type"]> = {
  event: AwaitingEventOf<T>;
  answer: Record<string, unknown> | null;
  onAnswer: (result: Record<string, unknown>) => void;
  fail: (message: string) => void;
  readOnly?: boolean;
  onStepProgress?: (progress: CardStepProgress | null) => void;
};

export type CardRenderer<T extends SnadCardEvent["type"]> = ComponentType<
  CardRenderProps<T>
>;

export type LandingHeroProps = {
  slug: string;
  interviewCount: number;
  children: ReactNode;
  inInterview?: boolean;
  onHome?: () => void;
  headerExtra?: ReactNode;
};

export type LandingFooterProps = { name: string };
export type FAQProps = { campaignName: string };
export type CookieConsentBannerProps = {
  onDecision: (prefs: ConsentPrefs) => void;
};

export type EndConfirmCardProps = {
  event: {
    type: "awaiting_end_confirmation";
    idea_summary: string;
    worry_summary: string;
    summary: string;
  };
  disabled: boolean;
  submitted: boolean;
  slug: string;
  onSubmit: (payload: { summaryText?: string }) => void;
  session?: SnadSessionPayload;
  onSession?: (session: SnadSessionPayload) => void;
  onStepProgress?: (progress: CardStepProgress | null) => void;
  // Client-side return to the landing view, offered on the finale.
  onHome?: () => void;
  peek?: number | null;
  paused?: boolean;
  advanceSignal?: number;
};

export type SnadActor = {
  id: string;
  prompt: string;
  model: string;
};

export type SnadArchetypeAxis = "candor" | "protection" | "boldness";

export type SnadArchetypeKey =
  | "protective-realist"
  | "vigilant-guardian"
  | "straight-talker"
  | "principled-skeptic"
  | "pragmatic-guardian"
  | "careful-mediator"
  | "liberal-pragmatist"
  | "quiet-liberal";

export type SnadArchetypeRules = {
  axes: readonly SnadArchetypeAxis[];
  scaleLow: number;
  scaleHigh: number;
  scaleItems: readonly {
    openerId: string;
    axis: SnadArchetypeAxis;
    low: 1 | -1;
    high: 1 | -1;
  }[];
  mcqItems: readonly {
    openerId: string;
    axis: SnadArchetypeAxis;
    byOption: Record<string, 1 | -1>;
  }[];
  axisMax: Record<SnadArchetypeAxis, number>;
  classification: {
    thresholds: Record<
      SnadArchetypeAxis,
      { value: number; inclusive: boolean }
    >;
    bySigns: Record<string, SnadArchetypeKey>;
  };
  trackRange: { min: number; max: number };
};

export type SnadStudyDefinition = {
  id: string;
  label: string;
  locales: SnadLocale[];
  topics: SnadTopic[];
  aiActors: Record<string, SnadActor>;
  wrapUp: {
    feedbackActorId: string;
    questions?: StoredOpenerSpec[];
    closing?: SnadClosingConfig;
    archetypeRules: SnadArchetypeRules;
  };
  onboarding?: SnadOnboarding;
  drawHash?: "mixed";
};

export type SnadClosingConfig = {
  question: LocalizedText;
  prompt: string;
};

export type SnadOnboarding = {
  cantonQuestion: LocalizedText;
  cantonWhy: LocalizedText;
  continueLabel: LocalizedText;
};

export type SnadStudyVersionSummary = {
  id: string;
  label: string;
  notes: string | null;
  createdBy: string;
  isActive: boolean;
  definitionHash: string;
  createdAt: string | Date;
  sessionCount: number;
};

export type SnadStudyWarning = {
  severity: "warning" | "info";
  message: string;
};

export type SnadClosingQuote = {
  id: string;
  text: string;
  locale: string;
  canton: string | null;
  source: string;
  status: "approved" | "pending" | "hidden";
  featured: boolean;
  createdAt: string | Date;
};

export type SnadChatTurn = {
  role: "user" | "assistant";
  content: string;
};

export type SnadQuestionVerdict = {
  rating: "up" | "down" | null;
  note: string;
};

export type SnadSessionPayload = {
  sessionId: string;
  status: "active" | "wrap_up" | "completed";
  locale: SnadLocale;
  canton: string | null;
  archetype: string | null;
  wrapUpQuestions: SnadSequenceStep[];
  wrapUpAnswers: Record<string, Record<string, unknown>>;
  activeStep:
    | {
        kind: "topic";
        topicKey: string;
        event: SnadOpenerSequenceEvent;
        partial: unknown[] | null;
      }
    | { kind: "wrap_up" }
    | { kind: "completed" };
  topics: Array<{
    key: string;
    title: string;
    state: "done" | "current" | "upcoming";
    answer: Record<string, unknown> | null;
    event: SnadOpenerSequenceEvent;
  }>;
  questionFeedback: Record<string, SnadQuestionVerdict>;
  feedbackChat: SnadChatTurn[];
  shape: { text: string | null; resolved: boolean };
  closing: {
    question: string;
    draft: string | null;
    contribution: string | null;
    resolved: boolean;
  } | null;
  participantCount: number;
};

export type SnadWallEntry = {
  text: string;
  canton: string | null;
  locale: string;
};

export type OpenerResponseKind =
  | "binary"
  | "mcq"
  | "slider"
  | "budget"
  | "ranking";

// The slider poll's histogram resolution: 0–100 split into ten equal bins.
export const SLIDER_BIN_COUNT = 10;

export function sliderBinIndex(position: number): number {
  return Math.min(
    SLIDER_BIN_COUNT - 1,
    Math.max(0, Math.floor(position / (100 / SLIDER_BIN_COUNT))),
  );
}

export const MCQ_OTHER_SENTINEL = "__other__";
