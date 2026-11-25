# @buildframe/ui

Shared React components for every Buildframe product (searchable Combobox, DataTable with phone cards, SlideOver, page
header, app shell, auth forms, theme, rich-text editor, `@buildframe/ui/server`). **Read [docs/plan.md](docs/plan.md) first**
(to-do only), then [CHANGELOG.md](CHANGELOG.md) for what is built and the current version, and
[docs/theme-standard.md](docs/theme-standard.md) for colour.

**Platform standard:** `../buildframe-account/docs/app-standard.md` (section 7 is this package's reason to exist).
**Working agreement:** `../buildframe-standards/profiles/buildframe/working-agreement.md`.

## Non-negotiables

- **This repo is public.** Nothing product specific, no keys, no client or tenant names, no real people, emails or domains
  in code, docs, tests or examples (app-standard section 7a).
- Shared first (DRY, app-standard 7b): the second product that needs a thing is the trigger to move it here. A fix means a
  tag here, then a bump of the pinned tag in each app. Apps install from the tarball URL, never `github:`.
- Test first. Behaviour that only a browser shows (focus trap, keyboard handling in SlideOver, Menu, Combobox) is tested in
  unit tests only until the playground (docs/plan.md G6) exists, so say what was not checked.
- Phone first: check at ~400px and desktop, light and dark. Every dropdown is the Combobox. No em or en dashes in copy.
- A form screen puts its Save in the page header, top right, with `PageSaveAction` (Save, Refresh, then the help "?"; the button shows a green Saved for a moment, never a word left on screen); never at the bottom of the form.
- Colour is defined once, here (`theme.css`, `family.css`). Apps do not redeclare these names.
- A release is a tag plus a CHANGELOG entry. Do not tag or push without Pratul's go.

## Commands

```
npm test            # Vitest; must be all green
npm run typecheck   # tsc --noEmit; must print nothing
npm run sync -- ../<app>   # local only: copy src into an app's node_modules to try a change
```

Done means `npm test` and `npm run typecheck` both pass, with the output shown.
