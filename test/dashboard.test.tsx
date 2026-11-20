import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { bucketSeries, periodChange, pickPeriod } from "../src/dashboard/series";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/admin",
  useSearchParams: () => new URLSearchParams("tab=x&days=7"),
}));

import { BarSeries, Change, PeriodSwitch, ShareBars, StatTile } from "../src/dashboard/Stats";

it("measures a change against the period before", () => {
  expect(periodChange(0, 0)).toEqual({ kind: "none" });
  expect(periodChange(5, 0)).toEqual({ kind: "new" });
  expect(periodChange(10, 10)).toEqual({ kind: "same" });
  expect(periodChange(15, 10)).toEqual({ kind: "up", pct: 50 });
  expect(periodChange(5, 10)).toEqual({ kind: "down", pct: 50 });
  expect(periodChange(0, 10)).toEqual({ kind: "down", pct: 100 });
});

it("buckets points into groups and keeps the short last one", () => {
  const pts = Array.from({ length: 9 }, (_, i) => ({ label: `d${i}`, values: { a: 1, b: i } }));
  const out = bucketSeries(pts, 7);
  expect(out).toHaveLength(2);
  expect(out[0]).toEqual({ label: "d0", values: { a: 7, b: 21 } });
  expect(out[1]).toEqual({ label: "d7", values: { a: 2, b: 15 } });
  expect(bucketSeries(pts, 1)).toBe(pts);
});

it("reads the period from the URL and falls back to the default", () => {
  expect(pickPeriod("7")).toBe(7);
  expect(pickPeriod(["90"])).toBe(90);
  expect(pickPeriod("5")).toBe(30);
  expect(pickPeriod(undefined)).toBe(30);
});

it("colours a rise in errors as bad", () => {
  render(<Change now={20} before={10} upIsGood={false} />);
  const el = screen.getByText(/100% vs the period before/);
  expect(el.className).toContain("text-bf-danger-ink");
});

it("draws a stat tile as a link when given href", () => {
  render(<StatTile label="Members" value="4" href="/admin/members" change={{ now: 4, before: 2 }} />);
  expect(screen.getByRole("link").getAttribute("href")).toBe("/admin/members");
  expect(screen.getByText(/100% vs the period before/)).toBeTruthy();
});

it("draws one bar per key per point, titled with the figures", () => {
  const { container } = render(
    <BarSeries label="Credits per day" keys={[{ key: "in", label: "Credited" }, { key: "out", label: "Used" }]}
      points={[{ label: "1 Oct", values: { in: 10, out: 3 } }, { label: "2 Oct", values: { in: 0, out: 5 } }]} />,
  );
  expect(screen.getByRole("img", { name: "Credits per day" })).toBeTruthy();
  expect(screen.getAllByTestId("bar")).toHaveLength(4);
  expect(container.querySelector('[title="1 Oct: Credited 10, Used 3"]')).toBeTruthy();
  expect(screen.getByText("Credited")).toBeTruthy();
});

it("shows each row's share", () => {
  render(<ShareBars rows={[{ key: "a", label: "Any product", value: 300 }, { key: "g", label: "GenFashion", value: 150 }]} />);
  expect(screen.getByText("Any product")).toBeTruthy();
  expect(screen.getByText("150")).toBeTruthy();
});

it("switches the period in the URL, leaving the default out", async () => {
  render(<PeriodSwitch value={7} />);
  expect(screen.getByRole("button", { name: "7 days" }).getAttribute("aria-pressed")).toBe("true");
  await userEvent.click(screen.getByRole("button", { name: "90 days" }));
  expect(push).toHaveBeenLastCalledWith("/admin?tab=x&days=90");
  await userEvent.click(screen.getByRole("button", { name: "30 days" }));
  expect(push).toHaveBeenLastCalledWith("/admin?tab=x");
});

it("a stat tile can carry a subtitle with a small icon beside it", () => {
  render(<StatTile label="Overdue" value="2" subtitle="Since Monday" subIcon={<svg data-testid="sub-icon" />} />);
  expect(screen.getByText("Since Monday")).toBeInTheDocument();
  const icon = screen.getByTestId("sub-icon");
  expect(icon.closest("[aria-hidden]")).not.toBeNull();
  expect(icon.closest("p")).toBe(screen.getByText("Since Monday").closest("p"));
});

it("colours the subtitle line by its tone, muted by default", () => {
  const { rerender } = render(<StatTile label="Overdue" value="2" subtitle="Late" />);
  expect(screen.getByText("Late").closest("p")!.className).toContain("text-bf-muted");
  rerender(<StatTile label="Overdue" value="2" subtitle="Late" subTone="bad" />);
  expect(screen.getByText("Late").closest("p")!.className).toContain("text-bf-danger-ink");
  rerender(<StatTile label="Done" value="9" subtitle="On track" subTone="ok" />);
  expect(screen.getByText("On track").closest("p")!.className).toContain("text-bf-ok-ink");
});

it("draws no subtitle line when there is none, and keeps the footnote working", () => {
  const { container, rerender } = render(<StatTile label="Members" value="4" />);
  expect(container.querySelectorAll("p")).toHaveLength(1);
  rerender(<StatTile label="Members" value="4" foot="Two invited" />);
  expect(screen.getByText("Two invited")).toBeInTheDocument();
});

it("a stat tile that is a link still shows its subtitle", () => {
  render(<StatTile label="Open" value="7" href="/app/items" subtitle="3 due this week" subIcon={<svg />} />);
  expect(within(screen.getByRole("link")).getByText("3 due this week")).toBeInTheDocument();
});
