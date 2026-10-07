import { describe, expect, it } from "vitest";
import {
  applyMove,
  checkGlobalWinner,
  countLocalBoardsWon,
  createNewGame,
  getFinalResult,
  getLegalMoves,
  getMoveError,
  IllegalMoveError,
  isLegalMove,
  replayHistory,
} from "./engine";
import { getTargetBoardFromCell } from "./rules";
import { TOP_ROW_VICTORY } from "./test-fixtures";
import { DRAWN_BOARD, O_WON_BOARD, play, stateWith, X_WON_BOARD } from "./test-utils";

const BOARD_WITH_X_THREAT = "XX. OO. ...";

describe("new game", () => {
  it("starts with X, no target restriction and 81 legal first moves (scenario 1)", () => {
    const game = createNewGame();
    expect(game.currentPlayer).toBe("X");
    expect(game.status).toBe("IN_PROGRESS");
    expect(game.target).toEqual({ mode: "ANY" });
    expect(game.boards).toHaveLength(9);
    expect(game.boards.every((board) => board.cells.length === 9 && board.status === "OPEN")).toBe(true);
    expect(getLegalMoves(game)).toHaveLength(81);
    expect(game.history).toEqual([]);
  });
});

describe("routing", () => {
  it.each([
    [4, "center (scenario 2)"],
    [0, "top-left (scenario 3)"],
    [8, "bottom-right (scenario 4)"],
  ])("cell %i sends the opponent to the board with the same index: %s", (cellIndex) => {
    const next = play(createNewGame(), [3, cellIndex]);
    expect(next.target).toEqual({ mode: "BOARD", boardIndex: cellIndex });
    expect(next.currentPlayer).toBe("O");
    expect(getLegalMoves(next).every((move) => move.boardIndex === cellIndex)).toBe(true);
    expect(getLegalMoves(next)).toHaveLength(9);
  });

  it("depends only on the cell index, not on the board that was played", () => {
    for (let boardIndex = 0; boardIndex < 9; boardIndex++) {
      expect(play(createNewGame(), [boardIndex, 5]).target).toEqual({ mode: "BOARD", boardIndex: 5 });
    }
    expect(getTargetBoardFromCell(7)).toBe(7);
  });
});

describe("move validation", () => {
  it("rejects a move in the wrong board (scenario 5)", () => {
    const game = play(createNewGame(), [0, 4]);
    expect(getMoveError(game, { boardIndex: 0, cellIndex: 1 })).toBe("WRONG_BOARD");
    expect(() => applyMove(game, { boardIndex: 0, cellIndex: 1 })).toThrow(IllegalMoveError);
  });

  it("rejects an occupied cell (scenario 6)", () => {
    const game = play(createNewGame(), [0, 4]);
    expect(getMoveError(game, { boardIndex: 4, cellIndex: 4 })).toBeNull();
    const afterReply = play(game, [4, 0]);
    // X is now routed to board A; cell 4 of A already holds X.
    expect(getMoveError(afterReply, { boardIndex: 0, cellIndex: 4 })).toBe("CELL_OCCUPIED");
  });

  it("rejects wrong player, bad indices and leaves state untouched", () => {
    const game = createNewGame();
    expect(getMoveError(game, { boardIndex: 0, cellIndex: 0, player: "O" })).toBe("WRONG_PLAYER");
    expect(getMoveError(game, { boardIndex: 9, cellIndex: 0 })).toBe("INVALID_BOARD");
    expect(getMoveError(game, { boardIndex: 0, cellIndex: -1 })).toBe("INVALID_CELL");
    expect(getMoveError(game, { boardIndex: 0.5, cellIndex: 0 })).toBe("INVALID_BOARD");
    expect(() => applyMove(game, { boardIndex: 0, cellIndex: 9 })).toThrow(IllegalMoveError);
    expect(game.history).toHaveLength(0);
    expect(game.boards[0].cells.every((cell) => cell === null)).toBe(true);
  });

  it("does not mutate the previous state when a move is applied", () => {
    const before = createNewGame();
    const after = applyMove(before, { boardIndex: 2, cellIndex: 2 });
    expect(before.boards[2].cells[2]).toBeNull();
    expect(before.history).toHaveLength(0);
    expect(after.boards[2].cells[2]).toBe("X");
  });
});

