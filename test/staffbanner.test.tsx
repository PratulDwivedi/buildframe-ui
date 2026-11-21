import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import { StaffBanner } from "../src/shell/StaffBanner";

const SESSION = {
  tenant_name: "Acme Store",
  mode: "read" as const,
  reason: "Checking a billing question",
  expires_at: "2026-11-21T10:30:00.000Z",
};
const exit = async () => {};

describe("StaffBanner", () => {
  it("says whose data this is, that it is read-only, and until when", () => {
    render(<StaffBanner session={SESSION} exitAction={exit} formatTime={() => "4:00 pm"} />);
    const bar = screen.getByRole("region", { name: "Staff view" });
    expect(bar).toHaveTextContent("Staff view: Acme Store");
    expect(bar).toHaveTextContent("read-only");
    expect(bar).toHaveTextContent("until 4:00 pm");
  });

  it("says plainly when the session can change things", () => {
    render(<StaffBanner session={{ ...SESSION, mode: "edit" }} exitAction={exit} formatTime={() => "4:00 pm"} />);
    expect(screen.getByRole("region", { name: "Staff view" })).toHaveTextContent("you can change things");
    expect(screen.getByRole("region", { name: "Staff view" })).not.toHaveTextContent("read-only");
  });

  it("shows the recorded reason, and nothing when there is none", () => {
    const { rerender } = render(<StaffBanner session={SESSION} exitAction={exit} formatTime={() => "t"} />);
    expect(screen.getByRole("region", { name: "Staff view" })).toHaveTextContent("Checking a billing question");
    rerender(<StaffBanner session={{ ...SESSION, reason: "" }} exitAction={exit} formatTime={() => "t"} />);
    expect(screen.getByRole("region", { name: "Staff view" }).textContent).not.toMatch(/·\s*$/);
  });

  it("uses a different tone for an editing session than for a read-only one, never colour alone", () => {
    const { rerender } = render(<StaffBanner session={SESSION} exitAction={exit} formatTime={() => "t"} />);
    const read = screen.getByRole("region", { name: "Staff view" }).className;
    rerender(<StaffBanner session={{ ...SESSION, mode: "edit" }} exitAction={exit} formatTime={() => "t"} />);
    expect(screen.getByRole("region", { name: "Staff view" }).className).not.toBe(read);
    expect(screen.getByRole("region", { name: "Staff view" }).className).toMatch(/bf-warn/);
  });

  it("has an Exit button inside a form wired to the action it was given", () => {
    render(<StaffBanner session={SESSION} exitAction={exit} formatTime={() => "t"} />);
    const button = screen.getByRole("button", { name: "Exit staff view" });
    expect(button).toHaveAttribute("type", "submit");
    expect(button.closest("form")).not.toBeNull();
  });

  it("runs the exit action it was given when Exit is pressed", async () => {
    const action = vi.fn(async () => {});
    render(<StaffBanner session={SESSION} exitAction={action} formatTime={() => "t"} />);
    await userEvent.click(screen.getByRole("button", { name: "Exit staff view" }));
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
  });

  it("never shows 'Invalid Date': a bad expiry leaves the time out", () => {
    render(<StaffBanner session={{ ...SESSION, expires_at: "not a date" }} exitAction={exit} formatTime={(i) => new Date(i).toLocaleTimeString()} />);
    const text = screen.getByRole("region", { name: "Staff view" }).textContent ?? "";
    expect(text).not.toMatch(/invalid/i);
    expect(text).not.toMatch(/until/);
  });

  it("is a labelled region, not a live region that re-announces on every navigation", () => {
    render(<StaffBanner session={SESSION} exitAction={exit} formatTime={() => "t"} />);
    expect(screen.getByRole("region", { name: "Staff view" })).not.toHaveAttribute("role", "status");
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("keeps the reason readable: no opacity that lowers its contrast", () => {
    render(<StaffBanner session={{ ...SESSION, mode: "edit" }} exitAction={exit} formatTime={() => "t"} />);
    expect(screen.getByText("Checking a billing question", { exact: false }).className).not.toMatch(/opacity/);
  });

  it("only lists https and relative links, never javascript: or data: addresses", () => {
    render(
      <StaffBanner
        session={SESSION}
        exitAction={exit}
        formatTime={() => "t"}
        links={[
          { code: "a", name: "Good", url: "https://shop.example.com" },
          { code: "b", name: "Relative", url: "/app" },
          { code: "c", name: "Script", url: "javascript:alert(1)" },
          { code: "d", name: "Data", url: "data:text/html,x" },
          { code: "e", name: "Plain http", url: "http://shop.example.com" },
        ]}
      />,
    );
    expect(screen.getByRole("link", { name: "Good" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Relative" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Script" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Data" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Plain http" })).toBeNull();
  });

  it("lists other product consoles only when asked, opening in a new tab safely", () => {
    const { rerender } = render(<StaffBanner session={SESSION} exitAction={exit} formatTime={() => "t"} />);
    expect(screen.queryByRole("link")).toBeNull();
    rerender(
      <StaffBanner
        session={SESSION}
        exitAction={exit}
        formatTime={() => "t"}
        links={[{ code: "shop", name: "Shop", url: "https://shop.example.com" }]}
      />,
    );
    const link = screen.getByRole("link", { name: "Shop" });
    expect(link).toHaveAttribute("href", "https://shop.example.com");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")).toMatch(/noopener/);
  });

  it("holds no hex colour, only the shared tokens", () => {
    const { container } = render(<StaffBanner session={SESSION} exitAction={exit} formatTime={() => "t"} />);
    expect(container.innerHTML).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });
});
