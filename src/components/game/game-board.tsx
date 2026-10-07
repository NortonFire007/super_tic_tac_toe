"use client";

import { motion } from "motion/react";
import { useMemo } from "react";
import { getLegalMoves, isGameOver } from "@/game/engine";
import { findGlobalWinningLine } from "@/game/rules";
import type { GameState } from "@/game/types";
import { getLineEndpoints } from "./geometry";
import { PLAYER_TEXT_CLASS } from "./mark";
import { LocalBoard } from "./local-board";

interface GameBoardProps {
  game: GameState;
  /** When false (e.g. the AI is to move) no cell accepts input. */
  inputEnabled: boolean;
  onPlay: (boardIndex: number, cellIndex: number) => void;
}

export function GameBoard({ game, inputEnabled, onPlay }: GameBoardProps) {
  const over = isGameOver(game);
  const lastMove = game.history.at(-1) ?? null;

  const playableCells = useMemo(
    () => new Set(inputEnabled ? getLegalMoves(game).map((move) => `${move.boardIndex}:${move.cellIndex}`) : []),
    [game, inputEnabled],
  );
  const isCellPlayable = (boardIndex: number, cellIndex: number) => playableCells.has(`${boardIndex}:${cellIndex}`);

  // A board is "active" if the rules allow the current player to move in it, regardless of who controls input.
  const isBoardActive = (boardIndex: number) => {
    if (over || game.boards[boardIndex].status !== "OPEN") return false;
    return game.target.mode !== "BOARD" || game.target.boardIndex === boardIndex;
  };

  const globalWin = findGlobalWinningLine(game.boards.map((board) => board.status));

  return (
    <div
      role="region"
      aria-label="Game board"
      data-testid="game-board"
      className="relative mx-auto aspect-square w-full max-w-[min(100%,calc(100dvh-8.5rem),46rem)] rounded-[3%] bg-edge/40 p-[1.6%] shadow-[0_30px_80px_-30px_rgb(0_0_0/0.8)] ring-1 ring-white/5"
    >
      <div className="grid size-full grid-cols-3 gap-[1.6%]">
        {game.boards.map((board, boardIndex) => (
          <LocalBoard
            key={boardIndex}
            boardIndex={boardIndex}
            board={board}
            isActive={isBoardActive(boardIndex)}
            isFreeMove={game.target.mode === "FREE_MOVE"}
            isGlobalWinner={globalWin?.line.includes(boardIndex) ?? false}
            isGameOver={over}
            currentPlayer={game.currentPlayer}
            lastMove={lastMove}
            isCellPlayable={isCellPlayable}
            onPlay={onPlay}
          />
        ))}
      </div>

      {globalWin && (
        <svg
          viewBox="0 0 3 3"
          aria-hidden="true"
          data-testid="global-win-line"
          className="pointer-events-none absolute inset-[1.6%] size-[96.8%]"
        >
          <motion.line
            {...getLineEndpoints(globalWin.line, 0.18)}
            stroke="currentColor"
            strokeWidth={0.07}
            strokeLinecap="round"
            className={`${PLAYER_TEXT_CLASS[globalWin.player]} drop-shadow-[0_0_10px_currentColor]`}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.45, duration: 0.5, ease: "easeInOut" }}
          />
        </svg>
      )}
    </div>
  );
}
