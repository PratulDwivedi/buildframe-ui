"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  BookmarkIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  EllipsisIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  LayoutGridIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  Rows3Icon,
  Settings2Icon,
  TableIcon,
  Trash2Icon,
} from "lucide-react";
import { cn } from "../lib/cn";
import { Button, IconButton } from "../primitives/Button";
import { Checkbox, Input } from "../primitives/Field";
import { MenuItem, MenuLabel, MenuSeparator, Popover, menuItemClass } from "../overlay/Menu";
import { moveColumn, newViewId, viewQuery, type ViewPrefs } from "./prefs";

/** Reloads the page's data from the database without a full page load. */
export function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  return (
    <IconButton
      variant="secondary"
      icon={<RefreshCwIcon className={cn(pending && "animate-spin")} />}
      label="Refresh"
      onClick={() => startTransition(() => router.refresh())}
    />
  );
}

export type MoreItem = {
  label: string;
  icon?: React.ReactNode;
  href?: string;
  download?: boolean;
  /** Receives the keys of the columns the person can see, in their order, so a CSV built in the browser can follow them. */
  onSelect?: (visibleCols: string[]) => void;
};

/**
 * The table's "⋯" menu, at the right end of its toolbar (as buildframe-account's ReportTable): Download CSV and
 * Download Excel of EVERY row matching the search and filters (not just this page), in the columns the person
 * can see, then any extra entries. The export route reads the same query string, plus `format` and `cols`.
 */
export function MoreMenu({ exportPath, cols, items = [] }: { exportPath?: string; cols: string; items?: MoreItem[] }) {
  const href = (format: "csv" | "xlsx") => {
    const next = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search);
    next.delete("page");
    next.delete("size");
    next.set("format", format);
    if (cols) next.set("cols", cols);
    return `${exportPath}?${next.toString()}`;
  };
  return (
    <Popover
      label="More actions"
      width={208}
      trigger={(p) => (
        <Button {...p} size="icon-sm" variant="ghost" className="size-9" aria-label="More actions" title="More actions">
          <EllipsisIcon />
        </Button>
      )}
    >
      {(close) => (
        <>
          {exportPath && (
            <>
              <MenuItem href={href("csv")} download onSelect={close}>
                <FileTextIcon /> Download CSV
              </MenuItem>
              <MenuItem href={href("xlsx")} download onSelect={close}>
                <FileSpreadsheetIcon /> Download Excel
              </MenuItem>
            </>
          )}
          {items.map((it) => (
            <MenuItem
              key={it.label}
              href={it.href}
              download={it.download}
              onSelect={() => {
                it.onSelect?.(cols ? cols.split(",") : []);
                close();
              }}
            >
              {it.icon}
              {it.label}
            </MenuItem>
          ))}
        </>
      )}
    </Popover>
  );
}

function Seg<V extends string>({ value, onChange, items, label }: { value: V; onChange: (v: V) => void; items: { v: V; label: string; icon: React.ReactNode }[]; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-2 gap-1 rounded-lg bg-bf-surface-alt p-1">
      {items.map((it) => (
        <button
          key={it.v}
          type="button"
          role="radio"
          aria-checked={value === it.v}
          onClick={() => onChange(it.v)}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors [&_svg]:size-3.5",
            value === it.v ? "bg-bf-surface text-bf-ink shadow-sm" : "text-bf-muted hover:text-bf-ink",
          )}
        >
          {it.icon}
          {it.label}
        </button>
      ))}
    </div>
  );
}

