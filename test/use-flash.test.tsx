import { act, renderHook } from "@testing-library/react";
import { useFlash } from "../src/lib/useFlash";

it("is on after flash() and off again after the time, and a second flash restarts the time", () => {
  vi.useFakeTimers();
  const { result } = renderHook(() => useFlash(3000));
  expect(result.current[0]).toBe(false);
  act(() => result.current[1]());
  expect(result.current[0]).toBe(true);
  act(() => vi.advanceTimersByTime(2000));
  act(() => result.current[1]());
  act(() => vi.advanceTimersByTime(2000));
  expect(result.current[0]).toBe(true);
  act(() => vi.advanceTimersByTime(1100));
  expect(result.current[0]).toBe(false);
  vi.useRealTimers();
});

it("can be cleared at once", () => {
  const { result } = renderHook(() => useFlash(3000));
  act(() => result.current[1]());
  act(() => result.current[2]());
  expect(result.current[0]).toBe(false);
});
