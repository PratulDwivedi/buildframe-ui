import { fireEvent, render, screen } from "@testing-library/react";
import { Avatar, AvatarStack } from "../src/people/Avatar";
import { initials } from "../src/people/initials";
import { categoryOf } from "../src/lib/category";

const riya = { name: "Riya Kapoor", email: "hello+riya@buildframe.tech" };

it("makes initials from the name, else from the email's local part, never from the domain", () => {
  expect(initials({ name: "Riya Kapoor", email: null })).toBe("RK");
  expect(initials({ name: "Riya", email: null })).toBe("R");
  expect(initials({ name: "Riya Devi Kapoor", email: null })).toBe("RD");
  expect(initials({ name: null, email: "hello+admin@buildframe.tech" })).toBe("HA");
  expect(initials({ name: " ", email: null })).toBe("?");
});

it("shows initials on the person's category colour, named for screen readers", () => {
  render(<Avatar user={riya} />);
  const el = screen.getByRole("img", { name: "Riya Kapoor" });
  expect(el).toHaveTextContent("RK");
  expect(el.style.background).toBe(`var(--bf-cat-${categoryOf("Riya Kapoor")}-bg)`);
});

it("shows the picture when there is one, and falls back to initials if it fails to load", () => {
  const { container } = render(<Avatar user={{ ...riya, avatar: "https://example.com/r.png" }} />);
  const img = container.querySelector("img")!;
  expect(img).toHaveAttribute("src", "https://example.com/r.png");
  fireEvent.error(img);
  expect(container.querySelector("img")).toBeNull();
  expect(screen.getByRole("img", { name: "Riya Kapoor" })).toHaveTextContent("RK");
});

it("is hidden from screen readers when the name is written beside it", () => {
  const { container } = render(<Avatar user={riya} decorative />);
  expect(screen.queryByRole("img")).toBeNull();
  expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
});

it("draws the assistant in the ai colour with a mark, not initials or a category", () => {
  render(<Avatar user={{ name: "Assistant" }} variant="ai" />);
  const el = screen.getByRole("img", { name: "Assistant" });
  expect(el.className).toMatch(/bg-bf-ai-bg/);
  expect(el.style.background).toBe("");
  expect(el.querySelector("svg")).not.toBeNull();
  expect(el).not.toHaveTextContent("A");
});

it("takes a size", () => {
  render(<Avatar user={riya} size="lg" />);
  expect(screen.getByRole("img").className).toMatch(/size-10/);
});

const team = ["Riya Kapoor", "Arjun Mehta", "Meera Nair", "Kabir Rao", "Ananya Iyer", "Dev Malhotra"].map((name) => ({ name }));

it("stacks up to the limit, then counts the rest", () => {
  render(<AvatarStack users={team} max={3} />);
  const group = screen.getByRole("group");
  expect(group).toHaveAccessibleName("Riya Kapoor, Arjun Mehta, Meera Nair, Kabir Rao, Ananya Iyer, Dev Malhotra");
  expect(group.querySelectorAll("[data-bf-avatar]")).toHaveLength(3);
  const more = screen.getByText("+3");
  expect(more).toHaveAttribute("title", "Kabir Rao, Ananya Iyer, Dev Malhotra");
});

it("shows everyone and no count when they fit", () => {
  render(<AvatarStack users={team.slice(0, 2)} max={3} />);
  expect(screen.getByRole("group").querySelectorAll("[data-bf-avatar]")).toHaveLength(2);
  expect(screen.queryByText(/^\+/)).toBeNull();
});

it("renders nothing for nobody", () => {
  const { container } = render(<AvatarStack users={[]} />);
  expect(container).toBeEmptyDOMElement();
});

it("overlaps the stack by 4px at most, so a second initial is never cut off (Qevli review finding 2)", () => {
  render(<AvatarStack users={team.slice(0, 3)} max={3} />);
  const avatars = screen.getByRole("group").querySelectorAll("[data-bf-avatar]");
  expect(avatars[1].className).toMatch(/(^|\s)-ml-1(\s|$)/);
  expect(avatars[1].className).not.toMatch(/-ml-1\.5|-ml-2/);
  render(<AvatarStack users={team} max={2} />);
  expect(screen.getByText("+4").className).toMatch(/(^|\s)-ml-1(\s|$)/);
});