/** Layout, row spacing, and which columns show in what order. */
export function DisplayMenu({
  columns,
  order,
  prefs,
  setPrefs,
  defaultHidden,
}: {
  /** The columns a person may hide, in drawn order. */
  columns: { key: string; label: string }[];
  /** Every column key in drawn order (reordering moves within this). */
  order: string[];
  prefs: ViewPrefs;
  setPrefs: (p: ViewPrefs) => void;
  defaultHidden: string[];
}) {
  const hidden = new Set(prefs.hidden);
  const changed = prefs.order.length > 0 || prefs.density !== "compact" || prefs.layout !== "table" || prefs.hidden.join() !== defaultHidden.join();
  return (
    <Popover
      label="Display"
      width={280}
      trigger={(p) => (
        <Button {...p} size="icon-sm" variant="ghost" className="size-9" aria-label="Display" title="Display: layout, spacing, columns">
          <Settings2Icon />
        </Button>
      )}
    >
      <div className="space-y-3 p-2">
        <div className="hidden space-y-1.5 sm:block">
          <MenuLabel>Layout</MenuLabel>
          <Seg
            label="Layout"
            value={prefs.layout}
            onChange={(layout) => setPrefs({ ...prefs, layout })}
            items={[
              { v: "table", label: "Table", icon: <TableIcon /> },
              { v: "cards", label: "Cards", icon: <LayoutGridIcon /> },
            ]}
          />
        </div>
        <div className="space-y-1.5">
          <MenuLabel>Row spacing</MenuLabel>
          <Seg
            label="Row spacing"
            value={prefs.density}
            onChange={(density) => setPrefs({ ...prefs, density })}
            items={[
              { v: "comfortable", label: "Comfortable", icon: <Rows3Icon /> },
              { v: "compact", label: "Compact", icon: <Rows3Icon className="scale-y-75" /> },
            ]}
          />
        </div>
      </div>
      {columns.length > 0 && (
        <>
          <MenuSeparator />
          <MenuLabel>Columns</MenuLabel>
          <ul className="max-h-64 overflow-y-auto pb-1">
            {columns.map((c) => {
              const i = order.indexOf(c.key);
              return (
                <li key={c.key} className="flex items-center gap-1 rounded-lg pr-1 hover:bg-bf-surface-alt">
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 px-2.5 py-1.5 text-sm">
                    <Checkbox
                      checked={!hidden.has(c.key)}
                      onChange={() =>
                        setPrefs({ ...prefs, hidden: hidden.has(c.key) ? prefs.hidden.filter((k) => k !== c.key) : [...prefs.hidden, c.key] })
                      }
                    />
                    <span className="truncate">{c.label}</span>
                  </label>
                  <button
                    type="button"
                    aria-label={`Move ${c.label} up`}
                    disabled={i <= 0}
                    onClick={() => setPrefs({ ...prefs, order: moveColumn(order, c.key, -1) })}
                    className="grid size-6 place-items-center rounded text-bf-muted hover:bg-bf-surface hover:text-bf-ink disabled:opacity-30"
                  >
                    <ChevronUpIcon className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${c.label} down`}
                    disabled={i >= order.length - 1}
                    onClick={() => setPrefs({ ...prefs, order: moveColumn(order, c.key, 1) })}
                    className="grid size-6 place-items-center rounded text-bf-muted hover:bg-bf-surface hover:text-bf-ink disabled:opacity-30"
                  >
                    <ChevronDownIcon className="size-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
      {changed && (
        <>
          <MenuSeparator />
          <MenuItem onSelect={() => setPrefs({ ...prefs, hidden: defaultHidden, order: [], density: "compact", layout: "table" })}>
            <RotateCcwIcon /> Reset display
          </MenuItem>
        </>
      )}
    </Popover>
  );
}

/** Named sets of filters, sort, columns and layout, one click to apply. Kept in this browser for now. */
export function ViewsMenu({
  prefs,
  setPrefs,
  sp,
  replaceAll,
}: {
  prefs: ViewPrefs;
  setPrefs: (p: ViewPrefs) => void;
  sp: URLSearchParams;
  replaceAll: (qs: string) => void;
}) {
  const [name, setName] = React.useState("");
  const current = viewQuery(sp);
  const active = prefs.views.find(
    (v) => v.qs === current && v.hidden.join() === prefs.hidden.join() && v.order.join() === prefs.order.join() && v.layout === prefs.layout && v.density === prefs.density,
  );

  function save(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    const view = { id: newViewId(), name: n, qs: current, hidden: prefs.hidden, order: prefs.order, density: prefs.density, layout: prefs.layout };
    // Saving under a name that exists replaces that view.
    setPrefs({ ...prefs, views: [...prefs.views.filter((v) => v.name.toLowerCase() !== n.toLowerCase()), view] });
    setName("");
  }

  return (
    <Popover
      label="Saved views"
      width={272}
      trigger={(p) => (
        <Button {...p} size="icon-sm" variant="ghost" className="size-9"
          aria-label={active ? `Saved views, showing ${active.name}` : "Saved views"}
          title={active ? `Saved views: ${active.name}` : "Saved views"}>
          <BookmarkIcon className={cn(active && "fill-current text-bf-brand-strong")} />
        </Button>
      )}
    >
      {(close) => (
        <>
          <MenuLabel>Saved views</MenuLabel>
          {prefs.views.length === 0 && <p className="px-2.5 pb-2 text-xs text-bf-muted">None yet. Set the filters, sort and columns you want, then save them here.</p>}
          {prefs.views.map((v) => (
            <div key={v.id} className="group flex items-center gap-1">
              <button
                type="button"
                role="menuitem"
                className={cn(menuItemClass, "min-w-0 flex-1")}
                onClick={() => {
                  setPrefs({ ...prefs, hidden: v.hidden, order: v.order, density: v.density, layout: v.layout });
                  replaceAll(v.qs);
                  close();
                }}
              >
                {active?.id === v.id ? <CheckIcon className="!text-bf-brand-strong" /> : <BookmarkIcon />}
                <span className="truncate">{v.name}</span>
              </button>
              <button
                type="button"
                aria-label={`Delete view ${v.name}`}
                onClick={() => setPrefs({ ...prefs, views: prefs.views.filter((x) => x.id !== v.id) })}
                className="mr-1 grid size-7 shrink-0 place-items-center rounded-md text-bf-muted hover:bg-bf-danger-bg hover:text-bf-danger-ink"
              >
                <Trash2Icon className="size-3.5" />
              </button>
            </div>
          ))}
          <MenuSeparator />
          <form onSubmit={save} className="flex items-center gap-1.5 p-1.5">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name this view" aria-label="View name" className="h-8 text-[13px]" maxLength={40} />
            <Button type="submit" size="sm" variant="primary" disabled={!name.trim()}>
              Save
            </Button>
          </form>
        </>
      )}
    </Popover>
  );
}
