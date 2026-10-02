import "@testing-library/jest-dom";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { SwissUserQuestionCard } from "../../ui/cards/SwissUserQuestionCard";

const originalFetch = global.fetch;
const fetchMock = jest.fn();

const OPENER_ID = "opener_values";
const QUESTION = "What matters to you?";

let sendStreams: Response[] = [];

function jsonResponse(body: unknown): Response {
  return { ok: true, json: async () => body } as Response;
}

function sse(events: Array<Record<string, unknown>>): Response {
  const encoder = new TextEncoder();
  return {
    ok: true,
    body: new ReadableStream<Uint8Array>({
      start(controller) {
        for (const event of events) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        }
        controller.close();
      },
    }),
  } as Response;
}

function deferredStream(): {
  response: Response;
  push: (event: Record<string, unknown>) => void;
  close: () => void;
} {
  const encoder = new TextEncoder();
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const response = {
    ok: true,
    body: new ReadableStream<Uint8Array>({
      start(c) {
        controller = c;
      },
    }),
  } as Response;
  return {
    response,
    push: (event) =>
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`)),
    close: () => controller.close(),
  };
}

beforeEach(() => {
  fetchMock.mockReset();
  sendStreams = [];
  global.fetch = fetchMock as unknown as typeof fetch;
  fetchMock.mockImplementation(async (_url: unknown, init: unknown) => {
    const body = JSON.parse((init as RequestInit).body as string) as {
      operation?: string;
    };
    if (body.operation === "load") return jsonResponse({ turns: [], draft: null });
    if (body.operation === "draft") return jsonResponse({ ok: true });
    return sendStreams.shift() ?? sse([{ type: "done" }]);
  });
});

afterAll(() => {
  global.fetch = originalFetch;
});

async function sendMessage(message: string): Promise<void> {
  const composer = await screen.findByPlaceholderText("Type here…");
  fireEvent.change(composer, { target: { value: message } });
  fireEvent.click(screen.getByRole("button", { name: "Send message" }));
}

function renderAssistQuestion() {
  const onAnswer = jest.fn();
  render(
    <SwissUserQuestionCard
      event={{
        type: "awaiting_user_question",
        tool_use_id: "tool_1",
        opener_id: OPENER_ID,
        questions: [
          {
            question: QUESTION,
            header: "Values",
            options: [{ label: "Fairness" }, { label: "Safety" }],
            otherAssist: true,
          },
        ],
      }}
      answer={null}
      onAnswer={onAnswer}
      fail={jest.fn()}
    />,
  );

  return { onAnswer };
}

function selectOthersOnAssistQuestion() {
  const rendered = renderAssistQuestion();
  fireEvent.click(screen.getByRole("radio", { name: "Other:" }));

  return rendered;
}

describe("the MCQ Other assist", () => {
  it("shows the underlined answer field before selection, and focusing it selects Others", () => {
    renderAssistQuestion();
    const field = screen.getByTestId("other-assist-suggestion");
    expect(screen.queryByTestId("other-assist")).not.toBeInTheDocument();

    fireEvent.focus(field);

    expect(screen.getByRole("radio", { name: "Other:" })).toBeChecked();
    expect(screen.getByTestId("other-assist")).toBeInTheDocument();
  });

  it("types the streamed answer into the Other row's field, which submits as the Other answer", async () => {
    sendStreams = [
      sse([
        { type: "text_delta", delta: "How about this?" },
        { type: "draft_update", draft: "AI should stay useful." },
        { type: "done" },
      ]),
    ];
    const { onAnswer } = selectOthersOnAssistQuestion();

    await sendMessage("It should be useful");

    const field = screen.getByTestId("other-assist-suggestion");
    await waitFor(() => expect(field).toHaveValue("AI should stay useful."), {
      timeout: 3000,
    });

    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    expect(onAnswer).toHaveBeenCalledWith({
      answers: { [QUESTION]: { other: "AI should stay useful." } },
    });
  });

  it("shows an edited note when a turn rewrites the answer with no reply", async () => {
    sendStreams = [
      sse([
        { type: "draft_update", draft: "AI should stay useful." },
        { type: "done" },
      ]),
      sse([{ type: "text_delta", delta: "Got it, anything else?" }, { type: "done" }]),
    ];
    selectOthersOnAssistQuestion();

    await sendMessage("It should be useful");
    expect(await screen.findByText("Edited your answer")).toBeInTheDocument();

    await sendMessage("Anything else?");

    expect(await screen.findByText("Got it, anything else?")).toBeInTheDocument();
    expect(screen.queryByText(/didn't go through/i)).not.toBeInTheDocument();
  });

  it("lets a manual edit while the reply is in flight beat the rewrite", async () => {
    const stream = deferredStream();
    sendStreams = [stream.response];
    selectOthersOnAssistQuestion();
    await sendMessage("It should be useful");

    await act(async () => {
      stream.push({ type: "text_delta", delta: "How about this?" });
    });
    await screen.findByText("How about this?");
    const field = screen.getByTestId("other-assist-suggestion");
    fireEvent.change(field, { target: { value: "My own words" } });

    await act(async () => {
      stream.push({ type: "draft_update", draft: "AI should stay useful." });
      stream.push({ type: "done" });
      stream.close();
    });

    expect(field).toHaveValue("My own words");
  });
});
