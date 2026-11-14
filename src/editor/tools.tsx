"use client";

import * as React from "react";
import type { Editor } from "@tiptap/core";
import { Selection } from "@tiptap/pm/state";
import {
  CheckIcon,
  Code2Icon,
  FileCode2Icon,
  Heading2Icon,
  Heading3Icon,
  Heading4Icon,
  ImageIcon,
  ListChecksIcon,
  ListIcon,
  ListOrderedIcon,
  MinusIcon,
  PilcrowIcon,
  QuoteIcon,
  TableIcon,
} from "lucide-react";
import { cn } from "../lib/cn";
import { inputClass } from "../primitives/Field";
import { Button } from "../primitives/Button";
import { Popover } from "../overlay/Menu";
import type { HeadingLevel, SlashItem } from "./extensions";
import { DATA_IMAGE } from "./sanitize";

/* ------------------------------------------------------------------------------------------------------------
   Toolbar pieces
   ------------------------------------------------------------------------------------------------------------ */

export const toolClass =
  "inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-bf-copy outline-none transition-colors sm:size-8 " +
  "hover:bg-bf-surface-alt hover:text-bf-ink focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-bf-brand/40 " +
  "disabled:pointer-events-none disabled:opacity-40 aria-pressed:bg-bf-brand-bg aria-pressed:text-bf-brand-strong " +
  "aria-expanded:bg-bf-surface-alt aria-expanded:text-bf-ink [&_svg]:size-4";

/** A toolbar button. It never takes focus from the text, so the selection it acts on is still there. */
export const Tool = React.forwardRef<
  HTMLButtonElement,
  { icon: React.ReactNode; label: string; keys?: string; active?: boolean; className?: string } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children">
>(function Tool({ icon, label, keys, active, className, ...rest }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={keys ? `${label} (${keys})` : label}
      aria-pressed={active === undefined ? undefined : active}
      onMouseDown={(e) => e.preventDefault()}
      className={cn(toolClass, className)}
      {...rest}
    >
      {icon}
    </button>
  );
});

export const Sep = () => <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-bf-line" />;

const isMac = () => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
/** "Mod+B" as the person's keyboard writes it. */
export const keys = (combo: string) => combo.replace("Mod", isMac() ? "⌘" : "Ctrl").replace("Alt", isMac() ? "⌥" : "Alt").replace("Shift", isMac() ? "⇧" : "Shift");

/* ------------------------------------------------------------------------------------------------------------
   Text colour, highlight and size
   ------------------------------------------------------------------------------------------------------------ */

// Mid tones: readable on a light page and on a dark one, because the same html is shown on both.
export const TEXT_COLOURS: [string, string][] = [
  ["#dc2626", "Red"], ["#ea580c", "Orange"], ["#ca8a04", "Amber"], ["#16a34a", "Green"], ["#0d9488", "Teal"],
  ["#0891b2", "Cyan"], ["#2563eb", "Blue"], ["#4f46e5", "Indigo"], ["#7c3aed", "Violet"], ["#db2777", "Pink"], ["#e11d48", "Rose"],
  ["#92400e", "Brown"], ["#6b7280", "Grey"],
];
export const HIGHLIGHTS: [string, string][] = [
  ["#fef08a", "Yellow"], ["#bbf7d0", "Green"], ["#bfdbfe", "Blue"], ["#fbcfe8", "Pink"], ["#fed7aa", "Orange"], ["#ddd6fe", "Violet"],
];
export const SIZES: [string | null, string, string][] = [
  ["0.875em", "Small", "text-xs"], [null, "Normal", "text-sm"], ["1.25em", "Large", "text-base"], ["1.5em", "Extra large", "text-lg"],
];

function Swatch({ colour, name, active, onPick }: { colour: string | null; name: string; active: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      aria-label={name}
      title={name}
      aria-pressed={active}
      onClick={onPick}
      className={cn(
        "grid size-7 place-items-center rounded-full border border-black/10 outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-bf-brand/50",
        active && "ring-2 ring-bf-brand ring-offset-2 ring-offset-bf-surface",
        colour === null && "bg-bf-surface text-bf-muted",
      )}
      style={colour ? { backgroundColor: colour } : undefined}
    >
      {colour === null ? <span className="block h-4 w-px rotate-45 bg-bf-danger" /> : active ? <CheckIcon className="size-3.5 text-black/70" /> : null}
    </button>
  );
}