describe("local boards", () => {
  it("resolves a won board immediately and locks it (scenario 7)", () => {
    const state = stateWith({ boards: { 0: BOARD_WITH_X_THREAT }, target: { mode: "BOARD", boardIndex: 0 } });
    const next = applyMove(state, { boardIndex: 0, cellIndex: 2 });
    expect(next.boards[0].status).toBe("X_WON");
    expect(getMoveError(next, { boardIndex: 0, cellIndex: 8 })).toBe("BOARD_RESOLVED");
    expect(getLegalMoves(next).some((move) => move.boardIndex === 0)).toBe(false);
  });

  it("resolves a full board without a winner as DRAW (scenario 8)", () => {
    const state = stateWith({ boards: { 4: "XOX XOO OX." }, target: { mode: "BOARD", boardIndex: 4 } });
    const next = applyMove(state, { boardIndex: 4, cellIndex: 8 });
    expect(next.boards[4].status).toBe("DRAW");
    expect(getMoveError(next, { boardIndex: 4, cellIndex: 0 })).toBe("BOARD_RESOLVED");
    expect(countLocalBoardsWon(next)).toEqual({ X: 0, O: 0 });
  });
});

describe("free move", () => {
  const resolvedCenter = { 4: DRAWN_BOARD };

  it("is entered when the routed board is already resolved (scenario 9)", () => {
    const state = stateWith({ boards: resolvedCenter, target: { mode: "ANY" } });
    const next = applyMove(state, { boardIndex: 0, cellIndex: 4 });
    expect(next.target).toEqual({ mode: "FREE_MOVE" });
    expect(next.currentPlayer).toBe("O");
  });

  it("offers every empty cell of every open board and no resolved board", () => {
    const state = stateWith({ boards: resolvedCenter, target: { mode: "FREE_MOVE" } });
    expect(getLegalMoves(state)).toHaveLength(8 * 9);
    expect(isLegalMove(state, { boardIndex: 4, cellIndex: 0 })).toBe(false);
  });

  it("does not grant an extra turn (scenario 10)", () => {
    const state = stateWith({ boards: resolvedCenter, target: { mode: "FREE_MOVE" }, currentPlayer: "O" });
    const next = applyMove(state, { boardIndex: 0, cellIndex: 0 });
    expect(next.currentPlayer).toBe("X");
  });

  it("still routes the next player by cell index (scenario 11)", () => {
    const state = stateWith({ boards: resolvedCenter, target: { mode: "FREE_MOVE" }, currentPlayer: "O" });
    const next = applyMove(state, { boardIndex: 3, cellIndex: 6 });
    expect(next.target).toEqual({ mode: "BOARD", boardIndex: 6 });
    expect(next.currentPlayer).toBe("X");
  });

  it("chains into another free move if the new target is resolved too", () => {
    const state = stateWith({ boards: { 6: DRAWN_BOARD }, target: { mode: "FREE_MOVE" }, currentPlayer: "O" });
    expect(applyMove(state, { boardIndex: 3, cellIndex: 6 }).target).toEqual({ mode: "FREE_MOVE" });
  });

  it("exposes only the last open board (scenario 17)", () => {
    const boards: Record<number, string> = {};
    for (let index = 0; index < 8; index++) boards[index] = DRAWN_BOARD;
    const state = stateWith({ boards, target: { mode: "FREE_MOVE" } });
    const moves = getLegalMoves(state);
    expect(moves).toHaveLength(9);
    expect(moves.every((move) => move.boardIndex === 8)).toBe(true);
  });
});

describe("winning move routing", () => {
  it("routes from the winning cell, not from the resolved board (scenario 15)", () => {
    const state = stateWith({ boards: { 4: BOARD_WITH_X_THREAT }, target: { mode: "BOARD", boardIndex: 4 } });
    const next = applyMove(state, { boardIndex: 4, cellIndex: 2 });
    expect(next.boards[4].status).toBe("X_WON");
    expect(next.target).toEqual({ mode: "BOARD", boardIndex: 2 });
  });

  it("gives a free move when the winning cell points to a resolved board (scenario 16)", () => {
    const state = stateWith({
      boards: { 4: "X.. .X. OO.", 8: DRAWN_BOARD },
      target: { mode: "BOARD", boardIndex: 4 },
    });
    const next = applyMove(state, { boardIndex: 4, cellIndex: 8 });
    expect(next.boards[4].status).toBe("X_WON");
    expect(next.target).toEqual({ mode: "FREE_MOVE" });
    expect(next.currentPlayer).toBe("O");
  });
});

