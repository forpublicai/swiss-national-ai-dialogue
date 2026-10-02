import "@testing-library/jest-dom";

import { createElement } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { SwissEndConfirmCard } from "@/deliberations/swiss-national-ai-dialogue/ui/end-flow/SwissEndConfirmCard";
import { WALL_AUTO_ADVANCE_MS } from "@/deliberations/swiss-national-ai-dialogue/ui/cards/SwissContributionCard";
import type {
  SnadSequenceStep,
  SnadSessionPayload,
} from "@/deliberations/swiss-national-ai-dialogue/types";

const DEMOGRAPHICS_DONE_KEY = "swiss-demographics-done";

const wrapUpQuestions: SnadSequenceStep[] = [
  {
    kind: "question",
    opener_id: "wrapup-age",
    header: "Age",
    question: "How old are you?",
    options: [
      { id: "age-under-25", label: "Under 25" },
      { id: "age-25-44", label: "25–44" },
      { id: "age-45-64", label: "45–64" },
      { id: "age-65-plus", label: "65+" },
    ],
  },
  {
    kind: "question",
    opener_id: "wrapup-field",
    header: "Field",
    question: "What field do you work or study in?",
    options: [
      { id: "field-technology", label: "Technology & digital services" },
      { id: "field-health", label: "Health & care" },
      { id: "field-education", label: "Education & research" },
      { id: "field-other", label: "Other", freeText: true },
    ],
  },
];

const event = {
  type: "awaiting_end_confirmation" as const,
  idea_summary: "",
  worry_summary: "",
  summary: "You want AI literacy taught in schools.",
};

const sessionWith = (
  overrides: Partial<SnadSessionPayload> = {},
): SnadSessionPayload => ({
  sessionId: "11111111-1111-4111-8111-111111111111",
  status: "completed",
  locale: "en",
  canton: "BE",
  archetype: null,
  wrapUpQuestions,
  wrapUpAnswers: {},
  activeStep: { kind: "completed" },
  topics: [],
  questionFeedback: {},
  feedbackChat: [],
  shape: { text: null, resolved: false },
  closing: null,
  participantCount: 1,
  ...overrides,
});

function renderLiveEnd() {
  const onSubmit = jest.fn();
  render(
    createElement(SwissEndConfirmCard, {
      event,
      disabled: false,
      submitted: false,
      slug: "swiss-national-ai-dialogue",
      onSubmit,
      session: sessionWith(),
    }),
  );
  return { onSubmit };
}

function renderEndedReload(
  session: SnadSessionPayload = sessionWith(),
  onSession?: (next: SnadSessionPayload) => void,
) {
  const onSubmit = jest.fn();
  render(
    createElement(SwissEndConfirmCard, {
      event,
      disabled: false,
      submitted: true,
      slug: "swiss-national-ai-dialogue",
      onSubmit,
      session,
      onSession,
    }),
  );
  return { onSubmit };
}

const shapeResolvedSession = (
  overrides: Partial<SnadSessionPayload> = {},
): SnadSessionPayload =>
  sessionWith({ shape: { text: null, resolved: true }, ...overrides });

function renderFinale() {
  window.localStorage.setItem(DEMOGRAPHICS_DONE_KEY, "1");
  return renderEndedReload(shapeResolvedSession());
}

function renderEndedReloadWithPeek(session: SnadSessionPayload = sessionWith()) {
  const onSubmit = jest.fn();
  const onSession = jest.fn();
  const props = (peek: number | null) => ({
    event,
    disabled: false,
    submitted: true,
    slug: "swiss-national-ai-dialogue",
    onSubmit,
    onSession,
    session,
    peek,
  });
  const utils = render(createElement(SwissEndConfirmCard, props(null)));
  return {
    onSubmit,
    setPeek: (peek: number | null) =>
      act(() => utils.rerender(createElement(SwissEndConfirmCard, props(peek)))),
  };
}

function installFetchMock(json: unknown = { result: null }) {
  const fetchMock = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => json,
  });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return {
    fetchMock,
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
}

