/**
 * Legal's cookie-manager spec for SNAD (Jen Lee / Alex Paul, "SNAD: Jul 16,
 * 2026 update") states: "non-essential cookies must be off by default until the
 * user opts in." The Customize panel pre-ticked Analytics, so a participant who
 * opened it and pressed Save without touching anything was opted into analytics
 * and session replay having never chosen either — a pre-ticked box is not
 * consent.
 *
 * The Marketing description also claimed the category was unused while the Meta
 * pixel was live.
 */

import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";

import { SwissCookieBanner } from "../../ui/landing/SwissCookieBanner";

const openCustomizePanel = (onDecision: jest.Mock) => {
  render(<SwissCookieBanner onDecision={onDecision} />);
  fireEvent.click(screen.getByRole("button", { name: "Customize" }));
};

const categorySwitch = (name: string) => screen.getByRole("switch", { name });

describe("SNAD cookie manager defaults", () => {
  it("leaves both non-essential categories off when the panel opens", () => {
    openCustomizePanel(jest.fn());

    expect(categorySwitch("Analytics")).toHaveAttribute(
      "aria-checked",
      "false",
    );
    expect(categorySwitch("Marketing")).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("records no consent when the participant saves without choosing anything", () => {
    const onDecision = jest.fn();
    openCustomizePanel(onDecision);

    fireEvent.click(screen.getByRole("button", { name: "Save choices" }));

    expect(onDecision).toHaveBeenCalledWith({
      analytics: false,
      marketing: false,
    });
  });

  it("records the category the participant actually turns on", () => {
    const onDecision = jest.fn();
    openCustomizePanel(onDecision);

    fireEvent.click(categorySwitch("Analytics"));
    fireEvent.click(screen.getByRole("button", { name: "Save choices" }));

    expect(onDecision).toHaveBeenCalledWith({
      analytics: true,
      marketing: false,
    });
  });

  it("still grants everything on an explicit Accept all", () => {
    const onDecision = jest.fn();
    render(<SwissCookieBanner onDecision={onDecision} />);

    fireEvent.click(screen.getByRole("button", { name: "Accept all" }));

    expect(onDecision).toHaveBeenCalledWith({
      analytics: true,
      marketing: true,
    });
  });

  it("does not tell participants the marketing category is unused", () => {
    openCustomizePanel(jest.fn());

    expect(screen.getByText(/measure and target advertising/i)).not.toHaveTextContent(
      /currently unused/i,
    );
  });
});
