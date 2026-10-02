"use client";

import { useState } from "react";

import { cn } from "@/components/ui";

import {
  CommitButton,
  PageHeading,
  SkipLink,
  SWISS_INPUT_CLASS,
} from "./SwissDemographics";
import { SwissPostScreen } from "./SwissPostScreen";
import { useSwissDict } from "../../i18n";

const SUGGESTION_MAX = 400;

function record(answer: Record<string, unknown> | null, skipped: boolean) {
  void fetch("/api/snad/session", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      operation: "wrapup_answer",
      response: { step_id: "wrapup-shape", answer, skipped },
    }),
  }).catch(() => {});
}

export function SwissShapeQuestion({
  initialText,
  readOnly,
  onResolve,
  onDone,
}: {
  initialText: string | null;
  readOnly?: boolean;
  onResolve: (text: string | null) => void;
  onDone: () => void;
}) {
  const dict = useSwissDict();
  const t = dict.shape;
  const [text, setText] = useState(initialText ?? "");

  const suggestion = text.trim();

  const send = () => {
    if (!suggestion) return;
    record({ text: suggestion }, false);
    onResolve(suggestion);
    onDone();
  };

  const skip = () => {
    record(null, true);
    onResolve(null);
    onDone();
  };

  return (
    <SwissPostScreen key="shape">
      <div className="flex flex-col gap-3">
        <PageHeading>{t.heading}</PageHeading>
        <p className="max-w-[46ch] text-[15px] leading-relaxed text-[color-mix(in_srgb,var(--hero-foreground)_72%,transparent)]">
          {t.body}
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <textarea
          value={readOnly ? (initialText ?? "") : text}
          rows={3}
          maxLength={SUGGESTION_MAX}
          placeholder={t.placeholder}
          aria-label={t.heading}
          readOnly={readOnly}
          disabled={readOnly}
          data-testid="shape-question-text"
          onChange={(event) => setText(event.target.value)}
          className={cn(SWISS_INPUT_CLASS, "resize-none", readOnly && "opacity-70")}
        />
        {!readOnly && (
          <div className="flex items-center justify-end gap-4">
            <SkipLink
              label={t.skip}
              disabled={false}
              onClick={skip}
              testId="shape-question-skip"
            />
            <CommitButton
              label={t.submit}
              disabled={!suggestion}
              onClick={send}
              testId="shape-question-submit"
            />
          </div>
        )}
      </div>
    </SwissPostScreen>
  );
}
