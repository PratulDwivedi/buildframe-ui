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

import { BarSeries, Change, PeriodSwitch, ShareBars, StatRow, StatTile } from "../src/dashboard/Stats";

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
  const { container, rerender } = render(<StatTile layout="stacked" label="Members" value="4" />);
  expect(container.querySelectorAll("p")).toHaveLength(1);
  rerender(<StatTile label="Members" value="4" foot="Two invited" />);
  expect(screen.getByText("Two invited")).toBeInTheDocument();
});

it("a stat tile that is a link still shows its subtitle", () => {
  render(<StatTile label="Open" value="7" href="/app/items" subtitle="3 due this week" subIcon={<svg />} />);
  expect(within(screen.getByRole("link")).getByText("3 due this week")).toBeInTheDocument();
});

it("the inline layout puts the number and the subtitle on one line, beside the icon, to save height", () => {
  const { container } = render(
    <StatTile layout="inline" icon={<svg data-testid="tile-icon" />} label="Overdue" value="2" subtitle="Since Monday" subIcon={<svg />} subTone="bad" />,
  );
  const root = container.firstElementChild as HTMLElement;
  expect(root.getAttribute("data-layout")).toBe("inline");
  const value = screen.getByText("2");
  const subtitle = screen.getByText("Since Monday").closest("p")!;
  // the number and the subtitle share one row, and that row is not the card itself
  expect(value.parentElement).toBe(subtitle.parentElement);
  expect(value.parentElement).not.toBe(root);
  // the icon is beside the text, in the same top row as the title
  expect(screen.getByTestId("tile-icon").closest("span")!.parentElement).toBe(screen.getByText("Overdue").closest("div")!.parentElement);
  expect(subtitle.className).toContain("text-bf-danger-ink");
});

it("the inline layout keeps a change line and a footnote under the row, and still links", () => {
  render(<StatTile layout="inline" label="Members" value="4" href="/admin/members" change={{ now: 4, before: 2 }} foot="Two invited" />);
  const link = screen.getByRole("link");
  expect(within(link).getByText(/100% vs the period before/)).toBeTruthy();
  expect(within(link).getByText("Two invited")).toBeTruthy();
});

it("the default layout is corner, the one look every product uses; the others stay available but products do not pick them", () => {
  const { container } = render(<StatTile label="Members" value="4" />);
  expect((container.firstElementChild as HTMLElement).getAttribute("data-layout")).toBe("corner");
});

it("a corner tile's title wraps to two lines instead of being cut off, so five across stay readable", () => {
  render(<StatTile label="Credits used, all organisations" value="0" />);
  const title = screen.getByText("Credits used, all organisations");
  expect(title.className).not.toMatch(/\btruncate\b/);
  expect(title.className).toMatch(/line-clamp-2/);
});

