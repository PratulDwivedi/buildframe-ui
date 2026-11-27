import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { afterEach, beforeAll, expect, it, vi } from "vitest";
import { Combobox } from "../src/combobox/Combobox";

// jsdom has no layout: the field's place, the page's size and the zoomed view are given by hand.
beforeAll(() => {
  Element.prototype.scrollIntoView = () => {};
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

type View = { offsetLeft: number; offsetTop: number; width: number; height: number };

function screenOf(field: { top: number; left: number; width: number }, page: { width: number; height: number }, view?: View) {
  Object.defineProperty(document.documentElement, "clientWidth", { value: page.width, configurable: true });
  Object.defineProperty(document.documentElement, "clientHeight", { value: page.height, configurable: true });
  // A phone that has zoomed in reports the SMALL zoomed size as innerWidth.
  Object.defineProperty(window, "innerWidth", { value: view?.width ?? page.width, configurable: true });
  Object.defineProperty(window, "innerHeight", { value: view?.height ?? page.height, configurable: true });
  vi.stubGlobal("visualViewport", view ? { ...view, addEventListener: () => {}, removeEventListener: () => {} } : undefined);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(() => {
    const r = { top: field.top, bottom: field.top + 40, left: field.left, right: field.left + field.width };
    return { ...r, width: field.width, height: 40, x: r.left, y: r.top, toJSON: () => ({}) } as DOMRect;
  });
}

async function open() {
  render(<Combobox aria-label="Type" options={[{ value: "a", label: "Apartment" }]} value="" onChange={() => {}} />);
  await userEvent.click(screen.getByRole("combobox"));
  const s = (screen.getByRole("listbox") as HTMLElement).style;
  const n = (v: string) => (v ? Number(v.replace("px", "")) : undefined);
  return { left: n(s.left)!, width: n(s.width)!, top: n(s.top), bottom: n(s.bottom), maxHeight: n(s.maxHeight)! };
}

it("sits under the field on an ordinary screen", async () => {
  screenOf({ top: 100, left: 16, width: 358 }, { width: 390, height: 760 });
  expect(await open()).toMatchObject({ left: 16, width: 358, top: 144 });
});

it("stays under the field, inside the zoomed view, when the phone has zoomed in", async () => {
  // Zoomed to 286px wide, scrolled 12px right: the list may not be pushed off the left edge.
  screenOf({ top: 200, left: 16, width: 358 }, { width: 390, height: 760 }, { offsetLeft: 12, offsetTop: 80, width: 286, height: 400 });
  const p = await open();
  expect(p.left).toBe(20); // the view's left edge plus 8
  expect(p.width).toBe(270); // never wider than the view
});

it("opens above the field when the keyboard covers the room below", async () => {
  // The keyboard leaves 420px of a 760px page; the field is near the bottom of what can be seen.
  screenOf({ top: 340, left: 16, width: 358 }, { width: 390, height: 760 }, { offsetLeft: 0, offsetTop: 0, width: 390, height: 420 });
  const p = await open();
  expect(p.top).toBeUndefined();
  expect(p.bottom).toBe(424); // measured from the bottom of the page: 760 - 340 + 4
  expect(p.maxHeight).toBe(320);
});

it("asks phones for 16px text in fields, so they do not zoom in on focus", () => {
  const base = readFileSync("src/base.css", "utf8");
  expect(base).toMatch(/@media \(pointer: coarse\)\s*\{[^}]*input[^{]*textarea[^{]*\{[^}]*font-size: max\(16px, 1em\)/s);
});
