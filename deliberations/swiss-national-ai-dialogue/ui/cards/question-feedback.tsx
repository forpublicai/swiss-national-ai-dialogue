"use client";

import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { motion } from "motion/react";
import { ThumbsDown, ThumbsUp } from "lucide-react";

import { cn } from "@/components/ui";

import { trackQuestionNoted, trackQuestionRated } from "../../analytics";
import { useSwissDict } from "../../i18n";
import type { SnadQuestionVerdict } from "../../types";
import type { AuthoredStep } from "./sequence-steps";

const SLUG = "swiss-national-ai-dialogue";

const NO_VERDICT: SnadQuestionVerdict = { rating: null, note: "" };

type QuestionFeedbackStore = {
  verdicts: Record<string, SnadQuestionVerdict>;
  openPanel: string | null;
  rate: (step: AuthoredStep, theme: string | undefined, rating: SnadQuestionVerdict["rating"]) => void;
  saveNote: (step: AuthoredStep, theme: string | undefined, note: string) => void;
  setOpenPanel: (openerId: string | null) => void;
};

const QuestionFeedbackContext = createContext<QuestionFeedbackStore | null>(null);

export function QuestionFeedbackProvider({
  initial,
  children,
}: {
  initial: Record<string, SnadQuestionVerdict>;
  children: ReactNode;
}) {
  const [verdicts, setVerdicts] = useState(initial);
  const [openPanel, setOpenPanel] = useState<string | null>(null);
  const promptedRef = useRef<Set<string>>(new Set(Object.keys(initial)));

  const persist = (openerId: string, verdict: SnadQuestionVerdict) => {
    setVerdicts((current) => ({ ...current, [openerId]: verdict }));
    void fetch("/api/snad/session", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operation: "question_feedback",
        opener_id: openerId,
        rating: verdict.rating,
        note: verdict.note,
      }),
    }).catch(() => {});
  };

  const store: QuestionFeedbackStore = {
    verdicts,
    openPanel,
    setOpenPanel,
    rate: (step, theme, rating) => {
      const openerId = step.opener_id;
      if (!openerId) return;
      const previous = verdicts[openerId] ?? NO_VERDICT;
      persist(openerId, { ...previous, rating });
      trackQuestionRated({
        ...eventParams(step, theme),
        rating: rating ?? "none",
        changed: previous.rating !== null,
      });
      if (!rating) {
        if (!previous.note) setOpenPanel(null);
        return;
      }
      if (promptedRef.current.has(openerId)) return;
      promptedRef.current.add(openerId);
      setOpenPanel(openerId);
    },
    saveNote: (step, theme, note) => {
      const openerId = step.opener_id;
      if (!openerId) return;
      const previous = verdicts[openerId] ?? NO_VERDICT;
      persist(openerId, { ...previous, note });
      setOpenPanel(null);
      trackQuestionNoted({
        ...eventParams(step, theme),
        rating: previous.rating ?? "none",
        length: note.length,
      });
    },
  };

  return (
    <QuestionFeedbackContext.Provider value={store}>
      {children}
    </QuestionFeedbackContext.Provider>
  );
}

function eventParams(step: AuthoredStep, theme: string | undefined) {
  return {
    campaignSlug: SLUG,
    theme: theme ?? "",
    openerId: step.opener_id ?? null,
    kind: (step.kind === "question" ? "mcq" : step.kind) as
      | "binary"
      | "mcq"
      | "slider"
      | "budget"
      | "ranking",
  };
}

function useQuestionVerdict(step: AuthoredStep) {
  const store = useContext(QuestionFeedbackContext);
  const openerId = step.opener_id;
  if (!store || !openerId) return null;
  return {
    store,
    openerId,
    verdict: store.verdicts[openerId] ?? NO_VERDICT,
  };
}

