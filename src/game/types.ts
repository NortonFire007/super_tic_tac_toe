export type Player = "X" | "O";

export type CellValue = Player | null;

export type LocalBoardStatus = "OPEN" | "X_WON" | "O_WON" | "DRAW";

export type GameStatus = "IN_PROGRESS" | "X_WON" | "O_WON" | "DRAW";

export type TargetBoard =
  | { mode: "ANY" }
  | { mode: "BOARD"; boardIndex: number }
  | { mode: "FREE_MOVE" }
  | { mode: "NONE" };

export interface LocalBoard {
  readonly cells: readonly CellValue[];
  readonly status: LocalBoardStatus;
}

/** A position on the 81-cell grid. */
export interface CellPosition {
  readonly boardIndex: number;
  readonly cellIndex: number;
}

/** A requested move. `player` is optional and, when given, must be the player to move. */
export interface MoveRequest extends CellPosition {
  readonly player?: Player;
}

/** An accepted move, as recorded in the history. */
export interface Move extends CellPosition {
  readonly player: Player;
  readonly moveNumber: number;
}

export interface GameState {
  readonly boards: readonly LocalBoard[];
  readonly currentPlayer: Player;
  readonly target: TargetBoard;
  readonly status: GameStatus;
  readonly history: readonly Move[];
  /** Set when this player ran out of time; the opponent is then the winner. */
  readonly timeoutLoser?: Player;
}

export type MoveErrorCode =
  | "GAME_OVER"
  | "WRONG_PLAYER"
  | "INVALID_BOARD"
  | "INVALID_CELL"
  | "BOARD_RESOLVED"
  | "WRONG_BOARD"
  | "CELL_OCCUPIED";

export type GameResultReason = "GLOBAL_LINE" | "MAJORITY" | "EQUAL_BOARDS" | "TIMEOUT";

export interface GameResult {
  readonly status: Exclude<GameStatus, "IN_PROGRESS">;
  readonly winner: Player | null;
  readonly reason: GameResultReason;
}
