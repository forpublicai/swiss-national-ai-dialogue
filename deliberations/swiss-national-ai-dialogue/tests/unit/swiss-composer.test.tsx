/**
 * Voice input was removed from SNAD: dictated audio was posted to
 * `/api/snad/chat` as multipart and transcribed by OpenAI Whisper in the US,
 * which is a cross-border transfer of participant data that the Swiss privacy
 * notice never disclosed. The composer is text-only now, and these tests fail
 * if a microphone affordance returns before a Swiss- or EU-hosted transcription
 * provider is wired up and disclosed.
 */

import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";

import { SnadComposer } from "../../ui/conversation/SnadComposer";

const renderComposer = (onSend: jest.Mock, disabled = false) =>
  render(
    <SnadComposer
      disabled={disabled}
      onSend={onSend}
      placeholder="Share your thoughts"
      ariaLabel="Your reply"
    />,
  );

describe("SNAD composer", () => {
  it("offers no way to record audio", () => {
    renderComposer(jest.fn());

    expect(
      screen.queryByRole("button", { name: /record|voice|mic/i }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("sends what the participant typed", () => {
    const onSend = jest.fn();
    renderComposer(onSend);

    fireEvent.change(screen.getByRole("textbox", { name: "Your reply" }), {
      target: { value: "AI should stay public." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    expect(onSend).toHaveBeenCalledWith("AI should stay public.");
  });

  it("sends on Enter and keeps Shift+Enter for a new line", () => {
    const onSend = jest.fn();
    renderComposer(onSend);
    const textarea = screen.getByRole("textbox", { name: "Your reply" });

    fireEvent.change(textarea, { target: { value: "A worry" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });
    expect(onSend).not.toHaveBeenCalled();

    fireEvent.keyDown(textarea, { key: "Enter" });
    expect(onSend).toHaveBeenCalledWith("A worry");
  });

  it("refuses to send whitespace", () => {
    const onSend = jest.fn();
    renderComposer(onSend);

    fireEvent.change(screen.getByRole("textbox", { name: "Your reply" }), {
      target: { value: "   " },
    });
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Your reply" }), {
      key: "Enter",
    });

    expect(onSend).not.toHaveBeenCalled();
  });
});
