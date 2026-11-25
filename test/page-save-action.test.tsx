import { render, screen, within } from "@testing-library/react";
import { PageSaveAction } from "../src/shell/PageSaveAction";
import { PageHeader, PageHeaderProvider, usePageActionsSlot } from "../src/shell/page-header";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
  usePathname: () => "/admin/x",
  useSearchParams: () => new URLSearchParams(),
}));

function Slot() {
  const set = usePageActionsSlot();
  return <div data-testid="topbar" ref={set} />;
}

it("draws Save, then Refresh, then the page's help, in the topbar, tied to the form by id", async () => {
  render(
    <PageHeaderProvider>
      <Slot />
      <form id="f1" />
      <PageSaveAction formId="f1" label="Save appearance" />
      <PageHeader title="Appearance" help={<p>Help words</p>} />
    </PageHeaderProvider>,
  );
  const bar = await screen.findByTestId("topbar");
  const save = within(bar).getByRole("button", { name: "Save appearance" });
  expect(save).toHaveAttribute("type", "submit");
  expect(save).toHaveAttribute("form", "f1");
  const buttons = within(bar).getAllByRole("button").map((b) => b.getAttribute("aria-label") ?? b.textContent);
  expect(buttons[0]).toBe("Save appearance");
  expect(buttons.indexOf("Refresh")).toBeGreaterThan(0);
  expect(buttons.at(-1)).toMatch(/help|\?/i);
});

it("turns the button itself into a green Saved for a moment, with a spoken note, and keeps it a submit button", () => {
  render(
    <PageHeaderProvider>
      <Slot />
      <PageSaveAction formId="f1" label="Save appearance" saved />
    </PageHeaderProvider>,
  );
  const bar = screen.getByTestId("topbar");
  const btn = within(bar).getByRole("button", { name: "Saved" });
  expect(btn).toHaveAttribute("type", "submit");
  expect(within(bar).queryByRole("button", { name: "Save appearance" })).toBeNull();
  expect(within(bar).getByRole("status")).toHaveTextContent("Saved");
});

it("outside a page header it draws in place, so a form still has a Save button", () => {
  render(<PageSaveAction formId="f1" label="Save appearance" />);
  expect(screen.getByRole("button", { name: "Save appearance" })).toBeInTheDocument();
});
