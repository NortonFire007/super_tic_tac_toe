import type { Player } from "./types";

export const BOARD_COUNT = 9;
export const CELLS_PER_BOARD = 9;

/** Rows, columns and diagonals of a 3×3 grid; used for local and global boards alike. */
export const WINNING_LINES: readonly (readonly [number, number, number])[] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export const BOARD_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H", "I"] as const;

export const BOARD_NAMES = [
  "top-left",
  "top-center",
  "top-right",
  "middle-left",
  "center",
  "middle-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
] as const;

/** Presentation names for the nine positions inside a local board (the engine only uses indexes 0–8). */
export const CELL_NAMES = [
  "Top Left",
  "Top Center",
  "Top Right",
  "Middle Left",
  "Center",
  "Middle Right",
  "Bottom Left",
  "Bottom Center",
  "Bottom Right",
] as const;

export const FIRST_PLAYER: Player = "X";
