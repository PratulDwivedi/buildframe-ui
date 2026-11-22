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

  describe("formula safety (a spreadsheet runs a cell that starts with = + - @ tab or CR)", () => {
    type R = { v: string | number | boolean | null };
    const one = (v: R["v"]) => toCsv<R, R["v"]>([{ header: "H", value: (r) => r.v }], [{ v }]).split("\n")[1];

    it.each(["=HYPERLINK(\"http://x\",\"y\")", "+1+1", "-2+3", "@SUM(A1)", "\tcmd", "\rcmd"])("prefixes text %j with a quote so it stays text", (v) => {
      expect(one(v).replace(/^"/, "")).toMatch(/^'/);
    });
    it("still quotes a formula cell that also holds a comma", () => {
      expect(one("=A1,B1")).toBe("\"'=A1,B1\"");
    });
    it("leaves a real negative number and a boolean alone, but prefixes the same digits typed as text", () => {
      expect(one(-5)).toBe("-5");
      expect(one(true)).toBe("true");
      expect(one("-5")).toBe("'-5");
    });
    it("leaves text that only contains those characters later, and an e-mail address, alone", () => {
      expect(one("a=b")).toBe("a=b");
      expect(one("me@x.com")).toBe("me@x.com");
    });
    it("protects a header cell as well", () => {
      expect(toCsv([{ header: "=bad", value: () => "x" }], [{}]).split("\n")[0]).toBe("'=bad");
    });
  });
});
