"use client";

import * as React from "react";
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Button, IconButton } from "./Button";
import { Field, Input, Textarea } from "./Field";

export type RowColumn = {
  key: string;
  label: string;
  placeholder?: string;
  maxLength?: number;
  /** A text box of a few lines, on a line of its own. */
  multiline?: boolean;
};

/**
 * An editable list of small text rows (a place and its distance, a heading and its text): add, change, move up and down, remove. It only edits the
 * list it is given; the caller checks and saves it. `errors` is keyed `<row index>:<column key>`. `noun` names a row in the button labels
 * ("Remove place 2"). Single-line columns sit side by side and stack on a phone; a multiline column takes the full width.
 */
export function RowsEditor({
  columns,
  rows,
  onChange,
  max,
  noun = "row",
  addLabel = "Add",
  emptyText,
  errors = {},
  disabled = false,
}: {
  columns: RowColumn[];
  rows: Record<string, string>[];
  onChange: (rows: Record<string, string>[]) => void;
  max: number;
  noun?: string;
  addLabel?: string;
  emptyText?: string;
  errors?: Record<string, string>;
  disabled?: boolean;
}) {
  const patch = (i: number, key: string, value: string) => onChange(rows.map((r, k) => (k === i ? { ...r, [key]: value } : r)));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= rows.length) return;
    const next = rows.slice();
    [next[i], next[j]] = [next[j]!, next[i]!];
    onChange(next);
  };
  const add = () => onChange([...rows, Object.fromEntries(columns.map((c) => [c.key, ""]))]);

  return (
    <div className="space-y-3">
      {rows.length === 0 && emptyText ? <p className="text-sm text-bf-muted">{emptyText}</p> : null}
      {rows.map((row, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-lg border border-bf-line p-3 sm:flex-row sm:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap">
            {columns.map((c) => {
              const error = errors[`${i}:${c.key}`];
              const props = {
                "aria-label": `${c.label}, row ${i + 1}`,
                "aria-invalid": error ? true : undefined,
                value: row[c.key] ?? "",
                placeholder: c.placeholder,
                maxLength: c.maxLength,
                disabled,
                onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => patch(i, c.key, e.target.value),
              };
              return (
                <div key={c.key} className={c.multiline ? "w-full" : "min-w-0 sm:min-w-40 sm:flex-1"}>
                  <Field label={c.label} error={error}>
                    {c.multiline ? <Textarea rows={3} {...props} /> : <Input {...props} />}
                  </Field>
                </div>
              );
            })}
          </div>
          {disabled ? null : (
            <div className="flex shrink-0 items-center justify-end gap-1 sm:pt-[1.625rem]">
              <IconButton type="button" icon={<ArrowUpIcon />} label={`Move ${noun} ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)} />
              <IconButton type="button" icon={<ArrowDownIcon />} label={`Move ${noun} ${i + 1} down`} disabled={i === rows.length - 1} onClick={() => move(i, 1)} />
              <IconButton type="button" icon={<Trash2Icon />} label={`Remove ${noun} ${i + 1}`} onClick={() => onChange(rows.filter((_, k) => k !== i))} />
            </div>
          )}
        </div>
      ))}
      {disabled ? null : (
        <Button type="button" variant="secondary" size="sm" disabled={rows.length >= max} onClick={add}>
          <PlusIcon aria-hidden className="mr-1.5 size-4" />
          {addLabel}
        </Button>
      )}
    </div>
  );
}
