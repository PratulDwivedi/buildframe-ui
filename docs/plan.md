# buildframe-ui: plan

Status: AGREED 2026-10-30 (answers in section 9). Build in phase order.

Progress 2026-10-30: P0 to P4 built (45 tests pass). P5 done in buildframe_ecomm, local only, not committed:
the admin wears the bf theme (shadcn token remap), runs in the shared AppShell, its 8 lists are the shared
DataTable (exports follow the visible columns, bulk archive on 5 lists, Orders' placed date one range), its edit
panels are SlideOverForm, its sign-in is AuthShell + SignInForm. Checked on desktop light and dark; 400px left to
Pratul. Still to do: the public repo and tag, switch ecomm to the tag, deploy; then P6 buildframe-account.

Rollout (2026-10-30), all DONE and live: ecomm admin (v0.1.3, 92bb1c9), buildframe-account (v0.1.2), TripSetu
(v0.1.3, fd589d4), **InsightUno** (v0.1.3, ef5c6fb; insightuno docs/shared-ui-plan.md) and **portage_now_web_site admin**.
Left: genfashion, vyapar_ping, karaar (when started), and account's move to 0.1.3. Portage Now: v0.1.3, commit c585f02, live on www.portagenow.com; shell, header, the 6 lists, Combobox,
AuthShell sign-in with Google; its primary/slate Tailwind colours are bridged to Buildframe blue in its admin.css.

## 1. Why

The same components were copied app to app and have drifted. Scan of 2026-10-30:

| Component | Copies | Notes |
|---|---|---|
| Combobox (searchable dropdown) | 6: tripsetu, insightuno, karaar, account, ecomm, vyapar_ping | 121 to 316 lines; insightuno = karaar except a comment |
| List table + phone cards | 5: tripsetu, insightuno, portage_now, ecomm, vyapar_ping | chain portage → tripsetu → insightuno; ecomm's is URL and server driven |
| SlideOver / RecordSheet | 4 | insightuno = karaar byte for byte |
| Sidebar, SidebarContext, SidebarTrigger, ProfileMenu | 5 each | same layout, small edits |
| Tabs, RefreshButton, SignOutButton, ChangePasswordForm, FormatContext | 2 to 4 each | several byte identical |
| Login, signup, forgot, reset, Google button, auth shell | 6 apps | insightuno and karaar near identical; genfashion, account, ecomm, vyapar each their own |
| bf-signup helpers (`lib/platform/password.ts`, `signup.ts`) | 3 | insightuno, karaar, vyapar_ping |

Every web app is Next 16, React 19, Tailwind 4, TypeScript, lucide-react. The Flutter app
(portage_now_ecomm_mobile_app) is out of scope.

## 2. Decisions proposed

| # | Decision | Why |
|---|---|---|
| D1 | Separate PUBLIC repo `PratulDwivedi/buildframe-ui`, package name `@buildframe/ui`, semver git tags. Apps install it as a git dependency: `"@buildframe/ui": "github:PratulDwivedi/buildframe-ui#v0.1.0"`. npmjs.com can come later | Public, so no token anywhere (GitHub Packages asks for a token even for public packages, so it was dropped). Source is shipped (D2), so a git install needs no build. Each app upgrades when ready (TripSetu stays pinned) |
| D2 | Ship TypeScript source, no build step. Apps add `transpilePackages: ['@buildframe/ui']` and `@source "../../node_modules/@buildframe/ui/src";` in globals.css | No bundler to maintain; Tailwind sees the classes |
| D3 | Tokens are namespaced `bf-*` (`bg-bf-surface`, `text-bf-muted`, `border-bf-line` ...). Each app maps them once in its globals.css to its own colours | Apps disagree on names: in InsightUno `muted` is a text colour, in ecomm (shadcn) `muted` is a background. Unprefixed names would collide |
| D4 | Token roles follow the InsightUno family (canvas, surface, surface-alt, ink, copy, muted, line, line-strong, brand, brand-strong, on-brand, accent, danger / warn / ok bg+ink+line, ai, chart-1..5). `theme.css` ships the InsightUno palette as the default, light and dark | Already used by 4 apps; Pratul chose InsightUno as the default look |
| D4b | Runtime rebranding: `brandCss({ brand, brandDark, accent })` in the package writes `--bf-brand`, `--bf-brand-strong`, `--bf-on-brand`, `--bf-accent` (hex only, contrast picked) for light and dark. Ecomm feeds it the store's Appearance colours, so a store's admin follows its brand over the InsightUno base | Ecomm already rebrands at runtime (`lib/store/theme.ts`); any product's tenant can use the same helper |
| D5 | Components never fetch. Data comes in props; actions are passed in (`onSubmit`, server actions) | Package is product neutral; RPC-only house rule stays in each app |
| D6 | Two entry points: `@buildframe/ui` (components, auth forms) and `@buildframe/ui/core` (no React: list contract, export columns, brand CSS, safeNext, auth message codes). The bf-signup calls stay in each app: they need the app's own platform client and secret | Server-safe helpers without a Supabase dependency in the package |
| D7 | House rules are built in, not optional: every dropdown is the Combobox; phone first (cards below `sm`, nothing scrolls sideways at 400px); no em or en dashes in default copy; small edit forms open in SlideOver | These are the rules repeated in every app's docs |
| D8 | Port, don't reinvent: start from the most evolved copy of each component (named per component in section 4) and merge the others' features | Saved memory rule |
| D9 | Tests: vitest + Testing Library in the package for logic (Combobox keys, DataTable state, URL codec). A `playground/` Next app renders every component, light and dark, for 400px checks | Changes land in many apps; logic must be proven once |
| D10 | Rollout: buildframe_ecomm admin console first, then buildframe-account (after the other agent's work lands), then the rest. TripSetu last and only with its own go | Only TripSetu has a live client |

## 3. Package layout

```
buildframe-ui/
  package.json            name @buildframe/ui, exports ".", "./server", "./theme.css"
  src/
    theme.css             bf-* tokens, light + dark, Tailwind @theme
    primitives/           Button, IconButton, Input, Textarea, Label, Field, FormError,
                          Badge / StatusPill, Checkbox, Switch, Skeleton, EmptyState
    combobox/             Combobox (single, multi, async search)
    overlay/              SlideOver, Dialog (confirm), Menu
    data/                 DataTable, useListUrl, parseList, ListQuery, export helpers
    shell/                AppShell, Sidebar, SidebarContext, SidebarTrigger, Topbar,
                          HeaderActions context, ProfileMenu, RefreshButton
    auth/                 AuthShell, SignInForm, SignUpForm, ForgotForm, ResetForm,
                          ChangePasswordForm, GoogleButton, EmailCodeStep, auth error text
    format/               FormatContext (tenant zone, currency, date / time formats)
    server/               safeNext, bf-signup client, Google callback factory
  playground/             small Next app, every component, light / dark
  docs/plan.md            this file
  CHANGELOG.md
```

## 4. Components and which copy each starts from

| Component | Start from | Merge in |
|---|---|---|
| Combobox | insightuno `shared/Combobox.tsx` | ecomm's option shape (`ComboOption`), vyapar's multi select if it has one |
| DataTable | ecomm `admin/data-table` (URL is the state, server pages, filters with `clears`, date filter, Excel / CSV export, phone fold-away filters) | insightuno: client mode for small lists, quick filters after search, column filters; plus the advanced view (section 5) |
| SlideOver | insightuno `app/SlideOver.tsx` | ecomm `RecordSheet` props |
| Shell | ecomm `admin-shell` + `admin-topbar` + `admin-header-context` | insightuno Sidebar / ProfileMenu (name and role header) |
| Field, FormError, StatusPill | ecomm `admin/kit.tsx` | tripsetu `FormActions` |
| Tabs, RefreshButton, SignOutButton | insightuno | |
| Auth | insightuno (login, signup, forgot, reset, GoogleButton, AuthCard) | ecomm admin's emailed-code mode, karaar `login-errors` (tested), genfashion `PasswordForm` |
| FormatContext | buildframe-account | |

## 5. DataTable advanced view (to agree)

Today every copy has: search, filters, sort, paging with page size, CSV (ecomm also Excel), phone cards.
Proposed additions, his pick of which are v1:

| # | Feature | Proposed |
|---|---|---|
| A1 | View switch on desktop: Table / Cards (phone stays cards) | v1 |
| A2 | Column chooser: show, hide, reorder; remembered per person per list | v1 |
| A3 | Density: comfortable / compact | v1 |
| A4 | Row selection with bulk actions (archive, status change, export selected) | v1 |
| A5 | Advanced filters: date range, number range, multi-pick, "is empty", chips showing each active filter with a clear button | v1 |
| A6 | Saved views: name a filter + sort + columns set; per person first, shared with the team later | v1 per person, team later |
| A7 | Export follows the view: only visible columns, in their order | v1 |
| A8 | Sticky header and sticky first column on wide tables | v1 |
| A9 | Row click opens the record in SlideOver (or its page for big forms) | v1 |
| A10 | Totals row for numeric columns | later |
| A11 | Group by a column with subtotals | later |
| A12 | Column resize | later |
| A13 | Kanban by status (Orders, Tasks) | later |

Storage for A2, A3 and A6 per person: browser storage for v1 (wrapped, falls back cleanly). Team-shared
saved views need a `bf_*` table and RPC pair, designed when we get there.

## 6. Auth components

UI (in `@buildframe/ui`): AuthShell (logo slot, optional poster side, one centred card), SignInForm
(password, optional Google, optional emailed code), SignUpForm, ForgotForm, ResetForm,
ChangePasswordForm, GoogleButton, EmailCodeStep, `authErrorText()` (one place for the messages).

Server (in `@buildframe/ui/server`): `safeNext(path, prefix)` (no off-site redirects),
`requestPasswordReset` and `signUp` through bf-signup, `googleCallbackHandler(opts)` for the
`/auth/google/callback` route.

Each app keeps its own routes (`/admin/login`, `/app/login` ...), its own Supabase client, its
own logo and copy, and passes actions to the forms. Shopper sign-in on the ecomm storefront is not
in scope for v1 (storefront is themed per store).

## 7. Phases

| Phase | Work | Proof |
|---|---|---|
| P0 | Repo, package.json, exports, `theme.css`, vitest, playground, public GitHub repo and tag v0.1.0 | `npm i github:PratulDwivedi/buildframe-ui#v0.1.0` works locally and in a Vercel build |
| P1 | Primitives, Combobox, SlideOver, FormatContext | tests pass; playground at 400px, light and dark |
| P2 | DataTable: ecomm base + insightuno merge + agreed advanced view | tests for URL codec, selection, column prefs; playground |
| P3 | Shell: AppShell, Sidebar, Topbar, HeaderActions, ProfileMenu | playground |
| P4 | Auth UI + server helpers | tests for safeNext and error text |
| P5 | buildframe_ecomm admin console switched over: bf-* token bridge in globals.css (admin only, storefront untouched), then shell, login, and the 8 list screens (products, orders, customers, categories, departments, brands, promotions, pages), then forms on Field / Combobox / SlideOver; delete the replaced local copies | lint + build; every screen on the demo store at 400px and in dark mode; Pratul's look-and-feel review; then production deploy |
| P6 | buildframe-account, after the other agent's work is merged | same checks |
| P7 | genfashion, vyapar_ping, karaar (when started); insightuno and portage_now admin DONE 2026-10-30 | per app |
| P8 | TripSetu, only with its own go, tested on its demo tenant before anything reaches a live client (DONE 2026-10-30) | |

## 8. Risks

- Client stores share the ecomm admin; Pratul accepts that it changes on deploy. Test on the demo store.
- Public repo: nothing product specific, no keys, no tenant data, no client names in the package.
- Release friction: a fix means tag then bump in each app. `npm link` (or a `file:` path) for local work, never committed.
- Ecomm uses Radix (shadcn) under its dialogs and menus; the package uses hand-rolled InsightUno
  versions. Focus trap and keyboard handling must be tested in the playground, not assumed.

## 9. Answers (Pratul, 2026-10-30)

1. Advanced view: as proposed in section 5 (A1 to A9 in v1, A10 to A13 later).
2. Look: InsightUno palette is the default; ecomm's runtime rebranding must keep working (D4b).
3. Client stores on ecomm: fine, they are also under review; P5 may change their admin when deployed.
4. Package: public, not private (D1).
5. Only TripSetu is a real client; broken code is acceptable in the other apps while they move over.
