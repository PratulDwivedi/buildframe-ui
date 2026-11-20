"use client";

import * as React from "react";

/**
 * Dark mode the way every Buildframe app does it: a `dark` class on <html> and the choice in localStorage under
 * the app's own key (the key themeInitScript reads before paint). Five apps carried a copy of this hook.
 * Pass the result straight to AppShell: `theme={useThemeToggle("acme_theme")}`.
 */
export function useThemeToggle(key: string): { dark: boolean; toggle: () => void } {
  const [dark, setDark] = React.useState(false);

  React.useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = React.useCallback(() => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      window.localStorage.setItem(key, next ? "dark" : "light");
    } catch {
      // Storage blocked: the theme still flips for this visit.
    }
    setDark(next);
  }, [key]);

  return { dark, toggle };
}
