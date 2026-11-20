/**
 * The script a root layout runs before paint, so someone who chose dark never sees a white flash. It reads the
 * same localStorage key useThemeToggle writes. Light is the default. Put it in <head>:
 *   <Script id="theme-init" strategy="beforeInteractive">{themeInitScript("acme_theme")}</Script>
 * No React here, so it is also exported from `@buildframe/ui/core` for a server layout.
 */
export function themeInitScript(key: string): string {
  if (!/^[\w.-]+$/.test(key)) throw new Error("themeInitScript: the key may hold only letters, digits, dot, dash and underscore");
  return `(function(){try{if(localStorage.getItem('${key}')==='dark')document.documentElement.classList.add('dark')}catch(e){}})();`;
}
