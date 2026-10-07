import { describe, expect, it } from "vitest";
import { applyMove, createNewGame, getFinalResult, isLegalMove } from "../engine";
import { DRAWN_BOARD, stateWith, X_WON_BOARD } from "../test-utils";
import { chooseMove, DIFFICULTIES, type Difficulty } from "./ai-player";

const noSlip = () => 0.99;

describe("AI tactics", () => {
  it("takes an immediate global victory", () => {
    const state = stateWith({
      boards: { 0: X_WON_BOARD, 1: X_WON_BOARD, 2: "XX. OO. ..." },
      target: { mode: "BOARD", boardIndex: 2 },
    });
    for (const difficulty of DIFFICULTIES) {
      expect(chooseMove(state, difficulty, noSlip)).toEqual({ boardIndex: 2, cellIndex: 2 });
    }
  });

  it("wins a local board when it can (cell routes to an open board)", () => {
    const state = stateWith({ boards: { 4: "XX. OO. ..." }, target: { mode: "BOARD", boardIndex: 4 } });
    expect(chooseMove(state, "MEDIUM")).toEqual({ boardIndex: 4, cellIndex: 2 });
  });

  it("considers routing: does not hand the opponent a winning board when a safe move exists", () => {
    // Playing cell 4 in board 0 would send O to board 4 where O wins instantly (OO. at 0,1).
    // Every other cell of board 0 sends O elsewhere, so a competent bot avoids cell 4.
    const state = stateWith({
      boards: { 4: "OO. X.. ..." },
      currentPlayer: "X",
      target: { mode: "BOARD", boardIndex: 0 },
    });
    expect(chooseMove(state, "HARD").cellIndex).not.toBe(4);
    expect(chooseMove(state, "MEDIUM").cellIndex).not.toBe(4);
  });

  it("avoids giving the opponent a free move when it can", () => {
    // Board 8 is resolved: cell 8 anywhere gives a free move. X should prefer something else.
    const state = stateWith({ boards: { 8: DRAWN_BOARD }, target: { mode: "BOARD", boardIndex: 0 } });
    expect(chooseMove(state, "HARD").cellIndex).not.toBe(8);
  });
});

describe("AI behaviour", () => {
  it.each<Difficulty>(["MEDIUM", "HARD"])("is deterministic for %s", (difficulty) => {
    const state = applyMove(createNewGame(), { boardIndex: 4, cellIndex: 4 });
    expect(chooseMove(state, difficulty)).toEqual(chooseMove(state, difficulty));
  });

  it("always returns a legal move, including on the first move", { timeout: 60_000 }, () => {
    let state = createNewGame();
    for (let ply = 0; ply < 12; ply++) {
      const move = chooseMove(state, DIFFICULTIES[ply % 3], () => 0.1);
      expect(isLegalMove(state, move)).toBe(true);
      state = applyMove(state, move);
    }
  });

  it("answers within a practical time on Hard", () => {
    let state = createNewGame();
    for (const [boardIndex, cellIndex] of [[4, 4], [4, 0], [0, 8], [8, 3], [3, 2], [2, 6]] as const) {
      state = applyMove(state, { boardIndex, cellIndex });
    }
    const started = performance.now();
    const move = chooseMove(state, "HARD");
    const elapsed = performance.now() - started;
    expect(isLegalMove(state, move)).toBe(true);
    console.info(`Hard AI move took ${Math.round(elapsed)} ms`);
    expect(elapsed).toBeLessThan(5_000);
  });

  it("Medium beats Easy over a full game from each side", { timeout: 120_000 }, () => {
    const outcomes = (["X", "O"] as const).map((strongSide) => {
      let state = createNewGame();
      let seed = 7;
      const random = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
      while (state.status === "IN_PROGRESS") {
        const difficulty: Difficulty = state.currentPlayer === strongSide ? "MEDIUM" : "EASY";
        state = applyMove(state, chooseMove(state, difficulty, random));
      }
      return { strongSide, winner: getFinalResult(state)?.winner };
    });
    for (const { strongSide, winner } of outcomes) expect(winner).toBe(strongSide);
  });
});
