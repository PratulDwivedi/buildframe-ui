# Changelog

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
