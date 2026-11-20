import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

const push = vi.fn();
let query = "q=shoes&tab=done";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/app/items",
  useSearchParams: () => new URLSearchParams(query),
}));

import { TabPanels, Tabs } from "../src/nav/Tabs";

const ITEMS = [
  { key: "open", label: "Open", count: 7 },
  { key: "done", label: "Done", count: 0 },
  { key: "all", label: "All" },
];

beforeEach(() => {
  push.mockClear();
  query = "q=shoes&tab=done";
});

describe("controlled", () => {
  it("is a named tablist with the chosen tab selected, counts shown", () => {
    render(<Tabs label="Items" items={ITEMS} value="open" onChange={() => {}} />);
    expect(screen.getByRole("tablist", { name: "Items" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Open/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /Done/ })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tab", { name: /Open/ })).toHaveTextContent("7");
    expect(screen.getByRole("tab", { name: /Done/ })).toHaveTextContent("0");
  });

  it("reports a click", async () => {
    const onChange = vi.fn();
    render(<Tabs label="Items" items={ITEMS} value="open" onChange={onChange} />);
    await userEvent.click(screen.getByRole("tab", { name: /Done/ }));
    expect(onChange).toHaveBeenCalledWith("done");
  });

  it("moves with the arrow keys, Home and End, wrapping at the ends", async () => {
    const onChange = vi.fn();
    render(<Tabs label="Items" items={ITEMS} value="open" onChange={onChange} />);
    screen.getByRole("tab", { name: /Open/ }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenLastCalledWith("done");
    // Focus follows the move, so Left from Done is Open, and Left again wraps to the last tab.
    await userEvent.keyboard("{ArrowLeft}");
    expect(onChange).toHaveBeenLastCalledWith("open");
    await userEvent.keyboard("{ArrowLeft}");
    expect(onChange).toHaveBeenLastCalledWith("all");
    await userEvent.keyboard("{End}");
    expect(onChange).toHaveBeenLastCalledWith("all");
    await userEvent.keyboard("{Home}");
    expect(onChange).toHaveBeenLastCalledWith("open");
  });

  it("keeps only the chosen tab in the tab order", () => {
    render(<Tabs label="Items" items={ITEMS} value="done" onChange={() => {}} />);
    expect(screen.getByRole("tab", { name: /Done/ })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("tab", { name: /Open/ })).toHaveAttribute("tabindex", "-1");
  });
});

describe("URL parameter", () => {
  it("reads the chosen tab from the URL and falls back to the first", () => {
    render(<Tabs label="Items" items={ITEMS} param="tab" />);
    expect(screen.getByRole("tab", { name: /Done/ })).toHaveAttribute("aria-selected", "true");
    query = "tab=nonsense";
    render(<Tabs label="More" items={ITEMS} param="tab" />);
    expect(screen.getAllByRole("tab", { name: /Open/ })[1]).toHaveAttribute("aria-selected", "true");
  });

  it("writes the parameter, keeps the others, and leaves the default out", async () => {
    render(<Tabs label="Items" items={ITEMS} param="tab" />);
    await userEvent.click(screen.getByRole("tab", { name: /All/ }));
    expect(push).toHaveBeenLastCalledWith("/app/items?q=shoes&tab=all");
    await userEvent.click(screen.getByRole("tab", { name: /Open/ }));
    expect(push).toHaveBeenLastCalledWith("/app/items?q=shoes");
  });
});

describe("links", () => {
  it("is a named nav of links with the current one marked", () => {
    const items = ITEMS.map((i) => ({ ...i, href: `/app/items/${i.key}` }));
    render(<Tabs label="Views" items={items} value="done" />);
    expect(screen.getByRole("navigation", { name: "Views" })).toBeInTheDocument();
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.getByRole("link", { name: /Done/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /Open/ })).toHaveAttribute("href", "/app/items/open");
    expect(screen.getByRole("link", { name: /Open/ })).not.toHaveAttribute("aria-current");
  });
});

describe("TabPanels", () => {
  const tabs = [
    { key: "a", label: "Assigned", count: 2, content: <p>assigned list</p> },
    { key: "b", label: "Created", content: <p>created list</p> },
  ];

  it("shows the first panel, wired to its tab, and switches on a click", async () => {
    render(<TabPanels label="My work" tabs={tabs} />);
    const panel = screen.getByRole("tabpanel");
    expect(panel).toHaveTextContent("assigned list");
    expect(panel).toHaveAttribute("aria-labelledby", screen.getByRole("tab", { name: /Assigned/ }).id);
    expect(screen.getByRole("tab", { name: /Assigned/ })).toHaveAttribute("aria-controls", panel.id);
    await userEvent.click(screen.getByRole("tab", { name: /Created/ }));
    expect(screen.getByRole("tabpanel")).toHaveTextContent("created list");
    expect(screen.queryByText("assigned list")).toBeNull();
  });

  it("can start on another tab, and two on one page do not share ids", () => {
    render(
      <>
        <TabPanels label="One" tabs={tabs} defaultKey="b" />
        <TabPanels label="Two" tabs={tabs} />
      </>,
    );
    expect(screen.getAllByRole("tabpanel")[0]).toHaveTextContent("created list");
    const ids = screen.getAllByRole("tab").map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("shows keyboard focus on a tab and on the panel (Qevli review finding 3, WCAG 2.4.7)", () => {
    render(<TabPanels label="Focus" tabs={tabs} />);
    expect(screen.getAllByRole("tab")[0].className).toMatch(/focus-visible:ring-2/);
    expect(screen.getByRole("tabpanel").className).toMatch(/focus-visible:ring-2/);
  });
});
