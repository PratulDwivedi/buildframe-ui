# @buildframe/ui

Shared React components for Buildframe products (Next 16, React 19, Tailwind 4): the searchable
dropdown, the data table with phone cards and advanced views, the slide-over panel, the page header
slot, and (coming) the app shell and auth forms. Plan and decisions: [docs/plan.md](docs/plan.md).

## Install

```sh
npm install https://codeload.github.com/PratulDwivedi/buildframe-ui/tar.gz/refs/tags/v0.7.1
```

Use the tarball URL, not `github:PratulDwivedi/buildframe-ui`: npm records a `github:` install as
`git+ssh`, which a Vercel build cannot fetch. To upgrade, change the tag in the URL and install again.

`next.config.ts`:

```ts
transpilePackages: ["@buildframe/ui"],
```

`globals.css`, after Tailwind:

```css
@import "tailwindcss";
@import "@buildframe/ui/theme.css";
```

Dark mode follows `.dark` on `<html>`. To also follow the device, put `data-bf-theme="system"` on
`<html>`; `.light` then opts out.

## Entry points

| Import | What | Where it runs |
|---|---|---|
| `@buildframe/ui` | components (`Combobox`, `MultiCombobox`, `DataTable`, `SlideOver`, `SlideOverForm`, `Button`, `Field`, `StatusPill` ...) | client components |
| `@buildframe/ui/core` | `parseList`, `applyList`, `pickExportColumns`, `toCsv`, `brandCss` ... | anywhere, incl. route handlers |
| `@buildframe/ui/editor` | `HtmlEditor`, `sanitizeHtml`, `formatHtml` | client components |
| `@buildframe/ui/theme.css` | `bf-*` colour tokens, light and dark | CSS |
| `@buildframe/ui/rich-text.css` | `.bf-rich-text` for html written in the editor, and the editor's own styles | CSS |

## Tokens

Every colour is `bf-` prefixed: `bg-bf-surface`, `text-bf-muted`, `border-bf-line`, `bg-bf-brand`.
A tenant's brand: put `brandCss({ brand, brandDark, accent })` in a `<style>` in `<head>`.
What is standard, what a product may change, and the contrast rules: [docs/theme-standard.md](docs/theme-standard.md).

## Rich text editor

```css
@import "@buildframe/ui/theme.css";
@import "@buildframe/ui/rich-text.css";
```

```tsx
import { HtmlEditor, sanitizeHtml } from "@buildframe/ui/editor";

<HtmlEditor value={html} onChange={setHtml} onUploadImage={(file) => uploadAndReturnHttpsUrl(file)} />
// before saving: sanitizeHtml(html)
// on the public page: <article className="bf-rich-text" dangerouslySetInnerHTML={{ __html: stored }} />
```

- The editor never uploads or saves: the app passes `onUploadImage` and keeps `value`.
- `embedImages` allows base64 images inside the html. Turn it on only where the server that stores the html accepts
  `data:` addresses; then also call `sanitizeHtml(html, { dataImages: true })`.
- `sanitizeHtml` runs in the browser and is the first check, not the only one. The server that stores the html must
  refuse scripts, frames, forms, event attributes and `javascript:` addresses again.
- A page with its own palette sets `--bf-rich-link`, `--bf-rich-line`, `--bf-rich-muted` and `--bf-rich-soft` on `.bf-rich-text`.

## Rules the components carry

- Every dropdown is `Combobox` (searchable). No native `<select>`.
- Phone first: lists become cards below `sm`; nothing scrolls sideways at 400px.
- Components never fetch; data comes in props, actions are passed in.
- No em or en dashes in default copy.

## Local work

```sh
# in the app, once
npm install ../buildframe-ui --install-links
# after each change here
npm run sync -- ../buildframe_ecomm
npm test
```
