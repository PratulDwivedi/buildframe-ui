# Changelog

## 0.12.1 (2026-11-25)

Save goes where the house puts it: the page header, top right.

- **New `PageSaveAction`:** a form's Save button drawn in the page header (`type="submit"` tied to the form by `form={formId}`), with a short "Saved" beside it and a Refresh icon after it. With the page's `PageHeader` declared after the form, the order is Save, Refresh, then the "?" help. Outside a `PageHeaderProvider` it draws in place.
- **`AppearanceForm` uses it** when the page has a header (new optional `formId`, default `appearance-form`); without one the button stays under the form, as in 0.12.0. Nothing else changes.
- **House practice:** a form screen puts its Save in the page header through `PageSaveAction`, not at the bottom of the form. Other forms move onto it as they are next touched.
- Tests first: 4 new, 363 in all; a deliberate break (the form never uses the header) fails a named test.
- Not checked: the header at 400px (the buttons share the row with the title).

## 0.12.0 (2026-11-25)

A tenant's Appearance screen, in one place. Two products already carried their own copy of this form; the third (a property portal) needed it, so it moves here.

- **New, `@buildframe/ui/site`:** `AppearanceForm` (logo, favicon, primary colour, primary in dark mode, accent colour, default mode, show the name beside the logo, show the light/dark switch, and any number of default pictures by slot, with a live sample), `AppearanceSample`, `ColorField` (picker and hex together, blank allowed).
- **What the product supplies:** `onSave(value)` answering `{ error }` (its own server action) and `renderImage(slot)` (its own picture upload, because where pictures are stored differs by product). Nothing in the form knows a table, a bucket or a product.
- **Same checks on the server:** `appearanceErrors`, `brandFromAppearance`, `emptyAppearance`, `APPEARANCE_MODES` are plain functions, also exported from `@buildframe/ui/core`. A colour is a six-digit hex or blank; the logo, favicon and default pictures are https addresses or blank; the mode is `system`, `light` or `dark`.
- **`themeInitScript(key, defaultMode?)`:** an optional second argument, `"light"` (the old behaviour, still the default), `"dark"` or `"system"` (follow the device). It applies only until the visitor has switched; a stored choice always wins. Existing calls are unchanged.
- Tests first: 16 new, 359 in all. Four deliberate breaks (hex check removed, sample text colour fixed, stored choice ignored, form saving despite errors) each fail a named test.
- Not checked: the form in a real browser at 400px and in dark mode (no playground yet, G6); the product's picture upload inside it.

## 0.11.1 (2026-11-22)

Three small fixes to the server-side files of 0.11.0, found by the first independent review of a product that uses them. No product had a failing file; each case needed an unusual value.

