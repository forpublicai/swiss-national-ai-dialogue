import {
  initializeAmplitude,
  setUserProperties,
  trackEvent,
} from "@/lib/analytics/amplitude";
import {
  canWeTrackAnalytics,
  hasConsentDecision,
  onConsentChange,
} from "@/lib/analytics/cookies";

export const identifyCanton = (canton: string) => {
  if (!/^[A-Z]{2}$/.test(canton)) return;
  setUserProperties({ canton });
};

export const identifyLanguage = (language: string) => {
  setUserProperties({ reply_language: language });
};

const runWhenAnalyticsPermitted = (fn: () => void): (() => void) => {
  if (hasConsentDecision()) {
    if (canWeTrackAnalytics()) fn();
    return () => {};
  }
  let done = false;
  return onConsentChange(() => {
    if (done || !canWeTrackAnalytics()) return;
    done = true;
    initializeAmplitude();
    fn();
  });
};

export const identifyLanguageWhenPermitted = (language: string): (() => void) =>
  runWhenAnalyticsPermitted(() => identifyLanguage(language));

// ── Flow ────────────────────────────────────────────────────────────────────

export const trackDialogueStarted = (params: {
  campaignSlug: string;
  resumed: boolean;
}) => {
  trackEvent("dialogue_started", {
    campaign_slug: params.campaignSlug,
    resumed: params.resumed,
  });
};

export const trackOnboardingCompleted = (campaignSlug: string) => {
  trackEvent("onboarding_completed", { campaign_slug: campaignSlug });
};

export const trackLandingViewedWhenPermitted = (params: {
  campaignSlug: string;
  kind: "start" | "continue" | "review";
}): (() => void) =>
  runWhenAnalyticsPermitted(() =>
    trackEvent("landing_viewed", {
      campaign_slug: params.campaignSlug,
      kind: params.kind,
    }),
  );

export const trackLandingCtaClicked = (params: {
  campaignSlug: string;
  kind: "start" | "continue" | "review";
}) => {
  trackEvent("landing_cta_clicked", {
    campaign_slug: params.campaignSlug,
    kind: params.kind,
  });
};

type QuestionEventParams = {
  campaignSlug: string;
  theme: string;
  openerId: string | null;
  kind: "binary" | "mcq" | "slider" | "budget" | "ranking" | "contribution";
};

const questionProps = (params: QuestionEventParams) => ({
  campaign_slug: params.campaignSlug,
  topic_key: params.theme,
  question_id: params.openerId,
  format: params.kind,
});

const questionShownAt = new Map<string, number>();
const questionIdentity = (params: QuestionEventParams) =>
  `${params.openerId ?? params.theme}:${params.kind}`;
const msSinceShown = (params: QuestionEventParams) => {
  const shownAt = questionShownAt.get(questionIdentity(params));
  return shownAt === undefined ? {} : { ms_since_shown: Date.now() - shownAt };
};

export const trackQuestionShown = (params: QuestionEventParams) => {
  questionShownAt.set(questionIdentity(params), Date.now());
  trackEvent("question_shown", questionProps(params));
};

export const trackQuestionAnswered = (
  params: QuestionEventParams & { position?: number },
) => {
  trackEvent("question_answered", {
    ...questionProps(params),
    ...msSinceShown(params),
    ...(params.position !== undefined ? { position: params.position } : {}),
  });
};

export const trackQuestionSkipped = (params: QuestionEventParams) => {
  trackEvent("question_skipped", {
    ...questionProps(params),
    ...msSinceShown(params),
  });
};

export const trackQuestionRated = (
  params: QuestionEventParams & {
    rating: "up" | "down" | "none";
    changed: boolean;
  },
) => {
  trackEvent("question_rated", {
    ...questionProps(params),
    rating: params.rating,
    changed: params.changed,
  });
};

export const trackQuestionNoted = (
  params: QuestionEventParams & { rating: "up" | "down" | "none"; length: number },
) => {
  trackEvent("question_noted", {
    ...questionProps(params),
    rating: params.rating,
    length: params.length,
  });
};

