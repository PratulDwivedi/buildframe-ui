import * as React from "react";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FooterForm } from "../src/site/FooterForm";
import { MenuForm } from "../src/site/MenuForm";
import { emptyFooter, type FooterValue, type NavLink } from "../src/site/links";
import { PageHeaderProvider, usePageActionsSlot } from "../src/shell/page-header";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
  usePathname: () => "/admin/x",
  useSearchParams: () => new URLSearchParams(),
}));

const options = [
  { value: "/buy", label: "Buy", hint: "page" },
  { value: "/contact", label: "Contact", hint: "page" },
];
const ok = async () => ({ error: null as string | null });

function footerSetup(value: FooterValue, save = vi.fn(async (_v: FooterValue) => ({ error: null as string | null }))) {
  render(<FooterForm value={value} linkOptions={options} onSave={save} />);
  return save;
}

const filled = (): FooterValue => ({
  about: "Homes in Noida",
  closing: "",
  groups: [
    { title: "Property", links: [{ label: "Buy", href: "/buy" }] },
    { title: "Company", links: [{ label: "Contact", href: "/contact" }] },
  ],
  social: [],
});

describe("FooterForm", () => {
  it("shows the text fields, each column with its links, and saves exactly what is there", async () => {
    const save = footerSetup(filled());
    expect(screen.getByLabelText("Text under the logo")).toHaveValue("Homes in Noida");
    expect(screen.getAllByLabelText("Column title").map((i) => (i as HTMLInputElement).value)).toEqual(["Property", "Company"]);
    await userEvent.click(screen.getByRole("button", { name: "Save footer" }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0]![0]).toEqual(filled());
    expect(await screen.findByText(/Saved\./)).toBeInTheDocument();
  });

  it("refuses a phone link, says which row, and does not save", async () => {
    const save = footerSetup(filled());
    const addresses = screen.getAllByLabelText("Address");
    await userEvent.clear(addresses[0]!);
    await userEvent.type(addresses[0]!, "tel:+911234567890");
    await userEvent.click(screen.getByRole("button", { name: "Save footer" }));
    expect(await screen.findByText(/Phone links are not allowed/)).toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
  });

  it("refuses a WhatsApp social link", async () => {
    const save = footerSetup(filled());
    await userEvent.click(screen.getByRole("button", { name: "Add a social link" }));
    await userEvent.type(screen.getByLabelText("Social address"), "https://wa.me/919876543210");
    await userEvent.click(screen.getByRole("button", { name: "Save footer" }));
    expect(await screen.findByText(/not on|phone number/i)).toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
  });

  it("adds a column and a link, and moves a column down", async () => {
    const save = footerSetup(filled());
    await userEvent.click(screen.getByRole("button", { name: "Add a column" }));
    expect(screen.getAllByLabelText("Column title")).toHaveLength(3);
    await userEvent.click(screen.getAllByRole("button", { name: "Add a link" })[0]!);
    expect(screen.getAllByLabelText("Link text")).toHaveLength(3);
    await userEvent.click(screen.getAllByRole("button", { name: "Move column down" })[0]!);
    expect((screen.getAllByLabelText("Column title")[0] as HTMLInputElement).value).toBe("Company");
    // the new blank column and the new blank link must be filled before a save is accepted
    await userEvent.click(screen.getByRole("button", { name: "Save footer" }));
    expect(save).not.toHaveBeenCalled();
  });

  it("saves a social link on its own network's domain", async () => {
    const save = footerSetup(filled());
    await userEvent.click(screen.getByRole("button", { name: "Add a social link" }));
    await userEvent.type(screen.getByLabelText("Social address"), "https://www.instagram.com/acme");
    await userEvent.click(screen.getByRole("button", { name: "Save footer" }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0]![0].social).toEqual([{ network: "instagram", url: "https://www.instagram.com/acme" }]);
  });

  it("the saved note goes away by itself", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      footerSetup(filled());
      await userEvent.click(screen.getByRole("button", { name: "Save footer" }));
      expect(await screen.findByText(/Saved\./)).toBeInTheDocument();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(4000);
      });
      expect(screen.queryByText(/Saved\./)).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("puts Save in the page header, once, when there is one", async () => {
    function Slot() {
      const set = usePageActionsSlot();
      return <div data-testid="topbar" ref={set} />;
    }
    const save = vi.fn(ok);
    render(
      <PageHeaderProvider>
        <Slot />
        <FooterForm value={emptyFooter()} linkOptions={options} onSave={save} />
      </PageHeaderProvider>,
    );
    const bar = await screen.findByTestId("topbar");
    expect(within(bar).getAllByRole("button", { name: "Save footer" })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Save footer" })).toHaveLength(1);
    await userEvent.click(within(bar).getByRole("button", { name: "Save footer" }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  });
});

describe("MenuForm", () => {
  function menuSetup(value: NavLink[], save = vi.fn(async (_v: NavLink[]) => ({ error: null as string | null }))) {
    render(<MenuForm value={value} linkOptions={options} onSave={save} />);
    return save;
  }

  it("adds a link by picking a page and saves it", async () => {
    const save = menuSetup([]);
    await userEvent.click(screen.getByRole("button", { name: "Add a link" }));
    await userEvent.type(screen.getByLabelText("Link text"), "About us");
    await userEvent.type(screen.getByLabelText("Address"), "/about");
    await userEvent.click(screen.getByRole("button", { name: "Save menu" }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0]![0]).toEqual([{ label: "About us", href: "/about" }]);
  });

  it("refuses a phone link", async () => {
    const save = menuSetup([{ label: "Call", href: "tel:123" }]);
    await userEvent.click(screen.getByRole("button", { name: "Save menu" }));
    expect(await screen.findByText(/Phone links are not allowed/)).toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
  });

  it("stops adding at 6 links", async () => {
    menuSetup(Array.from({ length: 6 }, (_, i) => ({ label: `L${i}`, href: `/p${i}` })));
    expect(screen.getByRole("button", { name: "Add a link" })).toBeDisabled();
  });

  it("shows the product's own error", async () => {
    menuSetup([{ label: "About", href: "/about" }], vi.fn(async () => ({ error: "You cannot change this" })));
    await userEvent.click(screen.getByRole("button", { name: "Save menu" }));
    expect(await screen.findByText("You cannot change this")).toBeInTheDocument();
  });
});
