/**
 * A person's view of one list: which columns show and in what order, row spacing, table or cards, and the
 * views they saved. Kept in browser storage for v1 (plan section 5), so it belongs to the browser, not the
 * account; team-shared views need a bf_* table later. Every read and write is guarded: private windows and
 * blocked storage throw, and the table must then simply use its defaults.
 */

export type Density = "comfortable" | "compact";
export type Layout = "table" | "cards";

export type SavedView = {
  id: string;
  name: string;
  /** The list's query string without page, e.g. "status=paid&sort=total&dir=desc". */
  qs: string;
  hidden: string[];
  order: string[];
  density: Density;
  layout: Layout;
};

export type ViewPrefs = {
  hidden: string[];
  order: string[];
  density: Density;
  layout: Layout;
  views: SavedView[];
};

export const emptyPrefs = (defaultHidden: string[] = []): ViewPrefs => ({
  hidden: defaultHidden,
  order: [],
  // Compact by default (Pratul, 2026-10-30): more rows on screen; Comfortable is one click away in Display.
  density: "compact",
  layout: "table",
  views: [],
});

const PREFIX = "bf-ui:view:";

export function loadPrefs(key: string, defaultHidden: string[] = []): ViewPrefs {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return emptyPrefs(defaultHidden);
    const p = JSON.parse(raw) as Partial<ViewPrefs>;
    return {
      hidden: Array.isArray(p.hidden) ? p.hidden.filter((x) => typeof x === "string") : defaultHidden,
      order: Array.isArray(p.order) ? p.order.filter((x) => typeof x === "string") : [],
      density: p.density === "comfortable" ? "comfortable" : "compact",
      layout: p.layout === "cards" ? "cards" : "table",
      views: Array.isArray(p.views) ? p.views.filter((v) => v && typeof v.name === "string" && typeof v.qs === "string") : [],
    };
  } catch {
    return emptyPrefs(defaultHidden);
  }
}

export function savePrefs(key: string, prefs: ViewPrefs) {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(prefs));
  } catch {
    // Storage is full or blocked: the choice lasts until the page reloads.
  }
}

/**
 * The column keys in the order to draw them. A saved order is applied, then any column the screen gained since
 * it was saved is put back at its own place, and keys that no longer exist are dropped, so a code change never
 * hides a column from someone with an old saved order.
 */
export function orderColumns(keys: string[], saved: string[]): string[] {
  if (saved.length === 0) return keys;
  const known = new Set(keys);
  const out = saved.filter((k) => known.has(k));
  keys.forEach((k, i) => {
    if (out.includes(k)) return;
    // Insert after the column that comes before it in the screen's own order.
    const prev = keys.slice(0, i).reverse().find((p) => out.includes(p));
    out.splice(prev ? out.indexOf(prev) + 1 : 0, 0, k);
  });
  return out;
}

/** Moves `key` one place up or down. */
export function moveColumn(order: string[], key: string, by: -1 | 1): string[] {
  const i = order.indexOf(key);
  const j = i + by;
  if (i < 0 || j < 0 || j >= order.length) return order;
  const next = order.slice();
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

/** The query string a saved view keeps: everything but the page, in a stable order so two views compare. */
export function viewQuery(sp: URLSearchParams): string {
  const next = new URLSearchParams();
  [...sp.entries()]
    .filter(([k]) => k !== "page" && k !== "cols")
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([k, v]) => next.append(k, v));
  return next.toString();
}

export const newViewId = () => Math.random().toString(36).slice(2, 10);
