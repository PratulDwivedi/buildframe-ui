import { describe, expect, it } from "vitest";
import { moveItem, type BoardItem } from "../src/board/moveItem";

const items: BoardItem[] = [
  { id: "a", columnId: "todo" },
  { id: "b", columnId: "doing" },
  { id: "c", columnId: "todo" },
  { id: "d", columnId: "todo" },
  { id: "e", columnId: "doing" },
];
const col = (list: BoardItem[], c: string) => list.filter((i) => i.columnId === c).map((i) => i.id);

describe("moveItem", () => {
  it("moves to another column at the start, the middle and the end", () => {
    expect(col(moveItem(items, "a", "doing", 0), "doing")).toEqual(["a", "b", "e"]);
    expect(col(moveItem(items, "a", "doing", 1), "doing")).toEqual(["b", "a", "e"]);
    expect(col(moveItem(items, "a", "doing", 2), "doing")).toEqual(["b", "e", "a"]);
  });

  it("takes it out of the column it left and leaves that column's order alone", () => {
    expect(col(moveItem(items, "a", "doing", 0), "todo")).toEqual(["c", "d"]);
    expect(col(moveItem(items, "b", "todo", 1), "doing")).toEqual(["e"]);
  });

  it("reorders inside a column, down and up", () => {
    expect(col(moveItem(items, "a", "todo", 2), "todo")).toEqual(["c", "d", "a"]);
    expect(col(moveItem(items, "d", "todo", 0), "todo")).toEqual(["d", "a", "c"]);
    expect(col(moveItem(items, "c", "todo", 1), "todo")).toEqual(["a", "c", "d"]);
  });

  it("clamps an index that is too small or too large", () => {
    expect(col(moveItem(items, "a", "doing", -5), "doing")).toEqual(["a", "b", "e"]);
    expect(col(moveItem(items, "a", "doing", 99), "doing")).toEqual(["b", "e", "a"]);
  });

  it("moves into an empty column", () => {
    const moved = moveItem(items, "a", "done", 0);
    expect(col(moved, "done")).toEqual(["a"]);
    expect(moved).toHaveLength(items.length);
  });

  it("keeps every item exactly once and does not change the input", () => {
    const before = JSON.stringify(items);
    const moved = moveItem(items, "c", "doing", 1);
    expect(moved.map((i) => i.id).sort()).toEqual(["a", "b", "c", "d", "e"]);
    expect(JSON.stringify(items)).toBe(before);
    expect(moved).not.toBe(items);
  });

  it("returns the same list for an item that is not there", () => {
    expect(moveItem(items, "zzz", "doing", 0)).toBe(items);
  });

  it("keeps the other fields of the item", () => {
    const rich = [{ id: "x", columnId: "a", title: "Hello" }, { id: "y", columnId: "b", title: "World" }];
    expect(moveItem(rich, "x", "b", 0)[0]).toEqual({ id: "x", columnId: "b", title: "Hello" });
  });
});
