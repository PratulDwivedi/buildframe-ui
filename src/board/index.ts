// The board has its own entry point so an app that has no board does not bundle dnd-kit.
export { Board, type BoardColumn, type BoardProps } from "./Board";
export { moveItem, type BoardItem } from "./moveItem";
