import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";

import { SwissClosingInterview } from "../../ui/end-flow/SwissClosingInterview";
import type { SnadSessionPayload } from "../../types";

const originalFetch = global.fetch;
const fetchMock = jest.fn();

const SUBMITTED_QUOTE = "I hope AI stays open and public.";

function mountPeekedBackClosing(
  closing: SnadSessionPayload["closing"],
): void {
  fetchMock.mockReset();
  fetchMock.mockImplementation(() => new Promise(() => {}));
  global.fetch = fetchMock as unknown as typeof fetch;

  const session = {
    canton: "ZH",
    feedbackChat: [{ role: "assistant", content: "Hi, I'm Apertus." }],
    closing,
  } as unknown as SnadSessionPayload;

  render(
    <SwissClosingInterview
      slug="swiss-national-ai-dialogue"
      session={session}
      onSession={jest.fn()}
      onDone={jest.fn()}
      onWallShown={jest.fn()}
      paused
      advanceSignal={0}
    />,
  );
}

afterAll(() => {
  global.fetch = originalFetch;
});

describe("peeking back to a resolved closing", () => {
  it("shows the submitted quote even before the wall fetch lands", () => {
    mountPeekedBackClosing({
      question: "What do you hope for the future of AI in Switzerland?",
      draft: SUBMITTED_QUOTE,
      contribution: SUBMITTED_QUOTE,
      resolved: true,
    });

    expect(screen.getByText(SUBMITTED_QUOTE, { exact: false })).toBeInTheDocument();
    expect(screen.queryByTestId("closing-quote-text")).not.toBeInTheDocument();
  });

  it("stays quiet for a skipped closing — no quote, no composer", () => {
    mountPeekedBackClosing({
      question: "What do you hope for the future of AI in Switzerland?",
      draft: null,
      contribution: null,
      resolved: true,
    });

    expect(
      screen.queryByText(SUBMITTED_QUOTE, { exact: false }),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("closing-quote-text")).not.toBeInTheDocument();
    expect(screen.queryByTestId("closing-quote-skip")).not.toBeInTheDocument();
  });
});
