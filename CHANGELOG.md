# Changelog

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
