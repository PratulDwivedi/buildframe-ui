# @buildframe/ui

Shared React components for Buildframe products (Next 16, React 19, Tailwind 4): the searchable
dropdown, the data table with phone cards and advanced views, the slide-over panel, the page header
slot, and (coming) the app shell and auth forms. Plan and decisions: [docs/plan.md](docs/plan.md).

## Install

```sh
npm install https://codeload.github.com/PratulDwivedi/buildframe-ui/tar.gz/refs/tags/v0.1.1
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
| `@buildframe/ui/theme.css` | `bf-*` colour tokens, light and dark | CSS |

## Tokens

Every colour is `bf-` prefixed: `bg-bf-surface`, `text-bf-muted`, `border-bf-line`, `bg-bf-brand`.
A tenant's brand: put `brandCss({ brand, brandDark, accent })` in a `<style>` in `<head>`.

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
