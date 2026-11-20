import { expect, it } from "vitest";
import { boardAnnouncements } from "../src/board/announce";

const columns = [
  { id: "todo", title: "To do" },
  { id: "doing", title: "In progress" },
];
const items = [
  { id: "a", columnId: "todo", title: "Write the plan" },
  { id: "b", columnId: "doing", title: "Build the board" },
  { id: "c", columnId: "todo", title: "Check the phone" },
];
const say = boardAnnouncements(items, columns, (i) => i.title);
const at = (active: string, over: string | null) => ({ active: { id: active }, over: over === null ? null : { id: over } }) as never;

it("says what was picked up and where it is", () => {
  expect(say.onDragStart!({ active: { id: "a" } } as never)).toBe("Picked up Write the plan, position 1 of 2 in To do.");
});

it("says where it is now over a card, or over a column", () => {
  expect(say.onDragOver!(at("a", "b"))).toBe("Write the plan is over In progress, position 1 of 2.");
  expect(say.onDragOver!(at("a", "c"))).toBe("Write the plan is over To do, position 2 of 2.");
  expect(say.onDragOver!(at("b", "column:todo"))).toBe("Build the board is over To do, at the end.");
});

it("says when it is over nothing", () => {
  expect(say.onDragOver!(at("a", null))).toBe("Write the plan is not over a column.");
});

it("says where it was dropped, or that the move was cancelled", () => {
  expect(say.onDragEnd!(at("a", "b"))).toBe("Dropped Write the plan in In progress, position 1 of 2.");
  expect(say.onDragEnd!(at("a", null))).toBe("Write the plan was not moved.");
  expect(say.onDragCancel!(at("a", null))).toBe("Move cancelled. Write the plan is back where it was.");
});

it("copes with an id it does not know", () => {
  expect(say.onDragStart!({ active: { id: "zzz" } } as never)).toBe("Picked up an item.");
});
