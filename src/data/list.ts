/**
 * The list contract behind every DataTable. The URL is the state: search, filters, sort, page and page size
 * all live in the query string, so a reload, a shared link and the back button land on the same rows, and the
 * server does the work however many rows there are.
 *
 * Ported from buildframe_ecomm lib/admin/list.ts (itself from buildframe-account's parseList), plus:
 *   - pick-many filters: one param, values joined by commas (`?status=paid,shipped`);
 *   - range filters: two params, `<param>_from` / `<param>_to` (dates) or `<param>_min` / `<param>_max` (numbers).
 * No React here, so a server page and an export route can both use it.
 */

export const PAGE_SIZES = [10, 25, 50, 100];
export const DEFAULT_PAGE_SIZE = 25;
/** An export stops here, so one click cannot read a whole large table into memory. */
export const EXPORT_ROW_CAP = 20000;

export type SortDir = "asc" | "desc";

export type ListQuery = {
  q: string;
  page: number;
  size: number;
  sort: string;
  dir: SortDir;
  /** Only the params the page declared; everything else in the URL is ignored. A pick-many value stays comma joined. */
  filters: Record<string, string>;
};

export type SearchParams = Record<string, string | string[] | undefined>;

/** Allowed values for a filter param, or null for free text (a date, a number, a search inside a column). */
export type FilterAllow = string[] | null;

export function parseList(
  sp: SearchParams,
  opts: {
    filters?: Record<string, FilterAllow>;
    sorts: string[];
    defaultSort: string;
    defaultDir?: SortDir;
    defaultSize?: number;
    pageSizes?: number[];
  },
): ListQuery {
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : (sp[k] as string | undefined)) ?? "";
  const sizes = opts.pageSizes ?? PAGE_SIZES;

  // A sort key is whitelisted here AND in the database; an unknown one falls back.
  const wanted = one("sort");
  const sort = opts.sorts.includes(wanted) ? wanted : opts.defaultSort;
  const dirParam = one("dir");
  const dir = dirParam === "asc" || dirParam === "desc" ? dirParam : (opts.defaultDir ?? "desc");

  const size = Number.parseInt(one("size"), 10);
  const filters: Record<string, string> = {};
  for (const [name, allowed] of Object.entries(opts.filters ?? {})) {
    const v = one(name).trim();
    if (allowed === null) {
      filters[name] = v;
      continue;
    }
    // Every comma-joined part must be allowed; the unknown ones are dropped, the rest kept.
    filters[name] = splitMany(v)
      .filter((part) => allowed.includes(part))
      .join(",");
  }

  return {
    q: one("q").trim(),
    page: Math.max(1, Number.parseInt(one("page") || "1", 10) || 1),
    size: sizes.includes(size) ? size : (opts.defaultSize ?? DEFAULT_PAGE_SIZE),
    sort,
    dir,
    filters,
  };
}

