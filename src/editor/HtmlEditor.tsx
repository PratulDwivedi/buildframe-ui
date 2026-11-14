"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import type { Editor } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import {
  AlignCenterIcon,
  AlignJustifyIcon,
  AlignLeftIcon,
  AlignRightIcon,
  BoldIcon,
  CaseSensitiveIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CodeIcon,
  CodeXmlIcon,
  ExternalLinkIcon,
  ImageIcon,
  IndentDecreaseIcon,
  IndentIncreaseIcon,
  ItalicIcon,
  KeyboardIcon,
  LinkIcon,
  ListChecksIcon,
  ListIcon,
  ListOrderedIcon,
  Loader2Icon,
  Maximize2Icon,
  Minimize2Icon,
  MinusIcon,
  PaletteIcon,
  PencilIcon,
  QuoteIcon,
  Redo2Icon,
  RemoveFormattingIcon,
  SearchIcon,
  SmartphoneIcon,
  StrikethroughIcon,
  SubscriptIcon,
  SuperscriptIcon,
  TableIcon,
  Trash2Icon,
  UnderlineIcon,
  Undo2Icon,
  UnlinkIcon,
  XIcon,
} from "lucide-react";
import { cn } from "../lib/cn";
import { inputClass } from "../primitives/Field";
import { Combobox } from "../combobox/Combobox";
import { MenuItem, MenuLabel, MenuSeparator } from "../overlay/Menu";
import { createSlashStore, editorExtensions, findState, replaceFound, setFind, stepFind, type HeadingLevel, type SlashStore } from "./extensions";
import { formatHtml, textStats } from "./format";
import { DATA_IMAGE, sanitizeHtml } from "./sanitize";
import { ImagePanel, insertImage, LinkPanel, Sep, TableGrid, TextStylePanel, Tool, ToolPopover, headingName, keys, slashIcon, slashItems, toolClass } from "./tools";

/**
 * The rich text editor: what you see is the html that is stored. A toolbar for people who like buttons, "/" on a
 * line and Markdown-style shortcuts ("## ", "- ", "> ") for people who like the keyboard, a bar over selected text,
 * tables, images (uploaded through `onUploadImage`), find and replace, a phone-width check, full screen, and an
 * HTML view for hand edits. Built on Tiptap (ProseMirror), so the html always matches a fixed set of elements;
 * the HTML view is passed through `sanitizeHtml` before it is used.
 *
 * The editor never uploads or saves anything itself: the app passes `onUploadImage` and keeps `value`.
 * Load "@buildframe/ui/rich-text.css" once in the app; show the stored html inside `class="bf-rich-text"`.
 */
export type HtmlEditorProps = {
  /** The html. "" when empty. */
  value: string;
  onChange: (html: string) => void;
  /** Stores the file and answers with its public https address. */
  onUploadImage?: (file: File) => Promise<string>;
  /**
   * Also allow images carried inside the html as base64 (`data:image/...`): chosen from the device, pasted, dropped
   * or typed as an address. Turn on only where the server that stores the html accepts `data:` addresses and has
   * room for them: a 100 KB picture adds about 135,000 characters. With `onUploadImage` too, pasted and dropped
   * images are uploaded and embedding is a choice in the image panel.
   */
  embedImages?: boolean;
  /** The largest picture that may be embedded, in bytes, after it has been shrunk. */
  maxEmbedBytes?: number;
  placeholder?: string;
  /** Read only: the text can be selected and copied, not changed. */
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
  /** Posts the html in a FormData form. */
  name?: string;
  /** Height of the writing area in px before it grows. */
  minHeight?: number;
  /** Past this the writing area scrolls and the toolbar stays in view. Any CSS length. */
  maxHeight?: string;
  /** The heading levels on offer, largest first. A page whose title is the h1 offers 2, 3 and 4. */
  headingLevels?: HeadingLevel[];
  className?: string;
};

const DEFAULT_LEVELS: HeadingLevel[] = [2, 3, 4];
const BUBBLES = ["bfTextBubble", "bfLinkBubble", "bfImageBubble"];

const NODE_NAMES: Record<string, string> = {
  paragraph: "Paragraph",
  blockquote: "Quote",
  bulletList: "Bulleted list",
  orderedList: "Numbered list",
  taskList: "Checklist",
  listItem: "Item",
  taskItem: "Item",
  codeBlock: "Code block",
  table: "Table",
  tableRow: "Row",
  tableCell: "Cell",
  tableHeader: "Heading cell",
  image: "Image",
  horizontalRule: "Divider",
};