describe("global board", () => {
  it("ends the game on a row of local boards (scenario 12)", () => {
    const state = stateWith({
      boards: { 0: X_WON_BOARD, 1: X_WON_BOARD, 2: BOARD_WITH_X_THREAT },
      target: { mode: "BOARD", boardIndex: 2 },
    });
    const next = applyMove(state, { boardIndex: 2, cellIndex: 2 });
    expect(next.status).toBe("X_WON");
    expect(next.target).toEqual({ mode: "NONE" });
    expect(checkGlobalWinner(next)).toBe("X");
    expect(getFinalResult(next)).toEqual({ status: "X_WON", winner: "X", reason: "GLOBAL_LINE" });
  });

  it("ends the game on a diagonal (scenario 13)", () => {
    const state = stateWith({
      boards: { 0: X_WON_BOARD, 4: X_WON_BOARD, 8: BOARD_WITH_X_THREAT },
      target: { mode: "BOARD", boardIndex: 8 },
    });
    expect(applyMove(state, { boardIndex: 8, cellIndex: 2 }).status).toBe("X_WON");
  });

  it("lets O win too and ignores drawn boards as owners", () => {
    const state = stateWith({
      boards: { 0: O_WON_BOARD, 3: O_WON_BOARD, 6: "OO. XX. X.X" },
      currentPlayer: "O",
      target: { mode: "BOARD", boardIndex: 6 },
    });
    expect(applyMove(state, { boardIndex: 6, cellIndex: 2 }).status).toBe("O_WON");

    const drawsOnly = stateWith({ boards: { 0: DRAWN_BOARD, 1: DRAWN_BOARD, 2: DRAWN_BOARD } });
    expect(checkGlobalWinner(drawsOnly)).toBeNull();
  });

  it("rejects moves after the game is over (scenario 14)", () => {
    const state = stateWith({
      boards: { 0: X_WON_BOARD, 1: X_WON_BOARD, 2: BOARD_WITH_X_THREAT },
      target: { mode: "BOARD", boardIndex: 2 },
    });
    const finished = applyMove(state, { boardIndex: 2, cellIndex: 2 });
    expect(getMoveError(finished, { boardIndex: 5, cellIndex: 5 })).toBe("GAME_OVER");
    expect(getLegalMoves(finished)).toEqual([]);
    expect(() => applyMove(finished, { boardIndex: 5, cellIndex: 5 })).toThrow(IllegalMoveError);
  });
});

describe("game end without a global line", () => {
  // Statuses (A..I): X . X / O X O / O X .  with the last board (I) still open.
  // X owns A, C, E, H; O owns D, F, G; B is a draw → no line of three exists.
  const lastBoardLayout = (boardB: string) => ({
    0: X_WON_BOARD,
    1: boardB,
    2: X_WON_BOARD,
    3: O_WON_BOARD,
    4: X_WON_BOARD,
    5: O_WON_BOARD,
    6: O_WON_BOARD,
    7: X_WON_BOARD,
    8: "XOX XOO OX.",
  });

  it("ends when no legal move remains and X holds more boards (scenario 18, 19)", () => {
    const state = stateWith({ boards: lastBoardLayout(DRAWN_BOARD), target: { mode: "BOARD", boardIndex: 8 } });
    const next = applyMove(state, { boardIndex: 8, cellIndex: 8 });
    expect(next.boards[8].status).toBe("DRAW");
    expect(getLegalMoves(next)).toEqual([]);
    expect(checkGlobalWinner(next)).toBeNull();
    expect(countLocalBoardsWon(next)).toEqual({ X: 4, O: 3 });
    expect(next.status).toBe("X_WON");
    expect(getFinalResult(next)).toEqual({ status: "X_WON", winner: "X", reason: "MAJORITY" });
  });

  it("declares O the winner when O holds more boards", () => {
    const state = stateWith({
      boards: { ...lastBoardLayout(O_WON_BOARD), 7: DRAWN_BOARD, 2: O_WON_BOARD, 0: DRAWN_BOARD },
      target: { mode: "BOARD", boardIndex: 8 },
    });
    const next = applyMove(state, { boardIndex: 8, cellIndex: 8 });
    expect(getFinalResult(next)?.winner).toBe("O");
  });

  it("is a draw when both players own the same number of boards (scenario 20)", () => {
    const state = stateWith({
      boards: { ...lastBoardLayout(O_WON_BOARD), 7: X_WON_BOARD },
      target: { mode: "BOARD", boardIndex: 8 },
    });
    // X: A, C, E, H = 4 ; O: B, D, F, G = 4.
    const next = applyMove(state, { boardIndex: 8, cellIndex: 8 });
    expect(countLocalBoardsWon(next)).toEqual({ X: 4, O: 4 });
    expect(next.status).toBe("DRAW");
    expect(getFinalResult(next)).toEqual({ status: "DRAW", winner: null, reason: "EQUAL_BOARDS" });
  });

  it("has no final result while the game is in progress", () => {
    expect(getFinalResult(createNewGame())).toBeNull();
  });
});