const panelLabel = "mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-bf-muted";

export function TextStylePanel({ editor, colour, highlight, size, close }: { editor: Editor; colour: string | null; highlight: string | null; size: string | null; close: () => void }) {
  const run = (fn: () => void) => {
    close();
    fn();
  };
  return (
    <div className="space-y-3 p-2">
      <div>
        <p className={panelLabel}>Size</p>
        <div className="grid grid-cols-4 gap-1">
          {SIZES.map(([value, name, cls]) => (
            <button
              key={name}
              type="button"
              aria-label={name}
              title={name}
              aria-pressed={size === value}
              onClick={() => run(() => (value ? editor.chain().focus().setFontSize(value).run() : editor.chain().focus().unsetFontSize().run()))}
              className={cn(
                "flex h-9 items-end justify-center rounded-lg border border-bf-line pb-1.5 font-semibold text-bf-ink outline-none hover:bg-bf-surface-alt focus-visible:ring-2 focus-visible:ring-bf-brand/40",
                "aria-pressed:border-bf-brand aria-pressed:bg-bf-brand-bg aria-pressed:text-bf-brand-strong",
                cls,
              )}
            >
              A
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className={panelLabel}>Text colour</p>
        <div className="flex flex-wrap gap-1.5">
          <Swatch colour={null} name="Default colour" active={!colour} onPick={() => run(() => editor.chain().focus().unsetColor().run())} />
          {TEXT_COLOURS.map(([c, name]) => (
            <Swatch key={c} colour={c} name={name} active={colour === c} onPick={() => run(() => editor.chain().focus().setColor(c).run())} />
          ))}
        </div>
      </div>
      <div>
        <p className={panelLabel}>Highlight</p>
        <div className="flex flex-wrap gap-1.5">
          <Swatch colour={null} name="No highlight" active={!highlight} onPick={() => run(() => editor.chain().focus().unsetHighlight().run())} />
          {HIGHLIGHTS.map(([c, name]) => (
            <Swatch key={c} colour={c} name={`${name} highlight`} active={highlight === c} onPick={() => run(() => editor.chain().focus().setHighlight({ color: c }).run())} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------------------
   Link
   ------------------------------------------------------------------------------------------------------------ */

/** "example.com" becomes "https://example.com"; an address on this site, an anchor, mailto: and tel: are kept. */
export function normaliseHref(raw: string): string {
  const v = raw.trim();
  if (!v) return "";
  if (/^(https?:\/\/|mailto:|tel:|\/|#)/i.test(v)) return v;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return `mailto:${v}`;
  return `https://${v}`;
}

export function LinkPanel({ editor, close }: { editor: Editor; close: () => void }) {
  const current = editor.getAttributes("link") as { href?: string; target?: string | null };
  const [href, setHref] = React.useState(current.href ?? "");
  const [newTab, setNewTab] = React.useState(current.target === "_blank");
  const linked = !!current.href;

  function apply() {
    const url = normaliseHref(href);
    close();
    if (!url) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    const attrs = { href: url, target: newTab ? "_blank" : null, rel: newTab ? "noopener noreferrer" : null };
    if (editor.state.selection.empty && !linked) {
      // Nothing selected: the address itself becomes the linked text.
      editor.chain().focus().insertContent({ type: "text", text: url, marks: [{ type: "link", attrs }] }).run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink(attrs).run();
    }
  }

  return (
    <div
      className="space-y-2.5 p-2"
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          apply();
        }
      }}
    >
      <label className="block">
        <span className={cn(panelLabel, "block")}>Link address</span>
        <input value={href} onChange={(e) => setHref(e.target.value)} placeholder="https://example.com" inputMode="url" className={cn(inputClass, "h-9 text-[13px]")} />
      </label>
      <label className="flex cursor-pointer items-center gap-2 text-[13px] text-bf-copy">
        <input type="checkbox" checked={newTab} onChange={(e) => setNewTab(e.target.checked)} className="size-4 accent-[var(--bf-brand)]" />
        Open in a new tab
      </label>
      <div className="flex justify-end gap-2">
        {linked && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              close();
              editor.chain().focus().extendMarkRange("link").unsetLink().run();
            }}
          >
            Remove link
          </Button>
        )}
        <Button size="sm" variant="primary" onClick={apply}>
          {linked ? "Save link" : "Add link"}
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------------------
   Image
   ------------------------------------------------------------------------------------------------------------ */

/** Adds the picture and puts the cursor after it, so the next thing typed or pasted does not replace it. */
export function insertImage(editor: Editor, attrs: { src: string; alt?: string }) {
  editor
    .chain()
    .focus()
    .setImage(attrs)
    .command(({ tr, state }) => {
      const after = tr.selection.to;
      // At the end of the page there is nothing after the picture yet: make the paragraph the cursor goes into.
      if (!tr.doc.resolve(after).nodeAfter?.isTextblock) tr.insert(after, state.schema.nodes.paragraph.create());
      tr.setSelection(Selection.near(tr.doc.resolve(after + 1)));
      return true;
    })
    .run();
}

export function ImagePanel({
  editor,
  canUpload,
  canEmbed,
  onPick,
  close,
}: {
  editor: Editor;
  canUpload: boolean;
  /** Images may be carried inside the page as base64. */
  canEmbed: boolean;
  onPick: (how: "upload" | "embed") => void;
  close: () => void;
}) {
  const [src, setSrc] = React.useState("");
  const [alt, setAlt] = React.useState("");
  const ok = /^(https?:\/\/|\/)\S+$/i.test(src.trim()) || (canEmbed && DATA_IMAGE.test(src.trim()));

  function insert() {
    if (!ok) return;
    close();
    insertImage(editor, { src: src.trim(), alt: alt.trim() });
  }

  return (
    <div
      className="space-y-2.5 p-2"
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          insert();
        }
      }}
    >
      {canUpload && (
        <Button
          size="sm"
          variant="secondary"
          className="w-full"
          onClick={() => {
            close();
            onPick("upload");
          }}
        >
          <ImageIcon /> Upload from this device
        </Button>
      )}
      {canEmbed && (
        <Button
          size="sm"
          variant="secondary"
          className="w-full"
          title="The image travels inside the page as base64, with no separate file"
          onClick={() => {
            close();
            onPick("embed");
          }}
        >
          <FileCode2Icon /> {canUpload ? "Embed in the page (base64)" : "Choose from this device (base64)"}
        </Button>
      )}
      {(canUpload || canEmbed) && <p className="text-center text-[11px] text-bf-muted">or use an image that is already online</p>}
      <label className="block">
        <span className={cn(panelLabel, "block")}>{canEmbed ? "Image address or base64" : "Image address"}</span>
        <input value={src} onChange={(e) => setSrc(e.target.value)} placeholder={canEmbed ? "https://… or data:image/png;base64,…" : "https://example.com/photo.jpg"} inputMode="url" className={cn(inputClass, "h-9 text-[13px]")} />
      </label>
      <label className="block">
        <span className={cn(panelLabel, "block")}>Description (for screen readers)</span>
        <input value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="What the image shows" className={cn(inputClass, "h-9 text-[13px]")} />
      </label>
      <div className="flex justify-end">
        <Button size="sm" variant="primary" disabled={!ok} onClick={insert}>
          Insert image
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------------------
   Table
   ------------------------------------------------------------------------------------------------------------ */

const GRID_ROWS = 6;
const GRID_COLS = 6;

/** Point at a cell to choose the size: the grid Word and TinyMCE made familiar. */
export function TableGrid({ onPick }: { onPick: (rows: number, cols: number) => void }) {
  const [at, setAt] = React.useState<[number, number]>([0, 0]);
  return (
    <div className="p-2">
      <p className={panelLabel}>{at[0] ? `${at[1]} columns, ${at[0]} rows` : "Table size"}</p>
      <div className="grid w-max gap-1" style={{ gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)` }} onMouseLeave={() => setAt([0, 0])}>
        {Array.from({ length: GRID_ROWS * GRID_COLS }, (_, i) => {
          const r = Math.floor(i / GRID_COLS) + 1;
          const c = (i % GRID_COLS) + 1;
          const on = r <= at[0] && c <= at[1];
          return (
            <button
              key={i}
              type="button"
              aria-label={`${c} columns, ${r} rows`}
              onMouseEnter={() => setAt([r, c])}
              onFocus={() => setAt([r, c])}
              onClick={() => onPick(r, c)}
              className={cn("size-6 rounded border outline-none transition-colors", on ? "border-bf-brand bg-bf-brand-bg" : "border-bf-line-strong bg-bf-surface")}
            />
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-bf-muted">The first row is a heading row.</p>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------------------
   Slash menu contents ("/" on a line) and the panel that draws them
   ------------------------------------------------------------------------------------------------------------ */

const HEADING_NAMES = ["Large heading", "Medium heading", "Small heading"];
/** The names shown for the heading levels on offer: the first is "Large heading" whatever its html level. */
export const headingName = (levels: HeadingLevel[], level: HeadingLevel) => HEADING_NAMES[levels.indexOf(level)] ?? `Heading ${level}`;

const SLASH_ICONS: Record<string, React.ReactNode> = {
  p: <PilcrowIcon />,
  h0: <Heading2Icon />,
  h1: <Heading3Icon />,
  h2: <Heading4Icon />,
  bullet: <ListIcon />,
  ordered: <ListOrderedIcon />,
  task: <ListChecksIcon />,
  quote: <QuoteIcon />,
  table: <TableIcon />,
  image: <ImageIcon />,
  rule: <MinusIcon />,
  code: <Code2Icon />,
};

export function slashItems(levels: HeadingLevel[], openImage: () => void): SlashItem[] {
  return [
    { id: "p", title: "Text", hint: "Plain paragraph", keywords: "paragraph normal", run: (e) => e.chain().focus().setParagraph().run() },
    ...levels.slice(0, 3).map(
      (level, i): SlashItem => ({
        id: `h${i}`,
        title: headingName(levels, level),
        hint: i === 0 ? "Section title" : i === 1 ? "Title inside a section" : "Minor title",
        keywords: `heading title h${level}`,
        run: (e) => e.chain().focus().setHeading({ level }).run(),
      }),
    ),
    { id: "bullet", title: "Bulleted list", hint: "A simple list", keywords: "unordered ul points", run: (e) => e.chain().focus().toggleBulletList().run() },
    { id: "ordered", title: "Numbered list", hint: "Steps in order", keywords: "ordered ol steps", run: (e) => e.chain().focus().toggleOrderedList().run() },
    { id: "task", title: "Checklist", hint: "Items with a tick box", keywords: "todo task check", run: (e) => e.chain().focus().toggleTaskList().run() },
    { id: "quote", title: "Quote", hint: "Set a passage apart", keywords: "blockquote citation", run: (e) => e.chain().focus().toggleBlockquote().run() },
    {
      id: "table",
      title: "Table",
      hint: "Three columns, three rows",
      keywords: "grid rows columns",
      run: (e) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    },
    { id: "image", title: "Image", hint: "Upload or link a picture", keywords: "photo picture upload", run: openImage },
    { id: "rule", title: "Divider", hint: "A line across the page", keywords: "horizontal rule hr separator line", run: (e) => e.chain().focus().setHorizontalRule().run() },
    { id: "code", title: "Code block", hint: "Text shown exactly as typed", keywords: "pre snippet", run: (e) => e.chain().focus().toggleCodeBlock().run() },
  ];
}

export const slashIcon = (id: string) => SLASH_ICONS[id] ?? <PilcrowIcon />;

/* ------------------------------------------------------------------------------------------------------------
   A toolbar button that opens a panel
   ------------------------------------------------------------------------------------------------------------ */

export function ToolPopover({
  icon,
  label,
  keys: combo,
  active,
  disabled,
  width = 248,
  open,
  onOpenChange,
  role = "dialog",
  children,
}: {
  icon: React.ReactNode;
  label: string;
  keys?: string;
  active?: boolean;
  disabled?: boolean;
  width?: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  role?: "menu" | "dialog";
  children: (close: () => void) => React.ReactNode;
}) {
  return (
    <Popover
      align="start"
      width={width}
      label={label}
      role={role}
      open={open}
      onOpenChange={onOpenChange}
      trigger={(p) => <Tool icon={icon} label={label} keys={combo} active={active} disabled={disabled} {...p} />}
    >
      {children}
    </Popover>
  );
}
