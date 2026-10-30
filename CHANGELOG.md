# Changelog

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
