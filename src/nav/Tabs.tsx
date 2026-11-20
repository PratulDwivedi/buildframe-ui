"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "../lib/cn";

/**
 * A row of tabs, three ways (merged from the copies in karaar and genfashion-app, insightuno ViewTabs,
 * buildframe-account DocTabs, tripsetu FormTabs and buildframe_ecomm ui/tabs):
 *
 *   1. Controlled: `value` and `onChange`. The caller shows the panel (or use TabPanels, which does both).
 *   2. URL parameter: `param="tab"`. The chosen tab lives in the query string, the first tab is the default and
 *      is left out of the URL, every other parameter is kept. It reads the query string, so on a statically
 *      rendered page wrap it in <Suspense>.
 *   3. Links: give every item an `href`. It is then a <nav> of links with the current one marked, and takes no
 *      handler, so a server component can render it.
 *
 * `label` names the row for screen readers and is required. Ids come from useId, so two rows can share a page.
 * Arrow keys, Home and End move between tabs; the row scrolls sideways when it does not fit.
 */
export type TabItem = { key: string; label: React.ReactNode; count?: number; href?: string };

const ROW = "flex gap-1 overflow-x-auto border-b border-bf-line [scrollbar-width:none]";
const tabClass = (on: boolean) =>
  cn(
    "-mb-px inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-2.5 py-2 text-[13px] font-medium outline-none transition-colors",
    "focus-visible:rounded-t-md focus-visible:bg-bf-surface-alt",
    on ? "border-bf-brand text-bf-brand-strong" : "border-transparent text-bf-muted hover:text-bf-ink",
  );

function Count({ n, on }: { n: number; on: boolean }) {
  return (
    <span className={cn("rounded-full px-1.5 text-[11px] font-semibold tabular-nums", on ? "bg-bf-brand-bg text-bf-brand-strong" : "bg-bf-neutral-bg text-bf-neutral-ink")}>
      {n}
    </span>
  );
}

type RowProps = { label: string; items: TabItem[]; className?: string; id?: string };

export function Tabs(props: RowProps & { value?: string; onChange?: (key: string) => void; param?: string }) {
  const { items, value, onChange, param } = props;
  if (items.length > 0 && items.every((i) => i.href)) return <LinkTabs {...props} value={value} />;
  if (param && !onChange) return <ParamTabs {...props} param={param} />;
  return <TabRow {...props} value={value ?? items[0]?.key} onChange={onChange ?? (() => {})} />;
}

function LinkTabs({ label, items, value, className }: RowProps & { value?: string }) {
  return (
    <nav aria-label={label} className={cn(ROW, className)}>
      {items.map((it) => {
        const on = it.key === value;
        return (
          <Link key={it.key} href={it.href!} aria-current={on ? "page" : undefined} className={tabClass(on)}>
            {it.label}
            {it.count !== undefined && <Count n={it.count} on={on} />}
          </Link>
        );
      })}
    </nav>
  );
}

function ParamTabs({ param, items, ...rest }: RowProps & { param: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const current = useSearchParams();
  const raw = current?.get(param);
  const value = items.some((i) => i.key === raw) ? raw! : items[0]?.key;
  const set = (key: string) => {
    const next = new URLSearchParams(current?.toString() ?? "");
    if (key === items[0]?.key) next.delete(param);
    else next.set(param, key);
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };
  return <TabRow {...rest} items={items} value={value} onChange={set} />;
}

function TabRow({ label, items, value, onChange, className, id }: RowProps & { value: string | undefined; onChange: (key: string) => void }) {
  const auto = React.useId();
  const base = id ?? auto;
  const refs = React.useRef<Record<string, HTMLButtonElement | null>>({});

  const go = (key: string) => {
    onChange(key);
    refs.current[key]?.focus();
  };
  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    const last = items.length - 1;
    const to =
      e.key === "ArrowRight" ? (index === last ? 0 : index + 1)
      : e.key === "ArrowLeft" ? (index === 0 ? last : index - 1)
      : e.key === "Home" ? 0
      : e.key === "End" ? last
      : -1;
    if (to < 0) return;
    e.preventDefault();
    go(items[to].key);
  };

  return (
    <div role="tablist" aria-label={label} className={cn(ROW, className)}>
      {items.map((it, index) => {
        const on = it.key === value;
        return (
          <button
            key={it.key}
            ref={(el) => {
              refs.current[it.key] = el;
            }}
            type="button"
            role="tab"
            id={tabId(base, it.key)}
            aria-selected={on}
            aria-controls={panelId(base, it.key)}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(it.key)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={tabClass(on)}
          >
            {it.label}
            {it.count !== undefined && <Count n={it.count} on={on} />}
          </button>
        );
      })}
    </div>
  );
}

const tabId = (base: string, key: string) => `${base}-tab-${key}`;
const panelId = (base: string, key: string) => `${base}-panel-${key}`;

/** The row and the chosen tab's content together, state kept here. Only the chosen panel is rendered. */
export function TabPanels({
  label,
  tabs,
  defaultKey,
  className,
  panelClassName,
}: {
  label: string;
  tabs: (Omit<TabItem, "href"> & { content: React.ReactNode })[];
  defaultKey?: string;
  className?: string;
  panelClassName?: string;
}) {
  const base = React.useId();
  const [value, setValue] = React.useState(defaultKey ?? tabs[0]?.key);
  const active = tabs.find((t) => t.key === value) ?? tabs[0];
  return (
    <div className={className}>
      <TabRow id={base} label={label} items={tabs} value={active?.key} onChange={setValue} />
      {active && (
        <div role="tabpanel" id={panelId(base, active.key)} aria-labelledby={tabId(base, active.key)} tabIndex={0} className={cn("outline-none", panelClassName)}>
          {active.content}
        </div>
      )}
    </div>
  );
}