function installRoutedFetchMock(routes: Record<string, unknown>) {
  const fetchMock = jest.fn(async (...[url]: [string, RequestInit?]) => ({
    ok: true,
    json: async () =>
      Object.entries(routes).find(([prefix]) => url.startsWith(prefix))?.[1] ?? {
        result: null,
      },
  }));
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return {
    fetchMock,
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
}

const closingSession = (
  overrides: Partial<NonNullable<SnadSessionPayload["closing"]>> = {},
) =>
  shapeResolvedSession({
    status: "wrap_up",
    activeStep: { kind: "wrap_up" },
    closing: {
      question:
        "We have covered a lot of ground, but what matters to you that we haven't talked about yet?",
      draft: null,
      contribution: null,
      resolved: false,
      ...overrides,
    },
  });

const answerAgePage = async () => {
  fireEvent.click(screen.getByRole("radio", { name: "25–44" }));
  return screen.findByText("What field do you work or study in?");
};

const skipToEmailPage = async () => {
  fireEvent.click(screen.getByRole("button", { name: "Skip" }));
  await screen.findByText("What field do you work or study in?");
  fireEvent.click(screen.getByRole("button", { name: "Skip" }));
  return screen.findByText("See what Switzerland decided.");
};

const skipShapePage = async () => {
  fireEvent.click(await screen.findByTestId("shape-question-skip"));
};

const wrapUpAnswerCalls = (fetchMock: jest.Mock) =>
  fetchMock.mock.calls
    .filter(([url]) => url === "/api/snad/session")
    .map(([, init]) => JSON.parse((init as RequestInit).body as string))
    .filter((body) => body.operation === "wrapup_answer");

beforeEach(() => {
  window.localStorage.clear();
  jest.restoreAllMocks();
  window.matchMedia = ((query: string) => ({
    matches: query.includes("prefers-reduced-motion"),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});

describe("SwissEndConfirmCard", () => {
  it("a fresh live end finalizes with the model's own summary (the archetype scores in the background) and opens on the age page", async () => {
    const { fetchMock, restore } = installFetchMock();
    const { onSubmit } = renderLiveEnd();

    await screen.findByText("How old are you?");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/snad/session?archetype=1",
    );
    expect(onSubmit).toHaveBeenCalledWith({
      summaryText: "You want AI literacy taught in schools.",
    });
    restore();
  });

  it("reveals the scored archetype — emblem, radar, and rarity — on the finale, above the copy-link close", async () => {
    const { restore } = installFetchMock({
      result: {
        archetype: "mountain-guide",
        axes: [
          { axis: "curiosity", you: 72, ch: 55 },
          { axis: "candor", you: 88, ch: 51 },
          { axis: "heart", you: 42, ch: 57 },
          { axis: "guard", you: 58, ch: 63 },
          { axis: "roots", you: 69, ch: 60 },
          { axis: "voice", you: 54, ch: 58 },
        ],
        rarity: { percent: 12 },
      },
    });
    renderFinale();

    const reveal = await screen.findByText("The Mountain Guide");
    const copyLink = screen.getByRole("button", { name: "Copy link to share" });

    expect(screen.getByText("Candor")).toBeInTheDocument();
    expect(screen.getByText("Roots")).toBeInTheDocument();
    expect(
      screen.getByText("12% of participants share this profile"),
    ).toBeInTheDocument();
    expect(
      reveal.compareDocumentPosition(copyLink) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();
    restore();
  });

  it("holds the rarity line back while the scored pool is still small", async () => {
    const { restore } = installFetchMock({
      result: {
        archetype: "watchmaker",
        axes: [
          { axis: "curiosity", you: 40, ch: 55 },
          { axis: "candor", you: 60, ch: 51 },
          { axis: "heart", you: 25, ch: 57 },
          { axis: "guard", you: 90, ch: 63 },
          { axis: "roots", you: 61, ch: 60 },
          { axis: "voice", you: 47, ch: 58 },
        ],
        rarity: null,
      },
    });
    renderFinale();

    await screen.findByText("The Watchmaker");

    expect(screen.queryByText(/share this profile/)).toBeNull();
    restore();
  });

  it("keeps the finale archetype-less when nothing scorable was answered", async () => {
    const { restore } = installFetchMock();
    renderFinale();

    await act(async () => {});

    expect(
      screen.getByRole("button", { name: "Copy link to share" }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByText("The Mountain Guide")).toBeNull(),
    );
    restore();
  });

  it("a reload of an ended interview resumes at the age page without re-finalizing; skipping every page reaches the finale via the email page", async () => {
    const { restore } = installFetchMock();
    const { onSubmit } = renderEndedReload();

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("How old are you?")).toBeInTheDocument();

    await skipToEmailPage();
    fireEvent.click(
      screen.getByRole("button", { name: "Skip" }),
    );
    await skipShapePage();

    expect(
      screen.getByRole("button", { name: "Copy link to share" }),
    ).toBeInTheDocument();
    expect(window.localStorage.getItem(DEMOGRAPHICS_DONE_KEY)).toBe("1");
    restore();
  });

  it("a mid-block reload resumes past the already-answered questions, landing on the email page", async () => {
    const { restore } = installFetchMock();
    renderEndedReload(
      sessionWith({
        wrapUpAnswers: {
          "wrapup-age": { choice: "age-25-44" },
          "wrapup-field": { choice: "field-health" },
        },
      }),
    );

    expect(screen.getByText("See what Switzerland decided.")).toBeInTheDocument();
    expect(screen.queryByText("How old are you?")).toBeNull();
    restore();
  });

  it("a mid-block reload with only the first question answered resumes on the next unanswered one", async () => {
    const { restore } = installFetchMock();
    renderEndedReload(
      sessionWith({ wrapUpAnswers: { "wrapup-age": { choice: "age-25-44" } } }),
    );

    expect(
      screen.getByText("What field do you work or study in?"),
    ).toBeInTheDocument();
    expect(screen.queryByText("How old are you?")).toBeNull();
    restore();
  });

  it("peeking back from the finale never re-opens a live results-email form, and records nothing new", async () => {
    const { fetchMock, restore } = installFetchMock();
    const { setPeek } = renderEndedReloadWithPeek();

    await skipToEmailPage();
    fireEvent.change(screen.getByPlaceholderText("you@example.ch"), {
      target: { value: "marta@example.ch" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    await skipShapePage();
    expect(
      screen.getByRole("button", { name: "Copy link to share" }),
    ).toBeInTheDocument();
    const emailAnswers = () =>
      wrapUpAnswerCalls(fetchMock).filter(
        (body) => body.response.step_id === "wrapup-email",
      ).length;
    const answersAfterSubmit = emailAnswers();

    setPeek(0);
    expect(screen.queryByRole("button", { name: "Submit" })).toBeNull();

    setPeek(3);
    const emailInput = screen.getByPlaceholderText("you@example.ch");
    expect(emailInput).toHaveValue("marta@example.ch");
    expect(emailInput).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Submit" })).toBeNull();

    expect(emailAnswers()).toBe(answersAfterSubmit);
    restore();
  });

  it("peeking back to a SKIPPED results-email re-opens it editable, and submitting records the address as a wrapup_answer", async () => {
    const { fetchMock, restore } = installFetchMock();
    const { setPeek } = renderEndedReloadWithPeek();

    await skipToEmailPage();
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    await skipShapePage();
    expect(
      screen.getByRole("button", { name: "Copy link to share" }),
    ).toBeInTheDocument();

    setPeek(3);
    const reopened = screen.getByPlaceholderText("you@example.ch");
    expect(reopened).toBeEnabled();
    fireEvent.change(reopened, { target: { value: "marta@example.ch" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    const emailCall = wrapUpAnswerCalls(fetchMock).find(
      (body) => body.response.step_id === "wrapup-email",
    );
    expect(emailCall).toBeDefined();
    expect(emailCall.response.answer).toEqual({ email: "marta@example.ch" });
    expect(screen.getByPlaceholderText("you@example.ch")).toBeDisabled();
    restore();
  });

  it("skipping the closing interview goes straight to the finale and never reveals the quote wall, even when the server returns one", async () => {
    const { restore } = installRoutedFetchMock({
      "/api/snad/contribution": {
        session: closingSession({ resolved: true }),
        wall: [{ text: "Featured voice.", canton: "ZH", locale: "en" }],
      },
    });
    window.localStorage.setItem(DEMOGRAPHICS_DONE_KEY, "1");
    renderEndedReload(closingSession(), jest.fn());
    await screen.findByTestId("closing-quote-text");

    fireEvent.click(screen.getByTestId("closing-quote-skip"));

    expect(
      await screen.findByRole("button", { name: "Copy link to share" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Featured voice/)).toBeNull();
    expect(screen.queryByText("Thank you, your voice is in.")).toBeNull();
    restore();
  });

  it("peeking back to a SUBMITTED closing renders the curated wall immediately, never flashing the live interviewer", async () => {
    const { restore } = installRoutedFetchMock({
      "/api/snad/contribution": {
        wall: [{ text: "Featured voice.", canton: "ZH", locale: "en" }],
      },
    });
    window.localStorage.setItem(DEMOGRAPHICS_DONE_KEY, "1");
    const { setPeek } = renderEndedReloadWithPeek(
      closingSession({ resolved: true, contribution: "Mine." }),
    );
    await screen.findByRole("button", { name: "Copy link to share" });

    setPeek(5);

    expect(screen.queryByTestId("closing-quote-text")).toBeNull();
    expect(screen.queryByTestId("closing-island")).toBeNull();
    expect(await screen.findByText("“Featured voice.”")).toBeInTheDocument();
    expect(screen.getByText("“Mine.”")).toBeInTheDocument();
    restore();
  });

  it("each answered page posts its own wrapup_answer keyed by the question spec id", async () => {
    const { fetchMock, restore } = installFetchMock();
    renderEndedReload();

    await answerAgePage();
    fireEvent.click(screen.getByRole("radio", { name: "Health & care" }));
    await screen.findByText("See what Switzerland decided.");

    expect(wrapUpAnswerCalls(fetchMock)).toEqual([
      {
        operation: "wrapup_answer",
        response: {
          step_id: "wrapup-age",
          answer: { choice: "age-25-44" },
          skipped: false,
        },
      },
      {
        operation: "wrapup_answer",
        response: {
          step_id: "wrapup-field",
          answer: { choice: "field-health" },
          skipped: false,
        },
      },
    ]);
    restore();
  });

  it("skipping a page posts nothing for it", async () => {
    const { fetchMock, restore } = installFetchMock();
    renderEndedReload();

    await answerAgePage();
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    await screen.findByText("See what Switzerland decided.");

    expect(wrapUpAnswerCalls(fetchMock)).toEqual([
      {
        operation: "wrapup_answer",
        response: {
          step_id: "wrapup-age",
          answer: { choice: "age-25-44" },
          skipped: false,
        },
      },
    ]);
    restore();
  });

  it('"Other" opens a free-text reveal that needs its commit button, and the typed value folds into the answer', async () => {
    const { fetchMock, restore } = installFetchMock();
    renderEndedReload();

    await answerAgePage();
    fireEvent.click(screen.getByRole("radio", { name: "Other" }));

    expect(screen.queryByText("See what Switzerland decided.")).toBeNull();
    fireEvent.change(screen.getByPlaceholderText("Please specify"), {
      target: { value: "Farming" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    await screen.findByText("See what Switzerland decided.");
    const fieldCall = wrapUpAnswerCalls(fetchMock).find(
      (body) => body.response.step_id === "wrapup-field",
    );
    expect(fieldCall.response.answer).toEqual({
      choice: "field-other",
      other: "Farming",
    });
    restore();
  });

  it("a valid email enables the primary finish, records the address, then reaches the finale", async () => {
    const { fetchMock, restore } = installFetchMock();
    renderEndedReload();
    await skipToEmailPage();

    expect(
      screen.getByRole("button", { name: "Submit" }),
    ).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText("you@example.ch"), {
      target: { value: " Marta@Example.CH " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    await skipShapePage();

    expect(
      screen.getByRole("button", { name: "Copy link to share" }),
    ).toBeInTheDocument();
    expect(window.localStorage.getItem(DEMOGRAPHICS_DONE_KEY)).toBe("1");
    const emailCall = wrapUpAnswerCalls(fetchMock).find(
      (body) => body.response.step_id === "wrapup-email",
    );
    expect(emailCall).toBeDefined();
    expect(emailCall.response.answer).toEqual({ email: "marta@example.ch" });
    restore();
  });

  it("an invalid address keeps the primary finish disabled while the quiet no-email link still finishes without posting", async () => {
    const { fetchMock, restore } = installFetchMock();
    renderEndedReload();
    await skipToEmailPage();

    fireEvent.change(screen.getByPlaceholderText("you@example.ch"), {
      target: { value: "not-an-email" },
    });

    expect(
      screen.getByRole("button", { name: "Submit" }),
    ).toBeDisabled();
    fireEvent.click(
      screen.getByRole("button", { name: "Skip" }),
    );
    await skipShapePage();

    expect(
      screen.getByRole("button", { name: "Copy link to share" }),
    ).toBeInTheDocument();
    expect(
      wrapUpAnswerCalls(fetchMock).some(
        (body) => body.response.step_id === "wrapup-email",
      ),
    ).toBe(false);
    restore();
  });

  it("skips straight to the finale when demographics were already answered", async () => {
    const { restore } = installFetchMock();
    renderFinale();

    await act(async () => {});

    expect(
      screen.getByRole("button", { name: "Copy link to share" }),
    ).toBeInTheDocument();
    restore();
  });

  it("copy-link copies the deliberation URL without query params and confirms", async () => {
    const { restore } = installFetchMock();
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    renderFinale();

    fireEvent.click(screen.getByRole("button", { name: "Copy link to share" }));

    expect(writeText).toHaveBeenCalledWith(
      `${window.location.origin}${window.location.pathname}`,
    );
    expect(
      await screen.findByText("Link copied to clipboard"),
    ).toBeInTheDocument();
    restore();
  });

  it("a closing-configured session resumes at the closing interview between demographics and the finale", async () => {
    const { restore } = installFetchMock();
    window.localStorage.setItem(DEMOGRAPHICS_DONE_KEY, "1");
    renderEndedReload(closingSession(), jest.fn());

    expect(await screen.findByTestId("closing-quote-text")).toBeInTheDocument();

    expect(screen.getByPlaceholderText("I hope that…")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add to wall" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("closing-quote-skip")).toHaveTextContent("Skip");
    expect(
      screen.queryByRole("button", { name: "Copy link to share" }),
    ).toBeNull();
    restore();
  });

  it("submitting the quote reveals the curated wall, which auto-advances into the finale's NPS form", async () => {
    jest.useFakeTimers();
    const { fetchMock, restore } = installRoutedFetchMock({
      "/api/snad/contribution": {
        session: closingSession({ resolved: true, contribution: "Mine." }),
        wall: [{ text: "Featured voice.", canton: "ZH", locale: "en" }],
      },
    });
    window.localStorage.setItem(DEMOGRAPHICS_DONE_KEY, "1");
    renderEndedReload(closingSession(), jest.fn());
    await screen.findByTestId("closing-quote-text");

    fireEvent.change(screen.getByTestId("closing-quote-text"), {
      target: { value: "Nobody asked about education." },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Add to wall" }),
    );

    expect(await screen.findByText("“Featured voice.”")).toBeInTheDocument();
    expect(
      screen.getByText("Thank you, your voice is in."),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("closing-wall-continue")).toBeNull();
    const submitCall = fetchMock.mock.calls.find(
      ([url]) => url === "/api/snad/contribution",
    );
    expect(JSON.parse((submitCall![1] as RequestInit).body as string)).toEqual({
      topic_key: "closing",
      operation: "submit",
      text: "Nobody asked about education.",
    });

    act(() => jest.advanceTimersByTime(WALL_AUTO_ADVANCE_MS));
    jest.useRealTimers();

    expect(
      await screen.findByRole("button", { name: "Copy link to share" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "How likely are you to recommend this dialogue to a friend?",
      ),
    ).toBeInTheDocument();
    restore();
  });

  it("a session that already resolved the closing interview lands straight on the finale, where the NPS form posts its reserved wrapup_answer", async () => {
    const { fetchMock, restore } = installFetchMock();
    window.localStorage.setItem(DEMOGRAPHICS_DONE_KEY, "1");
    renderEndedReload(
      closingSession({ resolved: true, contribution: "Mine." }),
      jest.fn(),
    );
    await screen.findByRole("button", { name: "Copy link to share" });
    expect(screen.queryByTestId("closing-quote-text")).toBeNull();
    expect(screen.queryByPlaceholderText("Type your reply…")).toBeNull();

    expect(screen.getByTestId("nps-submit")).toBeDisabled();
    fireEvent.click(screen.getByTestId("nps-9"));
    fireEvent.change(screen.getByTestId("nps-comment"), {
      target: { value: "Loved the maps." },
    });
    fireEvent.click(screen.getByTestId("nps-submit"));

    expect(
      await screen.findByText("Thank you for your feedback."),
    ).toBeInTheDocument();
    expect(wrapUpAnswerCalls(fetchMock)).toEqual([
      {
        operation: "wrapup_answer",
        response: {
          step_id: "wrapup-nps",
          answer: { nps: 9, comment: "Loved the maps." },
          skipped: false,
        },
      },
    ]);
    restore();
  });

  it("asks for a question of their own between the email page and the closing interview, and records it", async () => {
    const { fetchMock, restore } = installFetchMock();
    renderEndedReload(
      { ...closingSession(), shape: { text: null, resolved: false } },
      jest.fn(),
    );
    await skipToEmailPage();
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));

    fireEvent.change(await screen.findByTestId("shape-question-text"), {
      target: { value: "  How should schools teach AI?  " },
    });
    fireEvent.click(screen.getByTestId("shape-question-submit"));

    expect(await screen.findByTestId("closing-quote-text")).toBeInTheDocument();
    expect(
      wrapUpAnswerCalls(fetchMock).find(
        (body) => body.response.step_id === "wrapup-shape",
      ),
    ).toEqual({
      operation: "wrapup_answer",
      response: {
        step_id: "wrapup-shape",
        answer: { text: "How should schools teach AI?" },
        skipped: false,
      },
    });
    restore();
  });

  it("keeps the send disabled until they write something, and records a skip so the page never re-asks", async () => {
    const { fetchMock, restore } = installFetchMock();
    window.localStorage.setItem(DEMOGRAPHICS_DONE_KEY, "1");
    renderEndedReload();
    await screen.findByTestId("shape-question-text");

    expect(screen.getByTestId("shape-question-submit")).toBeDisabled();
    fireEvent.click(screen.getByTestId("shape-question-skip"));

    expect(
      screen.getByRole("button", { name: "Copy link to share" }),
    ).toBeInTheDocument();
    expect(
      wrapUpAnswerCalls(fetchMock).find(
        (body) => body.response.step_id === "wrapup-shape",
      ),
    ).toEqual({
      operation: "wrapup_answer",
      response: { step_id: "wrapup-shape", answer: null, skipped: true },
    });
    restore();
  });

  it("never re-asks a shape page the session already resolved", async () => {
    const { restore } = installFetchMock();
    window.localStorage.setItem(DEMOGRAPHICS_DONE_KEY, "1");
    renderEndedReload(
      sessionWith({ shape: { text: "Ask about jobs.", resolved: true } }),
    );

    await act(async () => {});

    expect(screen.queryByTestId("shape-question-submit")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Copy link to share" }),
    ).toBeInTheDocument();
    restore();
  });

  it("peeking back to an answered shape page shows it locked, and records nothing new", async () => {
    const { fetchMock, restore } = installFetchMock();
    window.localStorage.setItem(DEMOGRAPHICS_DONE_KEY, "1");
    const { setPeek } = renderEndedReloadWithPeek();
    fireEvent.change(await screen.findByTestId("shape-question-text"), {
      target: { value: "How should schools teach AI?" },
    });
    fireEvent.click(screen.getByTestId("shape-question-submit"));
    await screen.findByRole("button", { name: "Copy link to share" });
    const shapeAnswers = () =>
      wrapUpAnswerCalls(fetchMock).filter(
        (body) => body.response.step_id === "wrapup-shape",
      ).length;
    const answersAfterSubmit = shapeAnswers();

    setPeek(4);

    const locked = screen.getByTestId("shape-question-text");
    expect(locked).toHaveValue("How should schools teach AI?");
    expect(locked).toBeDisabled();
    expect(screen.queryByTestId("shape-question-submit")).toBeNull();
    expect(shapeAnswers()).toBe(answersAfterSubmit);
    restore();
  });

  it("the finale closes with a quiet link back to the landing page", async () => {
    const { restore } = installFetchMock();
    window.localStorage.setItem(DEMOGRAPHICS_DONE_KEY, "1");
    const onHome = jest.fn();
    render(
      createElement(SwissEndConfirmCard, {
        event,
        disabled: false,
        submitted: true,
        slug: "swiss-national-ai-dialogue",
        onSubmit: jest.fn(),
        session: shapeResolvedSession(),
        onHome,
      }),
    );
    await screen.findByRole("button", { name: "Copy link to share" });

    fireEvent.click(screen.getByTestId("finale-back-home"));

    expect(onHome).toHaveBeenCalledTimes(1);
    restore();
  });
});