function toolbarState(editor: Editor, levels: HeadingLevel[]) {
  const { selection } = editor.state;
  const level = levels.find((l) => editor.isActive("heading", { level: l }));
  const block = level ? `h${level}` : editor.isActive("codeBlock") ? "code" : editor.isActive("paragraph") ? "p" : "";
  const path: string[] = [];
  for (let d = 1; d <= selection.$from.depth; d++) {
    const node = selection.$from.node(d);
    path.push(node.type.name === "heading" ? headingName(levels, node.attrs.level) : (NODE_NAMES[node.type.name] ?? node.type.name));
  }
  if (selection instanceof NodeSelection) path.push(NODE_NAMES[selection.node.type.name] ?? selection.node.type.name);
  const style = editor.getAttributes("textStyle") as { color?: string | null; fontSize?: string | null };
  const find = findState(editor);
  return {
    block,
    bold: editor.isActive("bold"),
    italic: editor.isActive("italic"),
    underline: editor.isActive("underline"),
    strike: editor.isActive("strike"),
    code: editor.isActive("code"),
    sub: editor.isActive("subscript"),
    sup: editor.isActive("superscript"),
    quote: editor.isActive("blockquote"),
    bullet: editor.isActive("bulletList"),
    ordered: editor.isActive("orderedList"),
    task: editor.isActive("taskList"),
    link: editor.isActive("link"),
    href: (editor.getAttributes("link").href as string | undefined) ?? "",
    table: editor.isActive("table"),
    image: editor.isActive("image"),
    imageAttrs: editor.getAttributes("image") as { width?: string | null; align?: string | null; alt?: string | null },
    align: (["center", "right", "justify"] as const).find((a) => editor.isActive({ textAlign: a })) ?? "left",
    colour: hex(style.color),
    size: style.fontSize ?? null,
    highlight: hex(editor.getAttributes("highlight").color as string | undefined),
    styled: !!style.color || !!style.fontSize || editor.isActive("highlight"),
    canUndo: editor.can().undo(),
    canRedo: editor.can().redo(),
    canSink: editor.can().sinkListItem("listItem") || editor.can().sinkListItem("taskItem"),
    canLift: editor.can().liftListItem("listItem") || editor.can().liftListItem("taskItem"),
    canMerge: editor.can().mergeCells(),
    canSplit: editor.can().splitCell(),
    path: path.join(" › "),
    stats: textStats(editor.getText()),
    findCount: find.matches.length,
    findIndex: find.index,
  };
}

/**
 * The html to store. The editor keeps an empty paragraph after a closing list, table or image so there is
 * somewhere to click; that paragraph is not content, and an empty editor is "".
 */
function htmlOf(editor: Editor): string {
  return editor.isEmpty ? "" : editor.getHTML().replace(/(<p><\/p>)+$/, "");
}

/** "rgb(220, 38, 38)" as "#dc2626": a colour read back from stored html, compared with the palette. */
function hex(colour: string | null | undefined): string | null {
  if (!colour) return null;
  const m = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(colour);
  return m ? `#${[m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, "0")).join("")}` : colour.toLowerCase();
}

/** A set of related toolbar buttons with a hairline before it. Sets wrap whole, never mid-set. */
function Group({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("relative ml-1 flex shrink-0 items-center gap-0.5 pl-[5px] before:absolute before:inset-y-1.5 before:left-0 before:w-px before:bg-bf-line", className)}>
      {children}
    </div>
  );
}

const EMBEDDABLE = ["image/png", "image/jpeg", "image/webp", "image/gif"];

/**
 * The picture as a base64 address. One over the limit is first redrawn at most 1280px on its long side as WebP;
 * if it is still over, it is refused with a message that can be shown.
 */
async function toDataUrl(file: File, maxBytes: number): Promise<string> {
  if (!EMBEDDABLE.includes(file.type)) throw new Error("Use a PNG, JPEG, WebP or GIF image.");
  let blob: Blob = file;
  if (blob.size > maxBytes && file.type !== "image/gif") {
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const small = await new Promise<Blob | null>((done) => canvas.toBlob(done, "image/webp", 0.8));
      if (small && small.size < blob.size) blob = small;
    } catch {
      // keep the file as it is; the size check below decides
    }
  }
  if (blob.size > maxBytes) {
    throw new Error(`The image is too large to embed (${Math.round(blob.size / 1024)} KB, the limit is ${Math.round(maxBytes / 1024)} KB). Use a smaller one, or upload it instead.`);
  }
  return new Promise<string>((done, fail) => {
    const reader = new FileReader();
    reader.onload = () => done(String(reader.result));
    reader.onerror = () => fail(new Error("The image could not be read."));
    reader.readAsDataURL(blob);
  });
}

/** A base64 address as a file, so it can be uploaded like any other picture. */
function dataUrlToFile(src: string): File {
  const [head, body] = src.split(",");
  const type = /^data:([^;]+)/.exec(head)?.[1] ?? "image/png";
  const bytes = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
  return new File([bytes], `pasted.${type.split("/")[1].replace("jpeg", "jpg")}`, { type });
}

/** A layer on <body> for the floating bars, so a scrolling writing area never clips them. */
function useLayer() {
  const [layer, setLayer] = React.useState<HTMLElement | null>(null);
  React.useEffect(() => {
    const el = document.createElement("div");
    el.className = "bf-editor-layer";
    document.body.appendChild(el);
    setLayer(el);
    return () => el.remove();
  }, []);
  return layer;
}

