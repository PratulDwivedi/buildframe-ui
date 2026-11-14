import { Extension, mergeAttributes, type Editor, type Range } from "@tiptap/core";
import { StarterKit } from "@tiptap/starter-kit";
import { TextAlign } from "@tiptap/extension-text-align";
import { Color, FontSize, TextStyle } from "@tiptap/extension-text-style";
import { Highlight } from "@tiptap/extension-highlight";
import { Image } from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { Placeholder } from "@tiptap/extensions";
import { Suggestion } from "@tiptap/suggestion";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as PmNode } from "@tiptap/pm/model";

/* ------------------------------------------------------------------------------------------------------------
   Image: a width in percent (so it scales on a phone) and an alignment, both kept in the html.
   ------------------------------------------------------------------------------------------------------------ */

const RichImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (el: HTMLElement) => (/^\d+(\.\d+)?%$/.test(el.style.width) ? el.style.width : null),
        renderHTML: (attrs: { width?: string | null }) => (attrs.width ? { style: `width: ${attrs.width}` } : {}),
      },
      height: { default: null, renderHTML: () => ({}) },
      align: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute("data-align"),
        renderHTML: (attrs: { align?: string | null }) => (attrs.align ? { "data-align": attrs.align } : {}),
      },
    };
  },
});

/* ------------------------------------------------------------------------------------------------------------
   Highlight: the colour behind the words only. Tiptap also writes "color: inherit", which on a dark page puts
   light words on a pale marker; rich-text.css gives highlighted words a dark ink instead.
   ------------------------------------------------------------------------------------------------------------ */

const SoftHighlight = Highlight.extend({
  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute("data-color") || el.style.backgroundColor || null,
        renderHTML: (attrs: { color?: string | null }) => (attrs.color ? { "data-color": attrs.color, style: `background-color: ${attrs.color}` } : {}),
      },
    };
  },
});

/* ------------------------------------------------------------------------------------------------------------
   Checklist item: stored without an <input>, which most servers refuse in stored html. The tick is drawn by
   rich-text.css from data-checked. Inside the editor the item still has a real checkbox (the node view).
   ------------------------------------------------------------------------------------------------------------ */

const PlainTaskItem = TaskItem.extend({
  renderHTML({ HTMLAttributes }) {
    return ["li", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { "data-type": this.name }), ["div", 0]];
  },
});

/* ------------------------------------------------------------------------------------------------------------
   Find and replace
   ------------------------------------------------------------------------------------------------------------ */

export type FindState = { query: string; matchCase: boolean; index: number; matches: Range[] };
export const findKey = new PluginKey<FindState>("bfFind");
const NO_FIND: FindState = { query: "", matchCase: false, index: 0, matches: [] };

function findMatches(doc: PmNode, query: string, matchCase: boolean): Range[] {
  if (!query) return [];
  const needle = matchCase ? query : query.toLowerCase();
  const found: Range[] = [];
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    // An image or a line break inside the paragraph counts as one character, so offsets stay positions.
    const raw = node.textBetween(0, node.content.size, undefined, "￼");
    const text = matchCase ? raw : raw.toLowerCase();
    let at = text.indexOf(needle);
    while (at >= 0) {
      found.push({ from: pos + 1 + at, to: pos + 1 + at + needle.length });
      at = text.indexOf(needle, at + needle.length);
    }
    return false;
  });
  return found;
}

const FindReplace = Extension.create({
  name: "bfFind",
  addProseMirrorPlugins() {
    return [
      new Plugin<FindState>({
        key: findKey,
        state: {
          init: () => NO_FIND,
          apply(tr, prev) {
            const meta = tr.getMeta(findKey) as Partial<FindState> | undefined;
            if (!meta && !tr.docChanged) return prev;
            const next = { ...prev, ...meta };
            const matches = findMatches(tr.doc, next.query, next.matchCase);
            const index = matches.length === 0 ? 0 : Math.min(Math.max(next.index, 0), matches.length - 1);
            return { ...next, matches, index };
          },
        },
        props: {
          decorations(state) {
            const s = findKey.getState(state);
            if (!s || s.matches.length === 0) return null;
            return DecorationSet.create(
              state.doc,
              s.matches.map((m, i) => Decoration.inline(m.from, m.to, { class: i === s.index ? "bf-find bf-find-current" : "bf-find" })),
            );
          },
        },
      }),
    ];
  },
});

export const findState = (editor: Editor): FindState => findKey.getState(editor.state) ?? NO_FIND;

export function setFind(editor: Editor, patch: Partial<FindState>) {
  editor.view.dispatch(editor.state.tr.setMeta(findKey, patch));
}

/** Moves to the next (1) or previous (-1) match and scrolls it into view. */
export function stepFind(editor: Editor, by: 1 | -1) {
  const s = findState(editor);
  if (s.matches.length === 0) return;
  const index = (s.index + by + s.matches.length) % s.matches.length;
  setFind(editor, { index });
  const dom = editor.view.domAtPos(s.matches[index].from).node;
  (dom instanceof Element ? dom : dom.parentElement)?.scrollIntoView({ block: "nearest" });
}

export function replaceFound(editor: Editor, replacement: string, all: boolean) {
  const s = findState(editor);
  if (s.matches.length === 0) return;
  const tr = editor.state.tr;
  // Last match first, so earlier positions are still right.
  const targets = all ? [...s.matches].reverse() : [s.matches[s.index]];
  for (const m of targets) {
    if (replacement) tr.insertText(replacement, m.from, m.to);
    else tr.delete(m.from, m.to);
  }
  editor.view.dispatch(tr);
}

