import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DataTable, type DataColumn } from "../src/data/DataTable";

const push = vi.fn();
let search = "";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: push, refresh: vi.fn(), back: vi.fn() }),
  usePathname: () => "/admin/products",
  useSearchParams: () => new URLSearchParams(search),
}));

type Row = { id: string; name: string; price: number };
const rows: Row[] = [
  { id: "1", name: "Bag", price: 50 },
  { id: "2", name: "Belt", price: 120 },
];
const columns: DataColumn<Row>[] = [
  { key: "name", label: "Name", sort: "name", primary: true, render: (r) => r.name },
  { key: "price", label: "Price", sort: "price", align: "right", render: (r) => r.price },
  { key: "notes", label: "Notes", defaultHidden: true, render: () => "n" },
];
const query = { q: "", page: 1, size: 25, sort: "name", dir: "asc" as const, filters: { status: "paid" } };

beforeEach(() => {
  push.mockReset();
  search = "status=paid";
  window.localStorage.clear();
});

it("draws visible columns, hides default-hidden ones, and shows a chip per active filter", () => {
  render(
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      total={2}
      query={query}
      filters={[{ param: "status", placeholder: "All statuses", options: [{ value: "paid", label: "Paid" }] }]}
    />,
  );
  const table = screen.getByRole("table");
  expect(within(table).getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["Name", "Price"]);
  expect(screen.getByText("Statuses:")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Remove filter Statuses" })).toBeInTheDocument();
});

it("selects rows and hands them to the bulk actions", async () => {
  const bulk = vi.fn(() => null);
  render(<DataTable columns={columns} rows={rows} rowKey={(r) => r.id} total={2} query={query} bulkActions={bulk} />);
  const table = screen.getByRole("table");
  await userEvent.click(within(table).getByRole("checkbox", { name: "Select all rows on this page" }));
  expect(screen.getByText("2 selected")).toBeInTheDocument();
  expect(bulk).toHaveBeenLastCalledWith(rows, expect.any(Function));
});

it("sorts from a header and keeps the filter in the URL", async () => {
  render(<DataTable columns={columns} rows={rows} rowKey={(r) => r.id} total={2} query={query} />);
  await userEvent.click(within(screen.getByRole("table")).getByRole("button", { name: /Price/ }));
  expect(push).toHaveBeenCalledWith("/admin/products?status=paid&sort=price&dir=asc", { scroll: false });
});

it("opens a row on click but not when a link inside it is clicked", async () => {
  const open = vi.fn();
  render(
    <DataTable
      columns={[{ ...columns[0], render: (r) => <a href="#x">{r.name}</a> }, columns[1]]}
      rows={rows}
      rowKey={(r) => r.id}
      total={2}
      query={query}
      onRowClick={open}
    />,
  );
  const table = screen.getByRole("table");
  await userEvent.click(within(table).getByText("120"));
  expect(open).toHaveBeenCalledWith(rows[1]);
  open.mockReset();
  await userEvent.click(within(table).getByText("Bag"));
  expect(open).not.toHaveBeenCalled();
});

it("says no rows match and offers to clear when filtered", () => {
  render(<DataTable columns={columns} rows={[]} rowKey={(r) => r.id} total={0} query={query} noun={{ one: "product", many: "products" }} />);
  expect(screen.getByText("No products match.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Clear search and filters/ })).toBeInTheDocument();
});

it("puts Download CSV and Excel in the table's more menu, with the visible columns and no page", async () => {
  search = "status=paid&page=2";
  window.history.replaceState(null, "", "/admin/products?status=paid&page=2");
  render(<DataTable columns={columns} rows={rows} rowKey={(r) => r.id} total={2} query={query} exportPath="/admin/products/export" />);
  await userEvent.click(screen.getByRole("button", { name: "More actions" }));
  const csv = screen.getByRole("menuitem", { name: /Download CSV/ }).getAttribute("href")!;
  const qs = new URLSearchParams(csv.split("?")[1]);
  expect(csv.startsWith("/admin/products/export?")).toBe(true);
  expect(qs.get("format")).toBe("csv");
  expect(qs.get("cols")).toBe("name,price");
  expect(qs.get("page")).toBeNull();
  expect(qs.get("status")).toBe("paid");
  expect(screen.getByRole("menuitem", { name: /Download Excel/ })).toBeInTheDocument();
});

it("has no count line above the table; the footer carries it", () => {
  render(<DataTable columns={columns} rows={rows} rowKey={(r) => r.id} total={2} query={query} />);
  expect(screen.getByText("1 to 2 of 2")).toBeInTheDocument();
  expect(screen.queryByText("2 rows", { selector: "p:not(.sr-only)" })).toBeNull();
});

it("a click in the checkbox cell that misses the box ticks the row and does not open it", async () => {
  const open = vi.fn();
  render(<DataTable columns={columns} rows={rows} rowKey={(r) => r.id} total={2} query={query} onRowClick={open} bulkActions={() => null} />);
  const cell = within(screen.getByRole("table")).getAllByRole("cell")[0];
  await userEvent.click(cell.querySelector("label")!);
  expect(open).not.toHaveBeenCalled();
  expect(screen.getByText("1 selected")).toBeInTheDocument();
});