export function QuestionThumbs({
  step,
  theme,
}: {
  step: AuthoredStep;
  theme?: string;
}) {
  const dict = useSwissDict();
  const state = useQuestionVerdict(step);
  if (!state) return null;
  const { rating } = state.verdict;
  const buttonClass = (active: boolean) =>
    cn(
      "hover:text-foreground rounded-md p-1.5 transition-colors",
      active
        ? "text-[color:var(--primary)]"
        : rating
          ? "text-muted-foreground/30"
          : "text-muted-foreground/50",
    );
  return (
    <div className="-ml-1.5 flex items-center gap-0.5">
      <button
        type="button"
        aria-label={dict.question.rateUp}
        aria-pressed={rating === "up"}
        data-testid="question-rate-up"
        onClick={() => state.store.rate(step, theme, rating === "up" ? null : "up")}
        className={buttonClass(rating === "up")}
      >
        <ThumbsUp className="size-3.5" aria-hidden />
      </button>
      <button
        type="button"
        aria-label={dict.question.rateDown}
        aria-pressed={rating === "down"}
        data-testid="question-rate-down"
        onClick={() =>
          state.store.rate(step, theme, rating === "down" ? null : "down")
        }
        className={buttonClass(rating === "down")}
      >
        <ThumbsDown className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}

export function QuestionNote({
  step,
  theme,
}: {
  step: AuthoredStep;
  theme?: string;
}) {
  const dict = useSwissDict();
  const state = useQuestionVerdict(step);
  if (!state) return null;
  const { store, openerId, verdict } = state;
  if (store.openPanel === openerId) {
    return (
      <QuestionNoteEditor
        key={openerId}
        note={verdict.note}
        onSend={(note) => store.saveNote(step, theme, note)}
        onDismiss={() => store.setOpenPanel(null)}
      />
    );
  }
  if (!verdict.rating && !verdict.note) return null;
  return (
    <div className="text-muted-foreground mx-auto flex w-full max-w-[34rem] items-center gap-2 text-[13px]">
      {verdict.note && (
        <span data-testid="question-note-thanks">{dict.question.noteThanks}</span>
      )}
      <button
        type="button"
        data-testid="question-note-open"
        onClick={() => store.setOpenPanel(openerId)}
        className="hover:text-foreground font-medium underline underline-offset-4 transition-colors"
      >
        {verdict.note ? dict.question.noteEdit : dict.question.noteAdd}
      </button>
    </div>
  );
}

function QuestionNoteEditor({
  note,
  onSend,
  onDismiss,
}: {
  note: string;
  onSend: (note: string) => void;
  onDismiss: () => void;
}) {
  const dict = useSwissDict();
  const [draft, setDraft] = useState(note);
  const trimmed = draft.trim();
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="border-border/60 bg-card/40 mx-auto flex w-full max-w-[34rem] flex-col gap-2.5 rounded-md border p-3.5"
    >
      <p className="text-muted-foreground text-[13px] leading-relaxed">
        {dict.question.notePrompt}
      </p>
      <textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        rows={2}
        maxLength={1000}
        placeholder={dict.question.notePlaceholder}
        aria-label={dict.question.notePrompt}
        data-testid="question-note-input"
        className="border-input bg-card focus-visible:ring-ring min-h-[3rem] resize-none rounded-md border px-3.5 py-2.5 !text-[16px] leading-relaxed focus-visible:outline-none focus-visible:ring-2"
      />
      <div className="flex items-center justify-end gap-4">
        <button
          type="button"
          data-testid="question-note-dismiss"
          onClick={onDismiss}
          className="text-muted-foreground hover:text-foreground rounded-md px-1 py-1 text-sm font-medium transition-colors"
        >
          {dict.question.noteDismiss}
        </button>
        <button
          type="button"
          disabled={trimmed.length === 0}
          data-testid="question-note-send"
          onClick={() => onSend(trimmed)}
          className={cn(
            "rounded-md px-6 py-2 text-sm font-bold transition-all",
            trimmed.length > 0
              ? "bg-primary text-white hover:opacity-90"
              : "bg-muted text-muted-foreground cursor-not-allowed",
          )}
        >
          {dict.question.noteSend}
        </button>
      </div>
    </motion.div>
  );
}
