"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  ChevronsUpDownIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  XIcon,
} from "lucide-react";
import { cn } from "../lib/cn";
import { Button } from "../primitives/Button";
import { Checkbox, Input, inputClass } from "../primitives/Field";
import { Combobox, type ComboOption } from "../combobox/Combobox";
import { MultiCombobox } from "../combobox/MultiCombobox";
import { PageActions } from "../shell/page-header";
import { PAGE_SIZES, rangeParams, splitMany, type ListQuery } from "./list";
import { emptyPrefs, loadPrefs, orderColumns, savePrefs, type ViewPrefs } from "./prefs";
import { useListUrl } from "./useListUrl";
import { DisplayMenu, MoreMenu, RefreshButton, ViewsMenu, type MoreItem } from "./toolbar";

/**
 * The one list for every screen. Search, filters (pick one, pick many, date, date range, number range) with a
 * chip per active filter, sortable headers, paging with a page-size choice, CSV / Excel download of every
 * matching row in the columns the person can see, and a card per row on a phone.
 *
 * Advanced view (plan section 5): table or cards on a desktop, show / hide / reorder columns, comfortable or
 * compact rows, row selection with bulk actions, saved views, sticky header and first column, row click.
 *
 * The URL is the state; the SERVER filters, sorts and pages (a database function, or `applyList` for a small
 * list), so it is right at any size. The table never filters rows itself.
 *
 * Ported from buildframe_ecomm components/admin/data-table/data-table.tsx, with insightuno's quick filters
 * folded into the filter types.
 */

export type DataColumn<T> = {
  key: string;
  label: string;
  /** The server's sort key. Present = the header is a button. */
  sort?: string;
  /** Direction the first click sorts in. Dates and amounts read best newest or biggest first. */
  firstDir?: "asc" | "desc";
  align?: "right" | "center";
  /** The card's title. The first column when none is marked. Never hidden. */
  primary?: boolean;
  /** Left out of the phone card. */
  hideOnMobile?: boolean;
  /** Takes the card's full width. */
  wide?: boolean;
  /** Hidden until the person turns it on in Display. */
  defaultHidden?: boolean;
  /** false = always shown, not in the column list. Defaults to true. */
  hideable?: boolean;
  className?: string;
  render: (row: T) => React.ReactNode;
};

export type DataFilter = {
  /** The query-string param this filter owns (a range owns `<param>_from/_to` or `<param>_min/_max`). */
  param: string;
  /** Shown when nothing is picked, e.g. "All departments". */
  placeholder: string;
  /** The filter's short name, for its chip ("Department"). Derived from the placeholder when left out. */
  label?: string;
  type?: "one" | "many" | "date" | "date-range" | "number-range";
  options?: ComboOption[];
  /** What a pick-one filter means while its param is absent (Products: "active"); picking it again removes the param. */
  defaultValue?: string;
  /** Params to reset when this one changes (picking a department resets the category). */
  clears?: string[];
  /** A range's own two params when they are not `<param>_from/_to` or `_min/_max` (Orders uses `from` and `to`). */
  rangeKeys?: [string, string];
};

export type DataTableProps<T> = {
  columns: DataColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  total: number;
  query: ListQuery;
  noun?: { one: string; many: string };
  /** null hides the search box, for a screen the server cannot search. */
  searchPlaceholder?: string | null;
  filters?: DataFilter[];
  /** A strip above the table (Orders' status tabs). */
  tabs?: React.ReactNode;
  /** Icon buttons at the end of each row (and the foot of each card). */
  actions?: (row: T) => React.ReactNode;
  /** Extra classes for a row and its card, e.g. dimming an archived one. */
  rowClassName?: (row: T) => string | undefined;
  /** The whole row opens this address (the primary cell should still hold a real link). */
  rowHref?: (row: T) => string;
  /** The whole row calls this, e.g. to open the record in a SlideOver. */
  onRowClick?: (row: T) => void;
  /** Turns on row selection; drawn in the bar that replaces the count while rows are selected. */
  bulkActions?: (selected: T[], clear: () => void) => React.ReactNode;
  /** e.g. "/admin/orders/export": adds Download CSV and Download Excel to the table's "⋯" menu. */
  exportPath?: string;
  /** More entries for the table's "⋯" menu, after Download CSV and Download Excel. */
  menuActions?: MoreItem[];
  /** Extra page action buttons, drawn before Refresh (for example "New product"). */
  headerActions?: React.ReactNode;
  /** A custom card for the card layout. The default lays out the visible columns. */
  renderCard?: (row: T) => React.ReactNode;
  /** Where the person's column, density, layout and saved views are kept. Defaults to the page path. */
  viewKey?: string;
  /** Turn off the Views menu (saved views). */
  savedViews?: boolean;
  emptyText?: React.ReactNode;
  /** Height of the scroll box on a desktop, so the header can stick. CSS length. */
  maxHeight?: string;
  /** The rows-per-page choices; the page must accept the same ones (parseList's pageSizes). */
  pageSizes?: number[];
  /** false: the rows are the whole list (a short one), so no rows-per-page or page buttons. */
  paged?: boolean;
  /** false: add no Refresh button to the page header (the second table on a page, so there is only one). */
  refresh?: boolean;
};


