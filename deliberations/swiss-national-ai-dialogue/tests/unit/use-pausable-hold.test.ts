import { act, renderHook } from "@testing-library/react";

import { usePausableHold } from "../../ui/use-pausable-hold";

type HoldProps = { armed: boolean; paused: boolean; resetKey: unknown };

const HOLD_MS = 3000;

const renderArmedHold = (resetKey: unknown = 0) => {
  const onDone = jest.fn();
  const { rerender } = renderHook(
    (props: HoldProps) => usePausableHold({ onDone, ms: HOLD_MS, ...props }),
    { initialProps: { armed: true, paused: false, resetKey } },
  );
  return { onDone, rerender };
};

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("usePausableHold", () => {
  it("fires once after the full hold", () => {
    const { onDone } = renderArmedHold();

    act(() => jest.advanceTimersByTime(HOLD_MS - 1));

    expect(onDone).not.toHaveBeenCalled();

    act(() => jest.advanceTimersByTime(1));

    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("re-arms the full duration for the next reset key after a natural fire", () => {
    const { onDone, rerender } = renderArmedHold(0);
    act(() => jest.advanceTimersByTime(HOLD_MS));
    expect(onDone).toHaveBeenCalledTimes(1);
    rerender({ armed: false, paused: false, resetKey: 1 });

    rerender({ armed: true, paused: false, resetKey: 1 });
    act(() => jest.advanceTimersByTime(HOLD_MS - 1));

    expect(onDone).toHaveBeenCalledTimes(1);

    act(() => jest.advanceTimersByTime(1));

    expect(onDone).toHaveBeenCalledTimes(2);
  });

  it("banks the remaining time across a pause instead of restarting", () => {
    const { onDone, rerender } = renderArmedHold(0);
    act(() => jest.advanceTimersByTime(1000));
    rerender({ armed: true, paused: true, resetKey: 0 });
    act(() => jest.advanceTimersByTime(10_000));
    expect(onDone).not.toHaveBeenCalled();

    rerender({ armed: true, paused: false, resetKey: 0 });
    act(() => jest.advanceTimersByTime(HOLD_MS - 1000 - 1));

    expect(onDone).not.toHaveBeenCalled();

    act(() => jest.advanceTimersByTime(1));

    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
