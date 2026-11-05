# Theme standard

One base for every Buildframe app. The base lives in `src/theme.css`; a product changes its brand colour and nothing else.

## What the base gives every app

- **Neutrals**: `bf-canvas`, `bf-surface`, `bf-surface-alt`, `bf-ink`, `bf-copy`, `bf-muted`, `bf-line`, `bf-line-strong`.
- **Status**: `ok`, `warn` (fill) and `warn-ink`, `danger`, `neutral`, each with a `-bg` and `-ink` where text sits on it.
- **AI** (violet): reserved for "the AI said this".
- **Charts**: `bf-chart-1` to `bf-chart-5`.
- **Dark mode**: `.dark` on `<html>`. An app that also follows the device adds `data-bf-theme="system"`; `.light` opts out.

Use the classes (`bg-bf-surface`, `text-bf-muted`, `border-bf-line`) or the variables. Do not write a hex value in a component.

## What a product may change

Only the brand tokens: `bf-brand`, `bf-brand-hover`, `bf-brand-strong`, `bf-brand-bg`, `bf-on-brand`, and the accent trio `bf-accent`, `bf-accent-strong`, `bf-on-accent`.

- A tenant's brand at runtime: `brandCss({ brand, brandDark, accent })` in a `<style>` in `<head>`.
- A product's fixed brand: set the same tokens in the app's own CSS after the import, for `:root` and for `.dark`.

A brand override must carry its own dark values, and must keep the rules below.

## Contrast rules

`test/theme.test.ts` fails the build if any of these slip.

- Every text pair is at least 4.5:1 in light and in dark (the list is in the test).
- `bf-brand` is the fill and carries `bf-on-brand` (white) text. `bf-brand-strong` is the version for words. In dark mode `bf-brand-strong` must lift to a light tint, because the fill is too dark to read as text on a dark surface.
- The hover colour must also keep `bf-on-brand` at 4.5:1. In dark mode it is lighter than the fill, so check it.
- Teal and other accent fills are fills. Words use `bf-accent-strong`.
- The dark set and the follow-the-device set in `theme.css` are the same declarations. Edit both together; the test compares them.

## Not in the package yet

- **Type.** The Buildframe family uses Space Grotesk 700 for headings and Plus Jakarta Sans for body, through the `next/font` variables `--font-grotesk` and `--font-jakarta`. Each app still sets these itself.
- **Base element rules** (body colour, heading font, pointer cursor on buttons, reduced motion). Each app still carries its own copy.
- **Form field borders.** `bf-line-strong` is about 1.4:1 against the page. WCAG 1.4.11 asks 3:1 for a control's edge. Not changed here because it makes every field visibly heavier; decide before changing.

## Apps that already use the older names

InsightUno, account, karaar and the website write colours as `--bg-main`, `--card-bg`, `--text-heading`, `--brand` and so on. Import `@buildframe/ui/family.css` after `theme.css` and delete the app's own copy of those values; the names keep working and point at the package. Do not declare those names again in the app, or its own value (especially inside `.dark`) will win over the alias.

## Adopting it in an app

1. `@import "@buildframe/ui/theme.css";` after Tailwind, and `transpilePackages: ["@buildframe/ui"]`.
2. Delete the app's own copies of neutral, status and chart tokens; map any old names to `--bf-*` in one place.
3. Keep only the brand tokens, light and dark.
4. Replace hex values in components with token classes. Keep exceptions for third-party marks (WhatsApp green, the Google logo), OG images and emails.
5. Check 390px and desktop, light and dark.
