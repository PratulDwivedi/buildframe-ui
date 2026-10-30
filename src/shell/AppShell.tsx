"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeftIcon, ChevronUpIcon, LogOutIcon, MenuIcon, MoonIcon, XIcon } from "lucide-react";
import { cn } from "../lib/cn";
import { useOutsidePress } from "../combobox/position";
import { PageHeaderProvider, usePageActionsSlot, usePageHeader } from "./page-header";

/**
 * The console frame every Buildframe product shares: a sidebar of grouped links with the account menu at its
 * foot, and a topbar carrying the page title and the page's action buttons.
 *
 * Merged from insightuno components/app/Sidebar + SidebarContext + ProfileMenu (themselves from genfashion-app)
 * and buildframe_ecomm components/admin/admin-shell + admin-sidebar + admin-topbar + profile-menu:
 *   - below lg the sidebar is an off-canvas drawer with a backdrop; Escape closes it and the page behind does
 *     not scroll (insightuno);
 *   - from lg up it is a sticky full-height column that can collapse to icons, remembered per browser (ecomm);
 *   - the active link is the longest href the path sits under, so /app/connections/logs does not also light
 *     Connections (insightuno);
 *   - the account menu opens upward with name, email, role and tenant, the product's own links, a dark-mode
 *     switch and sign out (both).
 * The product supplies the nav, logo, menu links and the sign-out action; the shell knows no product.
 */

export type NavItem = {
  href: string;
  label: string;
  icon?: React.ReactNode;
  /** Active only on this exact path (a dashboard at "/admin" must not light up on every page under it). */
  exact?: boolean;
  /** A count or tag at the end of the row. */
  badge?: React.ReactNode;
};
export type NavGroup = { group: string; items: NavItem[] };

export type ProfileLink = { label: string; href: string; icon?: React.ReactNode; external?: boolean };

export type ShellUser = { name: string | null; email: string | null; avatar?: string | null; role?: string | null };

type SidebarState = { open: boolean; setOpen: (o: boolean) => void; collapsed: boolean; setCollapsed: (c: boolean) => void };
const SidebarCtx = React.createContext<SidebarState | null>(null);

/** The drawer and collapse state, for a custom trigger. */
export function useSidebar() {
  const ctx = React.useContext(SidebarCtx);
  if (!ctx) throw new Error("useSidebar must be used inside AppShell");
  return ctx;
}

const COLLAPSE_KEY = "bf-ui:sidebar-collapsed";