type InterviewerContext = "topic" | "feedback" | "question" | "closing";

const interviewerLastBeatAt = new Map<string, number>();
const interviewerIdentity = (context: InterviewerContext, ref: string | null) =>
  `${context}:${ref ?? ""}`;

export const trackInterviewerOffered = (params: {
  campaignSlug: string;
  context: InterviewerContext;
  ref: string | null;
}) => {
  interviewerLastBeatAt.set(
    interviewerIdentity(params.context, params.ref),
    Date.now(),
  );
  trackEvent("interviewer_offered", {
    campaign_slug: params.campaignSlug,
    context: params.context,
    ref: params.ref,
  });
};

export const trackInterviewerReplied = (params: {
  campaignSlug: string;
  context: InterviewerContext;
  ref: string | null;
  turnIndex: number;
}) => {
  const identity = interviewerIdentity(params.context, params.ref);
  const lastBeatAt = interviewerLastBeatAt.get(identity);
  interviewerLastBeatAt.set(identity, Date.now());
  trackEvent("interviewer_replied", {
    campaign_slug: params.campaignSlug,
    context: params.context,
    ref: params.ref,
    turn_index: params.turnIndex,
    ...(lastBeatAt === undefined
      ? {}
      : { ms_since_prev: Date.now() - lastBeatAt }),
  });
};

// A topic was completed — the participant finished it and the dialogue left it.
export const trackTopicCompleted = (params: {
  campaignSlug: string;
  topicIndex: number;
  topicKey?: string | null;
}) => {
  trackEvent("topic_completed", {
    campaign_slug: params.campaignSlug,
    topic_index: params.topicIndex,
    topic_key: params.topicKey ?? null,
  });
};

// The dialogue reached its wrap-up (the end-confirmation surfaced).
export const trackReachedWrapUp = (params: { campaignSlug: string }) => {
  trackEvent("reached_wrap_up", { campaign_slug: params.campaignSlug });
};

export const trackDialogueCompleted = (params: {
  campaignSlug: string;
  reason: "natural" | "abandoned";
  topicsDone: number;
  interactions: number;
}) => {
  trackEvent("dialogue_completed", {
    campaign_slug: params.campaignSlug,
    reason: params.reason,
    topics_done: params.topicsDone,
    interactions: params.interactions,
  });
};

export const trackResultsEmail = (params: {
  campaignSlug: string;
  choice: "submit" | "skip";
}) => {
  trackEvent("results_email", {
    campaign_slug: params.campaignSlug,
    choice: params.choice,
  });
};

// ── Engaged time ─────────────────────────────────────────────────────────────

export const trackEngagementHeartbeat = (params: {
  campaignSlug: string;
  phase: "landing" | "dialogue";
  seconds: number;
}) => {
  trackEvent("engagement_heartbeat", {
    campaign_slug: params.campaignSlug,
    phase: params.phase,
    seconds: params.seconds,
  });
};

// ── Diagnostics (off-funnel) ────────────────────────────────────────────────

export const trackErrorShown = (params: {
  campaignSlug: string;
  source: "start" | "stream" | "run_error" | "end" | "card";
}) => {
  trackEvent("error_shown", {
    campaign_slug: params.campaignSlug,
    source: params.source,
  });
};

export const trackRetryClicked = (campaignSlug: string) => {
  trackEvent("retry_clicked", { campaign_slug: campaignSlug });
};

export const trackShareClicked = (params: {
  campaignSlug: string;
  method: "web_share" | "clipboard";
}) => {
  trackEvent("share_clicked", {
    campaign_slug: params.campaignSlug,
    method: params.method,
  });
};

export const trackArchetypeRevealed = (params: {
  campaignSlug: string;
  archetype: string;
}) => {
  trackEvent("archetype_revealed", {
    campaign_slug: params.campaignSlug,
    archetype: params.archetype,
  });
};
