import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { Board } from "../src/board/Board";

const columns = [
  { id: "todo", title: "To do" },
  { id: "doing", title: "In progress" },
  { id: "done", title: "Done" },
];
const items = [
  { id: "a", columnId: "todo", title: "Write the plan" },
  { id: "b", columnId: "doing", title: "Build the board" },
  { id: "c", columnId: "todo", title: "Check the phone" },
];
const show = (onMove = vi.fn()) =>
  render(<Board label="Sprint board" columns={columns} items={items} renderCard={(i) => <span>{i.title}</span>} cardName={(i) => i.title} onMove={onMove} />);

it("draws one named column per status with its count and its cards", () => {
  show();
  expect(screen.getByRole("group", { name: "Sprint board" })).toBeInTheDocument();
  const todo = screen.getByRole("region", { name: "To do" });
  expect(within(todo).getAllByRole("listitem")).toHaveLength(2);
  expect(within(todo).getByText("2")).toBeInTheDocument();
  expect(within(screen.getByRole("region", { name: "In progress" })).getByText("Build the board")).toBeInTheDocument();
});

it("says an empty column is empty", () => {
  show();
  expect(within(screen.getByRole("region", { name: "Done" })).getByText("No items")).toBeInTheDocument();
});

it("every card has a drag handle named after it", () => {
  show();
  expect(screen.getByRole("button", { name: /Drag Write the plan/ })).toBeInTheDocument();
});

it("on a phone the columns are chosen from a tab row, one shown at a time", async () => {
  show();
  const tabs = screen.getByRole("tablist", { name: "Columns" });
  expect(within(tabs).getAllByRole("tab").map((t) => t.textContent)).toEqual(["To do2", "In progress1", "Done0"]);
  const doing = screen.getByRole("region", { name: "In progress" });
  expect(doing.className).toMatch(/(^|\s)hidden(\s|$)/);
  await userEvent.click(within(tabs).getByRole("tab", { name: /In progress/ }));
  expect(doing.className).not.toMatch(/(^|\s)hidden(\s|$)/);
  expect(screen.getByRole("region", { name: "To do" }).className).toMatch(/(^|\s)hidden(\s|$)/);
});

it("a card's Move menu is the way to move without dragging: it lists the other columns and moves to the end of one", async () => {
  const onMove = vi.fn();
  show(onMove);
  await userEvent.click(screen.getByRole("button", { name: "Move Write the plan" }));
  const menu = screen.getByRole("menu");
  expect(within(menu).queryByRole("menuitem", { name: "To do" })).toBeNull();
  await userEvent.click(within(menu).getByRole("menuitem", { name: "In progress" }));
  expect(onMove).toHaveBeenCalledWith("a", "doing", 1);
});

it("moving to an empty column goes to the top of it", async () => {
  const onMove = vi.fn();
  show(onMove);
  await userEvent.click(screen.getByRole("button", { name: "Move Build the board" }));
  await userEvent.click(within(screen.getByRole("menu")).getByRole("menuitem", { name: "Done" }));
  expect(onMove).toHaveBeenCalledWith("b", "done", 0);
});
