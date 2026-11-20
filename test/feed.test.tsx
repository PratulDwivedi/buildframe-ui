import { render, screen, within } from "@testing-library/react";
import { Feed } from "../src/feed/Feed";

const ROWS = [
  { key: "1", lead: <span data-testid="lead-1" />, text: <>Kabir Rao moved WEB-148 to Done</>, time: "9:12", href: "/app/items/WEB-148" },
  { key: "2", text: "Assistant asked a question on WEB-150", time: "Yesterday" },
];

it("is a named list, rows in the order given, with the lead, text and time", () => {
  render(<Feed label="Recent activity" items={ROWS} />);
  const rows = within(screen.getByRole("list", { name: "Recent activity" })).getAllByRole("listitem");
  expect(rows).toHaveLength(2);
  expect(rows[0]).toHaveTextContent("Kabir Rao moved WEB-148 to Done");
  expect(rows[0]).toHaveTextContent("9:12");
  expect(within(rows[0]).getByTestId("lead-1")).toBeInTheDocument();
  expect(rows[1]).toHaveTextContent("Yesterday");
});

it("makes a row with an address a link, and leaves the others plain", () => {
  render(<Feed label="Recent activity" items={ROWS} />);
  expect(screen.getByRole("link", { name: /Kabir Rao moved WEB-148 to Done/ })).toHaveAttribute("href", "/app/items/WEB-148");
  expect(screen.getAllByRole("link")).toHaveLength(1);
});

it("shows the empty line when there is nothing", () => {
  render(<Feed label="Recent activity" items={[]} empty="Nothing has happened yet." />);
  expect(screen.getByText("Nothing has happened yet.")).toBeInTheDocument();
  expect(screen.queryByRole("list")).toBeNull();
});
