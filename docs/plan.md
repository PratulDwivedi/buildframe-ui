# buildframe-ui: pending plan

Updated 2026-11-05. This file lists only what is still to do. What is built is in CHANGELOG.md (current version 0.4.0),
the colour and theme rules are in docs/theme-standard.md.

Standing rules for every item below: public repo, nothing product specific, no keys or client names in the package;
phone first (check at ~400px and desktop, light and dark); every dropdown is the Combobox; no em or en dashes in copy;
a fix means tag, then bump the pin in each app.

## 1. Apps not yet on the package

| App | What is left |
|---|---|
| buildframe-karaar | Takes only the theme and the progress bar. Still local: shell and Sidebar, Combobox, DataTable, SlideOver, auth forms. Move them onto the package, then drop the local copies. |
| genfashion-app | Not on the package at all (no dependency). Theme, shell, lists, forms, auth. Its own go before it starts. |
| vyapar_ping (app and website) | Not on the package. Separate track, its own go. |
| anant_travels_next | Out of scope for now. |

## 2. Gaps in the package

| # | Item | Notes |
|---|---|---|
| G1 | `@buildframe/ui/server` entry | `safeNext`, `requestPasswordReset` and `signUp` through bf-signup, Google callback factory. Three apps (insightuno, karaar, vyapar_ping) still carry their own copies of the bf-signup helpers. |
| G2 | FormatContext | `src/format/` is empty. buildframe-account has the working copy (tenant zone, currency, date and time formats); port it. |
| G3 | Type | Space Grotesk 700 for headings and Plus Jakarta Sans for body, through `--font-grotesk` and `--font-jakarta`. Every app still sets these itself. |
| G4 | Base element rules | Body colour, heading font, pointer cursor on buttons, reduced motion. Every app carries its own copy. |
| G5 | Form field borders | `bf-line-strong` is about 1.4:1 on the page; WCAG 1.4.11 asks 3:1 for a control edge. Decide on `--bf-input-line` before changing, it makes every field heavier. |
| G6 | Playground | A small Next app that renders every component, light and dark, for 400px checks. Not built. Focus trap and keyboard handling under SlideOver, Menu and Combobox are tested only in unit tests until it exists. |
| G7 | Primitives not yet shared | Switch, Dialog (confirm). Add when the first app needs them, from the most evolved local copy. |

## 3. DataTable, later

- A10 totals row for numeric columns
- A11 group by a column with subtotals
- A12 column resize
- A13 kanban by status (Orders, Tasks)
- Team-shared saved views: needs a `bf_*` table and an RPC pair, designed when we get there. Per-person views live in
  browser storage today.

## 4. Navigation progress bar, follow-ups

- Apps whose lists use `onRowClick` and then call `router.push` should call `useNavProgress().start()` first
  (`DataTable` does it for `rowHref` itself). Only buildframe-sites is done.
- A link that opens a modal instead of navigating will start the bar until the 8 second stop. Put `data-no-progress`
  on such a link if one turns up.

## 5. Cross-app: page load time (in progress, 2026-11-05)

- The Vercel functions run in `iad1` (Washington D.C.) and the database `buildframe_db` is in `ap-southeast-1`
  (Singapore). Every RPC from a page is an inter-continental round trip. Fix is a function region next to the database
  (`sin1`) for every app that reads it; none of the repos sets one.
- Pages that call RPCs one after another (bookings: financial years, then bookings) wait twice. Merge, parallelise or
  cache the first.
- Details and the measured numbers go in each app's PENDING.md as they are confirmed.