export function HtmlEditor({
  value,
  onChange,
  onUploadImage,
  embedImages = false,
  maxEmbedBytes = 300 * 1024,
  placeholder = "Write here, or type / for headings, lists, tables and images",
  disabled = false,
  id,
  "aria-label": ariaLabel = "Content",
  name,
  minHeight = 320,
  maxHeight = "min(70vh, 720px)",
  headingLevels = DEFAULT_LEVELS,
  className,
}: HtmlEditorProps) {
  const [mode, setMode] = React.useState<"write" | "html">("write");
  const [source, setSource] = React.useState("");
  const [full, setFull] = React.useState(false);
  const [phone, setPhone] = React.useState(false);
  const [finding, setFinding] = React.useState(false);
  const [linkOpen, setLinkOpen] = React.useState(false);
  const [imageOpen, setImageOpen] = React.useState(false);
  const [uploads, setUploads] = React.useState(0);
  const [problem, setProblem] = React.useState<string | null>(null);
  const fileInput = React.useRef<HTMLInputElement>(null);
  const layer = useLayer();

  // The editor is created once; what it calls later is read through refs so it always sees the latest props.
  const onChangeRef = React.useRef(onChange);
  const uploadRef = React.useRef(onUploadImage);
  const embedRef = React.useRef({ on: embedImages, max: maxEmbedBytes });
  /** What the file picker was opened for. */
  const pickFor = React.useRef<"upload" | "embed">("upload");
  React.useEffect(() => {
    onChangeRef.current = onChange;
    uploadRef.current = onUploadImage;
    embedRef.current = { on: embedImages, max: maxEmbedBytes };
  });
  const clean = React.useCallback((html: string) => sanitizeHtml(html, { dataImages: embedRef.current.on }), []);
  /** The html last given to or taken from the app, so a `value` that merely echoes it does not reset the cursor. */
  const last = React.useRef(value);
  const [slash] = React.useState<SlashStore>(createSlashStore);
  const levelsRef = React.useRef(headingLevels);

  /** The editor's own html as last seen. Loading normalises html (colours, table columns); that is not an edit. */
  const seen = React.useRef<string | null>(null);
  const booting = React.useRef(false);

  const emit = React.useCallback((html: string) => {
    if (html === seen.current) return;
    seen.current = html;
    last.current = html;
    onChangeRef.current(html);
  }, []);

  /** Adds the pictures: uploaded when the app can store them (or when asked to), otherwise embedded as base64. */
  const uploadFiles = React.useCallback(async (files: File[], target: Editor, how?: "upload" | "embed") => {
    const upload = uploadRef.current;
    const embed = embedRef.current;
    const images = files.filter((f) => f.type.startsWith("image/"));
    const mode = how ?? (upload ? "upload" : "embed");
    if (images.length === 0 || (mode === "upload" ? !upload : !embed.on)) return;
    setProblem(null);
    for (const file of images) {
      setUploads((n) => n + 1);
      try {
        const src = mode === "upload" && upload ? await upload(file) : await toDataUrl(file, embed.max);
        insertImage(target, { src, alt: "" });
      } catch (e) {
        setProblem(e instanceof Error && e.message ? e.message : "The image could not be added.");
      } finally {
        setUploads((n) => n - 1);
      }
    }
  }, []);

  /**
   * Text copied from a document with pictures inside it: the pictures arrive as base64 in the html. Each is
   * uploaded and the text is pasted with the stored addresses, so nothing is lost and nothing is embedded.
   */
  const pasteWithPictures = React.useCallback(async (doc: Document, pictures: HTMLImageElement[], target: Editor) => {
    const upload = uploadRef.current;
    if (!upload) return;
    setProblem(null);
    setUploads((n) => n + 1);
    try {
      for (const img of pictures) {
        try {
          img.setAttribute("src", await upload(dataUrlToFile(img.getAttribute("src") ?? "")));
        } catch (e) {
          img.remove();
          setProblem(e instanceof Error && e.message ? e.message : "An image could not be added.");
        }
      }
      target.chain().focus().insertContent(sanitizeHtml(doc.body.innerHTML)).run();
    } finally {
      setUploads((n) => n - 1);
    }
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    content: value,
    extensions: editorExtensions({
      placeholder,
      headingLevels,
      slash,
      slashItems: () => slashItems(levelsRef.current, () => setImageOpen(true)),
      embedImages,
    }),
    editorProps: {
      attributes: { class: "bf-rich-text bf-editor-content", role: "textbox", "aria-multiline": "true", "aria-label": ariaLabel, ...(id ? { id } : {}) },
      handleKeyDown(_view, e) {
        const mod = e.metaKey || e.ctrlKey;
        if (mod && !e.shiftKey && e.key.toLowerCase() === "k") {
          e.preventDefault();
          setLinkOpen(true);
          return true;
        }
        if (mod && !e.shiftKey && e.key.toLowerCase() === "f") {
          e.preventDefault();
          setFinding(true);
          return true;
        }
        return false;
      },
      handlePaste(_view, e) {
        const target = editorRef.current;
        const data = e.clipboardData;
        if (!target || !data || !(uploadRef.current || embedRef.current.on)) return false;
        const files = Array.from(data.files).filter((f) => f.type.startsWith("image/"));
        const html = data.getData("text/html");
        const doc = html ? new DOMParser().parseFromString(html, "text/html") : null;
        // A copied picture or a screenshot. Office also puts a snapshot of copied TEXT on the clipboard as a
        // picture, so when words came along, the words are what is pasted.
        if (files.length > 0 && !doc?.body.textContent?.trim()) {
          e.preventDefault();
          void uploadFiles(files, target);
          return true;
        }
        const pictures = doc ? Array.from(doc.querySelectorAll("img")).filter((i) => DATA_IMAGE.test(i.getAttribute("src") ?? "")) : [];
        if (!doc || pictures.length === 0 || !uploadRef.current) return false;
        e.preventDefault();
        void pasteWithPictures(doc, pictures, target);
        return true;
      },
      handleDrop(view, e, _slice, moved) {
        const files = Array.from(e.dataTransfer?.files ?? []).filter((f) => f.type.startsWith("image/"));
        if (moved || files.length === 0 || !(uploadRef.current || embedRef.current.on) || !editorRef.current) return false;
        e.preventDefault();
        const at = view.posAtCoords({ left: e.clientX, top: e.clientY });
        if (at) editorRef.current.commands.setTextSelection(at.pos);
        void uploadFiles(files, editorRef.current);
        return true;
      },
    },
    onCreate: ({ editor: e }) => {
      // One empty step: plugins settle the document (table columns), and the toolbar reads its first state.
      booting.current = true;
      e.view.dispatch(e.state.tr.setMeta("addToHistory", false));
      booting.current = false;
      seen.current = htmlOf(e);
    },
    onUpdate: ({ editor: e }) => {
      if (!booting.current) emit(htmlOf(e));
    },
  });
  const editorRef = React.useRef<Editor | null>(null);
  React.useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  // A value from outside (a loaded record, a reset) replaces the text; our own echo does not.
  React.useEffect(() => {
    if (!editor || value === last.current) return;
    last.current = value;
    editor.commands.setContent(value, { emitUpdate: false });
    seen.current = htmlOf(editor);
    setSource(formatHtml(value));
  }, [value, editor]);

  // The floating bars are fixed to the window: when the page or the writing area scrolls, ask them to follow.
  React.useEffect(() => {
    if (!editor) return;
    let frame = 0;
    const follow = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (editor.isDestroyed || editor.state.selection.empty && !editor.isActive("link")) return;
        const tr = editor.state.tr.setMeta("addToHistory", false);
        for (const key of BUBBLES) tr.setMeta(key, "updatePosition");
        editor.view.dispatch(tr);
      });
    };
    window.addEventListener("scroll", follow, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", follow, true);
    };
  }, [editor]);

  React.useEffect(() => {
    // Not an edit: the second argument keeps this from reaching onChange.
    editor?.setEditable(!disabled, false);
  }, [editor, disabled]);

  // Full screen: the page behind must not scroll, and Escape leaves.
  React.useEffect(() => {
    if (!full) return;
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) setFull(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = before;
      document.removeEventListener("keydown", onKey);
    };
  }, [full]);

  const s = useEditorState({ editor, selector: ({ editor: e }) => (e ? toolbarState(e, headingLevels) : null) });

  function switchMode(next: "write" | "html") {
    if (!editor || next === mode) return;
    if (next === "html") {
      setSource(formatHtml(htmlOf(editor)));
      setFinding(false);
    } else {
      editor.commands.setContent(clean(source), { emitUpdate: false });
      const html = htmlOf(editor);
      seen.current = html;
      if (html !== last.current) {
        last.current = html;
        onChangeRef.current(html);
      }
    }
    setMode(next);
  }

  function closeFind() {
    setFinding(false);
    if (editor) setFind(editor, { query: "" });
    editor?.commands.focus();
  }

  const writing = mode === "write";
  const off = disabled || !writing || !editor || !s;
  const blockOptions = [
    { value: "p", label: "Paragraph" },
    ...headingLevels.map((l) => ({ value: `h${l}`, label: headingName(headingLevels, l) })),
    { value: "code", label: "Code block" },
  ];

  function setBlock(v: string) {
    if (!editor) return;
    const chain = editor.chain().focus();
    if (v === "p") chain.setParagraph().run();
    else if (v === "code") chain.setCodeBlock().run();
    else if (v.startsWith("h")) chain.setHeading({ level: Number(v.slice(1)) as HeadingLevel }).run();
  }

  const list = (kind: "listItem" | "taskItem") => (s?.task ? "taskItem" : kind);

  return (
    <div
      data-bf-editor
      className={cn(
        "flex min-w-0 flex-col rounded-xl border border-bf-line bg-bf-surface text-bf-copy transition-shadow",
        "focus-within:border-bf-brand focus-within:ring-3 focus-within:ring-bf-brand/15",
        full && "fixed inset-0 z-[65] rounded-none border-0 focus-within:ring-0",
        disabled && "opacity-80",
        className,
      )}
    >
      {name && <input type="hidden" name={name} value={value} />}
      <input
        ref={fileInput}
        type="file"
        accept={embedImages ? "image/png,image/jpeg,image/webp,image/gif" : "image/png,image/jpeg,image/webp"}
        multiple
        hidden
        aria-label="Upload images"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (editor) void uploadFiles(files, editor, pickFor.current);
        }}
      />

      {/* ---- Toolbar: one row that scrolls sideways on a phone, wraps from sm up ---- */}
      {!disabled && (
        <div role="toolbar" aria-label="Formatting" className="rounded-t-xl border-b border-bf-line bg-bf-surface px-2 py-1.5">
          {/* The row is pulled left by one group gap and clipped, so a row never starts with a divider. */}
          <div className="overflow-x-auto [scrollbar-width:none] sm:overflow-hidden [&::-webkit-scrollbar]:hidden">
          <div className="-ml-[9px] flex items-center gap-y-1 sm:flex-wrap">
          <Group>
          <Tool icon={<Undo2Icon />} label="Undo" keys={keys("Mod+Z")} disabled={off || !s.canUndo} onClick={() => editor?.chain().focus().undo().run()} />
          <Tool icon={<Redo2Icon />} label="Redo" keys={keys("Mod+Shift+Z")} disabled={off || !s.canRedo} onClick={() => editor?.chain().focus().redo().run()} />
          </Group>
          <Group>
          <div className="w-[9.5rem] shrink-0">
            <Combobox aria-label="Text style" size="sm" clearable={false} disabled={off} options={blockOptions} value={off ? "" : s.block} onChange={setBlock} className="h-8 border-transparent bg-transparent font-medium hover:bg-bf-surface-alt" />
          </div>
          </Group>
          <Group>
          <Tool icon={<BoldIcon />} label="Bold" keys={keys("Mod+B")} active={!off && s.bold} disabled={off} onClick={() => editor?.chain().focus().toggleBold().run()} />
          <Tool icon={<ItalicIcon />} label="Italic" keys={keys("Mod+I")} active={!off && s.italic} disabled={off} onClick={() => editor?.chain().focus().toggleItalic().run()} />
          <Tool icon={<UnderlineIcon />} label="Underline" keys={keys("Mod+U")} active={!off && s.underline} disabled={off} onClick={() => editor?.chain().focus().toggleUnderline().run()} />
          <Tool icon={<StrikethroughIcon />} label="Strikethrough" keys={keys("Mod+Shift+S")} active={!off && s.strike} disabled={off} onClick={() => editor?.chain().focus().toggleStrike().run()} />
          <ToolPopover icon={<PaletteIcon />} label="Text size, colour and highlight" active={!off && s.styled} disabled={off} width={264}>
            {(close) => (editor && s ? <TextStylePanel editor={editor} colour={s.colour} highlight={s.highlight} size={s.size} close={close} /> : null)}
          </ToolPopover>
          <Tool
            icon={<RemoveFormattingIcon />}
            label="Clear formatting"
            disabled={off}
            onClick={() => editor?.chain().focus().unsetAllMarks().unsetTextAlign().run()}
          />
          </Group>
          <Group>
          <Tool icon={<AlignLeftIcon />} label="Align left" active={!off && s.align === "left"} disabled={off} onClick={() => editor?.chain().focus().unsetTextAlign().run()} />
          <Tool icon={<AlignCenterIcon />} label="Align centre" active={!off && s.align === "center"} disabled={off} onClick={() => editor?.chain().focus().setTextAlign("center").run()} />
          <Tool icon={<AlignRightIcon />} label="Align right" active={!off && s.align === "right"} disabled={off} onClick={() => editor?.chain().focus().setTextAlign("right").run()} />
          <Tool icon={<AlignJustifyIcon />} label="Justify" active={!off && s.align === "justify"} disabled={off} onClick={() => editor?.chain().focus().setTextAlign("justify").run()} />
          </Group>
          <Group>
          <Tool icon={<ListIcon />} label="Bulleted list" active={!off && s.bullet} disabled={off} onClick={() => editor?.chain().focus().toggleBulletList().run()} />
          <Tool icon={<ListOrderedIcon />} label="Numbered list" active={!off && s.ordered} disabled={off} onClick={() => editor?.chain().focus().toggleOrderedList().run()} />
          <Tool icon={<ListChecksIcon />} label="Checklist" active={!off && s.task} disabled={off} onClick={() => editor?.chain().focus().toggleTaskList().run()} />
          <Tool icon={<IndentDecreaseIcon />} label="Move item out" keys="Shift+Tab" disabled={off || !s.canLift} onClick={() => editor?.chain().focus().liftListItem(list("listItem")).run()} />
          <Tool icon={<IndentIncreaseIcon />} label="Move item in" keys="Tab" disabled={off || !s.canSink} onClick={() => editor?.chain().focus().sinkListItem(list("listItem")).run()} />
          </Group>
          <Group>
          <ToolPopover icon={<LinkIcon />} label="Link" keys={keys("Mod+K")} active={!off && s.link} disabled={off} width={288} open={linkOpen} onOpenChange={setLinkOpen}>
            {(close) => (editor ? <LinkPanel editor={editor} close={close} /> : null)}
          </ToolPopover>
          <ToolPopover icon={<ImageIcon />} label="Image" disabled={off} width={288} open={imageOpen} onOpenChange={setImageOpen}>
            {(close) => (editor ? <ImagePanel
                  editor={editor}
                  canUpload={!!onUploadImage}
                  canEmbed={embedImages}
                  onPick={(how) => {
                    pickFor.current = how;
                    fileInput.current?.click();
                  }}
                  close={close}
                /> : null)}
          </ToolPopover>
          <ToolPopover icon={<TableIcon />} label="Table" active={!off && s.table} disabled={off} width={off || !s.table ? 196 : 224} role="menu">
            {(close) => {
              if (!editor || !s) return null;
              const run = (fn: (e: Editor) => void) => () => {
                close();
                fn(editor);
              };
              if (!s.table) return <TableGrid onPick={(rows, cols) => run((e) => e.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run())()} />;
              return (
                <>
                  <MenuLabel>Rows</MenuLabel>
                  <MenuItem onSelect={run((e) => e.chain().focus().addRowBefore().run())}>Add row above</MenuItem>
                  <MenuItem onSelect={run((e) => e.chain().focus().addRowAfter().run())}>Add row below</MenuItem>
                  <MenuItem onSelect={run((e) => e.chain().focus().deleteRow().run())}>Delete row</MenuItem>
                  <MenuLabel>Columns</MenuLabel>
                  <MenuItem onSelect={run((e) => e.chain().focus().addColumnBefore().run())}>Add column left</MenuItem>
                  <MenuItem onSelect={run((e) => e.chain().focus().addColumnAfter().run())}>Add column right</MenuItem>
                  <MenuItem onSelect={run((e) => e.chain().focus().deleteColumn().run())}>Delete column</MenuItem>
                  <MenuSeparator />
                  <MenuItem onSelect={run((e) => e.chain().focus().toggleHeaderRow().run())}>Heading row on or off</MenuItem>
                  <MenuItem onSelect={run((e) => e.chain().focus().toggleHeaderColumn().run())}>Heading column on or off</MenuItem>
                  {s.canMerge && <MenuItem onSelect={run((e) => e.chain().focus().mergeCells().run())}>Merge selected cells</MenuItem>}
                  {s.canSplit && <MenuItem onSelect={run((e) => e.chain().focus().splitCell().run())}>Split cell</MenuItem>}
                  <MenuSeparator />
                  <MenuItem className="text-bf-danger-ink [&_svg]:text-bf-danger-ink" onSelect={run((e) => e.chain().focus().deleteTable().run())}>
                    <Trash2Icon /> Delete table
                  </MenuItem>
                </>
              );
            }}
          </ToolPopover>
          <Tool icon={<QuoteIcon />} label="Quote" active={!off && s.quote} disabled={off} onClick={() => editor?.chain().focus().toggleBlockquote().run()} />
          <Tool icon={<MinusIcon />} label="Divider line" disabled={off} onClick={() => editor?.chain().focus().setHorizontalRule().run()} />
          </Group>
          <Group>
          <Tool icon={<CodeIcon />} label="Inline code" keys={keys("Mod+E")} active={!off && s.code} disabled={off} onClick={() => editor?.chain().focus().toggleCode().run()} />
          <Tool icon={<SubscriptIcon />} label="Subscript" active={!off && s.sub} disabled={off} onClick={() => editor?.chain().focus().unsetSuperscript().toggleSubscript().run()} />
          <Tool icon={<SuperscriptIcon />} label="Superscript" active={!off && s.sup} disabled={off} onClick={() => editor?.chain().focus().unsetSubscript().toggleSuperscript().run()} />

          </Group>
          {/* ---- View controls, at the right edge when there is room ---- */}
          <Group className="sm:ml-auto">
          <Tool icon={<SearchIcon />} label="Find and replace" keys={keys("Mod+F")} active={finding} disabled={off} onClick={() => (finding ? closeFind() : setFinding(true))} />
          <Tool icon={<SmartphoneIcon />} label="Check at phone width" active={phone} disabled={!writing} onClick={() => setPhone((v) => !v)} />
          <Tool icon={<CodeXmlIcon />} label={writing ? "Edit the HTML" : "Back to the editor"} active={!writing} disabled={!editor} onClick={() => switchMode(writing ? "html" : "write")} />
          <Tool icon={full ? <Minimize2Icon /> : <Maximize2Icon />} label={full ? "Leave full screen" : "Full screen"} keys={full ? "Esc" : undefined} active={full} onClick={() => setFull((v) => !v)} />
          <ToolPopover icon={<KeyboardIcon />} label="Shortcuts" width={272}>
            {() => <Shortcuts />}
          </ToolPopover>
          </Group>
          </div>
          </div>
        </div>
      )}

      {finding && writing && editor && s && <FindBar editor={editor} count={s.findCount} index={s.findIndex} onClose={closeFind} />}

      {problem && (
        <div role="alert" className="flex items-start gap-2 border-b border-bf-danger-line bg-bf-danger-bg px-3 py-2 text-[13px] text-bf-danger-ink">
          <span className="min-w-0 flex-1">{problem}</span>
          <button type="button" aria-label="Dismiss" onClick={() => setProblem(null)} className="shrink-0 rounded p-0.5 hover:bg-black/5">
            <XIcon className="size-3.5" />
          </button>
        </div>
      )}

      {/* ---- Writing area ---- */}
      <div
        className={cn("min-h-0 overflow-y-auto", full ? "flex-1" : "", phone && writing ? "bg-bf-surface-alt py-4" : "")}
        style={full ? undefined : { maxHeight }}
        onMouseDown={(e) => {
          // A press on the empty space around the text puts the cursor at the end.
          if (e.target === e.currentTarget && writing && editor) {
            e.preventDefault();
            editor.commands.focus("end");
          }
        }}
      >
        {writing ? (
          <div
            className={cn("mx-auto w-full", phone ? "max-w-[400px] rounded-[1.25rem] border border-bf-line-strong bg-bf-surface shadow-sm" : full ? "max-w-3xl" : "")}
            style={{ minHeight }}
          >
            {editor ? (
              <EditorContent editor={editor} className="bf-editor-host" style={{ minHeight }} />
            ) : (
              <div className="space-y-3 p-5" aria-hidden>
                <div className="h-4 w-2/3 rounded bg-bf-surface-alt" />
                <div className="h-4 w-full rounded bg-bf-surface-alt" />
                <div className="h-4 w-5/6 rounded bg-bf-surface-alt" />
              </div>
            )}
          </div>
        ) : (
          <textarea
            aria-label="HTML"
            spellCheck={false}
            value={source}
            readOnly={disabled}
            onChange={(e) => {
              setSource(e.target.value);
              const html = clean(e.target.value);
              last.current = html;
              onChangeRef.current(html);
            }}
            className={cn("block w-full resize-none bg-transparent p-4 font-mono text-xs leading-relaxed text-bf-copy outline-none", full ? "h-full" : "")}
            style={full ? undefined : { minHeight, height: `max(${minHeight}px, ${Math.min(source.split("\n").length, 60) * 1.625}em)` }}
          />
        )}
      </div>

      {/* ---- Status bar ---- */}
      <div className="flex min-h-8 flex-wrap items-center gap-x-3 gap-y-0.5 rounded-b-xl border-t border-bf-line bg-bf-surface-alt/50 px-3 py-1 text-[11px] text-bf-muted">
        <span className="min-w-0 flex-1 truncate">
          {uploads > 0 ? (
            <span className="inline-flex items-center gap-1.5 text-bf-brand-strong">
              <Loader2Icon className="size-3 animate-spin" /> Adding image…
            </span>
          ) : !writing ? (
            "HTML view. Scripts, forms, frames and unknown tags are removed."
          ) : (
            s?.path || "Paragraph"
          )}
        </span>
        {s && (
          <span className="shrink-0 tabular-nums">
            {s.stats.words} {s.stats.words === 1 ? "word" : "words"} · {s.stats.characters} characters{s.stats.minutes > 0 ? ` · ${s.stats.minutes} min read` : ""}
          </span>
        )}
      </div>

      {/* ---- Floating bars and the "/" menu ---- */}
      {editor && layer && writing && !disabled && s && (
        <>
          <BubbleMenu
            editor={editor}
            pluginKey="bfTextBubble"
            appendTo={() => layer}
            options={{ strategy: "fixed", placement: "top", offset: 8, flip: true, shift: { padding: 8 } }}
            shouldShow={({ editor: e, state }) => e.isEditable && !state.selection.empty && !(state.selection instanceof NodeSelection) && !e.isActive("codeBlock") && !e.isActive("image")}
            className="bf-editor-bubble"
          >
            <Tool icon={<BoldIcon />} label="Bold" active={s.bold} onClick={() => editor.chain().focus().toggleBold().run()} />
            <Tool icon={<ItalicIcon />} label="Italic" active={s.italic} onClick={() => editor.chain().focus().toggleItalic().run()} />
            <Tool icon={<UnderlineIcon />} label="Underline" active={s.underline} onClick={() => editor.chain().focus().toggleUnderline().run()} />
            <Tool icon={<StrikethroughIcon />} label="Strikethrough" active={s.strike} onClick={() => editor.chain().focus().toggleStrike().run()} />
            <Sep />
            <Tool icon={<LinkIcon />} label="Link" active={s.link} onClick={() => setLinkOpen(true)} />
            <button
              type="button"
              aria-label="Highlight"
              title="Highlight"
              aria-pressed={!!s.highlight}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => (s.highlight ? editor.chain().focus().unsetHighlight().run() : editor.chain().focus().setHighlight({ color: "#fef08a" }).run())}
              className={toolClass}
            >
              <span className="rounded bg-[#fef08a] px-1 text-[13px] font-bold leading-5 text-[#172033]">A</span>
            </button>
            <Tool icon={<RemoveFormattingIcon />} label="Clear formatting" onClick={() => editor.chain().focus().unsetAllMarks().run()} />
          </BubbleMenu>

          <BubbleMenu
            editor={editor}
            pluginKey="bfLinkBubble"
            appendTo={() => layer}
            options={{ strategy: "fixed", placement: "bottom-start", offset: 8, flip: true, shift: { padding: 8 } }}
            shouldShow={({ editor: e, state }) => e.isEditable && state.selection.empty && e.isActive("link")}
            className="bf-editor-bubble"
          >
            <a href={s.href} target="_blank" rel="noopener noreferrer" className="flex min-w-0 max-w-[14rem] items-center gap-1.5 truncate px-2 text-[13px] text-bf-brand-strong underline-offset-2 hover:underline">
              <ExternalLinkIcon className="size-3.5 shrink-0" />
              <span className="truncate">{s.href}</span>
            </a>
            <Sep />
            <Tool icon={<PencilIcon />} label="Edit link" onClick={() => setLinkOpen(true)} />
            <Tool icon={<UnlinkIcon />} label="Remove link" onClick={() => editor.chain().focus().extendMarkRange("link").unsetLink().run()} />
          </BubbleMenu>

          <BubbleMenu
            editor={editor}
            pluginKey="bfImageBubble"
            appendTo={() => layer}
            options={{ strategy: "fixed", placement: "top", offset: 8, flip: true, shift: { padding: 8 } }}
            shouldShow={({ editor: e }) => e.isEditable && e.isActive("image")}
            className="bf-editor-bubble"
          >
            <ImageBar editor={editor} attrs={s.imageAttrs} />
          </BubbleMenu>

          <SlashMenu store={slash} />
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------------------
   Image bar: alignment, width, description, remove
   ------------------------------------------------------------------------------------------------------------ */

const WIDTHS: [string | null, string][] = [
  ["25%", "S"],
  ["50%", "M"],
  ["75%", "L"],
  [null, "Full"],
];

function ImageBar({ editor, attrs }: { editor: Editor; attrs: { width?: string | null; align?: string | null; alt?: string | null } }) {
  const set = (patch: Record<string, string | null>) => editor.chain().focus().updateAttributes("image", patch).run();
  return (
    <>
      <Tool icon={<AlignLeftIcon />} label="Image on the left" active={attrs.align === "left"} onClick={() => set({ align: attrs.align === "left" ? null : "left" })} />
      <Tool icon={<AlignCenterIcon />} label="Image in the centre" active={attrs.align === "center"} onClick={() => set({ align: attrs.align === "center" ? null : "center" })} />
      <Tool icon={<AlignRightIcon />} label="Image on the right" active={attrs.align === "right"} onClick={() => set({ align: attrs.align === "right" ? null : "right" })} />
      <Sep />
      {WIDTHS.map(([w, name]) => (
        <button
          key={name}
          type="button"
          title={w ? `${w} of the page width` : "Full width"}
          aria-label={w ? `Width ${w}` : "Full width"}
          aria-pressed={(attrs.width ?? null) === w}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => set({ width: w })}
          className={cn(toolClass, "w-auto px-2 text-xs font-semibold sm:w-auto")}
        >
          {name}
        </button>
      ))}
      <Sep />
      <input
        aria-label="Image description"
        title="Description for screen readers and search engines"
        placeholder="Describe the image"
        defaultValue={attrs.alt ?? ""}
        key={editor.state.selection.from}
        onBlur={(e) => {
          if (e.target.value !== (attrs.alt ?? "") && editor.isActive("image")) editor.commands.updateAttributes("image", { alt: e.target.value });
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            editor.chain().updateAttributes("image", { alt: e.currentTarget.value }).focus().run();
          }
        }}
        className={cn(inputClass, "h-8 w-36 px-2 text-xs")}
      />
      <Tool icon={<Trash2Icon />} label="Remove image" onClick={() => editor.chain().focus().deleteSelection().run()} />
    </>
  );
}