it("the corner layout puts the icon in the top-right corner, level with the title, and the subtitle under the number", () => {
  const { container } = render(<StatTile layout="corner" icon={<svg data-testid="corner-icon" />} label="Overdue" value="2" subtitle="Since Monday" />);
  expect((container.firstElementChild as HTMLElement).getAttribute("data-layout")).toBe("corner");
  const iconTile = screen.getByTestId("corner-icon").closest("span")!;
  const title = screen.getByText("Overdue");
  // the title and the icon are in the same top row; the icon comes after the text block
  expect(iconTile.parentElement).toBe(title.closest("div")!.parentElement);
  expect(title.closest("div")!.compareDocumentPosition(iconTile) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  // the subtitle is below that row, not inside it
  expect(iconTile.parentElement!.contains(screen.getByText("Since Monday"))).toBe(false);
});

it("the accent layout has a coloured edge instead of an icon tile, and a small icon before the title", () => {
  const { container } = render(<StatTile layout="accent" tone="bad" icon={<svg data-testid="small-icon" />} label="Overdue" value="2" subtitle="Since Monday" />);
  const root = container.firstElementChild as HTMLElement;
  expect(root.getAttribute("data-layout")).toBe("accent");
  const bar = root.querySelector("[data-accent]") as HTMLElement;
  expect(bar).not.toBeNull();
  expect(bar.className).toContain("text-bf-danger-ink");
  expect(bar.getAttribute("aria-hidden")).toBe("true");
  // no tinted square tile: the icon sits in the title line
  expect(screen.getByTestId("small-icon").closest("p")).toBe(screen.getByText("Overdue").closest("p"));
});

it("every layout shows the title, the number and the subtitle", () => {
  for (const layout of ["stacked", "inline", "corner", "accent"] as const) {
    const { unmount } = render(<StatTile layout={layout} label="Open" value="7" subtitle="3 due" />);
    expect(screen.getByText("Open")).toBeTruthy();
    expect(screen.getByText("7")).toBeTruthy();
    expect(screen.getByText("3 due")).toBeTruthy();
    unmount();
  }
});

describe("StatRow: one grid for a row of figures, so no page picks its own", () => {
  const tiles = (n: number) => Array.from({ length: n }, (_, i) => <StatTile key={i} label={`Figure ${i}`} value={String(i)} />);

  it.each([
    [1, "grid-cols-1"],
    [2, "sm:grid-cols-2"],
    [3, "sm:grid-cols-3"],
    [4, "lg:grid-cols-4"],
    [5, "xl:grid-cols-5"],
    [6, "xl:grid-cols-6"],
  ])("with %i tiles the grid is %s", (n, cls) => {
    const { container } = render(<StatRow>{tiles(n)}</StatRow>);
    expect((container.firstElementChild as HTMLElement).className).toContain(cls);
  });

  it("counts only the tiles that are drawn: a false or null child (a tile shown only to some people) does not leave a gap", () => {
    const { container } = render(
      <StatRow>
        <StatTile label="A" value="1" />
        {false}
        {null}
        <StatTile label="B" value="2" />
        <StatTile label="C" value="3" />
        <StatTile label="D" value="4" />
      </StatRow>,
    );
    expect((container.firstElementChild as HTMLElement).className).toContain("lg:grid-cols-4");
  });

  it("makes every tile the height of the tallest in its row", () => {
    const { container } = render(<StatRow>{tiles(3)}</StatRow>);
    expect((container.firstElementChild as HTMLElement).className).toContain("[&>*]:h-full");
  });

  it("draws nothing at all when there are no tiles", () => {
    const { container } = render(<StatRow>{[false, null]}</StatRow>);
    expect(container).toBeEmptyDOMElement();
  });

  it("more than six tiles stay six across at most, and wrap", () => {
    const { container } = render(<StatRow>{tiles(8)}</StatRow>);
    expect((container.firstElementChild as HTMLElement).className).toContain("xl:grid-cols-6");
  });

  it("takes an extra class for spacing", () => {
    const { container } = render(<StatRow className="mb-5">{tiles(2)}</StatRow>);
    expect((container.firstElementChild as HTMLElement).className).toContain("mb-5");
  });

  it("counts the tiles inside a Fragment, so a row written as <>{a}{b}{c}{d}</> still gets four columns", () => {
    const { container } = render(
      <StatRow>
        <>
          <StatTile label="A" value="1" />
          <StatTile label="B" value="2" />
        </>
        <>
          <StatTile label="C" value="3" />
          {false}
          <StatTile label="D" value="4" />
        </>
      </StatRow>,
    );
    expect((container.firstElementChild as HTMLElement).className).toContain("lg:grid-cols-4");
  });

  it("can be a list: as='ul' draws a labelled list with each tile in an item", () => {
    render(
      <StatRow as="ul" label="Totals">
        <StatTile label="A" value="1" />
        <StatTile label="B" value="2" />
      </StatRow>,
    );
    const list = screen.getByRole("list", { name: "Totals" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
  });

  it("a plain row is not a list", () => {
    render(<StatRow><StatTile label="A" value="1" /></StatRow>);
    expect(screen.queryByRole("list")).toBeNull();
  });
});

describe("StatTile fits its row", () => {
  it("is as tall as its grid cell by default, so a tile wrapped in a list item or a link needs no extra class", () => {
    const { container } = render(<StatTile label="Members" value="4" />);
    expect((container.firstElementChild as HTMLElement).className).toMatch(/\bh-full\b/);
    const link = render(<StatTile label="Members" value="4" href="/x" />);
    expect((link.container.firstElementChild as HTMLElement).className).toMatch(/\bh-full\b/);
  });

  it("a long title can still be read in full: it is the tooltip when it is cut at two lines", () => {
    render(<StatTile label="Credits used, all organisations" value="0" />);
    expect(screen.getByText("Credits used, all organisations")).toHaveAttribute("title", "Credits used, all organisations");
  });

  it("the big number gets smaller as its column gets narrower, and may wrap rather than run under the icon", () => {
    render(<StatTile label="Billed" value="₹12,34,567" icon={<svg />} />);
    const number = screen.getByText("₹12,34,567");
    expect(number.className).toMatch(/@\[[0-9.]+rem\]:text-/);
    expect(number.className).toMatch(/break-words|\[overflow-wrap:anywhere\]/);
    expect(number.parentElement?.className).toMatch(/@container/);
  });
});

describe("StatRow keys and labels", () => {
  it("gives every tile its own React key, also when some sit inside Fragments (no duplicate-key warning)", () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <StatRow>
        <StatTile label="A" value="1" />
        <>
          <StatTile label="B" value="2" />
          <StatTile label="C" value="3" />
        </>
        <>
          <>
            <StatTile label="D" value="4" />
          </>
          <StatTile label="E" value="5" />
        </>
      </StatRow>,
    );
    const warned = errors.mock.calls.some((c) => /same key|unique "key"/i.test(String(c[0])));
    errors.mockRestore();
    expect(warned).toBe(false);
    expect(screen.getAllByText(/^[A-E]$/).map((n) => n.textContent)).toEqual(["A", "B", "C", "D", "E"]);
  });

  it("keeps keyed tiles from an array in the same order and without a key warning", () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<StatRow>{["x", "y", "z"].map((k) => <StatTile key={k} label={k.toUpperCase()} value="1" />)}</StatRow>);
    const warned = errors.mock.calls.some((c) => /unique "key"|same key/i.test(String(c[0])));
    errors.mockRestore();
    expect(warned).toBe(false);
  });

  it("a plain row with a label is a labelled group, so the label is announced", () => {
    render(<StatRow label="Totals"><StatTile label="A" value="1" /></StatRow>);
    expect(screen.getByRole("group", { name: "Totals" })).toBeInTheDocument();
  });
});
