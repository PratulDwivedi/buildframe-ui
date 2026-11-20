import type { Announcements } from "@dnd-kit/core";
import type { BoardColumn } from "./Board";
import type { BoardItem } from "./moveItem";

/**
 * What a screen reader says while a card is dragged, in plain words: the card's name, the column and the place in
 * it. dnd-kit's own default ("moved over droppable area WEB-142") names ids, which mean nothing to a person.
 * Positions are where the card will land: dropped over a card in another column it takes that card's place, so the
 * column then holds one more.
 */
export function boardAnnouncements<T extends BoardItem>(items: T[], columns: BoardColumn[], name: (item: T) => string): Announcements {
  const byId = new Map(items.map((i) => [i.id, i]));
  const title = (id: string) => columns.find((c) => c.id === id)?.title ?? "a column";
  const inColumn = (id: string) => items.filter((i) => i.columnId === id);

  const nameOf = (id: string) => {
    const item = byId.get(id);
    return item ? name(item) : null;
  };

  /** Where the card lands if dropped over `over`: a column title and a place in it. */
  const place = (active: string, over: string): { column: string; text: string } | null => {
    if (over.startsWith("column:")) {
      const column = over.slice("column:".length);
      return { column: title(column), text: "at the end" };
    }
    const target = byId.get(over);
    const mover = byId.get(active);
    if (!target || !mover) return null;
    const cards = inColumn(target.columnId);
    const same = target.columnId === mover.columnId;
    const index = cards.findIndex((i) => i.id === over);
    return { column: title(target.columnId), text: `position ${index + 1} of ${same ? cards.length : cards.length + 1}` };
  };

  return {
    onDragStart({ active }) {
      const id = String(active.id);
      const item = byId.get(id);
      const n = nameOf(id);
      if (!item || !n) return "Picked up an item.";
      const cards = inColumn(item.columnId);
      return `Picked up ${n}, position ${cards.findIndex((i) => i.id === id) + 1} of ${cards.length} in ${title(item.columnId)}.`;
    },
    onDragOver({ active, over }) {
      const n = nameOf(String(active.id)) ?? "The item";
      if (!over) return `${n} is not over a column.`;
      const p = place(String(active.id), String(over.id));
      return p ? `${n} is over ${p.column}, ${p.text}.` : undefined;
    },
    onDragEnd({ active, over }) {
      const n = nameOf(String(active.id)) ?? "The item";
      if (!over) return `${n} was not moved.`;
      const p = place(String(active.id), String(over.id));
      return p ? `Dropped ${n} in ${p.column}, ${p.text}.` : `${n} was not moved.`;
    },
    onDragCancel({ active }) {
      const n = nameOf(String(active.id)) ?? "The item";
      return `Move cancelled. ${n} is back where it was.`;
    },
  };
}
