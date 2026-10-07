import { applyMove, createNewGame } from "./engine";
import { resolveLocalBoard } from "./rules";
import type { CellValue, GameState, LocalBoard, Player, TargetBoard } from "./types";

import type { MovePair } from "./test-fixtures";

/** Plays a sequence of [boardIndex, cellIndex] moves from `start`. */
export function play(start: GameState, ...moves: MovePair[]): GameState {
  return moves.reduce((state, [boardIndex, cellIndex]) => applyMove(state, { boardIndex, cellIndex }), start);
}

export function parseBoard(pattern: string): LocalBoard {
  const cells = [...pattern.replace(/\s/g, "")].map((char): CellValue => (char === "X" || char === "O" ? char : null));
  if (cells.length !== 9) throw new Error(`Board pattern needs 9 cells: "${pattern}"`);
  return { cells, status: resolveLocalBoard(cells) };
}

interface StateSpec {
  /** Board patterns by index, e.g. `{ 0: "XXX......" }`. Unlisted boards are empty. */
  boards?: Record<number, string>;
  currentPlayer?: Player;
  target?: TargetBoard;
}

/** Builds an arbitrary mid-game state for engine tests. History is left empty. */
export function stateWith({ boards = {}, currentPlayer = "X", target = { mode: "ANY" } }: StateSpec): GameState {
  const base = createNewGame();
  return {
    ...base,
    boards: base.boards.map((empty, index) => (boards[index] ? parseBoard(boards[index]) : empty)),
    currentPlayer,
    target,
  };
}

/** Board patterns that are resolved without ever being "won" by the global rules. */
export const X_WON_BOARD = "XXX OO. ...";
export const O_WON_BOARD = "OOO XX. X..";
export const DRAWN_BOARD = "XOX XOO OXX";
