import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MenuItem, Popover } from "../src/overlay/Menu";

// jsdom has no layout, so the button's place and the panel's height are given by hand.
let buttonRect: { top: number; bottom: number; left: number; right: number };
beforeEach(() => {
  Object.defineProperty(window, "innerHeight", { value: 600, configurable: true });
  Object.defineProperty(window, "innerWidth", { value: 1000, configurable: true });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    const r = this.tagName === "BUTTON" ? buttonRect : { top: 0, bottom: 0, left: 0, right: 0 };
    return { ...r, width: r.right - r.left, height: r.bottom - r.top, x: r.left, y: r.top, toJSON: () => ({}) } as DOMRect;
  });
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (this: HTMLElement) {
    return this.getAttribute("role") === "menu" ? 150 : 20;
  });
});
afterEach(() => vi.restoreAllMocks());

const menu = () => (
  <Popover trigger={(p) => <button {...p}>Open</button>} label="Actions">
    <MenuItem>One</MenuItem>
    <MenuItem>Two</MenuItem>
  </Popover>
);
const top = () => Number((screen.getByRole("menu") as HTMLElement).style.top.replace("px", ""));

it("opens below its button when there is room", async () => {
  buttonRect = { top: 20, bottom: 40, left: 800, right: 900 };
  render(menu());
  await userEvent.click(screen.getByRole("button", { name: "Open" }));
  expect(top()).toBe(46); // 40 + 6
});

it("opens above its button when it would run off the bottom of the screen and there is room above", async () => {
  buttonRect = { top: 540, bottom: 560, left: 800, right: 900 };
  render(menu());
  await userEvent.click(screen.getByRole("button", { name: "Open" }));
  expect(top()).toBe(384); // 540 - 6 - 150
});

it("stays below when it fits there even though there is more room above", async () => {
  buttonRect = { top: 300, bottom: 320, left: 800, right: 900 };
  render(menu());
  await userEvent.click(screen.getByRole("button", { name: "Open" }));
  expect(top()).toBe(326);
});

it("never opens above the top of the screen", async () => {
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (this: HTMLElement) {
    return this.getAttribute("role") === "menu" ? 700 : 20;
  });
  buttonRect = { top: 300, bottom: 320, left: 800, right: 900 };
  render(menu());
  await userEvent.click(screen.getByRole("button", { name: "Open" }));
  expect(top()).toBeGreaterThanOrEqual(8);
});
