import { describe, expect, it } from "vitest";
import { applyMove, applyTimeout, createNewGame, getFinalResult, getLegalMoves, reconstructGame } from "./engine";
import { describeLocation, describeMove } from "./move-notation";
import { FREE_MOVE_SETUP, TOP_ROW_VICTORY } from "./test-fixtures";
import { play } from "./test-utils";

describe("move records", () => {
  it("are numbered in order and keep the time they were played", () => {
    let game = createNewGame();
    game = applyMove(game, { boardIndex: 0, cellIndex: 4, playedAt: 1000 });
    game = applyMove(game, { boardIndex: 4, cellIndex: 2, playedAt: 2500 });
    expect(game.history).toEqual([
      { player: "X", boardIndex: 0, cellIndex: 4, moveNumber: 1, playedAt: 1000 },
      { player: "O", boardIndex: 4, cellIndex: 2, moveNumber: 2, playedAt: 2500 },
    ]);
  });

  it("omit the time when it is unknown", () => {
    expect(play(createNewGame(), [0, 4]).history[0]).not.toHaveProperty("playedAt");
  });
});

describe("reconstructGame", () => {
  const { history } = play(createNewGame(), ...TOP_ROW_VICTORY);

  it("returns the empty initial state at move 0", () => {
    const start = reconstructGame(history, 0, null);
    expect(start).toEqual(createNewGame());
    expect(start.target).toEqual({ mode: "ANY" });
  });

  it("matches the original game at every position, deterministically", () => {
    for (let count = 0; count <= history.length; count++) {
      const expected = play(createNewGame(), ...TOP_ROW_VICTORY.slice(0, count));
      expect(reconstructGame(history, count, null)).toEqual(expected);
      expect(reconstructGame(history, count, null)).toEqual(reconstructGame(history, count, null));
    }
  });

  it("restores a global win at the final position only", () => {
    expect(getFinalResult(reconstructGame(history, history.length, null))).toMatchObject({ winner: "X", reason: "GLOBAL_LINE" });
    expect(getFinalResult(reconstructGame(history, history.length - 1, null))).toBeNull();
  });

  it("restores target routing, local wins and Free Move", () => {
    const moves = play(createNewGame(), ...FREE_MOVE_SETUP).history;
    expect(reconstructGame(moves, 1, null).target).toEqual({ mode: "BOARD", boardIndex: 0 });
    const afterFreeMove = reconstructGame(moves, moves.length, null);
    expect(afterFreeMove.target).toEqual({ mode: "FREE_MOVE" });
    expect(afterFreeMove.boards[4].status).toBe("X_WON");
    expect(getLegalMoves(afterFreeMove).some((move) => move.boardIndex === 3)).toBe(true);
  });

  it("restores a timeout only at the final position", () => {
    const original = play(createNewGame(), [0, 4], [4, 0]);
    const timedOut = reconstructGame(original.history, 2, "X");
    expect(timedOut).toEqual(applyTimeout(original, "X"));
    expect(getFinalResult(timedOut)).toEqual({ status: "O_WON", winner: "O", reason: "TIMEOUT" });
    expect(reconstructGame(original.history, 1, "X").status).toBe("IN_PROGRESS");
  });
});

describe("move notation", () => {
  it("uses board letters and position names instead of chess-like coordinates", () => {
    expect(describeLocation({ boardIndex: 0, cellIndex: 0 })).toBe("Board A · Top Left");
    expect(describeMove({ player: "O", boardIndex: 4, cellIndex: 4, moveNumber: 2 })).toBe("O · Board E · Center");
    expect(describeMove({ player: "X", boardIndex: 7, cellIndex: 8, moveNumber: 3 })).toBe("X · Board H · Bottom Right");
  });
});
