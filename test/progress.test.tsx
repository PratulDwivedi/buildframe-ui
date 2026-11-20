import { render, screen } from "@testing-library/react";
import { ProgressBar } from "../src/primitives/Progress";

it("is a progressbar with its value and name", () => {
  render(<ProgressBar value={45} label="Sprint 14" />);
  const bar = screen.getByRole("progressbar", { name: "Sprint 14" });
  expect(bar).toHaveAttribute("aria-valuenow", "45");
  expect(bar).toHaveAttribute("aria-valuemin", "0");
  expect(bar).toHaveAttribute("aria-valuemax", "100");
  expect((bar.firstElementChild as HTMLElement).style.width).toBe("45%");
});

it.each([
  [-20, "0"],
  [140, "100"],
  [Number.NaN, "0"],
  [33.6, "34"],
])("clamps and rounds %s to %s", (value, now) => {
  render(<ProgressBar value={value} label="x" />);
  expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", now);
});

it("takes a tone, brand by default", () => {
  const { rerender } = render(<ProgressBar value={10} label="x" />);
  expect(screen.getByRole("progressbar").firstElementChild!.className).toMatch(/bg-bf-brand/);
  rerender(<ProgressBar value={10} label="x" tone="ok" />);
  expect(screen.getByRole("progressbar").firstElementChild!.className).toMatch(/bg-bf-ok-ink/);
});

it("can write the percent beside the bar", () => {
  render(<ProgressBar value={45} label="x" showValue />);
  expect(screen.getByText("45%")).toBeInTheDocument();
});