- `toXlsxFile`: the sheet name is cut to 31 characters **before** it is escaped (it was cut after, so a name with `&` near the end could be left as `&am`, which Excel reports as a corrupt file). The characters Excel forbids in a sheet name (`[ ] : * ? / \`) are removed, and a name with nothing left is `Export`.
- `toXlsxFile`: a number that is `NaN` or `Infinity` is written as an empty cell (it was written as `<v>NaN</v>`, which is not valid). `csvCell`, and so both CSV writers, prints it as an empty cell too (it printed the word).
- Tests first: 4 new, 343 in all, four deliberate breaks each failing a named test. One existing test asserted the old, wrong order (the escaped name at most 31 characters); it now checks the name as written.

## 0.11.0 (2026-11-22)

CSV and Excel downloads, in one place, and safe to open. Three products each carried their own copy of the server-side files; the browser export had no protection against formulas at all.

- **Fix, `toCsv` (browser export behind `downloadCsv` and every `DataTable` download):** a text cell, or a header, that starts with `=`, `+`, `-`, `@`, a tab or a carriage return gets a leading quote, so a row named `=HYPERLINK(...)` opens as text instead of executing. Real numbers (`-5`) and booleans are left alone; text that merely contains those characters later (an e-mail address) is unchanged. **Behaviour change to know about:** a text cell such as `"-5"` now reads `'-5` in the file; pass a number, not a string, when a column is numeric. The rule lives in one exported function, `csvCell`, which the server files below use too.
- **New, `@buildframe/ui/server`:** `toCsvFile(header, body)` (RFC 4180, CRLF, a UTF-8 byte-order mark so Excel reads non-ASCII text), `toXlsxFile(sheet, header, body)` (a dependency-free `.xlsx`: stored zip, escaped XML, control characters dropped, formulas never written, widths 10 to 48, sheet name cut to 31) and `fileResponse(format, baseName, header, body, { sheet?, cols?, ties? })`, the download `Response` every export route returns (right type, dated file name, `no-store`). The files are the ones account and Ecomm already shipped, moved here unchanged apart from sharing `csvCell`.
- **`ties` stays with the product.** With the table's `?cols=` the file keeps only the columns the person can see, in their order. Which export column belongs to which table column is product knowledge: each screen passes its own map (header text to column key; `"*"` ties every unlisted header to one column). A product keeps a small file with its maps and a thin `fileResponse` wrapper, so its routes do not change.
- Node only (`node:zlib` `crc32`): import it from route handlers and server code, never from a client component. It is not in `core`, so client bundles are unaffected.
- Tests first: 43 new, 339 in all (the 31 account tests for these files ported here, plus the formula guard). Eight deliberate breaks (numbers prefixed, CR unprotected, checksum zero, wildcard tie dropped, byte-order mark removed, `&` unescaped, sheet name ignored) each fail a named test; one change to the `cols` guard proved equivalent, because `pickExportColumns` already returns every column for an empty value.
- Proved in two products before release: account's 31 export tests pass unchanged through a wrapper over this code, and account and Ecomm both pass `npm run check` and a production build against it.
- Not covered: opening the files in Excel, Numbers or Sheets (the zip is checked structurally, every checksum recomputed).

## 0.10.0 (2026-11-21)

One look for every stat tile. Until now each page and product chose its own layout (stacked, inline or corner) and wrote its own adapter, so the same component looked different everywhere.

- **`StatTile`'s default layout is now `corner`** (the title and a large number at the left, the icon top right, the subtitle under it), the look the account console and Qevli already use. **No product renders differently from this change alone:** every product that uses the package's tile already passes `layout`. (Buildframe Sites draws its own local tile and is unaffected until it moves onto the package.) Products stop passing `layout` as they move onto this version; `stacked`, `inline` and `accent` stay in the package for the few screens that cannot take the default.
- **The corner tile fits narrow columns.** The title wraps to two lines (and is the tooltip when cut), and the big number is sized by the width of its own column (container queries): 30px when there is room, down to 18px, and it wraps rather than run under the icon. Measured in a 390px frame: two tiles across, number at 18px, no page overflow; at 360px a seven-digit amount wraps onto two lines.
- **`StatTile` is as tall as its cell by default** (`h-full`), so a tile in a list item or a link needs no extra class.
- **New `StatRow`:** the one grid for a row of tiles. Columns follow the number of tiles drawn (a `false` or `null` child, such as a tile shown only to some people, does not count, and Fragments are looked into): 1 to 6 across on a wide screen (more than six wrap); one across on a phone for one to three tiles, two across for four or more; every tile as tall as its cell; nothing drawn when there are none. `as="ul"` with `label` makes it a labelled list (each tile in an item). A component that itself renders several tiles counts as one child.
- Tests first: 21 new, 296 in all. A reviewer (fresh context) found 3 Majors in the first pass (the wrong note about Sites, the number overflowing a narrow tile, a Fragment counted as one tile) and a duplicate-key bug in the fix to the third; all fixed and tested, plus the Minors, fixed or documented here.
- A tile sizes its number by the width of its own column, so put it in a column that has a width (`StatRow`, or any grid cell). Placed in a plain flex row with no width it can shrink to almost nothing.
- Not covered by tests: the look in a real browser. The class-based tests cannot see overflow; it was measured by hand as above.

## 0.9.1 (2026-11-21)

Fixes to 0.9.0, found while moving the first product onto it and by the post-fix review. No product had pinned 0.9.0 yet.

- `StaffBanner`: product links on `http://localhost` or `http://127.0.0.1` (any port) are shown again. 0.9.0 dropped every plain-http link, which would have hidden the local-development links the platform console builds from its environment settings. Any other plain `http`, a look-alike host such as `localhost.evil.example` and `localhost@evil.example` stay refused.
- `StaffBanner`: while the exit action runs, the Exit button's accessible name is its visible text ("Exiting...") instead of a stale "Exit staff view".
- `SignOutButton`: new `wrapperClassName`, for the outer element that holds the button and its error message, so an app can make the button full width or place it in a flex row. `className` still styles the button itself.
- Tests: 4 new, 275 in all.

## 0.9.0 (2026-11-21)

Two components that six products each carried their own copy of. Moving a product onto them removes its copy; nothing else in the package changes.

- `SignOutButton`: signs out first, then goes to `to` (a plain link to the login page is a trap on a "not authorised" screen, because the proxy bounces a signed-in person straight back). Nothing is navigated when signing out fails, whether the function throws or resolves `{ error }` (how Supabase reports it); the person sees "Could not sign out" and can try again, and `onError` is called. Disabled while it runs, so a double click signs out once. Primary by default; takes `variant`, `size`, `className`, `children` (instead of `label`) and `fullReload` (a full page load instead of a client navigation, as Qevli's copy did).
  - **`to` is required** (the copies differed: `/admin/login` in TripSetu and Sites, `/app/login` elsewhere).
  - It is a client component, so `signOut` is a function prop and cannot be passed from a server component: each app keeps a tiny client wrapper that supplies `() => createClient().auth.signOut()`. The doc comment has the three-line example.
- `StaffBanner`: the bar shown while platform staff are inside a customer's organisation. Says whose data, read-only or "you can change things" (different tone and words, never colour alone), until when, and the recorded reason; an Exit button that disables itself while the exit action runs. Props: `session`, `exitAction` (a server action, used as the form action), **`formatTime` (required: it renders on the server, and a default would show the server's time zone)**, optional `links` to other product consoles (only `https:` and same-site paths are shown). A labelled region (`aria-label="Staff view"`), not a live region. An unreadable `expires_at` leaves "until ..." out instead of printing "Invalid Date".
  - Visible changes for the products that move onto it: the wording is "Staff view: <name> · read-only" everywhere; in the platform console it replaces "Inside <name> · can edit", and its edit tone changes from the accent colour to the warning tone.
- Both are exported from `@buildframe/ui`. Tests first: 22 new, 271 in all.
- Reviewed by an independent reviewer before release (fresh context): 14 findings, all Majors fixed, Minors fixed or documented above.

## 0.8.0 (2026-11-20)

- New entry point `@buildframe/ui/server`, for server code only (it uses Node's crypto): the helpers three products each carried a copy of.
  - `createBf(product)`: calls to the platform's `bf-signup` edge function with the project's secret key (`call`, `signUpOrganisation`, `requestPasswordReset`, `hashInviteToken`). The product name is bound once and cannot be overridden by a request body. An empty or missing key or url is refused, and a network failure or a non-JSON answer comes back as `ok: false`, never a throw.
  - `callRpc`, `callRpcEnvelope`, `callRpcPaged`: unwrap the database envelope `{ is_success, data, message, paging }` from any client with an `rpc` method. A failed envelope is an error, never data.
  - `createGoogleSignIn({ clientId, clientSecret })`: the Google sign-in handshake handled by the app (`configured`, `startSignIn`, `exchangeCode`) with state, PKCE, a hashed nonce, and checks of issuer, audience, expiry, nonce and verified email. `GoogleError` carries a code the callback maps to a message.
- `safeNext`, `authMessage` and the other auth helpers are unchanged (`@buildframe/ui/core`).
- Not in this release: `FormatContext` (package plan G2).

## 0.7.2 (2026-11-20)

- `Popover` (the menu behind "Move to", the column chooser, the Download choices): it now opens above its button when it would run off the bottom of the screen and there is room above, and never past the top. It always opened below before, so a menu on a row near the bottom of a page was cut off and unreachable (a `fixed` panel cannot be scrolled into view).

## 0.7.1 (2026-11-20)

- `StatTile` (the shared stats card) gains `subtitle`, `subIcon` and `subTone`: a line under the number with its own small icon, muted by default or coloured ok, warn, bad or brand ("3 due this week" with a clock, "2 late" in red with an alert). Icon, title (`label`), number (`value`), `tone`, `change`, `foot` and `href` are as before, so existing uses are unchanged. New `layout="inline"`: the icon at the left, the title above, and the number and subtitle on one line beside it, about half the height of the default `"stacked"`, for a row of tiles on a dashboard (the subtitle wraps under the number on a narrow tile). Also `layout="corner"` (title and a large number at the left, the icon in the top-right corner, the subtitle underneath) and `layout="accent"` (no icon tile: a coloured edge and a small icon before the title; the densest).
- `Board`: screen reader announcements in plain words ("Picked up WEB-149, position 1 of 4 in To do", "Dropped it in In progress, position 2 of 3") and instructions that point to the card's Move button, instead of dnd-kit's default that names ids.

## 0.7.0 (2026-11-20)

- `Board` and `moveItem`, in their own entry point `@buildframe/ui/board` (an app without a board does not bundle it). Columns of cards that move by dragging the handle (pointer, finger, or keyboard: Space, arrow keys, Space), or by each card's Move menu, so no one has to drag (WCAG 2.5.7). On a phone one column shows at a time with a tab row to switch. The caller owns the items and answers `onMove(id, toColumnId, toIndex)`; `moveItem` is the pure function that applies a move to the list (array order is the order inside each column).
- New dependencies: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` (MIT). Chosen over a hand-written drag because it handles touch and keyboard dragging.

## 0.6.3 (2026-11-20)

- `DataTable`: the desktop scroll box is now `relative`, so screen-reader-only text (`sr-only` is absolutely positioned) in a cell scrolled out of view no longer widens the page with a sideways scrollbar.

## 0.6.2 (2026-11-20)

- `Tabs`: in URL-parameter and controlled mode a tab no longer has `aria-controls` pointing at a panel that does not exist (axe `aria-valid-attr-value`). Only `TabPanels`, which draws the panels, sets it.

## 0.6.1 (2026-11-20)

- `Tabs` and `TabPanels`: a keyboard-focused tab and the tab panel now show a focus ring (WCAG 2.4.7).
- `AvatarStack`: the overlap is 4px instead of 6px, so the second initial is no longer cut off.

## 0.6.0 (2026-11-20)

- New components: `Tabs` and `TabPanels` (URL parameter support), `Avatar` and `AvatarStack` (initials or image), `ProgressBar`, `Feed` (activity items with optional links).
- Category colours added to the theme, and `@buildframe/ui/base.css` for foundational styles (typography, reduced motion).
- Theme helpers: `useThemeToggle` and theme init for dark mode.
- `AppShell` simplified (theme logic moved into the shared helpers).

## 0.5.0 (2026-11-14)

- `HtmlEditor`, a rich text editor, in its own entry point `@buildframe/ui/editor` (an app that does not use it does not bundle it). Built on Tiptap 3 (ProseMirror, MIT). What you see is the html that is stored.
  - Toolbar: undo and redo, text style (the Combobox), bold, italic, underline, strikethrough, text size, colour and highlight, clear formatting, alignment, bulleted, numbered and check lists with indent, link, image, table, quote, divider, inline code, subscript and superscript.
  - Keyboard: "/" on a line opens the insert menu; Markdown-style shortcuts ("## ", "- ", "1. ", "[ ] ", "> ", "---"); Mod+K link, Mod+F find.
  - A bar over selected text, over a link (open, edit, remove) and over an image (alignment, width as a share of the page, description, remove).
  - Tables: size grid, add and delete rows and columns, heading row and column, merge and split.
  - Images three ways: uploaded through `onUploadImage`, by address, or embedded as base64 with `embedImages` (off by default, bitmap types only, shrunk to `maxEmbedBytes`). Paste and drop are simple: a copied picture or screenshot is uploaded (or embedded when there is no uploader); pictures inside text copied from a document are uploaded and the text keeps them.
  - Find and replace, a phone-width check, an HTML view (formatted, cleaned on the way back), full screen, a status bar (where the cursor is, words, characters, reading time), read only with `disabled`.
  - `onChange` fires for edits only, never for loading or focusing; an empty editor is `""`.
- `sanitizeHtml` (moved from buildframe_ecomm and widened to what the editor writes: alignment, colour, highlight, size, image width and alignment, checklists; `{ dataImages: true }` keeps base64 images), `cleanStyle`, `formatHtml`, `textStats`.
- `@buildframe/ui/rich-text.css`: `.bf-rich-text` styles the stored html on the public page exactly as in the editor. Four variables (`--bf-rich-link`, `--bf-rich-line`, `--bf-rich-muted`, `--bf-rich-soft`) point it at a page that is not on the bf palette. A checklist is stored without an `<input>`; the tick is drawn by this file.
- `Popover`: `open` and `onOpenChange` (controlled), `role="dialog"` for a panel holding a form, and a panel with nothing focusable now closes on Escape.
- New dependencies: `@tiptap/*` 3.34 and `@floating-ui/dom`.

## 0.4.0 (2026-11-05)

- The navigation bar now also shows for in-page navigation, not only sidebar links: a click on any internal `<a>` under `AppShell` or `NavProgressProvider` starts it, and a change of path or query string ends it (8 second safety). Opt a link out with `data-no-progress`. New tab, download, hash-only and same-URL links are ignored.
- `useNavProgress().start()` for code that calls `router.push` itself. `DataTable` calls it for `rowHref` rows. An `onRowClick` handler that navigates should call `start()` first.
- Console pages need no `loading.tsx`; this bar is the loading signal.

## 0.3.0 (2026-11-05)

- Navigation progress bar (from InsightUno, which had it from genfashion-app): `AppShell` now shows a 2px bar across the top while a sidebar link is loading. Colour is `--bf-accent` (teal, the logo's closing stop), identical in every product whatever its brand. No app code needed.
- `NavProgressProvider` and `LinkPending` are exported for links outside the shell. An app that kept its own copy (InsightUno) deletes it, with its `.nav-progress` CSS, and drops any `badge: <LinkPending />`, which would count a link twice.

## 0.2.0 (2026-11-05)

- Theme standard: `docs/theme-standard.md` says what every app takes from the package and what a product may change (the brand tokens only).
- Contrast fixes found in an audit of the apps: `--bf-muted` and `--bf-neutral-ink` in light mode are `#5f6a7e` (were `#667085`, 4.43:1 on `surface-alt` and `neutral-bg`); `--bf-brand-hover` in dark mode is `#1a62e8` (was `#168fe8`, 3.43:1 under white button text).
- New token `--bf-warn` (`#f5a623`, a fill for stars, ratings and markers). Class: `bg-bf-warn`, `text-bf-warn`.
- `test/theme.test.ts` checks that 21 text pairs stay at 4.5:1 in light and dark, and that the dark set and the follow-the-device set stay identical.
- Apps that took `#18233a` or `#0f1829` for the dark alternate surface: the package value is `#18233a`.
- `@buildframe/ui/family.css`: the older names the InsightUno family uses (`--bg-main`, `--card-bg`, `--text-heading`, `--brand` ...), each a `var(--bf-*)` alias. An app imports it instead of keeping its own copy of the values. `test/family.test.ts` checks every alias points at a token `theme.css` defines.

## 0.1.3 (2026-10-30)

- Help panel (from TripSetu): `PageHeader` takes `help`, which adds a "?" at the right end of the header opening a panel
  that explains the page. `PageHelp` is the button and panel on its own; `HelpSection` and `HelpSteps` build the text
  and work in server components.
- A CSV built in the browser can follow the visible columns: a `menuActions` item's `onSelect` now receives the keys of
  the columns the person can see, in their order. Pass them to `pickExportColumns` as `cols`.
- core: `toCsv` (export columns and rows to CSV text). Components: `downloadCsv`, `downloadText` (save it in the browser).

## 0.1.2 (2026-10-30)

- Dashboards (from buildframe_ecomm's dashboard): `StatTile` (icon, value, change against the period before, footnote, optional link),
  `DashCard`, `Change` (`upIsGood` false for errors), `BarSeries` (bars per day in plain CSS, one bar per key, a title per bar),
  `ShareBars` (each row's share of the largest), `PeriodSwitch` (7 / 30 / 90 days in `?days`, the default left out of the URL).
- core: `periodChange`, `bucketSeries` (days into weeks), `pickPeriod`.
- DataTable `paged={false}` (a whole short list: no rows-per-page or page buttons) and `refresh={false}` (no second Refresh in the
  page header when a page has two tables).
- DataTable search box: 192px wide from `sm` up (was up to 384px and growing); full width on a phone. The placeholder is also its title.
- DataTable toolbar: Views and Display are icon buttons like "⋯", with a tooltip (the active saved view's name is in the Views tooltip).
- Sidebar: condensed rows (13px, 16px icons, tighter padding and group gaps) indented under their group heading.
- NavItem `match`: the item is active under that path instead of under its `href`.

## 0.1.1 (2026-10-30)

- DataTable `pageSizes`: an app's own rows-per-page choices (buildframe-account uses 20, 50, 100).
- AppShell: `brand.wordmark` (the name in the product's own lettering), `menuExtra` (more controls in the account
  menu, such as an accent picker), `tenant` may be any element (a badge beside the name).
- SlideOver `closeOnEscape`: off for a panel only its close button may close.
- Google sign-in started by a server action (`google={{ action, next }}`) as well as by a link.

## 0.1.0 (2026-10-30)

- Theme: `bf-*` tokens on the InsightUno palette, light and dark, device-following opt-in; `brandCss` for runtime rebranding.
- Primitives: Button, ButtonLink, IconButton, Input, Textarea, Label, Field, FormError, FormNotice, Checkbox, StatusPill, Skeleton, EmptyState, Card.
- Combobox (from insightuno, plus ecomm's `clearable`, sizes) and MultiCombobox.
- SlideOver (state or routed) and SlideOverForm; Popover menu.
- DataTable (from ecomm): URL state, server paging, filters (one, many, date, date range, number range) with chips, phone cards, plus the advanced view: table or cards, column show / hide / reorder, row spacing, row selection with bulk actions, saved views (this browser), sticky header and first column, row click, export of the visible columns.
- PageHeaderProvider / PageHeader / PageActions (the topbar slot).
- core: parseList, applyList, matchesAny, inRange, pickExportColumns, safeNext, authMessage, signInErrorText.
- DataTable: no count line above the table (the footer has it); Download CSV / Excel in the toolbar's "⋯" menu (as buildframe-account); selection bar in the footer; compact rows by default; the checkbox cell is the tick target and never opens the row.
- Combobox opens on click, typing or arrow keys, not on focus.
- AppShell: sidebar (grouped links, longest-match active, desktop collapse, phone drawer), topbar with the page title and actions, account menu (name, role, tenant, links, dark mode, sign out).
- Auth: AuthShell (form column + optional poster), SignInForm (password and / or emailed code, Google), ForgotPasswordForm, ResetPasswordForm, ChangePasswordForm, SignUpForm with CheckEmail, GoogleButton.
- Removed the empty `./server` entry; server-safe helpers are in `./core`.
