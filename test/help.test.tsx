import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HelpSection, HelpSteps } from "../src/help/sections";
import { PageHeader } from "../src/shell/page-header";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
  usePathname: () => "/admin/rates",
  useSearchParams: () => new URLSearchParams(),
}));

it("PageHeader help adds a ? that opens the page's help panel", async () => {
  render(
    <PageHeader
      title="Rate cards"
      help={
        <HelpSection title="Add a price">
          <HelpSteps steps={["Press New rate card.", "Save it."]} />
        </HelpSection>
      }
    />,
  );
  await userEvent.click(screen.getByRole("button", { name: "Help: Rate cards" }));
  expect(screen.getByText("Add a price")).toBeInTheDocument();
  expect(screen.getAllByRole("listitem")).toHaveLength(2);
});

it("PageHeader without help renders nothing", () => {
  const { container } = render(<PageHeader title="Orders" />);
  expect(container).toBeEmptyDOMElement();
});