export function activeHref(path: string, groups: NavGroup[]): string | undefined {
  return groups
    .flatMap((g) => g.items)
    .filter((it) => (it.exact ? path === it.href : path === it.href || path.startsWith(`${it.href}/`)))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

/** From the name, else from the email's local part ("hello+admin@x" -> "HA"), never from the domain. */
export function initials(user: ShellUser): string {
  return (
    (user.name?.trim() || user.email?.split("@")[0] || "?")
      .split(/[\s+._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join("") || "?"
  );
}

export function AppShell({
  brand,
  nav,
  user,
  tenant,
  profileLinks = [],
  onSignOut,
  theme,
  collapsible = true,
  banner,
  children,
}: {
  /** The logo mark, the product or tenant name, a small line under it, and where the logo links. */
  brand: { logo: React.ReactNode; name: string; subtitle?: string; href: string };
  nav: NavGroup[];
  user: ShellUser;
  /** The workspace or store name, shown in the account menu. */
  tenant?: string | null;
  profileLinks?: ProfileLink[];
  /** A server action or a client sign-out. */
  onSignOut: () => void | Promise<void>;
  /** Shows the Dark mode switch in the account menu. */
  theme?: { dark: boolean; toggle: () => void };
  /** Desktop collapse to icons. */
  collapsible?: boolean;
  /** A strip under the topbar (a plan or trial notice). */
  banner?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [collapsed, setCollapsedState] = React.useState(false);
  React.useEffect(() => {
    try {
      if (collapsible && window.localStorage.getItem(COLLAPSE_KEY) === "1") setCollapsedState(true);
    } catch {
      // Blocked storage: start expanded.
    }
  }, [collapsible]);
  const setCollapsed = React.useCallback((c: boolean) => {
    setCollapsedState(c);
    try {
      window.localStorage.setItem(COLLAPSE_KEY, c ? "1" : "0");
    } catch {
      // The choice lasts until reload.
    }
  }, []);

  // While the drawer is open the page behind does not scroll, and Escape closes it.
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const path = usePathname();
  // A link followed on a phone closes the drawer.
  const [seenPath, setSeenPath] = React.useState(path);
  if (seenPath !== path) {
    setSeenPath(path);
    setOpen(false);
  }

  const state = React.useMemo(() => ({ open, setOpen, collapsed, setCollapsed }), [open, collapsed, setCollapsed]);
  const narrow = collapsible && collapsed;

  return (
    <SidebarCtx.Provider value={state}>
      <PageHeaderProvider>
        <div data-bf-shell className="flex min-h-screen bg-bf-canvas text-bf-copy">
          <div
            onClick={() => setOpen(false)}
            aria-hidden
            className={cn("fixed inset-0 z-40 bg-black/35 transition-opacity duration-200 lg:hidden", open ? "opacity-100" : "pointer-events-none opacity-0")}
          />
          <aside
            aria-label="Navigation"
            className={cn(
              "fixed inset-y-0 left-0 z-50 flex w-[264px] shrink-0 flex-col border-r border-bf-line bg-bf-surface transition-[transform,width] duration-200 ease-out",
              "lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:self-start",
              narrow ? "lg:w-[68px]" : "lg:w-[248px]",
              open ? "translate-x-0" : "-translate-x-full",
            )}
          >
            <SidebarBody brand={brand} nav={nav} narrow={narrow} collapsible={collapsible} path={path} />
            <div className="border-t border-bf-line p-2">
              <ProfileMenu user={user} tenant={tenant} links={profileLinks} onSignOut={onSignOut} theme={theme} narrow={narrow} />
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar fallbackTitle={brand.name} />
            {banner}
            <main className="flex-1 p-4 lg:p-6">{children}</main>
          </div>
        </div>
      </PageHeaderProvider>
    </SidebarCtx.Provider>
  );
}

function SidebarBody({
  brand,
  nav,
  narrow,
  collapsible,
  path,
}: {
  brand: { logo: React.ReactNode; name: string; subtitle?: string; href: string };
  nav: NavGroup[];
  narrow: boolean;
  collapsible: boolean;
  path: string;
}) {
  const { setOpen, setCollapsed } = useSidebar();
  const active = activeHref(path, nav);
  return (
    <>
      <div className={cn("flex h-14 shrink-0 items-center gap-2.5 border-b border-bf-line px-4", narrow && "lg:justify-center lg:px-0")}>
        <Link href={brand.href} className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center">{brand.logo}</span>
          <span className={cn("min-w-0 leading-tight", narrow && "lg:hidden")}>
            <span className="block truncate text-sm font-bold tracking-tight text-bf-ink">{brand.name}</span>
            {brand.subtitle && <span className="block truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-bf-muted">{brand.subtitle}</span>}
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close navigation"
          className="ml-auto grid size-8 shrink-0 place-items-center rounded-lg text-bf-muted hover:bg-bf-surface-alt hover:text-bf-ink lg:hidden"
        >
          <XIcon className="size-[18px]" />
        </button>
        {collapsible && !narrow && (
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
            className="ml-auto hidden size-7 shrink-0 place-items-center rounded-md text-bf-muted hover:bg-bf-surface-alt hover:text-bf-ink lg:grid"
          >
            <ChevronsLeftIcon className="size-4" />
          </button>
        )}
      </div>
      {/* Collapsed, the expand button sits right under the logo, not at the foot where a dev badge would cover it. */}
      {collapsible && narrow && (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          aria-label="Expand sidebar"
          title="Expand sidebar"
          className="hidden h-9 w-full items-center justify-center border-b border-bf-line text-bf-muted hover:bg-bf-surface-alt hover:text-bf-ink lg:flex"
        >
          <ChevronsLeftIcon className="size-4 rotate-180" />
        </button>
      )}

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4 [scrollbar-width:none]">
        {nav.map((g) => (
          <div key={g.group} className="mb-5 last:mb-0">
            <p className={cn("mb-1.5 px-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-bf-muted", narrow && "lg:sr-only")}>{g.group}</p>
            <ul className="space-y-0.5">
              {g.items.map((it) => {
                const on = it.href === active;
                return (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      title={narrow ? it.label : undefined}
                      aria-current={on ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors [&_svg]:size-[18px] [&_svg]:shrink-0",
                        narrow && "lg:justify-center lg:px-0",
                        on ? "bg-bf-brand-bg font-semibold text-bf-brand-strong" : "text-bf-ink hover:bg-bf-surface-alt [&_svg]:opacity-75",
                      )}
                    >
                      {it.icon}
                      <span className={cn("min-w-0 flex-1 truncate", narrow && "lg:sr-only")}>{it.label}</span>
                      {it.badge && <span className={cn("shrink-0 text-xs text-bf-muted", narrow && "lg:hidden")}>{it.badge}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </>
  );
}

/** The page title and, below lg, the button that opens the drawer. The page's action buttons render at its right. */
function Topbar({ fallbackTitle }: { fallbackTitle: string }) {
  const header = usePageHeader();
  const setSlot = usePageActionsSlot();
  const { setOpen } = useSidebar();
  return (
    <header className="sticky top-0 z-30 border-b border-bf-line bg-bf-surface/85 backdrop-blur-md">
      <div className="flex h-14 items-center gap-3 px-4 lg:px-6">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          className="-ml-1 grid size-9 shrink-0 place-items-center rounded-lg text-bf-ink hover:bg-bf-surface-alt lg:hidden"
        >
          <MenuIcon className="size-5" />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-[15px] font-semibold leading-tight text-bf-ink">{header?.title ?? fallbackTitle}</h1>
          {header?.subtitle && <p className="truncate text-xs text-bf-muted">{header.subtitle}</p>}
        </div>
        <div ref={setSlot} className="ml-auto flex shrink-0 items-center gap-1.5" />
      </div>
    </header>
  );
}

const ITEM = "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-bf-ink transition-colors hover:bg-bf-surface-alt focus-visible:bg-bf-surface-alt outline-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-bf-muted";

function Avatar({ user, size }: { user: ShellUser; size: string }) {
  if (user.avatar) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={user.avatar} alt="" className={cn("shrink-0 rounded-full object-cover", size)} />;
  }
  return <span className={cn("grid shrink-0 place-items-center rounded-full bg-bf-brand-bg text-[11px] font-semibold text-bf-brand-strong", size)}>{initials(user)}</span>;
}

/** The account menu at the sidebar's foot. Opens upward; outside click or Escape closes it. */
export function ProfileMenu({
  user,
  tenant,
  links,
  onSignOut,
  theme,
  narrow = false,
}: {
  user: ShellUser;
  tenant?: string | null;
  links: ProfileLink[];
  onSignOut: () => void | Promise<void>;
  theme?: { dark: boolean; toggle: () => void };
  narrow?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [signingOut, startSignOut] = React.useTransition();
  const root = React.useRef<HTMLDivElement>(null);
  useOutsidePress(open, [root], () => setOpen(false));
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const shown = user.name ?? user.email?.split("@")[0] ?? "Account";

  return (
    <div ref={root} className="relative">
      {open && (
        <div role="menu" aria-label="Account" className="absolute bottom-full left-0 z-20 mb-2 w-[248px] overflow-hidden rounded-xl border border-bf-line bg-bf-surface shadow-[var(--bf-shadow-pop)]">
          <div className="flex items-center gap-2.5 border-b border-bf-line px-3.5 py-3">
            <Avatar user={user} size="size-9" />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[13px] font-semibold text-bf-ink">{shown}</p>
              {user.email && <p className="truncate text-[11px] text-bf-muted">{user.email}</p>}
            </div>
            {user.role && <span className="shrink-0 rounded-full bg-bf-neutral-bg px-2 py-0.5 text-[10px] font-semibold capitalize text-bf-neutral-ink">{user.role}</span>}
          </div>
          {tenant && <p className="truncate border-b border-bf-line px-3.5 py-2 text-[11px] text-bf-muted">{tenant}</p>}

          {(links.length > 0 || theme) && (
            <div className="p-1.5">
              {links.map((l) =>
                l.external ? (
                  <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" role="menuitem" className={ITEM} onClick={() => setOpen(false)}>
                    {l.icon}
                    {l.label}
                    <span aria-hidden className="ml-auto text-[11px] text-bf-muted">↗</span>
                  </a>
                ) : (
                  <Link key={l.href} href={l.href} role="menuitem" className={ITEM} onClick={() => setOpen(false)}>
                    {l.icon}
                    {l.label}
                  </Link>
                ),
              )}
              {theme && (
                // Stays open so the switch can be seen to change.
                <button type="button" role="menuitemcheckbox" aria-checked={theme.dark} onClick={theme.toggle} className={ITEM}>
                  <MoonIcon />
                  Dark mode
                  <span aria-hidden className={cn("ml-auto flex h-[22px] w-[38px] shrink-0 items-center rounded-full p-[3px] transition-colors", theme.dark ? "bg-bf-brand" : "bg-bf-neutral-bg")}>
                    <span className={cn("size-4 rounded-full bg-white shadow-sm transition-transform", theme.dark ? "translate-x-4" : "translate-x-0")} />
                  </span>
                </button>
              )}
            </div>
          )}

          <div className="border-t border-bf-line p-1.5">
            <button
              type="button"
              role="menuitem"
              disabled={signingOut}
              onClick={() => startSignOut(async () => void (await onSignOut()))}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-semibold text-bf-danger-ink transition-colors hover:bg-bf-danger-bg disabled:opacity-60"
            >
              <LogOutIcon className="size-4" />
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={narrow ? "Account menu" : undefined}
        className={cn("flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors", open ? "bg-bf-surface-alt" : "hover:bg-bf-surface-alt", narrow && "lg:justify-center lg:px-0")}
      >
        <Avatar user={user} size="size-8" />
        <span className={cn("min-w-0 flex-1 leading-tight", narrow && "lg:hidden")}>
          <span className="block truncate text-[13px] font-semibold text-bf-ink">{shown}</span>
          {user.email && <span className="block truncate text-[11px] text-bf-muted">{user.email}</span>}
        </span>
        <ChevronUpIcon className={cn("size-4 shrink-0 text-bf-muted transition-transform", !open && "rotate-180", narrow && "lg:hidden")} />
      </button>
    </div>
  );
}
