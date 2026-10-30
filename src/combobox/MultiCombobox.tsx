"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { cn } from "../lib/cn";
import { inputClass } from "../primitives/Field";
import type { ComboOption, ComboSize } from "./Combobox";
import { matchesQuery, useOutsidePress, usePopoverPosition } from "./position";

const SIZE: Record<ComboSize, string> = { md: "", sm: "h-9 text-[13px]", xs: "h-7 rounded-md px-2 text-xs" };

/**
 * The pick-many twin of Combobox (a status filter that takes "Paid" and "Shipped"). Same look and keys; the
 * list stays open while ticking, and Escape, Tab or a click away closes it. Posts one hidden input per value.
 */
export function MultiCombobox({
  id: idProp,
  label,
  options,
  name,
  value,
  onChange,
  placeholder = "Any",
  disabled,
  size = "md",
  className,
  "aria-label": ariaLabel,
}: {
  id?: string;
  label?: string;
  options: ComboOption[];
  name?: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  size?: ComboSize;
  className?: string;
  "aria-label"?: string;
}) {
  const auto = React.useId();
  const id = idProp ?? `bf-mcb-${auto.replace(/:/g, "")}`;
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);
  const boxRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const pos = usePopoverPosition(open, boxRef, 200);
  const set = new Set(value);

  const q = query.trim().toLowerCase();
  const matches = q ? options.filter((o) => matchesQuery(o, q)) : options;
  const picked = options.filter((o) => set.has(o.value));
  const summary = picked.length === 0 ? "" : picked.length <= 2 ? picked.map((o) => o.label).join(", ") : `${picked.length} selected`;

  function close() {
    setOpen(false);
    setQuery("");
    setActive(0);
  }
  useOutsidePress(open, [boxRef, listRef], close);

  function toggle(o: ComboOption) {
    if (o.disabled) return;
    onChange(set.has(o.value) ? value.filter((v) => v !== o.value) : [...value, o.value]);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        e.stopPropagation();
      }
      close();
      return;
    }
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" || (e.key === " " && !query)) {
      e.preventDefault();
      if (matches[active]) toggle(matches[active]);
    } else if (e.key === "Tab") {
      close();
    }
  }

  return (
    <div className="min-w-0">
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold text-bf-ink">
          {label}
        </label>
      )}
      <div ref={boxRef} className="relative">
        {name && value.map((v) => <input key={v} type="hidden" name={name} value={v} />)}
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-label={label ? undefined : (ariaLabel ?? placeholder)}
          aria-expanded={open}
          aria-controls={`${id}-listbox`}
          aria-autocomplete="list"
          aria-activedescendant={open && matches[active] ? `${id}-opt-${active}` : undefined}
          autoComplete="off"
          disabled={disabled}
          className={cn(inputClass, "cursor-pointer pr-9 text-ellipsis", SIZE[size], picked.length > 0 && !open && "font-medium", className)}
          placeholder={open ? "Search…" : placeholder}
          value={open ? query : summary}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            if (!open) setOpen(true);
          }}
          onClick={() => !disabled && setOpen(true)}
          onKeyDown={onKeyDown}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          disabled={disabled}
          onMouseDown={(e) => {
            e.preventDefault();
            if (open) close();
            else {
              setOpen(true);
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
              id={`${id}-listbox`}
              role="listbox"
              aria-multiselectable
              style={{ position: "fixed", left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, maxHeight: pos.maxHeight }}
              className="z-[80] overflow-auto rounded-xl border border-bf-line bg-bf-surface p-1 shadow-[var(--bf-shadow-pop)]"
            >
              {value.length > 0 && !q && (
                <li
                  role="presentation"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange([]);
                  }}
                  className="cursor-pointer rounded-lg px-2.5 py-2 text-sm text-bf-muted hover:bg-bf-surface-alt"
                >
                  Clear selection
                </li>
              )}
              {matches.length === 0 && <li className="px-3 py-2 text-sm text-bf-muted">{`Nothing matches "${query}".`}</li>}
              {matches.map((o, i) => {
                const on = set.has(o.value);
                return (
                  <li
                    key={o.value}
                    id={`${id}-opt-${i}`}
                    role="option"
                    aria-selected={on}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      toggle(o);
                    }}
                    onMouseEnter={() => setActive(i)}
                    className={cn("flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-bf-copy", i === active && "bg-bf-surface-alt")}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "grid size-4 shrink-0 place-items-center rounded border",
                        on ? "border-bf-brand bg-bf-brand text-bf-on-brand" : "border-bf-line-strong bg-bf-surface",
                      )}
                    >
                      {on && <CheckIcon className="size-3" strokeWidth={3} />}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      {o.label}
                      {o.hint && <span className="ml-2 text-xs text-bf-muted">{o.hint}</span>}
                    </span>
                  </li>
                );
              })}
            </ul>,
            document.body,
          )}
      </div>
    </div>
  );
}