const filterLabel = (f: DataFilter) => f.label ?? f.placeholder.replace(/^(All|Any)\s+/i, "").replace(/^./, (c) => c.toUpperCase());

/** Every param a filter owns. */
export function filterParams(f: DataFilter): string[] {
  if ((f.type === "date-range" || f.type === "number-range") && f.rangeKeys) return f.rangeKeys;
  if (f.type === "date-range") return rangeParams(f.param, "date");
  if (f.type === "number-range") return rangeParams(f.param, "number");
  return [f.param];
}

function isActive(f: DataFilter, query: ListQuery) {
  return filterParams(f).some((p) => !!query.filters[p]);
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  total,
  query,
  noun = { one: "row", many: "rows" },
  searchPlaceholder = "Search…",
  filters = [],
  tabs,
  actions,
  rowClassName,
  rowHref,
  onRowClick,
  bulkActions,
  exportPath,
  headerActions,
  menuActions = [],
  renderCard,
  viewKey,
  savedViews = true,
  emptyText = "Nothing to show yet.",
  maxHeight = "calc(100dvh - 15rem)",
  paged = true,
  refresh = true,
  pageSizes = PAGE_SIZES,
}: DataTableProps<T>) {
  const sizeOptions: ComboOption[] = pageSizes.map((n) => ({ value: String(n), label: String(n) }));
  const router = useRouter();
  const { push, replaceAll, pending, sp, pathname } = useListUrl();
  const [search, setSearch] = React.useState(query.q);
  const activeFilters = filters.filter((f) => isActive(f, query));
  // On a phone the filters and sort fold away behind one button; a link that arrives with filters set shows them.
  const [foldOpen, setFoldOpen] = React.useState(activeFilters.length > 0);

  // The search box follows the URL when it changes from outside (Back, a saved view, Clear).
  const [seenQ, setSeenQ] = React.useState(query.q);
  if (seenQ !== query.q) {
    setSeenQ(query.q);
    setSearch(query.q);
  }

  // Search waits for a pause in typing before it asks the server.
  React.useEffect(() => {
    if (search.trim() === query.q) return;
    const t = window.setTimeout(() => push({ q: search.trim() }, "replace"), 350);
    return () => window.clearTimeout(t);
  }, [search, query.q, push]);

  /* ── the person's view ─────────────────────────────────────────────────────────────────────────── */
  const key = viewKey ?? pathname;
  const defaultHidden = React.useMemo(() => columns.filter((c) => c.defaultHidden).map((c) => c.key), [columns]);
  // Defaults on the server and on first paint, then the stored choice, so hydration matches.
  const [prefs, setPrefsState] = React.useState<ViewPrefs>(() => emptyPrefs(defaultHidden));
  React.useEffect(() => {
    setPrefsState(loadPrefs(key, defaultHidden));
  }, [key, defaultHidden]);
  const setPrefs = React.useCallback(
    (next: ViewPrefs) => {
      setPrefsState(next);
      savePrefs(key, next);
    },
    [key],
  );

  const primary = columns.find((c) => c.primary) ?? columns[0];
  const canHide = (c: DataColumn<T>) => c !== primary && c.hideable !== false;
  const ordered = orderColumns(
    columns.map((c) => c.key),
    prefs.order,
  ).map((k) => columns.find((c) => c.key === k)!);
  const hidden = new Set(prefs.hidden);
  const visible = ordered.filter((c) => !canHide(c) || !hidden.has(c.key));
  const cardFields = visible.filter((c) => c !== primary && !c.hideOnMobile);
  const compact = prefs.density === "compact";

  /* ── selection ─────────────────────────────────────────────────────────────────────────────────── */
  const selectable = !!bulkActions;
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  // A new page, search or filter is a different set of rows: the selection does not carry over.
  const queryId = sp.toString();
  const [seenQuery, setSeenQuery] = React.useState(queryId);
  if (seenQuery !== queryId) {
    setSeenQuery(queryId);
    setSelected(new Set());
  }
  const pageKeys = rows.map(rowKey);
  const allOn = pageKeys.length > 0 && pageKeys.every((k) => selected.has(k));
  const someOn = !allOn && pageKeys.some((k) => selected.has(k));
  const toggleRow = (k: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  const toggleAll = () => setSelected(allOn ? new Set() : new Set(pageKeys));
  const clearSelection = React.useCallback(() => setSelected(new Set()), []);
  const selectedRows = rows.filter((r) => selected.has(rowKey(r)));

  /* ── paging, sort, filters ─────────────────────────────────────────────────────────────────────── */
  const filtered = !!query.q || Object.values(query.filters).some(Boolean);
  const pages = Math.max(1, Math.ceil(total / query.size));
  const page = Math.min(query.page, pages);
  const from = total === 0 ? 0 : (page - 1) * query.size + 1;
  const to = Math.min(page * query.size, total);
  const sortable = columns.filter((c) => c.sort);

  const sortBy = (c: DataColumn<T>) => {
    if (!c.sort) return;
    const first = c.firstDir ?? "asc";
    const dir = query.sort === c.sort ? (query.dir === "asc" ? "desc" : "asc") : first;
    push({ sort: c.sort, dir });
  };

  const clearFilter = (f: DataFilter) => push(Object.fromEntries([...filterParams(f), ...(f.clears ?? [])].map((p) => [p, null])));

  function clearAll() {
    setSearch("");
    push({ q: null, ...Object.fromEntries(filters.flatMap(filterParams).map((p) => [p, null])) });
  }

  const interactive = !!rowHref || !!onRowClick;
  const openRow = (row: T, e: React.MouseEvent | React.KeyboardEvent) => {
    if (!interactive) return;
    if ((e.target as HTMLElement).closest("a,button,input,label,textarea,[role=combobox],[data-no-row-click]")) return;
    if (onRowClick) onRowClick(row);
    else if (rowHref) router.push(rowHref(row));
  };
  const rowKeyDown = (row: T, e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.target === e.currentTarget) openRow(row, e);
  };

  const exportCols = visible.map((c) => c.key).join(",");
  const cellPad = compact ? "px-3 py-1.5" : "px-4 py-2.5";

  const card = (r: T) =>
    renderCard ? (
      renderCard(r)
    ) : (
      <>
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2.5">
            {selectable && (
              <label data-no-row-click className="-m-2 flex cursor-pointer p-2">
                <Checkbox className="mt-0.5" checked={selected.has(rowKey(r))} onChange={() => toggleRow(rowKey(r))} aria-label="Select row" />
              </label>
            )}
            <div className="min-w-0 font-medium text-bf-ink">{primary.render(r)}</div>
          </div>
          {actions && <div className="-my-1.5 -mr-2 flex shrink-0 gap-0.5">{actions(r)}</div>}
        </div>
        {cardFields.length > 0 && (
          <dl className={cn("grid grid-cols-2 gap-x-4 text-sm", compact ? "gap-y-1.5" : "gap-y-2")}>
            {cardFields.map((c) => (
              <div key={c.key} className={cn("min-w-0", c.wide && "col-span-2")}>
                <dt className="text-xs text-bf-muted">{c.label}</dt>
                <dd className="min-w-0 text-bf-copy">{c.render(r)}</dd>
              </div>
            ))}
          </dl>
        )}
      </>
    );

  return (
    <>
      {(refresh || headerActions) && (
        <PageActions>
          {headerActions}
          {refresh && <RefreshButton />}
        </PageActions>
      )}

      {tabs}

      <div className="overflow-hidden rounded-2xl border border-bf-line bg-bf-surface text-bf-copy">
        {/* ── toolbar ── */}
        <div className="space-y-2 border-b border-bf-line p-3">
          <div className="flex flex-wrap items-center gap-2">
            {searchPlaceholder !== null && (
              <div className="relative min-w-[180px] flex-1 sm:min-w-[260px] sm:max-w-sm">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-bf-muted" />
                <Input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                  className="h-9 bg-bf-canvas pl-9 pr-8 text-[13px] [&::-webkit-search-cancel-button]:hidden"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-bf-muted hover:text-bf-ink"
                  >
                    <XIcon className="size-3.5" />
                  </button>
                )}
              </div>
            )}

            {(filters.length > 0 || sortable.length > 0) && (
              <Button
                size="sm"
                className="h-9 sm:hidden"
                aria-expanded={foldOpen}
                onClick={() => setFoldOpen((o) => !o)}
              >
                <SlidersHorizontalIcon /> Filters
                {activeFilters.length > 0 ? ` (${activeFilters.length})` : ""}
              </Button>
            )}

            <div className="ml-auto flex items-center gap-1 sm:order-last">
              {savedViews && <ViewsMenu prefs={prefs} setPrefs={setPrefs} sp={sp} replaceAll={replaceAll} />}
              <DisplayMenu
                columns={ordered.filter(canHide).map((c) => ({ key: c.key, label: c.label }))}
                order={ordered.map((c) => c.key)}
                prefs={prefs}
                setPrefs={setPrefs}
                defaultHidden={defaultHidden}
              />
              {(exportPath || menuActions.length > 0) && <MoreMenu exportPath={exportPath} cols={exportCols} items={menuActions} />}
            </div>

            <div className={cn("w-full flex-wrap items-center gap-2", foldOpen ? "flex" : "hidden", "sm:contents")}>
              {filters.map((f) => (
                <FilterControl key={f.param} f={f} query={query} push={push} />
              ))}

              {/* On a phone the headers are not there to tap, so sort is a choice in the toolbar. */}
              {sortable.length > 0 && (
                <div className="flex w-full items-center gap-1.5 sm:hidden">
                  <div className="min-w-0 flex-1">
                    <Combobox
                      size="sm"
                      value={query.sort}
                      clearable={false}
                      aria-label="Sort by"
                      onChange={(v) => {
                        const c = sortable.find((x) => x.sort === v);
                        push({ sort: v, dir: c?.firstDir ?? "asc" });
                      }}
                      options={sortable.map((c) => ({ value: c.sort!, label: `Sort: ${c.label}` }))}
                      placeholder="Sort by"
                    />
                  </div>
                  <Button
                    size="icon-sm"
                    className="size-9"
                    aria-label={query.dir === "asc" ? "Ascending, switch to descending" : "Descending, switch to ascending"}
                    onClick={() => push({ sort: query.sort, dir: query.dir === "asc" ? "desc" : "asc" })}
                  >
                    {query.dir === "asc" ? <ArrowUpIcon /> : <ArrowDownIcon />}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* One chip per active filter, each with its own clear. */}
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {activeFilters.map((f) => (
                <span
                  key={f.param}
                  className="inline-flex max-w-full items-center gap-1 rounded-full border border-bf-line bg-bf-brand-bg py-0.5 pl-2.5 pr-1 text-xs text-bf-brand-strong"
                >
                  <span className="truncate">
                    <span className="font-semibold">{filterLabel(f)}:</span> {chipText(f, query)}
                  </span>
                  <button
                    type="button"
                    onClick={() => clearFilter(f)}
                    aria-label={`Remove filter ${filterLabel(f)}`}
                    className="grid size-5 shrink-0 place-items-center rounded-full hover:bg-bf-surface"
                  >
                    <XIcon className="size-3" />
                  </button>
                </span>
              ))}
              <button type="button" onClick={clearAll} className="px-1.5 text-xs font-semibold text-bf-muted hover:text-bf-ink">
                Clear all
              </button>
            </div>
          )}

          {/* The count is in the footer ("1 to 25 of 87"); a screen reader still hears it change. */}
          <p className="sr-only" aria-live="polite">
            {total} {total === 1 ? noun.one : noun.many}
            {pending ? ", updating" : ""}
          </p>
        </div>

        <div className={cn("transition-opacity", pending && "opacity-60")}>
          {/* ── desktop table ── */}
          {prefs.layout === "table" && rows.length > 0 && (
            <div className="hidden overflow-auto sm:block" style={{ maxHeight }}>
              <table className={cn("w-full border-separate border-spacing-0", compact ? "text-[13px]" : "text-sm")}>
                <thead>
                  <tr className="text-left text-xs text-bf-muted">
                    {selectable && (
                      <th scope="col" className="sticky left-0 top-0 z-20 w-10 border-b border-bf-line bg-bf-surface p-0">
                        <label className="flex min-h-9 cursor-pointer items-center justify-center px-3">
                          <Checkbox checked={allOn} indeterminate={someOn} onChange={toggleAll} aria-label="Select all rows on this page" />
                        </label>
                      </th>
                    )}
                    {visible.map((c, i) => {
                      const on = !!c.sort && c.sort === query.sort;
                      const stickyFirst = i === 0;
                      return (
                        <th
                          key={c.key}
                          scope="col"
                          aria-sort={on ? (query.dir === "asc" ? "ascending" : "descending") : undefined}
                          className={cn(
                            "sticky top-0 z-10 whitespace-nowrap border-b border-bf-line bg-bf-surface font-semibold",
                            cellPad,
                            stickyFirst && (selectable ? "left-10 z-20" : "left-0 z-20"),
                            c.align === "right" && "text-right",
                            c.align === "center" && "text-center",
                            c.className,
                          )}
                        >
                          {c.sort ? (
                            <button
                              type="button"
                              onClick={() => sortBy(c)}
                              className={cn("inline-flex items-center gap-1 hover:text-bf-ink", on && "text-bf-ink")}
                            >
                              {c.label}
                              {on ? query.dir === "asc" ? <ArrowUpIcon className="size-3" /> : <ArrowDownIcon className="size-3" /> : <ChevronsUpDownIcon className="size-3 opacity-40" />}
                            </button>
                          ) : (
                            c.label
                          )}
                        </th>
                      );
                    })}
                    {actions && (
                      <th scope="col" className={cn("sticky top-0 z-10 w-px border-b border-bf-line bg-bf-surface", cellPad)}>
                        <span className="sr-only">Actions</span>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const k = rowKey(r);
                    const isSel = selected.has(k);
                    const rowBg = isSel ? "bg-bf-brand-bg" : "bg-bf-surface group-hover:bg-bf-surface-alt";
                    return (
                      <tr
                        key={k}
                        onClick={(e) => openRow(r, e)}
                        onKeyDown={(e) => rowKeyDown(r, e)}
                        tabIndex={interactive ? 0 : undefined}
                        aria-selected={selectable ? isSel : undefined}
                        className={cn("group outline-none focus-visible:[&>td]:bg-bf-surface-alt", interactive && "cursor-pointer", rowClassName?.(r))}
                      >
                        {selectable && (
                          // The whole cell ticks the box and never opens the row: a near miss must not leave the page.
                          <td data-no-row-click className={cn("sticky left-0 z-[5] w-10 border-b border-bf-line p-0", rowBg)}>
                            <label className="flex h-full min-h-9 cursor-pointer items-center justify-center px-3">
                              <Checkbox checked={isSel} onChange={() => toggleRow(k)} aria-label="Select row" />
                            </label>
                          </td>
                        )}
                        {visible.map((c, i) => (
                          <td
                            key={c.key}
                            className={cn(
                              "border-b border-bf-line align-middle",
                              cellPad,
                              rowBg,
                              i === 0 && (selectable ? "sticky left-10 z-[5]" : "sticky left-0 z-[5]"),
                              i === 0 && "text-bf-ink",
                              c.align === "right" && "text-right",
                              c.align === "center" && "text-center",
                              c.className,
                            )}
                          >
                            {c.render(r)}
                          </td>
                        ))}
                        {actions && (
                          <td className={cn("whitespace-nowrap border-b border-bf-line text-right", compact ? "px-2 py-0.5" : "px-3 py-1", rowBg)}>
                            {actions(r)}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── desktop cards ── */}
          {prefs.layout === "cards" && rows.length > 0 && (
            <ul className={cn("hidden gap-3 p-3 sm:grid sm:grid-cols-2 xl:grid-cols-3", compact && "gap-2 p-2")}>
              {rows.map((r) => {
                const k = rowKey(r);
                return (
                  <li
                    key={k}
                    onClick={(e) => openRow(r, e)}
                    onKeyDown={(e) => rowKeyDown(r, e)}
                    tabIndex={interactive ? 0 : undefined}
                    className={cn(
                      "space-y-2.5 rounded-xl border border-bf-line bg-bf-surface outline-none transition-colors",
                      compact ? "p-3" : "p-4",
                      interactive && "cursor-pointer hover:border-bf-line-strong hover:bg-bf-surface-alt focus-visible:border-bf-brand",
                      selected.has(k) && "border-bf-brand bg-bf-brand-bg",
                      rowClassName?.(r),
                    )}
                  >
                    {card(r)}
                  </li>
                );
              })}
            </ul>
          )}

          {/* ── phone: always a card per row, so nothing scrolls sideways ── */}
          {rows.length > 0 && (
            <ul className="divide-y divide-bf-line sm:hidden">
              {rows.map((r) => {
                const k = rowKey(r);
                return (
                  <li
                    key={k}
                    onClick={(e) => openRow(r, e)}
                    className={cn(
                      "space-y-2.5",
                      compact ? "p-3" : "p-4",
                      interactive && "cursor-pointer active:bg-bf-surface-alt",
                      selected.has(k) && "bg-bf-brand-bg",
                      rowClassName?.(r),
                    )}
                  >
                    {card(r)}
                  </li>
                );
              })}
            </ul>
          )}

          {rows.length === 0 && (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-bf-muted">{filtered ? `No ${noun.many} match.` : emptyText}</p>
              {filtered && (
                <Button size="sm" variant="secondary" className="mt-3" onClick={clearAll}>
                  <XIcon /> Clear search and filters
                </Button>
              )}
            </div>
          )}
        </div>

        {/* ── paging ── */}
        {total > 0 && (paged || (selectable && selected.size > 0)) && (
          <div className={cn("flex min-h-12 flex-wrap items-center justify-between gap-3 border-t border-bf-line px-4 py-2 text-xs text-bf-muted", selected.size > 0 && "bg-bf-brand-bg")}>
            {selectable && selected.size > 0 ? (
              <div className="flex min-w-0 flex-wrap items-center gap-2 text-[13px]" role="region" aria-label="Selected rows">
                <span className="font-semibold text-bf-brand-strong">{selected.size} selected</span>
                <div className="flex flex-wrap items-center gap-1.5">{bulkActions!(selectedRows, clearSelection)}</div>
                <button type="button" onClick={clearSelection} className="text-xs font-semibold text-bf-muted hover:text-bf-ink">
                  Clear
                </button>
              </div>
            ) : (
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline">Rows per page</span>
              <div className="w-[4.5rem]">
                <Combobox size="xs" value={String(query.size)} clearable={false} aria-label="Rows per page" onChange={(v) => push({ size: v })} options={sizeOptions} />
              </div>
              <span>
                {from} to {to} of {total}
              </span>
            </div>
            )}
            <div className="flex items-center gap-1">
              <span className="mr-1">
                Page {page} of {pages}
              </span>
              <Button size="icon-sm" aria-label="First page" className="hidden sm:inline-flex" disabled={page <= 1} onClick={() => push({ page: 1 })}>
                <ChevronsLeftIcon />
              </Button>
              <Button size="icon-sm" aria-label="Previous page" disabled={page <= 1} onClick={() => push({ page: page - 1 })}>
                <ChevronLeftIcon />
              </Button>
              <Button size="icon-sm" aria-label="Next page" disabled={page >= pages} onClick={() => push({ page: page + 1 })}>
                <ChevronRightIcon />
              </Button>
              <Button size="icon-sm" aria-label="Last page" className="hidden sm:inline-flex" disabled={page >= pages} onClick={() => push({ page: pages })}>
                <ChevronsRightIcon />
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function chipText(f: DataFilter, query: ListQuery): string {
  const label = (v: string) => f.options?.find((o) => o.value === v)?.label ?? v;
  if (f.type === "many") return splitMany(query.filters[f.param]).map(label).join(", ");
  if (f.type === "date-range" || f.type === "number-range") {
    const [a, b] = filterParams(f);
    const lo = query.filters[a];
    const hi = query.filters[b];
    if (lo && hi) return `${lo} to ${hi}`;
    return lo ? `from ${lo}` : `up to ${hi}`;
  }
  return label(query.filters[f.param]);
}

function FilterControl({
  f,
  query,
  push,
}: {
  f: DataFilter;
  query: ListQuery;
  push: (patch: Record<string, string | number | null>) => void;
}) {
  const clears = Object.fromEntries((f.clears ?? []).map((p) => [p, null]));
  const name = filterLabel(f);

  if (f.type === "many") {
    return (
      <div className="w-full sm:w-48">
        <MultiCombobox
          size="sm"
          value={splitMany(query.filters[f.param])}
          onChange={(v) => push({ [f.param]: v.join(","), ...clears })}
          options={f.options ?? []}
          placeholder={f.placeholder}
          aria-label={name}
        />
      </div>
    );
  }

  if (f.type === "date") {
    return (
      <label className="flex w-[calc(50%-0.25rem)] items-center gap-1.5 sm:w-auto">
        <span className="text-xs text-bf-muted">{f.placeholder}</span>
        <Input
          type="date"
          value={query.filters[f.param] ?? ""}
          onChange={(e) => push({ [f.param]: e.target.value, ...clears })}
          aria-label={f.placeholder}
          className="h-9 px-2 text-[13px] sm:w-36"
        />
      </label>
    );
  }

  if (f.type === "date-range") {
    const [a, b] = filterParams(f);
    return (
      <fieldset className="flex w-full items-center gap-1.5 sm:w-auto">
        <legend className="sr-only">{name}</legend>
        <span className="shrink-0 text-xs text-bf-muted">{name}</span>
        <Input
          type="date"
          value={query.filters[a] ?? ""}
          max={query.filters[b] || undefined}
          onChange={(e) => push({ [a]: e.target.value, ...clears })}
          aria-label={`${name} from`}
          className="h-9 min-w-0 flex-1 px-2 text-[13px] sm:w-36 sm:flex-none"
        />
        <span className="text-xs text-bf-muted">to</span>
        <Input
          type="date"
          value={query.filters[b] ?? ""}
          min={query.filters[a] || undefined}
          onChange={(e) => push({ [b]: e.target.value, ...clears })}
          aria-label={`${name} to`}
          className="h-9 min-w-0 flex-1 px-2 text-[13px] sm:w-36 sm:flex-none"
        />
      </fieldset>
    );
  }

  if (f.type === "number-range") return <NumberRange f={f} query={query} push={push} name={name} />;

  return (
    <div className="w-full sm:w-48">
      <Combobox
        size="sm"
        value={query.filters[f.param] || f.defaultValue || ""}
        onChange={(v) => push({ [f.param]: v === (f.defaultValue ?? "") ? null : v, ...clears })}
        options={f.options ?? []}
        placeholder={f.defaultValue ? undefined : f.placeholder}
        emptyLabel={f.placeholder}
        clearable={!f.defaultValue}
        aria-label={name}
      />
    </div>
  );
}

/** Min and max boxes that ask the server once typing stops, not on every key. */
function NumberRange({
  f,
  query,
  push,
  name,
}: {
  f: DataFilter;
  query: ListQuery;
  push: (patch: Record<string, string | number | null>) => void;
  name: string;
}) {
  const [a, b] = filterParams(f);
  const [lo, setLo] = React.useState(query.filters[a] ?? "");
  const [hi, setHi] = React.useState(query.filters[b] ?? "");
  const urlLo = query.filters[a] ?? "";
  const urlHi = query.filters[b] ?? "";
  const [seen, setSeen] = React.useState(`${urlLo}|${urlHi}`);
  if (seen !== `${urlLo}|${urlHi}`) {
    setSeen(`${urlLo}|${urlHi}`);
    setLo(urlLo);
    setHi(urlHi);
  }
  React.useEffect(() => {
    if (lo === urlLo && hi === urlHi) return;
    const t = window.setTimeout(() => push({ [a]: lo.trim(), [b]: hi.trim() }), 500);
    return () => window.clearTimeout(t);
  }, [lo, hi, urlLo, urlHi, a, b, push]);
  const box = cn(inputClass, "h-9 min-w-0 flex-1 px-2 text-[13px] sm:w-24 sm:flex-none");
  return (
    <fieldset className="flex w-full items-center gap-1.5 sm:w-auto">
      <legend className="sr-only">{name}</legend>
      <span className="shrink-0 text-xs text-bf-muted">{name}</span>
      <input type="number" inputMode="decimal" className={box} placeholder="Min" aria-label={`${name} minimum`} value={lo} onChange={(e) => setLo(e.target.value)} />
      <span className="text-xs text-bf-muted">to</span>
      <input type="number" inputMode="decimal" className={box} placeholder="Max" aria-label={`${name} maximum`} value={hi} onChange={(e) => setHi(e.target.value)} />
    </fieldset>
  );
}
