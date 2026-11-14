/**
 * Cleans html written in the editor (or pasted into its HTML view) before it is stored. Browser only: the html is
 * parsed and rebuilt from an allow list, so nothing outside the list reaches the database. Moved here from
 * buildframe_ecomm (lib/admin/sanitize.ts) and widened to what HtmlEditor can produce: alignment, text colour,
 * highlight, text size, image width and alignment, checklists.
 *
 * It is the first line of defence, not the only one: the server that stores the html must refuse the dangerous
 * constructs again, because a request can be sent without this code running.
 */

const TAGS = new Set([
  "p", "br", "hr", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "blockquote",
  "strong", "b", "em", "i", "u", "s", "del", "small", "sub", "sup", "code", "pre", "span", "div", "mark",
  "a", "img", "table", "colgroup", "col", "thead", "tbody", "tr", "th", "td", "figure", "figcaption",
]);

const DROP_WITH_CONTENT = new Set([
  "script", "style", "iframe", "frame", "frameset", "object", "embed", "applet", "form", "template", "svg", "math",
  "noscript", "input", "button", "textarea", "select", "link", "meta", "base", "title", "head",
]);

const COLOUR = /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%/]+\)|hsla?\([\d\s.,%/a-z]+\)|[a-z]+)$/i;

/** Attribute name to the test its value must pass. `true` means any text. */
type Rule = RegExp | true;
const GLOBAL_ATTRS: Record<string, Rule> = {
  "data-type": /^(taskList|taskItem)$/,
  "data-checked": /^(true|false)$/,
  "data-align": /^(left|center|right)$/,
};
const ATTRS: Record<string, Record<string, Rule>> = {
  a: { href: true, title: true, target: /^_(blank|self)$/, rel: true },
  img: { src: true, alt: true, title: true, width: /^\d{1,4}%?$/, height: /^\d{1,4}%?$/ },
  th: { colspan: /^\d{1,3}$/, rowspan: /^\d{1,3}$/ },
  td: { colspan: /^\d{1,3}$/, rowspan: /^\d{1,3}$/ },
  ol: { start: /^-?\d{1,6}$/, type: /^[1aAiI]$/ },
  mark: { "data-color": COLOUR },
};

/** The only style declarations kept. Anything else (position, background images, fonts) is dropped. */
const STYLES: Record<string, RegExp> = {
  "text-align": /^(left|right|center|justify)$/i,
  color: COLOUR,
  "background-color": COLOUR,
  "font-size": /^\d+(\.\d+)?(px|em|rem|%)$/i,
  width: /^\d+(\.\d+)?(px|%)$/i,
  "min-width": /^\d+(\.\d+)?(px|%)$/i,
};

/** An image carried inside the html itself. Bitmap types only: an SVG can hold script. */
export const DATA_IMAGE = /^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/=]+$/i;

export type SanitizeOptions = {
  /** Keep images embedded as base64 (`data:image/...`). Off unless the server that stores the html accepts them. */
  dataImages?: boolean;
};

function safeUrl(value: string, allowMail: boolean, allowDataImage = false): string | null {
  const v = value.trim();
  if (allowDataImage && DATA_IMAGE.test(v)) return v;
  if (v.startsWith("#") || v.startsWith("/")) return v.startsWith("//") ? null : v;
  try {
    const u = new URL(v);
    if (u.protocol === "https:" || u.protocol === "http:") return v;
    if (allowMail && (u.protocol === "mailto:" || u.protocol === "tel:")) return v;
  } catch {
    // not an absolute address
  }
  return null;
}

/** The style text with only the allowed declarations; "" when none survive. Untouched when all of it is allowed. */
export function cleanStyle(style: string): string {
  const kept: string[] = [];
  let dropped = false;
  for (const part of style.split(";")) {
    if (!part.trim()) continue;
    const at = part.indexOf(":");
    const prop = at < 0 ? "" : part.slice(0, at).trim().toLowerCase();
    const value = at < 0 ? "" : part.slice(at + 1).trim();
    if (STYLES[prop]?.test(value)) kept.push(`${prop}: ${value}`);
    else dropped = true;
  }
  if (kept.length === 0) return "";
  return dropped ? kept.join("; ") : style;
}

export function sanitizeHtml(html: string, options: SanitizeOptions = {}): string {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");

  const walk = (node: Element) => {
    for (const child of Array.from(node.children)) {
      const tag = child.tagName.toLowerCase();
      if (DROP_WITH_CONTENT.has(tag)) {
        child.remove();
        continue;
      }
      walk(child);
      if (!TAGS.has(tag)) {
        child.replaceWith(...Array.from(child.childNodes));
        continue;
      }
      const allowed = ATTRS[tag] ?? {};
      for (const attr of Array.from(child.attributes)) {
        const name = attr.name.toLowerCase();
        if (name === "style") {
          const style = cleanStyle(attr.value);
          if (style) child.setAttribute("style", style);
          else child.removeAttribute(attr.name);
          continue;
        }
        const rule = allowed[name] ?? GLOBAL_ATTRS[name];
        if (!rule || (rule !== true && !rule.test(attr.value.trim()))) {
          child.removeAttribute(attr.name);
          continue;
        }
        if (name === "href" || name === "src") {
          const ok = safeUrl(attr.value, name === "href", name === "src" && tag === "img" && !!options.dataImages);
          if (ok === null) child.removeAttribute(attr.name);
          else child.setAttribute(attr.name, ok);
        }
      }
      if (tag === "a" && child.getAttribute("target") === "_blank") child.setAttribute("rel", "noopener noreferrer");
      // A span that lost every attribute says nothing.
      if (tag === "span" && child.attributes.length === 0) child.replaceWith(...Array.from(child.childNodes));
    }
  };
  walk(doc.body);
  return doc.body.innerHTML.trim();
}
