import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppShell, activeHref, initials } from "../src/shell/AppShell";
import { PageActions, PageHeader } from "../src/shell/page-header";

let path = "/admin/products/new";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
  usePathname: () => path,
  useSearchParams: () => new URLSearchParams(),
}));

const nav = [
  { group: "Sales", items: [{ href: "/admin", label: "Dashboard", exact: true }, { href: "/admin/orders", label: "Orders" }] },
  { group: "Catalogue", items: [{ href: "/admin/products", label: "Products" }, { href: "/admin/products/new", label: "New product" }] },
];

it("lights the longest matching link only, and an exact link only on its own path", () => {
  expect(activeHref("/admin/products/new", nav)).toBe("/admin/products/new");
  expect(activeHref("/admin/products/abc", nav)).toBe("/admin/products");
  expect(activeHref("/admin/orders/x", nav)).toBe("/admin/orders");
  expect(activeHref("/admin/settings", nav)).toBeUndefined();
  expect(activeHref("/admin", nav)).toBe("/admin");
});

it("makes initials from a name or an email", () => {
  expect(initials({ name: "Ecomm Admin", email: null })).toBe("EA");
  expect(initials({ name: null, email: "hello+admin@buildframe.tech" })).toBe("HA");
});

it("draws the page title and actions in the topbar, and signs out from the account menu", async () => {
  path = "/admin/orders";
  const signOut = vi.fn();
  render(
    <AppShell brand={{ logo: <span />, name: "Demo store", subtitle: "Back office", href: "/admin" }} nav={nav} user={{ name: "Ecomm Admin", email: "hello+admin@buildframe.tech", role: "admin" }} tenant="Demo store" onSignOut={signOut}>
      <PageHeader title="Orders" subtitle="7 new" />
      <PageActions>
        <button type="button">New order</button>
      </PageActions>
    </AppShell>,
  );
  expect(screen.getByRole("heading", { level: 1, name: "Orders" })).toBeInTheDocument();
  expect(await screen.findByRole("button", { name: "New order" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Orders" })).toHaveAttribute("aria-current", "page");
  await userEvent.click(screen.getByRole("button", { name: /Ecomm Admin/ }));
  expect(screen.getByRole("menu", { name: "Account" })).toHaveTextContent("admin");
  await userEvent.click(screen.getByRole("menuitem", { name: /Sign out/ }));
  expect(signOut).toHaveBeenCalled();
});

it("lights an item under its match path", () => {
  const groups = [{ group: "P", items: [{ href: "/admin/invoicing/invoices", match: "/admin/invoicing", label: "Invoices" }, { href: "/admin/logs", label: "Logs" }] }];
  expect(activeHref("/admin/invoicing", groups)).toBe("/admin/invoicing/invoices");
  expect(activeHref("/admin/invoicing/invoices/inv_1", groups)).toBe("/admin/invoicing/invoices");
  expect(activeHref("/admin/invoicingx", groups)).toBeUndefined();
});
