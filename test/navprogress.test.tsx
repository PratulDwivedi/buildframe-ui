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

import userEvent from "@testing-library/user-event";
import { useNavProgress } from "../src/shell/NavProgress";

let nav = { path: "/a", search: "" };
vi.mock("next/navigation", () => ({
  usePathname: () => nav.path,
  useSearchParams: () => new URLSearchParams(nav.search),
}));

function PushButton() {
  const { start } = useNavProgress();
  return <button onClick={start}>push</button>;
}
function Tree() {
  return (
    <NavProgressProvider>
      <a href="/b" onClick={(e) => e.preventDefault()}>internal</a>
      <a href="https://example.com/x" onClick={(e) => e.preventDefault()}>external</a>
      <a href="/b" data-no-progress onClick={(e) => e.preventDefault()}>optout</a>
      <PushButton />
    </NavProgressProvider>
  );
}
const bar = () => screen.getByRole("progressbar", { hidden: true });

it("starts on an internal link click and ends when the path changes", async () => {
  pending = false;
  nav = { path: "/a", search: "" };
  const { rerender } = render(<Tree />);
  await userEvent.click(screen.getByText("internal"));
  expect(bar().className).toContain("is-pending");
  nav = { path: "/b", search: "" };
  rerender(<Tree />);
  expect(bar().className).not.toContain("is-pending");
});

it("ignores external and opted-out links, and starts on start()", async () => {
  pending = false;
  nav = { path: "/a", search: "" };
  render(<Tree />);
  await userEvent.click(screen.getByText("external"));
  await userEvent.click(screen.getByText("optout"));
  expect(bar().className).not.toContain("is-pending");
  await userEvent.click(screen.getByText("push"));
  expect(bar().className).toContain("is-pending");
});