describe("full sequences", () => {
  it("follows the routing from the specification example", () => {
    let game = play(createNewGame(), [4, 4]);
    expect(game.target).toEqual({ mode: "BOARD", boardIndex: 4 });
    game = play(game, [4, 0]);
    expect(game.target).toEqual({ mode: "BOARD", boardIndex: 0 });
    game = play(game, [0, 8]);
    expect(game.target).toEqual({ mode: "BOARD", boardIndex: 8 });
    game = play(game, [8, 3]);
    expect(game.target).toEqual({ mode: "BOARD", boardIndex: 3 });
    expect(game.history.map((move) => move.player)).toEqual(["X", "O", "X", "O"]);
  });

  it("wins a board, routes from the winning cell, then enters a free move", () => {
    let game = play(createNewGame(), [4, 0], [0, 4], [4, 1], [1, 4]);
    game = play(game, [4, 2]);
    expect(game.boards[4].status).toBe("X_WON");
    expect(game.target).toEqual({ mode: "BOARD", boardIndex: 2 });

    game = play(game, [2, 4]);
    expect(game.target).toEqual({ mode: "FREE_MOVE" });
    expect(game.currentPlayer).toBe("X");
    expect(getLegalMoves(game).some((move) => move.boardIndex === 4)).toBe(false);

    game = play(game, [3, 6]);
    expect(game.currentPlayer).toBe("O");
    expect(game.target).toEqual({ mode: "BOARD", boardIndex: 6 });
  });

  it("plays a complete game to a global victory with routing checked after every move", () => {
    let game = createNewGame();
    for (const [boardIndex, cellIndex] of TOP_ROW_VICTORY) {
      expect(isLegalMove(game, { boardIndex, cellIndex })).toBe(true);
      game = applyMove(game, { boardIndex, cellIndex });
    }
    expect(game.status).toBe("X_WON");
    expect(game.history).toHaveLength(TOP_ROW_VICTORY.length);
    expect(countLocalBoardsWon(game)).toEqual({ X: 3, O: 2 });
    expect(getFinalResult(game)?.reason).toBe("GLOBAL_LINE");
  });

  it("replays a history to the same state", () => {
    const game = play(createNewGame(), [4, 0], [0, 4], [4, 1], [1, 4], [4, 2]);
    expect(replayHistory(game.history)).toEqual(game);
    expect(replayHistory(game.history, 2)).toEqual(play(createNewGame(), [4, 0], [0, 4]));
  });
});

describe("invariants over seeded random playouts", () => {
  function createRandom(seed: number) {
    let value = seed;
    return () => {
      value = (value * 1664525 + 1013904223) % 4294967296;
      return value / 4294967296;
    };
  }

  it("keeps the rules consistent for 200 complete games", () => {
    for (let seed = 1; seed <= 200; seed++) {
      const random = createRandom(seed);
      let game = createNewGame();

      while (game.status === "IN_PROGRESS") {
        const legalMoves = getLegalMoves(game);
        expect(legalMoves.length).toBeGreaterThan(0);

        for (const move of legalMoves) {
          expect(game.boards[move.boardIndex].status).toBe("OPEN");
          expect(game.boards[move.boardIndex].cells[move.cellIndex]).toBeNull();
          if (game.target.mode === "BOARD") expect(move.boardIndex).toBe(game.target.boardIndex);
        }

        const move = legalMoves[Math.floor(random() * legalMoves.length)];
        const previousPlayer = game.currentPlayer;
        const next = applyMove(game, move);

        expect(next.history).toHaveLength(game.history.length + 1);
        expect(next.history.at(-1)).toEqual({ ...move, player: previousPlayer, moveNumber: next.history.length });
        if (next.status === "IN_PROGRESS") {
          expect(next.currentPlayer).not.toBe(previousPlayer);
          const routed = next.boards[move.cellIndex].status === "OPEN";
          expect(next.target).toEqual(routed ? { mode: "BOARD", boardIndex: move.cellIndex } : { mode: "FREE_MOVE" });
        }
        game = next;
      }

      expect(getLegalMoves(game)).toEqual([]);
      expect(getFinalResult(game)?.status).toBe(game.status);
      expect(replayHistory(game.history)).toEqual(game);
    }
  });
});
