import { WINNING_LINES } from "../constants";
import { getOpponent } from "../rules";
import type { CellValue, GameState, LocalBoard, LocalBoardStatus, Player } from "../types";

/** Named weights for the static evaluation; tuned empirically against the search tests. */
export const WEIGHTS = {
  WIN: 1_000_000,
  LOCAL_BOARD_OWNED: 110,
  GLOBAL_LINE_TWO_WITH_OPEN_THIRD: 420,
  GLOBAL_LINE_ONE_WITH_OPEN_REST: 24,
  LOCAL_LINE_TWO_WITH_EMPTY_THIRD: 7,
  LOCAL_LINE_ONE: 1,
  LOCAL_CENTER_CELL: 2,
  FREE_MOVE_FOR_MOVER: 35,
  MOVER_CAN_WIN_TARGET_BOARD: 60,
  MOVER_FORCED_INTO_THREATENED_BOARD: 12,
} as const;

/** Importance of a Local Board = number of global lines running through it. */
export const BOARD_IMPORTANCE = [3, 2, 3, 2, 4, 2, 3, 2, 3] as const;

const CENTER_CELL = 4;

export function hasWinningCell(cells: readonly CellValue[], player: Player): boolean {
  for (const [a, b, c] of WINNING_LINES) {
    const marks = [cells[a], cells[b], cells[c]];
    const own = marks.filter((mark) => mark === player).length;
    const empty = marks.filter((mark) => mark === null).length;
    if (own === 2 && empty === 1) return true;
  }
  return false;
}

/** True if placing `player` on `cellIndex` would complete a line of three. */
export function completesLine(cells: readonly CellValue[], cellIndex: number, player: Player): boolean {
  for (const [a, b, c] of WINNING_LINES) {
    if (a !== cellIndex && b !== cellIndex && c !== cellIndex) continue;
    if ([a, b, c].every((index) => index === cellIndex || cells[index] === player)) return true;
  }
  return false;
}

/** Positive favours X. Counts open lines and the centre of one Local Board. */
function evaluateLocalBoard(board: LocalBoard): number {
  let score = 0;
  for (const [a, b, c] of WINNING_LINES) {
    let x = 0;
    let o = 0;
    for (const mark of [board.cells[a], board.cells[b], board.cells[c]]) {
      if (mark === "X") x++;
      else if (mark === "O") o++;
    }
    if (o === 0 && x > 0) score += x === 2 ? WEIGHTS.LOCAL_LINE_TWO_WITH_EMPTY_THIRD : WEIGHTS.LOCAL_LINE_ONE;
    if (x === 0 && o > 0) score -= o === 2 ? WEIGHTS.LOCAL_LINE_TWO_WITH_EMPTY_THIRD : WEIGHTS.LOCAL_LINE_ONE;
  }
  if (board.cells[CENTER_CELL] === "X") score += WEIGHTS.LOCAL_CENTER_CELL;
  if (board.cells[CENTER_CELL] === "O") score -= WEIGHTS.LOCAL_CENTER_CELL;
  return score;
}

function evaluateGlobalLines(statuses: readonly LocalBoardStatus[]): number {
  let score = 0;
  for (const line of WINNING_LINES) {
    let x = 0;
    let o = 0;
    let open = 0;
    for (const index of line) {
      const status = statuses[index];
      if (status === "X_WON") x++;
      else if (status === "O_WON") o++;
      else if (status === "OPEN") open++;
    }
    if (x > 0 && o === 0) {
      if (x === 2 && open === 1) score += WEIGHTS.GLOBAL_LINE_TWO_WITH_OPEN_THIRD;
      else if (x === 1 && open === 2) score += WEIGHTS.GLOBAL_LINE_ONE_WITH_OPEN_REST;
    } else if (o > 0 && x === 0) {
      if (o === 2 && open === 1) score -= WEIGHTS.GLOBAL_LINE_TWO_WITH_OPEN_THIRD;
      else if (o === 1 && open === 2) score -= WEIGHTS.GLOBAL_LINE_ONE_WITH_OPEN_REST;
    }
  }
  return score;
}

/** How good the forced routing is for the player to move; positive favours X. */
function evaluateRouting(state: GameState): number {
  const mover = state.currentPlayer;
  const sign = mover === "X" ? 1 : -1;
  const { target } = state;

  if (target.mode === "FREE_MOVE") return sign * WEIGHTS.FREE_MOVE_FOR_MOVER;
  if (target.mode !== "BOARD") return 0;

  const cells = state.boards[target.boardIndex].cells;
  const importance = BOARD_IMPORTANCE[target.boardIndex];
  let score = 0;
  if (hasWinningCell(cells, mover)) score += WEIGHTS.MOVER_CAN_WIN_TARGET_BOARD * importance;
  if (hasWinningCell(cells, getOpponent(mover))) score -= WEIGHTS.MOVER_FORCED_INTO_THREATENED_BOARD * importance;
  return sign * score;
}

/** Static evaluation of an in-progress position from X's point of view. */
export function evaluateForX(state: GameState): number {
  let score = 0;
  const statuses: LocalBoardStatus[] = [];
  for (let boardIndex = 0; boardIndex < state.boards.length; boardIndex++) {
    const board = state.boards[boardIndex];
    statuses.push(board.status);
    const importance = BOARD_IMPORTANCE[boardIndex];
    if (board.status === "X_WON") score += WEIGHTS.LOCAL_BOARD_OWNED * importance;
    else if (board.status === "O_WON") score -= WEIGHTS.LOCAL_BOARD_OWNED * importance;
    else if (board.status === "OPEN") score += evaluateLocalBoard(board) * importance;
  }
  return score + evaluateGlobalLines(statuses) + evaluateRouting(state);
}

/** Static evaluation from the point of view of the player to move. */
export function evaluateForMover(state: GameState): number {
  const scoreForX = evaluateForX(state);
  return state.currentPlayer === "X" ? scoreForX : -scoreForX;
}
