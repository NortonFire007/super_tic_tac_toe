import { BOARD_LABELS, CELL_NAMES } from "./constants";
import type { CellPosition, Move } from "./types";

/** "Board A · Top Left" */
export const describeLocation = ({ boardIndex, cellIndex }: CellPosition) =>
  `Board ${BOARD_LABELS[boardIndex]} · ${CELL_NAMES[cellIndex]}`;

/** "X · Board A · Top Left" */
export const describeMove = (move: Move) => `${move.player} · ${describeLocation(move)}`;
