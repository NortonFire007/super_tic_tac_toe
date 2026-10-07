import { WINNING_LINES } from "./constants";
import type { CellValue, LocalBoardStatus, Player } from "./types";

export type WinningLine = readonly [number, number, number];

export function getOpponent(player: Player): Player {
  return player === "X" ? "O" : "X";
}

/** The Local Board the opponent must play in is the cell index just played. */
export function getTargetBoardFromCell(cellIndex: number): number {
  return cellIndex;
}

const cellOwner = (cell: CellValue): Player | null => cell;

export const boardStatusOwner = (status: LocalBoardStatus): Player | null =>
  status === "X_WON" ? "X" : status === "O_WON" ? "O" : null;

function findLine<T>(
  grid: readonly T[],
  ownerOf: (value: T) => Player | null,
): { player: Player; line: WinningLine } | null {
  for (const line of WINNING_LINES) {
    const owner = ownerOf(grid[line[0]]);
    if (owner && owner === ownerOf(grid[line[1]]) && owner === ownerOf(grid[line[2]])) {
      return { player: owner, line };
    }
  }
  return null;
}

export function findLocalWinningLine(cells: readonly CellValue[]) {
  return findLine(cells, cellOwner);
}

export function findGlobalWinningLine(statuses: readonly LocalBoardStatus[]) {
  return findLine(statuses, boardStatusOwner);
}

export function resolveLocalBoard(cells: readonly CellValue[]): LocalBoardStatus {
  const win = findLocalWinningLine(cells);
  if (win) return win.player === "X" ? "X_WON" : "O_WON";
  return cells.every((cell) => cell !== null) ? "DRAW" : "OPEN";
}
