import { render, screen } from "@testing-library/react";
import { NavProgressProvider, LinkPending } from "../src/shell/NavProgress";

let pending = false;
vi.mock("next/link", () => ({ useLinkStatus: () => ({ pending }) }));

it("is hidden when no link is pending and shown while one is", () => {
  pending = false;
  const { rerender } = render(<NavProgressProvider><LinkPending /></NavProgressProvider>);
  const bar = () => screen.getByRole("progressbar", { hidden: true });
  expect(bar().className).not.toContain("is-pending");
  pending = true;
  rerender(<NavProgressProvider><LinkPending /></NavProgressProvider>);
  expect(bar().className).toContain("is-pending");
  expect(bar().getAttribute("aria-busy")).toBe("true");
});

it("stays shown until every pending link has finished", () => {
  pending = true;
  const { rerender } = render(<NavProgressProvider><LinkPending /><LinkPending /></NavProgressProvider>);
  pending = false;
  rerender(<NavProgressProvider><LinkPending /></NavProgressProvider>);
  expect(screen.getByRole("progressbar", { hidden: true }).className).not.toContain("is-pending");
});
