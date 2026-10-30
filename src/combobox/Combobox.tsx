"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { cn } from "../lib/cn";
import { inputClass } from "../primitives/Field";
import { matchesQuery, useOutsidePress, usePopoverPosition } from "./position";

/**
 * The only dropdown. Looks like a select, types like a search box, works with the keyboard, and posts
 * like a form field. House rule in every Buildframe app: every dropdown is searchable, and every dropdown
 * is this component. No native <select>.
 *
 * Ported from insightuno components/shared/Combobox.tsx (itself from tripsetu), plus from ecomm's copy:
 * `clearable` and a `className` for the closed control.
 *
 * The list opens on a click, a typed letter or an arrow key, not on focus: a panel that focuses its first field
 * on open must not pop a list over the form.
 *
 * Two modes:
 *   - uncontrolled, with `name` + `defaultValue`: posts through a hidden input, so it drops into a
 *     FormData form unchanged.
 *   - controlled, with `value` + `onChange`: used by filter bars, which keep their state in the URL.
 */
export interface ComboOption {
  value: string;
  label: string;
  /** Shown beside the label, and searched. */
  hint?: string;
  /** Extra words to match on that are not worth showing (a cab's model, when it is listed by registration). */
  search?: string;
  disabled?: boolean;
}

export type ComboSize = "md" | "sm" | "xs";

const SIZE: Record<ComboSize, string> = {
  md: "",
  sm: "h-9 text-[13px]",
  xs: "h-7 rounded-md px-2 text-xs",
};

