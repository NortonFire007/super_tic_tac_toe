import { BOARD_COUNT, CELLS_PER_BOARD, FIRST_PLAYER } from "./constants";
import {
  boardStatusOwner,
  findGlobalWinningLine,
  getOpponent,
  getTargetBoardFromCell,
  resolveLocalBoard,
} from "./rules";
import type {
  CellPosition,
  GameResult,
  GameState,
  LocalBoard,
  Move,
  MoveErrorCode,
  MoveRequest,
  Player,
  TargetBoard,
} from "./types";

export class IllegalMoveError extends Error {
  constructor(
    readonly code: MoveErrorCode,
    request: MoveRequest,
  ) {
    super(`Illegal move (${code}): board ${request.boardIndex}, cell ${request.cellIndex}`);
    this.name = "IllegalMoveError";
  }
}

const isValidIndex = (value: number, limit: number) => Number.isInteger(value) && value >= 0 && value < limit;

function createEmptyBoard(): LocalBoard {
  return { cells: Array<null>(CELLS_PER_BOARD).fill(null), status: "OPEN" };
}

export function createNewGame(): GameState {
  return {
    boards: Array.from({ length: BOARD_COUNT }, createEmptyBoard),
    currentPlayer: FIRST_PLAYER,
    target: { mode: "ANY" },
    status: "IN_PROGRESS",
    history: [],
  };
}

export function isGameOver(state: GameState): boolean {
  return state.status !== "IN_PROGRESS";
}

/** Returns why a move is illegal, or null when it is legal. */
export function getMoveError(state: GameState, request: MoveRequest): MoveErrorCode | null {
  if (isGameOver(state)) return "GAME_OVER";
  if (request.player !== undefined && request.player !== state.currentPlayer) return "WRONG_PLAYER";
  if (!isValidIndex(request.boardIndex, BOARD_COUNT)) return "INVALID_BOARD";
  if (!isValidIndex(request.cellIndex, CELLS_PER_BOARD)) return "INVALID_CELL";

  const board = state.boards[request.boardIndex];
  if (board.status !== "OPEN") return "BOARD_RESOLVED";
  if (state.target.mode === "BOARD" && state.target.boardIndex !== request.boardIndex) return "WRONG_BOARD";
  if (board.cells[request.cellIndex] !== null) return "CELL_OCCUPIED";
  return null;
}

export function isLegalMove(state: GameState, request: MoveRequest): boolean {
  return getMoveError(state, request) === null;
}

export function getLegalMoves(state: GameState): CellPosition[] {
  if (isGameOver(state)) return [];
  const moves: CellPosition[] = [];
  for (let boardIndex = 0; boardIndex < BOARD_COUNT; boardIndex++) {
    if (state.target.mode === "BOARD" && state.target.boardIndex !== boardIndex) continue;
    const board = state.boards[boardIndex];
    if (board.status !== "OPEN") continue;
    for (let cellIndex = 0; cellIndex < CELLS_PER_BOARD; cellIndex++) {
      if (board.cells[cellIndex] === null) moves.push({ boardIndex, cellIndex });
    }
  }
  return moves;
}

export function countLocalBoardsWon(state: GameState): Record<Player, number> {
  const counts: Record<Player, number> = { X: 0, O: 0 };
  for (const board of state.boards) {
    const owner = boardStatusOwner(board.status);
    if (owner) counts[owner]++;
  }
  return counts;
}

export function checkGlobalWinner(state: GameState): Player | null {
  return findGlobalWinningLine(state.boards.map((board) => board.status))?.player ?? null;
}

/** Final outcome of a finished game; null while in progress. */
export function getFinalResult(state: GameState): GameResult | null {
  if (!isGameOver(state)) return null;
  const lineWinner = checkGlobalWinner(state);
  if (lineWinner) return { status: `${lineWinner}_WON`, winner: lineWinner, reason: "GLOBAL_LINE" };

  const { X, O } = countLocalBoardsWon(state);
  if (X > O) return { status: "X_WON", winner: "X", reason: "MAJORITY" };
  if (O > X) return { status: "O_WON", winner: "O", reason: "MAJORITY" };
  return { status: "DRAW", winner: null, reason: "EQUAL_BOARDS" };
}

function resolveNextTarget(boards: readonly LocalBoard[], playedCellIndex: number): TargetBoard {
  const boardIndex = getTargetBoardFromCell(playedCellIndex);
  return boards[boardIndex].status === "OPEN" ? { mode: "BOARD", boardIndex } : { mode: "FREE_MOVE" };
}

/** Pure transition: validates the move and returns the next state, or throws IllegalMoveError. */
export function applyMove(state: GameState, request: MoveRequest): GameState {
  const error = getMoveError(state, request);
  if (error) throw new IllegalMoveError(error, request);

  const { boardIndex, cellIndex } = request;
  const player = state.currentPlayer;

  const cells = state.boards[boardIndex].cells.slice();
  cells[cellIndex] = player;
  const boards = state.boards.slice();
  boards[boardIndex] = { cells, status: resolveLocalBoard(cells) };

  const move: Move = { player, boardIndex, cellIndex, moveNumber: state.history.length + 1 };
  const history = [...state.history, move];

  const finished = (status: GameState["status"]): GameState => ({
    boards,
    currentPlayer: player,
    target: { mode: "NONE" },
    status,
    history,
  });

  const globalWinner = findGlobalWinningLine(boards.map((board) => board.status))?.player ?? null;
  if (globalWinner) return finished(`${globalWinner}_WON`);

  // No open board means no legal move remains: decide by the number of Local Boards won.
  if (boards.every((board) => board.status !== "OPEN")) {
    const result = getFinalResult(finished("DRAW"));
    return finished(result?.status ?? "DRAW");
  }

  return {
    boards,
    currentPlayer: getOpponent(player),
    target: resolveNextTarget(boards, cellIndex),
    status: "IN_PROGRESS",
    history,
  };
}

/** Rebuilds the state reached after the first `moveCount` moves of the history. */
export function replayHistory(history: readonly Move[], moveCount = history.length): GameState {
  return history.slice(0, moveCount).reduce<GameState>((state, move) => applyMove(state, move), createNewGame());
}