/* ------------------------------------------------------------------------------------------------------------
   The selection stays visible while a panel (link, colour) has the focus, so it is clear what will change.
   ------------------------------------------------------------------------------------------------------------ */

const keptKey = new PluginKey<boolean>("bfKeepSelection");
const KeepSelection = Extension.create({
  name: "bfKeepSelection",
  addProseMirrorPlugins() {
    return [
      new Plugin<boolean>({
        key: keptKey,
        state: {
          init: () => false,
          apply: (tr, blurred) => (tr.getMeta(keptKey) as boolean | undefined) ?? blurred,
        },
        props: {
          decorations(state) {
            const { from, to, empty } = state.selection;
            if (!keptKey.getState(state) || empty) return null;
            return DecorationSet.create(state.doc, [Decoration.inline(from, to, { class: "bf-kept-selection" })]);
          },
          handleDOMEvents: {
            blur(view) {
              view.dispatch(view.state.tr.setMeta(keptKey, true).setMeta("addToHistory", false));
              return false;
            },
            focus(view) {
              view.dispatch(view.state.tr.setMeta(keptKey, false).setMeta("addToHistory", false));
              return false;
            },
          },
        },
      }),
    ];
  },
});

/* ------------------------------------------------------------------------------------------------------------
   Slash commands: type "/" on a line to get the insert menu.
   ------------------------------------------------------------------------------------------------------------ */

export type SlashItem = {
  id: string;
  title: string;
  hint: string;
  /** Extra words the filter matches. */
  keywords?: string;
  run: (editor: Editor) => void;
};

export type SlashView = {
  open: boolean;
  items: SlashItem[];
  index: number;
  rect: DOMRect | null;
  pick: (item: SlashItem) => void;
};

const CLOSED: SlashView = { open: false, items: [], index: 0, rect: null, pick: () => {} };

/** The menu's state lives outside React because the editor plugin drives it; the menu component subscribes. */
export function createSlashStore() {
  let view = CLOSED;
  const listeners = new Set<() => void>();
  return {
    get: () => view,
    set(next: Partial<SlashView>) {
      view = { ...view, ...next };
      listeners.forEach((l) => l());
    },
    close() {
      view = CLOSED;
      listeners.forEach((l) => l());
    },
    subscribe(l: () => void) {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
  };
}
export type SlashStore = ReturnType<typeof createSlashStore>;

const SlashCommands = Extension.create<{ store: SlashStore | null; items: () => SlashItem[] }>({
  name: "bfSlash",
  addOptions() {
    return { store: null, items: () => [] };
  },
  addProseMirrorPlugins() {
    const { store, items } = this.options;
    if (!store) return [];
    return [
      Suggestion<SlashItem, SlashItem>({
        editor: this.editor,
        char: "/",
        pluginKey: new PluginKey("bfSlash"),
        allow: ({ editor }) => !editor.isActive("codeBlock"),
        items: ({ query }) => {
          const q = query.trim().toLowerCase();
          return items().filter((i) => !q || `${i.title} ${i.keywords ?? ""}`.toLowerCase().includes(q));
        },
        command: ({ editor, range, props }) => {
          editor.chain().focus().deleteRange(range).run();
          props.run(editor);
        },
        render: () => ({
          onStart: (p) => store.set({ open: true, items: p.items, index: 0, rect: p.clientRect?.() ?? null, pick: p.command }),
          onUpdate: (p) => store.set({ open: true, items: p.items, index: 0, rect: p.clientRect?.() ?? null, pick: p.command }),
          onExit: () => store.close(),
          onKeyDown: ({ event }) => {
            const v = store.get();
            if (!v.open) return false;
            if (event.key === "Escape") {
              store.close();
              return true;
            }
            if (v.items.length === 0) return false;
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              const step = event.key === "ArrowDown" ? 1 : -1;
              store.set({ index: (v.index + step + v.items.length) % v.items.length });
              return true;
            }
            if (event.key === "Enter" || event.key === "Tab") {
              v.pick(v.items[v.index]);
              return true;
            }
            return false;
          },
        }),
      }),
    ];
  },
});

/* ------------------------------------------------------------------------------------------------------------
   The schema
   ------------------------------------------------------------------------------------------------------------ */

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export function editorExtensions(o: {
  placeholder: string;
  headingLevels: HeadingLevel[];
  slash: SlashStore;
  slashItems: () => SlashItem[];
  /** Accept images embedded as base64. */
  embedImages?: boolean;
}) {
  return [
    StarterKit.configure({
      heading: { levels: o.headingLevels },
      link: {
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
        // Tiptap's default opens every link in a new tab; here that is a per-link choice.
        HTMLAttributes: { target: null, rel: null, class: null },
      },
      dropcursor: { color: "var(--bf-brand)", width: 2 },
    }),
    TextStyle,
    Color,
    FontSize,
    SoftHighlight.configure({ multicolor: true }),
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    Subscript,
    Superscript,
    RichImage.configure({ inline: false, allowBase64: !!o.embedImages, resize: false }),
    TableKit.configure({ table: { resizable: false } }),
    TaskList,
    PlainTaskItem.configure({ nested: true }),
    Placeholder.configure({ placeholder: o.placeholder }),
    FindReplace,
    KeepSelection,
    SlashCommands.configure({ store: o.slash, items: o.slashItems }),
  ];
}
