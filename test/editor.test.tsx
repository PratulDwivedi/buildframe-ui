import { describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import { Editor } from "@tiptap/core";
import { HtmlEditor, cleanStyle, formatHtml, sanitizeHtml, textStats } from "../src/editor";
import { createSlashStore, editorExtensions, findState, replaceFound, setFind } from "../src/editor/extensions";

const headless = (content: string) =>
  new Editor({ content, extensions: editorExtensions({ placeholder: "", headingLevels: [2, 3, 4], slash: createSlashStore(), slashItems: () => [] }) });

// What a typical server-side second check refuses (buildframe_ecomm's ecomm_fn_unsafe_html).
const REFUSED = [
  /<\s*\/?\s*(script|style|iframe|frame|frameset|object|embed|applet|form|input|button|textarea|select|link|meta|base|svg|math)\b/i,
  /\son[a-z]+\s*=/i,
  /(javascript|vbscript|data)\s*:/i,
];

const RICH = `
<h2 style="text-align: center">Returns</h2>
<p>You can <strong>return</strong> <em>most</em> <u>items</u> <s>today</s> within <mark data-color="#fef08a" style="background-color: #fef08a">30 days</mark>.
<span style="color: #dc2626; font-size: 1.25em">Sale items</span> are final. H<sub>2</sub>O, x<sup>2</sup>, <code>CODE10</code>,
<a href="https://example.com/help" target="_blank" rel="noopener noreferrer">help</a> and <a href="/contact">contact</a>.</p>
<ul><li><p>One</p><ul><li><p>Nested</p></li></ul></li><li><p>Two</p></li></ul>
<ol><li><p>First</p></li></ol>
<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><div><p>Packed</p></div></li><li data-type="taskItem" data-checked="false"><div><p>Sent</p></div></li></ul>
<blockquote><p>Quoted</p></blockquote>
<pre><code>a &lt; b</code></pre>
<hr>
<img src="https://example.com/a.webp" alt="A shoe" style="width: 50%" data-align="center">
<table><tbody><tr><th><p>Size</p></th><th><p>Fit</p></th></tr><tr><td colspan="2"><p>All</p></td></tr></tbody></table>
`;

describe("sanitizeHtml", () => {
  it("removes scripts, frames, forms, handlers and unsafe addresses", () => {
    const out = sanitizeHtml(
      `<p onclick="x()">Hi<script>alert(1)</script></p><iframe src="https://x.test"></iframe><form><input name="a"></form>` +
        `<a href="javascript:alert(1)">a</a><img src="data:image/png;base64,AAAA" onerror="x()"><svg><circle/></svg><style>p{}</style>`,
    );
    expect(out).toBe(`<p>Hi</p><a>a</a><img>`);
    for (const r of REFUSED) expect(out).not.toMatch(r);
  });

  it("unwraps unknown tags and keeps their text", () => {
    expect(sanitizeHtml(`<section><p>Kept <font color="red">words</font></p></section>`)).toBe(`<p>Kept words</p>`);
  });

  it("keeps only the allowed style declarations", () => {
    expect(cleanStyle("text-align: center")).toBe("text-align: center");
    expect(cleanStyle("color: #dc2626; position: fixed; background-image: url(https://x.test/a)")).toBe("color: #dc2626");
    expect(cleanStyle("background-color: url(javascript:x)")).toBe("");
    expect(cleanStyle("width: 50%; height: 9999px")).toBe("width: 50%");
    expect(sanitizeHtml(`<p style="position:fixed;top:0">x</p>`)).toBe(`<p>x</p>`);
    expect(sanitizeHtml(`<span style="behavior: url(x)">x</span>`)).toBe(`x`);
  });

  it("keeps only known data attributes with known values", () => {
    expect(sanitizeHtml(`<ul data-type="taskList" data-x="1"><li data-type="evil" data-checked="true">a</li></ul>`)).toBe(
      `<ul data-type="taskList"><li data-checked="true">a</li></ul>`,
    );
    expect(sanitizeHtml(`<img src="https://example.com/a.png" data-align="middle" class="x">`)).toBe(`<img src="https://example.com/a.png">`);
  });

  it("adds rel to links that open a new tab and refuses protocol-relative addresses", () => {
    expect(sanitizeHtml(`<a href="https://example.com" target="_blank">x</a>`)).toBe(`<a href="https://example.com" target="_blank" rel="noopener noreferrer">x</a>`);
    expect(sanitizeHtml(`<a href="//evil.test">x</a>`)).toBe(`<a>x</a>`);
    expect(sanitizeHtml(`<a href="mailto:you@company.com">x</a>`)).toBe(`<a href="mailto:you@company.com">x</a>`);
  });
});

describe("embedded (base64) images", () => {
  const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

  it("are removed by the sanitiser unless asked for, and never as SVG or outside an image", () => {
    expect(sanitizeHtml(`<img src="${PNG}" alt="dot">`)).toBe(`<img alt="dot">`);
    expect(sanitizeHtml(`<img src="${PNG}" alt="dot">`, { dataImages: true })).toBe(`<img src="${PNG}" alt="dot">`);
    expect(sanitizeHtml(`<img src="data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=">`, { dataImages: true })).toBe(`<img>`);
    expect(sanitizeHtml(`<img src="data:text/html;base64,PHNjcmlwdD4=">`, { dataImages: true })).toBe(`<img>`);
    expect(sanitizeHtml(`<a href="${PNG}">x</a>`, { dataImages: true })).toBe(`<a>x</a>`);
  });

  it("are kept by an editor that allows them and dropped by one that does not", () => {
    const make = (embedImages: boolean) =>
      new Editor({
        content: `<p>a</p><img src="${PNG}" alt="dot">`,
        extensions: editorExtensions({ placeholder: "", headingLevels: [2], slash: createSlashStore(), slashItems: () => [], embedImages }),
      });
    const on = make(true);
    expect(on.getHTML()).toContain(`src="${PNG}"`);
    on.destroy();
    const off = make(false);
    expect(off.getHTML()).not.toContain("data:");
    off.destroy();
  });
});

describe("the editor's own html", () => {
  it("passes the sanitiser unchanged and holds nothing a server check refuses", () => {
    const editor = headless(RICH);
    const html = editor.getHTML();
    expect(sanitizeHtml(html)).toBe(html);
    for (const r of REFUSED) expect(html).not.toMatch(r);
    // Every feature survived the round trip through the schema.
    for (const piece of [
      'text-align: center', "<strong>", "<em>", "<u>", "<s>", '<mark data-color="#fef08a"', 'color: rgb(220, 38, 38)', 'font-size: 1.25em', "<sub>", "<sup>", "<code>",
      'target="_blank"', 'href="/contact"', 'data-type="taskList"', 'data-checked="true"', "<blockquote>", "<pre>", "<hr>",
      'width: 50%', 'data-align="center"', 'colspan="2"', "<th",
    ]) {
      expect(html).toContain(piece);
    }
    editor.destroy();
  });

  it("stores a checklist without an input element", () => {
    const editor = headless("<p>x</p>");
    editor.chain().selectAll().toggleTaskList().run();
    expect(editor.getHTML()).toContain(`<ul data-type="taskList"><li data-checked="false" data-type="taskItem"><div><p>x</p></div></li></ul>`);
    expect(editor.getHTML()).not.toContain("<input");
    editor.destroy();
  });

  it("drops what is outside the schema when html is loaded", () => {
    const editor = headless(`<p>ok</p><script>alert(1)</script><iframe src="https://x.test"></iframe><img src="data:image/png;base64,AAAA">`);
    const html = editor.getHTML();
    for (const r of REFUSED) expect(html).not.toMatch(r);
    expect(html).toContain("<p>ok</p>");
    editor.destroy();
  });

  it("a link opens in the same tab unless asked otherwise", () => {
    const editor = headless("<p>word</p>");
    editor.chain().selectAll().setLink({ href: "https://example.com" }).run();
    expect(editor.getHTML()).toBe(`<p><a href="https://example.com">word</a></p>`);
    editor.destroy();
  });
});

describe("find and replace", () => {
  it("counts matches, ignoring case unless asked, and replaces one or all", () => {
    const editor = headless("<p>Tea and tea</p><p>More <strong>TEA</strong> here</p>");
    setFind(editor, { query: "tea" });
    expect(findState(editor).matches).toHaveLength(3);
    setFind(editor, { matchCase: true });
    expect(findState(editor).matches).toHaveLength(1);
    setFind(editor, { matchCase: false, index: 0 });
    replaceFound(editor, "Coffee", false);
    expect(editor.getText()).toContain("Coffee and tea");
    replaceFound(editor, "chai", true);
    expect(editor.getHTML()).toBe("<p>Coffee and chai</p><p>More <strong>chai</strong> here</p>");
    expect(findState(editor).matches).toHaveLength(0);
    editor.destroy();
  });
});

describe("formatHtml and textStats", () => {
  it("puts one block per line, indents nested blocks, and survives a round trip", () => {
    const html = `<h2>Title</h2><ul><li><p>One <strong>bold</strong></p></li></ul><pre><code>a\n  b</code></pre>`;
    const formatted = formatHtml(html);
    expect(formatted).toBe(`<h2>Title</h2>\n<ul>\n  <li>\n    <p>One <strong>bold</strong></p>\n  </li>\n</ul>\n<pre><code>a\n  b</code></pre>`);
    const editor = headless(html);
    const before = editor.getHTML();
    editor.commands.setContent(formatHtml(before));
    // The editor adds an empty paragraph after a closing code block; HtmlEditor does not store it.
    expect(editor.getHTML().replace(/(<p><\/p>)+$/, "")).toBe(before);
    editor.destroy();
  });

  it("counts words, characters and reading time", () => {
    expect(textStats("")).toEqual({ words: 0, characters: 0, minutes: 0 });
    expect(textStats("Hello there\n\nworld")).toEqual({ words: 3, characters: 17, minutes: 1 });
  });
});

describe("HtmlEditor", () => {
  it("shows the html, reports edits as html, and reports empty as an empty string", async () => {
    const onChange = vi.fn();
    render(<HtmlEditor value="<p>Hello</p>" onChange={onChange} aria-label="Body" />);
    const box = await screen.findByRole("textbox", { name: "Body" });
    expect(box).toHaveTextContent("Hello");
    expect(screen.getByRole("toolbar", { name: "Formatting" })).toBeInTheDocument();
    // Loading a value is not an edit.
    expect(onChange).not.toHaveBeenCalled();

    const editor = (box as unknown as { editor: Editor }).editor;
    act(() => {
      editor.chain().selectAll().toggleBold().run();
    });
    expect(onChange).toHaveBeenLastCalledWith("<p><strong>Hello</strong></p>");
    // The bar over the selection has a Bold button too; this is the toolbar's.
    const toolbar = within(screen.getByRole("toolbar", { name: "Formatting" }));
    await waitFor(() => expect(toolbar.getByRole("button", { name: "Bold" })).toHaveAttribute("aria-pressed", "true"));

    // A list at the end: the empty paragraph the editor keeps after it is not stored.
    act(() => {
      editor.chain().selectAll().toggleBulletList().run();
    });
    expect(onChange).toHaveBeenLastCalledWith("<ul><li><p><strong>Hello</strong></p></li></ul>");

    act(() => {
      editor.commands.clearContent(true);
    });
    expect(onChange).toHaveBeenLastCalledWith("");
  });

  it("read only: no toolbar and the text cannot be edited", async () => {
    render(<HtmlEditor value="<p>Fixed</p>" onChange={() => {}} disabled />);
    const box = await screen.findByRole("textbox");
    expect(box).toHaveAttribute("contenteditable", "false");
    expect(screen.queryByRole("toolbar")).toBeNull();
  });
});
