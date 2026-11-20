import { act, renderHook } from "@testing-library/react";
import { themeInitScript } from "../src/theme/init";
import { useThemeToggle } from "../src/theme/useThemeToggle";

beforeEach(() => {
  document.documentElement.className = "";
  window.localStorage.clear();
});

it("starts from the class already on <html>", () => {
  document.documentElement.classList.add("dark");
  const { result } = renderHook(() => useThemeToggle("acme_theme"));
  expect(result.current.dark).toBe(true);
});

it("flips the class and remembers the choice under the app's own key", () => {
  const { result } = renderHook(() => useThemeToggle("acme_theme"));
  expect(result.current.dark).toBe(false);
  act(() => result.current.toggle());
  expect(document.documentElement.classList.contains("dark")).toBe(true);
  expect(window.localStorage.getItem("acme_theme")).toBe("dark");
  act(() => result.current.toggle());
  expect(document.documentElement.classList.contains("dark")).toBe(false);
  expect(window.localStorage.getItem("acme_theme")).toBe("light");
});

it("writes a before-paint script that reads the same key, and runs", () => {
  window.localStorage.setItem("acme_theme", "dark");
  const script = themeInitScript("acme_theme");
  expect(script).toContain("acme_theme");
  new Function(script)();
  expect(document.documentElement.classList.contains("dark")).toBe(true);
});

it("refuses a key that could break out of the script", () => {
  expect(() => themeInitScript("x');alert(1);('")).toThrow();
});