/* ------------------------------------------------------------------------------------------------------------
   Find and replace bar
   ------------------------------------------------------------------------------------------------------------ */

function FindBar({ editor, count, index, onClose }: { editor: Editor; count: number; index: number; onClose: () => void }) {
  const [query, setQuery] = React.useState("");
  const [replacement, setReplacement] = React.useState("");
  const [matchCase, setMatchCase] = React.useState(false);
  const findInput = React.useRef<HTMLInputElement>(null);
  const replace = (all: boolean) => {
    replaceFound(editor, replacement, all);
    findInput.current?.focus();
  };
  const field = cn(inputClass, "h-8 min-w-0 flex-1 px-2.5 text-[13px] sm:w-44 sm:flex-none");
  const small = "h-8 shrink-0 rounded-lg border border-bf-line-strong bg-bf-surface px-2.5 text-xs font-semibold text-bf-ink hover:bg-bf-surface-alt disabled:opacity-40";

  return (
    <div
      role="search"
      className="flex flex-wrap items-center gap-1.5 border-b border-bf-line bg-bf-surface-alt/50 px-2 py-1.5"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="flex w-full min-w-0 items-center gap-1 sm:w-auto">
        <input
          ref={findInput}
          autoFocus
          aria-label="Find"
          placeholder="Find"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setFind(editor, { query: e.target.value, index: 0 });
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              stepFind(editor, e.shiftKey ? -1 : 1);
            }
          }}
          className={field}
        />
        <span className="w-14 shrink-0 text-center text-[11px] tabular-nums text-bf-muted" aria-live="polite">
          {query ? (count ? `${index + 1} of ${count}` : "None") : ""}
        </span>
        <Tool icon={<ChevronUpIcon />} label="Previous match" keys="Shift+Enter" disabled={count === 0} onClick={() => stepFind(editor, -1)} />
        <Tool icon={<ChevronDownIcon />} label="Next match" keys="Enter" disabled={count === 0} onClick={() => stepFind(editor, 1)} />
        <Tool
          icon={<CaseSensitiveIcon />}
          label="Match capital letters"
          active={matchCase}
          onClick={() => {
            setMatchCase(!matchCase);
            setFind(editor, { matchCase: !matchCase, index: 0 });
          }}
        />
      </div>
      <div className="flex w-full min-w-0 items-center gap-1 sm:w-auto">
        <input
          aria-label="Replace with"
          placeholder="Replace with"
          value={replacement}
          onChange={(e) => setReplacement(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              replaceFound(editor, replacement, false);
            }
          }}
          className={field}
        />
        <button type="button" disabled={count === 0} onClick={() => replace(false)} className={small}>
          Replace
        </button>
        <button type="button" disabled={count === 0} onClick={() => replace(true)} className={small}>
          All
        </button>
      </div>
      <span className="hidden flex-1 sm:block" />
      <Tool icon={<XIcon />} label="Close find" keys="Esc" onClick={onClose} className="ml-auto" />
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------------------
   "/" menu
   ------------------------------------------------------------------------------------------------------------ */