export function Combobox({
  id: idProp,
  label,
  options,
  name,
  value,
  defaultValue,
  onChange,
  clearable,
  emptyLabel = "None",
  placeholder,
  required = false,
  disabled = false,
  hint,
  size = "md",
  className,
  remote,
  "aria-label": ariaLabel,
}: {
  id?: string;
  label?: string;
  options: ComboOption[];
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Adds the `emptyLabel` row that sets the value to "". Defaults to on unless `required`. */
  clearable?: boolean;
  /** The row meaning "not set" or "no filter", e.g. "All departments". */
  emptyLabel?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  hint?: React.ReactNode;
  /** md = form height; sm = filter row; xs = inside a dense table row. */
  size?: ComboSize;
  /** Extra classes for the closed control. */
  className?: string;
  /**
   * For choices too many to list: asked for from the database as the person types. `options` then only has
   * to carry what is already chosen, so its name can be shown.
   */
  remote?: (query: string) => Promise<ComboOption[]>;
  "aria-label"?: string;
}) {
  const auto = React.useId();
  const id = idProp ?? `bf-cb-${auto.replace(/:/g, "")}`;
  const canClear = clearable ?? !required;
  const controlled = value !== undefined;
  const [inner, setInner] = React.useState(defaultValue ?? "");
  const current = controlled ? value : inner;

  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);
  const boxRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);
  const pos = usePopoverPosition(open, boxRef, 180);
  const listId = `${id}-listbox`;

  const [remoteOpts, setRemoteOpts] = React.useState<ComboOption[] | null>(null);
  const [searching, setSearching] = React.useState(false);

  const selected = options.find((o) => o.value === current) ?? (remoteOpts ?? []).find((o) => o.value === current) ?? null;
  // With a clear row, "nothing chosen" reads as that row ("All departments"); otherwise the placeholder shows.
  const emptyDisplay = canClear && !placeholder ? emptyLabel : "";

  const matches = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = remote ? (remoteOpts ?? options) : options;
    const all: ComboOption[] = canClear ? [{ value: "", label: emptyLabel }, ...pool] : pool;
    // A remote list was already filtered by the database.
    if (remote) return q ? all.filter((o) => o.value !== "") : all;
    if (!q) return all;
    // The clear row is dropped while typing unless it matches, so Enter after a name never picks "None".
    return all.filter((o) => matchesQuery(o, q));
  }, [query, options, emptyLabel, canClear, remote, remoteOpts]);

  React.useEffect(() => {
    if (!open || !remote) return;
    let cancelled = false;
    const t = setTimeout(
      async () => {
        setSearching(true);
        try {
          const r = await remote(query.trim());
          if (!cancelled) setRemoteOpts(r);
        } finally {
          if (!cancelled) setSearching(false);
        }
      },
      query ? 250 : 0,
    );
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [open, query, remote]);

  function close() {
    setOpen(false);
    setQuery("");
    setActive(0);
  }
  useOutsidePress(open, [boxRef, listRef], close);

  function openList() {
    if (disabled) return;
    // Start on the chosen row, so Enter on open keeps the value.
    const at = matches.findIndex((o) => o.value === current);
    setActive(at < 0 ? 0 : at);
    setOpen(true);
  }

  function commit(option: ComboOption) {
    if (option.disabled) return;
    if (!controlled) setInner(option.value);
    onChange?.(option.value);
    close();
    inputRef.current?.blur();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    // Marked handled when it closes the list, so a SlideOver around this field does not also close.
    if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        e.stopPropagation();
      }
      close();
      return;
    }
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter")) {
      e.preventDefault();
      openList();
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(matches.length - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (matches[active]) commit(matches[active]);
    } else if (e.key === "Tab") {
      close();
    }
  }

  // Keep the active row in view while arrowing through a long list.
  React.useEffect(() => {
    if (!open) return;
    document.getElementById(`${id}-opt-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, open, id]);

  return (
    <div className="min-w-0">
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold text-bf-ink">
          {label}
          {required && <span className="ml-0.5 text-bf-danger-ink">*</span>}
        </label>
      )}

      <div ref={boxRef} className="relative">
        {name && <input type="hidden" name={name} value={current} />}
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-label={label ? undefined : (ariaLabel ?? placeholder ?? emptyLabel)}
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && matches[active] ? `${id}-opt-${active}` : undefined}
          autoComplete="off"
          required={required}
          disabled={disabled}
          className={cn(inputClass, "cursor-pointer pr-9 text-ellipsis", SIZE[size], open && "cursor-text", className)}
          placeholder={open ? "Search…" : (placeholder ?? (required ? "Select…" : undefined))}
          value={open ? query : (selected?.label ?? emptyDisplay)}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            if (!open) setOpen(true);
          }}
          onClick={() => !open && openList()}
          onKeyDown={onKeyDown}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          disabled={disabled}
          onMouseDown={(e) => {
            e.preventDefault();
            if (disabled) return;
            if (open) close();
            else {
              openList();
              inputRef.current?.focus();
            }
          }}
          className={cn("absolute inset-y-0 right-0 flex items-center justify-center text-bf-muted", size === "xs" ? "w-7" : "w-9")}
        >
          <ChevronDownIcon className={cn("size-4 transition-transform", open && "rotate-180")} />
        </button>

        {open &&
          pos &&
          createPortal(
            <ul
              ref={listRef}
              id={listId}
              role="listbox"
              style={{ position: "fixed", left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, maxHeight: pos.maxHeight }}
              className="z-[80] overflow-auto rounded-xl border border-bf-line bg-bf-surface p-1 shadow-[var(--bf-shadow-pop)]"
            >
              {matches.length === 0 && (
                <li className="px-3 py-2 text-sm text-bf-muted">{remote && searching ? "Searching…" : `Nothing matches "${query}".`}</li>
              )}
              {matches.map((o, i) => {
                const isSelected = o.value === current;
                return (
                  <li
                    key={o.value || "__empty"}
                    id={`${id}-opt-${i}`}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={o.disabled || undefined}
                    onMouseDown={(e) => {
                      // mousedown, not click: blur would close the list first.
                      e.preventDefault();
                      commit(o);
                    }}
                    onMouseEnter={() => setActive(i)}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm",
                      i === active && "bg-bf-surface-alt",
                      isSelected ? "font-semibold text-bf-ink" : "text-bf-copy",
                      o.value === "" && "text-bf-muted",
                      o.disabled && "cursor-not-allowed opacity-50",
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {o.label}
                      {o.hint && <span className="ml-2 text-xs font-normal text-bf-muted">{o.hint}</span>}
                    </span>
                    {isSelected && <CheckIcon className="size-4 shrink-0 text-bf-brand-strong" />}
                  </li>
                );
              })}
            </ul>,
            document.body,
          )}
      </div>

      {hint && <p className="mt-1 text-xs text-bf-muted">{hint}</p>}
    </div>
  );
}
