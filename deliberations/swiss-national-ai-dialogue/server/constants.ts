export const SNAD_SKIP_TOPIC_MESSAGE =
  "I've shared everything I wanted on this topic — let's move on.";

export const SNAD_CONTRIBUTION_MODEL =
  process.env.LLM_MODEL ?? "apertus-ai/Apertus-v1.5-70B-integration";

export const CONTRIBUTION_MAX_LENGTH = 600;

export const SNAD_CLOSING_TOPIC_KEY = "closing";

export const SNAD_NPS_STEP_ID = "wrapup-nps";

export const SNAD_EMAIL_STEP_ID = "wrapup-email";

export const SNAD_SHAPE_STEP_ID = "wrapup-shape";

export const SNAD_SHAPE_QUESTION_EN =
  "Which question should this dialogue ask next?";

export const SNAD_QUESTION_FEEDBACK_PREFIX = "qfeedback:";

export const SNAD_TOPIC_TIMING_PREFIX = "timing:";

export const SNAD_WRAP_UP_PROGRESS_STEP_ID = "progress:wrapup";

export const SNAD_WRAP_UP_EMAIL_MARKER = "@email";
export const SNAD_WRAP_UP_SHAPE_MARKER = "@shape";
export const SNAD_WRAP_UP_CLOSING_MARKER = "@closing";
export const SNAD_WRAP_UP_FINALE_MARKER = "@finale";

export const LANGUAGE_NAME: Record<
  "de" | "fr" | "it" | "en" | "rm",
  string
> = {
  de: "German (Deutsch)",
  fr: "French (Français)",
  it: "Italian (Italiano)",
  en: "English",
  rm: "Romansh (Rumantsch)",
};
