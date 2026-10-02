import "@testing-library/jest-dom";
import { StrictMode, useEffect, useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";

import { useDraftChat } from "../../ui/conversation/use-draft-chat";

const STEM = "I hope that…";
const originalFetch = global.fetch;

function doneStream(): Response {
  const encoder = new TextEncoder();
  return {
    ok: true,
    body: new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
        controller.close();
      },
    }),
  } as Response;
}

function ClosingPrimeHarness() {
  const [text, setText] = useState("");
  const chat = useDraftChat({
    mode: "closing",
    onSession: () => {},
    text,
    onText: setText,
    kickoffText: "",
    stemText: STEM,
  });
  const primeStem = chat.primeStem;
  useEffect(() => {
    primeStem();
  }, [primeStem]);

  return <div data-testid="quote">{text}</div>;
}

beforeEach(() => {
  global.fetch = (() => Promise.resolve(doneStream())) as unknown as typeof fetch;
});

afterAll(() => {
  global.fetch = originalFetch;
});

describe("closing quote priming under StrictMode", () => {
  it("types the whole stem in even when the mount double-invoke interrupts it", async () => {
    render(
      <StrictMode>
        <ClosingPrimeHarness />
      </StrictMode>,
    );

    await waitFor(() => expect(screen.getByTestId("quote")).toHaveTextContent(STEM), {
      timeout: 3000,
    });
  });
});
