/**
 * The order of a board, as one list: the array order is the order inside each column. Pure, so a page, a drag
 * handler and a server function can all use it and it is tested without a browser.
 */
export type BoardItem = { id: string; columnId: string };

/**
 * Moves `id` to `toColumnId` so that it ends up at position `toIndex` among that column's items (0 = top). An index
 * outside the column is clamped. Everything else keeps its place. Returns the same array when the item is unknown.
 */
export function moveItem<T extends BoardItem>(items: T[], id: string, toColumnId: string, toIndex: number): T[] {
  const from = items.findIndex((i) => i.id === id);
  if (from < 0) return items;
  const moved: T = { ...items[from], columnId: toColumnId };
  const rest = items.filter((_, n) => n !== from);
  const inColumn = rest.filter((i) => i.columnId === toColumnId);
  const at = Math.max(0, Math.min(toIndex, inColumn.length));
  if (inColumn.length === 0) return [...rest, moved];
  if (at >= inColumn.length) {
    const lastId = inColumn[inColumn.length - 1].id;
    const pos = rest.findIndex((i) => i.id === lastId);
    return [...rest.slice(0, pos + 1), moved, ...rest.slice(pos + 1)];
  }
  const beforeId = inColumn[at].id;
  const pos = rest.findIndex((i) => i.id === beforeId);
  return [...rest.slice(0, pos), moved, ...rest.slice(pos)];
}