/** `"paid,shipped"` -> `["paid", "shipped"]`; empty parts dropped. */
export function splitMany(v: string | undefined | null): string[] {
  return (v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** The two params a range filter owns. */
export function rangeParams(param: string, kind: "date" | "number"): [string, string] {
  return kind === "date" ? [`${param}_from`, `${param}_to`] : [`${param}_min`, `${param}_max`];
}

/** A date param is only trusted as YYYY-MM-DD. */
export const isIsoDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

/** A number param, or null when absent or not a number. */
export function numberParam(v: string | undefined): number | null {
  if (v === undefined || v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/* ── small lists ────────────────────────────────────────────────────────────────────────────────────
   A list of tens of rows has no paging function in the database: it returns every row. The page reads the same
   URL query and applies it here, so the table behaves exactly like the database-driven ones. */

export type ListSpec<T> = {
  /** The text a search looks in. */
  search: (row: T) => string;
  /** Sort keys the URL may name, each giving the value to order by (null sorts last). */
  sorts: Record<string, (row: T) => string | number | null>;
  /** One test per filter param. Called with "" when the filter is off, so it must return true then (or apply its default). */
  filters?: Record<string, (row: T, value: string) => boolean>;
};

export type ListResult<T> = { rows: T[]; total: number; all: T[] };

export function applyList<T>(source: T[], query: ListQuery, spec: ListSpec<T>): ListResult<T> {
  const q = query.q.toLowerCase();
  const tests = Object.entries(spec.filters ?? {});
  const all = source.filter((r) => (!q || spec.search(r).toLowerCase().includes(q)) && tests.every(([k, test]) => test(r, query.filters[k] ?? "")));

  const key = spec.sorts[query.sort];
  if (key) {
    const sign = query.dir === "asc" ? 1 : -1;
    // Array.sort is stable, so rows with equal values keep the order they came in.
    all.sort((a, b) => {
      const x = key(a);
      const y = key(b);
      if (x === y) return 0;
      if (x === null) return 1;
      if (y === null) return -1;
      return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true, sensitivity: "base" })) * sign;
    });
  }

  const start = (query.page - 1) * query.size;
  return { rows: all.slice(start, start + query.size), total: all.length, all };
}

/** Filter test for a pick-many param: off when empty, else the row's value must be one of those picked. */
export const matchesAny = (rowValue: string | null | undefined, param: string) => {
  const picked = splitMany(param);
  return picked.length === 0 || (rowValue != null && picked.includes(rowValue));
};

/** Filter test for a range pair; either end may be open. */
export function inRange(v: number | string | null | undefined, from: string | undefined, to: string | undefined): boolean {
  if (!from && !to) return true;
  if (v === null || v === undefined || v === "") return false;
  if (typeof v === "number") {
    const lo = numberParam(from);
    const hi = numberParam(to);
    return (lo === null || v >= lo) && (hi === null || v <= hi);
  }
  const day = v.slice(0, 10);
  return (!from || day >= from) && (!to || day <= to);
}

/** The Active / Archived / All filter every small list has: live rows unless told otherwise. */
export const ARCHIVE_STATUS = ["active", "archived", "all"];
export const matchesStatus = (isActive: boolean, value: string) => {
  const s = value || "active";
  return s === "all" || (s === "archived") === !isActive;
};

/* ── export follows the view ────────────────────────────────────────────────────────────────────────── */

/** One column of a CSV / Excel export. `col` ties it to a table column key, so hiding that column drops it. */
export type ExportColumn<T, C = string | number | boolean | null> = { header: string; col?: string; value: (row: T) => C };

/**
 * Keeps the export columns the person can see, in their order (`cols` is the table's `?cols=a,b,c`). Columns
 * without a `col` key always stay: those before the first tied column lead (a code, an id), the rest trail.
 * Several export columns tied to one table column keep their own order. No `cols` means every column.
 */
export function pickExportColumns<T, C>(all: ExportColumn<T, C>[], cols: string | undefined | null): ExportColumn<T, C>[] {
  const wanted = splitMany(cols);
  if (wanted.length === 0) return all;
  const firstTied = all.findIndex((c) => c.col);
  const lead = all.filter((c, i) => !c.col && (firstTied < 0 || i < firstTied));
  const trail = all.filter((c, i) => !c.col && firstTied >= 0 && i > firstTied);
  const tied = wanted.flatMap((k) => all.filter((c) => c.col === k));
  return [...lead, ...tied, ...trail];
}

/**
 * CSV text from export columns and rows: every cell quoted when it holds a comma, quote or line break, a header
 * row first. For a list built in the browser; pair with pickExportColumns so it follows the visible columns.
 */
export function toCsv<T, C>(columns: ExportColumn<T, C>[], rows: T[]): string {
  const cell = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [columns.map((c) => cell(c.header)).join(","), ...rows.map((r) => columns.map((c) => cell(c.value(r))).join(","))].join("\n");
}
