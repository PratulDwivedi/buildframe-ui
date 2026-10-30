import { applyList, inRange, matchesAny, parseList, pickExportColumns, splitMany, toCsv, type ExportColumn } from "../src/data/list";

describe("parseList", () => {
  const opts = { filters: { status: ["paid", "shipped", "cancelled"], total_min: null }, sorts: ["created", "total"], defaultSort: "created" };

  it("falls back on an unknown sort, direction and page size", () => {
    const q = parseList({ sort: "drop table", dir: "sideways", size: "7", page: "-3" }, opts);
    expect(q).toMatchObject({ sort: "created", dir: "desc", size: 25, page: 1 });
  });

  it("keeps only the allowed parts of a pick-many value", () => {
    expect(parseList({ status: "paid,evil,shipped" }, opts).filters.status).toBe("paid,shipped");
  });

  it("passes free-text filters through and ignores undeclared params", () => {
    const q = parseList({ total_min: "100", other: "x" }, opts);
    expect(q.filters).toEqual({ status: "", total_min: "100" });
  });
});

describe("small-list helpers", () => {
  const rows = [
    { name: "Bag", status: "paid", total: 50, at: "2026-10-01T10:00:00Z" },
    { name: "Belt", status: "shipped", total: 120, at: "2026-10-05T10:00:00Z" },
    { name: "Cap", status: "cancelled", total: 15, at: "2026-10-09T10:00:00Z" },
  ];
  const base = { q: "", page: 1, size: 25, sort: "total", dir: "asc" as const, filters: {} as Record<string, string> };

  it("filters with pick-many and ranges, then sorts", () => {
    const r = applyList(rows, { ...base, filters: { status: "paid,shipped", total_min: "60" } }, {
      search: (x) => x.name,
      sorts: { total: (x) => x.total },
      filters: {
        status: (x, v) => matchesAny(x.status, v),
        total_min: (x, v) => inRange(x.total, v, undefined),
      },
    });
    expect(r.rows.map((x) => x.name)).toEqual(["Belt"]);
  });

  it("compares date ranges by day", () => {
    expect(inRange("2026-10-05T23:59:00Z", "2026-10-05", "2026-10-05")).toBe(true);
    expect(inRange("2026-10-06T00:00:00Z", undefined, "2026-10-05")).toBe(false);
  });

  it("splitMany drops empty parts", () => {
    expect(splitMany(" a, ,b,")).toEqual(["a", "b"]);
  });
});

describe("pickExportColumns", () => {
  const all = [
    { header: "Code", value: () => 1 },
    { header: "Title", col: "product", value: () => 1 },
    { header: "SKU", col: "product", value: () => 1 },
    { header: "Price", col: "price", value: () => 1 },
    { header: "Stock", col: "stock", value: () => 1 },
    { header: "Exported at", value: () => 1 },
  ];
  it("follows the visible columns and their order, keeping untied ones", () => {
    expect(pickExportColumns(all, "stock,product").map((c) => c.header)).toEqual(["Code", "Stock", "Title", "SKU", "Exported at"]);
  });
  it("returns everything without cols", () => {
    expect(pickExportColumns(all, null)).toHaveLength(6);
  });
});

describe("toCsv", () => {
  it("writes a header row and quotes only cells that need it", () => {
    type R = { n: string; v: number | null };
    const cols: ExportColumn<R>[] = [
      { header: "Name", value: (r) => r.n },
      { header: "Value, INR", value: (r) => r.v },
    ];
    expect(toCsv(cols, [{ n: 'Say "hi"', v: 5 }, { n: "a\nb", v: null }])).toBe('Name,"Value, INR"\n"Say ""hi""",5\n"a\nb",');
  });
});
