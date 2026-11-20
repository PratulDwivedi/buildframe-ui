"use client";

import * as React from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { EllipsisIcon, GripVerticalIcon } from "lucide-react";
import { cn } from "../lib/cn";
import { Tabs } from "../nav/Tabs";
import { MenuItem, MenuLabel, Popover } from "../overlay/Menu";
import { boardAnnouncements } from "./announce";
import type { BoardItem } from "./moveItem";

/**
 * Columns of cards that can be dragged between columns and reordered inside one: a work board, a pipeline.
 * Generic: it knows nothing about what a card is. The caller owns the items (array order is the order inside each
 * column, see moveItem) and answers `onMove`.
 *
 * Moving works four ways, so nobody needs a mouse or a steady hand (WCAG 2.5.7): drag the handle with a pointer or a
 * finger, or with the keyboard (Space to lift, arrow keys to move, Space to drop, Escape to cancel), or use the
 * card's Move menu, which lists the other columns. On a phone one column shows at a time and a tab row switches.
 *
 * Built on dnd-kit. It lives in its own entry point, `@buildframe/ui/board`, so an app that has no board does not
 * bundle it.
 */
export type BoardColumn = { id: string; title: string };

export type BoardProps<T extends BoardItem> = {
  /** Names the whole board for screen readers. */
  label: string;
  columns: BoardColumn[];
  items: T[];
  renderCard: (item: T) => React.ReactNode;
  /** The card's name for its drag handle and Move button, e.g. its title. */
  cardName: (item: T) => string;
  /** `toIndex` is the place among the target column's other cards (0 = top). */
  onMove: (id: string, toColumnId: string, toIndex: number) => void;
  emptyText?: string;
  className?: string;
};

const colDrop = (id: string) => `column:${id}`;

export function Board<T extends BoardItem>({ label, columns, items, renderCard, cardName, onMove, emptyText = "No items", className }: BoardProps<T>) {
  const [phoneColumn, setPhoneColumn] = React.useState(columns[0]?.id);
  const sensors = useSensors(
    // A small distance first, so a click on the card or a scroll with a finger is not a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const inColumn = (id: string) => items.filter((i) => i.columnId === id);

  /** The Move menu's choice: the end of that column, which is where a card with no drop point belongs. */
  const moveToEnd = (id: string, to: string) => onMove(id, to, inColumn(to).filter((i) => i.id !== id).length);

  const onDragEnd = (e: DragEndEvent) => {
    const active = String(e.active.id);
    const over = e.over ? String(e.over.id) : null;
    if (!over || over === active) return;
    if (over.startsWith("column:")) {
      const to = over.slice("column:".length);
      onMove(active, to, inColumn(to).filter((i) => i.id !== active).length);
      return;
    }
    const target = items.find((i) => i.id === over);
    if (!target) return;
    onMove(active, target.columnId, inColumn(target.columnId).findIndex((i) => i.id === over));
  };

  return (
    <div role="group" aria-label={label} className={className}>
      <Tabs
        label="Columns"
        className="mb-3 sm:hidden"
        value={phoneColumn}
        onChange={setPhoneColumn}
        items={columns.map((c) => ({ key: c.id, label: c.title, count: inColumn(c.id).length }))}
      />
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragEnd={onDragEnd}
        accessibility={{
          announcements: boardAnnouncements(items, columns, cardName),
          screenReaderInstructions: {
            draggable: "To pick up a card, press space or enter. Use the arrow keys to move it, space or enter to drop it, escape to cancel. Or use the card's Move button.",
          },
        }}
      >
        <div className="flex gap-3 sm:items-start sm:overflow-x-auto sm:pb-2">
          {columns.map((c) => (
            <Column
              key={c.id}
              column={c}
              cards={inColumn(c.id)}
              columns={columns}
              shownOnPhone={phoneColumn === c.id}
              renderCard={renderCard}
              cardName={cardName}
              moveToEnd={moveToEnd}
              emptyText={emptyText}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
}

function Column<T extends BoardItem>({
  column,
  cards,
  columns,
  shownOnPhone,
  renderCard,
  cardName,
  moveToEnd,
  emptyText,
}: {
  column: BoardColumn;
  cards: T[];
  columns: BoardColumn[];
  shownOnPhone: boolean;
  renderCard: (item: T) => React.ReactNode;
  cardName: (item: T) => string;
  moveToEnd: (id: string, toColumnId: string) => void;
  emptyText: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: colDrop(column.id) });
  return (
    <section
      ref={setNodeRef}
      aria-label={column.title}
      className={cn(
        "min-w-0 flex-1 flex-col rounded-2xl border border-bf-line bg-bf-surface-alt p-2 transition-colors sm:flex sm:w-72 sm:min-w-[16rem] sm:flex-none",
        shownOnPhone ? "flex" : "hidden",
        isOver && "border-bf-brand",
      )}
    >
      <h3 className="flex items-center gap-2 px-1.5 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-bf-muted">
        {column.title}
        <span className="rounded-full bg-bf-neutral-bg px-1.5 text-[11px] font-semibold tabular-nums text-bf-neutral-ink">{cards.length}</span>
      </h3>
      <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <ul className="flex min-h-12 flex-col gap-2">
          {cards.map((card) => (
            <Card key={card.id} card={card} name={cardName(card)} column={column} columns={columns} moveToEnd={moveToEnd}>
              {renderCard(card)}
            </Card>
          ))}
        </ul>
      </SortableContext>
      {cards.length === 0 && <p className="px-2 py-3 text-center text-xs text-bf-muted">{emptyText}</p>}
    </section>
  );
}

function Card<T extends BoardItem>({
  card,
  name,
  column,
  columns,
  moveToEnd,
  children,
}: {
  card: T;
  name: string;
  column: BoardColumn;
  columns: BoardColumn[];
  moveToEnd: (id: string, toColumnId: string) => void;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("group relative rounded-xl border border-bf-line bg-bf-surface p-2.5 shadow-sm", isDragging && "z-10 opacity-60 shadow-md")}
    >
      <div className="flex items-start gap-1.5">
        <button
          type="button"
          aria-label={`Drag ${name}`}
          className="-ml-1 mt-0.5 grid size-6 shrink-0 cursor-grab touch-none place-items-center rounded-md text-bf-muted outline-none hover:bg-bf-surface-alt hover:text-bf-ink focus-visible:ring-2 focus-visible:ring-bf-brand/50 active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVerticalIcon className="size-4" aria-hidden />
        </button>
        <div className="min-w-0 flex-1">{children}</div>
        <Popover
          label={`Move ${name}`}
          width={200}
          trigger={(p) => (
            <button
              type="button"
              aria-label={`Move ${name}`}
              className="-mr-1 grid size-6 shrink-0 place-items-center rounded-md text-bf-muted outline-none hover:bg-bf-surface-alt hover:text-bf-ink focus-visible:ring-2 focus-visible:ring-bf-brand/50"
              {...p}
            >
              <EllipsisIcon className="size-4" aria-hidden />
            </button>
          )}
        >
          {(close) => (
            <>
              <MenuLabel>Move to</MenuLabel>
              {columns
                .filter((c) => c.id !== column.id)
                .map((c) => (
                  <MenuItem
                    key={c.id}
                    onSelect={() => {
                      close();
                      moveToEnd(card.id, c.id);
                    }}
                  >
                    {c.title}
                  </MenuItem>
                ))}
            </>
          )}
        </Popover>
      </div>
    </li>
  );
}