function SlashMenu({ store }: { store: SlashStore }) {
  const view = React.useSyncExternalStore(store.subscribe, store.get, store.get);
  const active = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    active.current?.scrollIntoView({ block: "nearest" });
  }, [view.index, view.open]);
  if (!view.open || !view.rect) return null;

  const width = Math.min(288, window.innerWidth - 16);
  const left = Math.max(8, Math.min(view.rect.left, window.innerWidth - width - 8));
  const below = window.innerHeight - view.rect.bottom;
  const up = below < 300 && view.rect.top > below;

  return createPortal(
    <div
      role="listbox"
      aria-label="Insert"
      style={{ position: "fixed", left, width, ...(up ? { bottom: window.innerHeight - view.rect.top + 6 } : { top: view.rect.bottom + 6 }) }}
      className="z-[80] max-h-72 overflow-y-auto rounded-xl border border-bf-line bg-bf-surface p-1 shadow-[var(--bf-shadow-pop)]"
    >
      {view.items.length === 0 ? (
        <p className="px-3 py-2.5 text-[13px] text-bf-muted">Nothing matches. Keep typing or press Esc.</p>
      ) : (
        view.items.map((item, i) => (
          <button
            key={item.id}
            ref={i === view.index ? active : undefined}
            type="button"
            role="option"
            aria-selected={i === view.index}
            onMouseDown={(e) => e.preventDefault()}
            onMouseEnter={() => store.set({ index: i })}
            onClick={() => view.pick(item)}
            className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left outline-none aria-selected:bg-bf-surface-alt"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-bf-line bg-bf-surface text-bf-copy [&_svg]:size-4">{slashIcon(item.id)}</span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-semibold text-bf-ink">{item.title}</span>
              <span className="block truncate text-[11px] text-bf-muted">{item.hint}</span>
            </span>
          </button>
        ))
      )}
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------------------------------------------------------
   Shortcuts
   ------------------------------------------------------------------------------------------------------------ */

const SHORTCUTS: [string, string][] = [
  ["Insert menu", "/"],
  ["Bold", "Mod+B"],
  ["Italic", "Mod+I"],
  ["Underline", "Mod+U"],
  ["Link", "Mod+K"],
  ["Find and replace", "Mod+F"],
  ["Undo", "Mod+Z"],
  ["Redo", "Mod+Shift+Z"],
  ["Line break, same paragraph", "Shift+Enter"],
  ["Move list item in or out", "Tab / Shift+Tab"],
];
const TYPED: [string, string][] = [
  ["Heading", "## then space"],
  ["Bulleted list", "- then space"],
  ["Numbered list", "1. then space"],
  ["Checklist", "[ ] then space"],
  ["Quote", "> then space"],
  ["Divider", "--- then Enter"],
];

function Shortcuts() {
  const row = "flex items-center justify-between gap-3 px-2.5 py-1 text-[13px]";
  const key = "shrink-0 rounded border border-bf-line bg-bf-surface-alt px-1.5 py-0.5 font-mono text-[11px] text-bf-ink";
  return (
    <div className="max-h-80 overflow-y-auto pb-1">
      <MenuLabel>Keys</MenuLabel>
      {SHORTCUTS.map(([what, combo]) => (
        <div key={what} className={row}>
          <span>{what}</span>
          <kbd className={key}>{keys(combo)}</kbd>
        </div>
      ))}
      <MenuLabel>Type at the start of a line</MenuLabel>
      {TYPED.map(([what, how]) => (
        <div key={what} className={row}>
          <span>{what}</span>
          <kbd className={key}>{how}</kbd>
        </div>
      ))}
    </div>
  );
}
