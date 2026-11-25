/**
 * The script a root layout runs before paint, so someone who chose dark never sees a white flash. It reads the
 * same localStorage key useThemeToggle writes. Light is the default. Put it in <head>:
 *   <Script id="theme-init" strategy="beforeInteractive">{themeInitScript("acme_theme")}</Script>
 * A tenant can choose what a first-time visitor sees: pass "dark" or "system" (follow the device) as the second argument.
 * A visitor who has switched always keeps their own choice, whatever the default says.
 * No React here, so it is also exported from `@buildframe/ui/core` for a server layout.
 */
export type ThemeDefault = "light" | "dark" | "system";

export function themeInitScript(key: string, defaultMode: ThemeDefault = "light"): string {
  if (!/^[\w.-]+$/.test(key)) throw new Error("themeInitScript: the key may hold only letters, digits, dot, dash and underscore");
  if (defaultMode !== "light" && defaultMode !== "dark" && defaultMode !== "system") throw new Error("themeInitScript: the default is light, dark or system");
  const fallback = defaultMode === "dark" ? "true" : defaultMode === "system" ? "typeof matchMedia==='function'&&matchMedia('(prefers-color-scheme: dark)').matches" : "false";
  return `(function(){try{var s=localStorage.getItem('${key}');var d=s==='dark'||(s!=='light'&&(${fallback}));if(d)document.documentElement.classList.add('dark')}catch(e){}})();`;
}
