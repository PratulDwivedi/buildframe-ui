/** Helpers for the editor's HTML view and status bar. Browser only (DOMParser). */

const BLOCK = new Set([
  "p", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "blockquote", "pre", "hr", "div", "figure", "figcaption",
  "table", "colgroup", "col", "thead", "tbody", "tr", "th", "td", "img",
]);
const VOID = new Set(["br", "hr", "img", "col"]);

function openTag(el: Element): string {
  const attrs = Array.from(el.attributes)
    .map((a) => ` ${a.name}="${a.value.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}"`)
    .join("");
  return `<${el.tagName.toLowerCase()}${attrs}>`;
}

const hasBlockChild = (el: Element) => Array.from(el.children).some((c) => BLOCK.has(c.tagName.toLowerCase()));

/**
 * The html with one block per line and nested blocks indented, so the HTML view is readable. Only white space
 * between blocks is added; text inside a paragraph or a `pre` is left exactly as it is.
 */
export function formatHtml(html: string): string {
  if (!html.trim()) return "";
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  const out: string[] = [];

  const walk = (parent: Element, depth: number) => {
    const pad = "  ".repeat(depth);
    let inline = "";
    const flush = () => {
      if (inline.trim()) out.push(pad + inline.trim());
      inline = "";
    };
    for (const node of Array.from(parent.childNodes)) {
      if (node.nodeType === 3) {
        inline += (node.textContent ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        continue;
      }
      if (node.nodeType !== 1) continue;
      const el = node as Element;
      const tag = el.tagName.toLowerCase();
      if (!BLOCK.has(tag)) {
        inline += el.outerHTML;
        continue;
      }
      flush();
      if (VOID.has(tag)) out.push(pad + openTag(el));
      else if (tag === "pre" || !hasBlockChild(el)) out.push(pad + el.outerHTML);
      else {
        out.push(pad + openTag(el));
        walk(el, depth + 1);
        out.push(`${pad}</${tag}>`);
      }
    }
    flush();
  };
  walk(doc.body, 0);
  return out.join("\n");
}

export type TextStats = { words: number; characters: number; minutes: number };

/** Words, characters and reading time (200 words a minute, at least one minute once there is text). */
export function textStats(text: string): TextStats {
  const trimmed = text.trim();
  const words = trimmed ? trimmed.split(/\s+/).length : 0;
  return { words, characters: trimmed.replace(/\n+/g, " ").length, minutes: words === 0 ? 0 : Math.max(1, Math.round(words / 200)) };
}
