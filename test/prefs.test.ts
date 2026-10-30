import { loadPrefs, moveColumn, orderColumns, savePrefs, viewQuery } from "../src/data/prefs";

describe("orderColumns", () => {
  it("applies a saved order and puts back columns added since", () => {
    expect(orderColumns(["a", "b", "new", "c"], ["c", "a", "b"])).toEqual(["c", "a", "b", "new"]);
  });
  it("drops keys that no longer exist", () => {
    expect(orderColumns(["a", "b"], ["gone", "b", "a"])).toEqual(["b", "a"]);
  });
  it("puts a new first column first", () => {
    expect(orderColumns(["z", "a", "b"], ["b", "a"])).toEqual(["z", "b", "a"]);
  });
});

it("moveColumn stays inside the list", () => {
  expect(moveColumn(["a", "b", "c"], "a", -1)).toEqual(["a", "b", "c"]);
  expect(moveColumn(["a", "b", "c"], "a", 1)).toEqual(["b", "a", "c"]);
});

it("viewQuery drops page and cols and sorts keys", () => {
  expect(viewQuery(new URLSearchParams("status=paid&page=3&cols=a,b&dir=asc"))).toBe("dir=asc&status=paid");
});

describe("storage", () => {
  afterEach(() => vi.restoreAllMocks());
  it("round-trips and survives junk", () => {
    savePrefs("t", { hidden: ["x"], order: ["b", "a"], density: "compact", layout: "cards", views: [] });
    expect(loadPrefs("t")).toMatchObject({ hidden: ["x"], density: "compact", layout: "cards" });
    window.localStorage.setItem("bf-ui:view:bad", "{not json");
    expect(loadPrefs("bad", ["d"]).hidden).toEqual(["d"]);
  });
  it("falls back when storage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(loadPrefs("t").layout).toBe("table");
  });
});
