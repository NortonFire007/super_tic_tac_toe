"use client";

import { motion } from "motion/react";
import { BOARD_LABELS, BOARD_NAMES } from "@/game/constants";
import { boardStatusOwner, findLocalWinningLine } from "@/game/rules";
import type { LocalBoard as LocalBoardState, Move, Player } from "@/game/types";
import { Cell } from "./cell";
import { getLineEndpoints } from "./geometry";
import { Mark, PLAYER_TEXT_CLASS } from "./mark";

interface LocalBoardProps {
  boardIndex: number;
  board: LocalBoardState;
  /** Whether the current player may play in this board right now. */
  isActive: boolean;
  isFreeMove: boolean;
  isGlobalWinner: boolean;
  isGameOver: boolean;
  currentPlayer: Player;
  lastMove: Move | null;
  isCellPlayable: (boardIndex: number, cellIndex: number) => boolean;
  onPlay: (boardIndex: number, cellIndex: number) => void;
}

const ACTIVE_RING: Record<Player, string> = {
  X: "ring-2 ring-x/80 shadow-[0_0_28px_-4px_rgb(255_122_89/0.45)]",
  O: "ring-2 ring-o/80 shadow-[0_0_28px_-4px_rgb(60_200_244/0.45)]",
};

function describeBoard(boardIndex: number, board: LocalBoardState, isActive: boolean) {
  const name = `Board ${BOARD_LABELS[boardIndex]} (${BOARD_NAMES[boardIndex]})`;
  if (board.status === "DRAW") return `${name}, drawn`;
  if (board.status !== "OPEN") return `${name}, won by ${boardStatusOwner(board.status)}`;
  return isActive ? `${name}, playable` : name;
}

export function LocalBoard({
  boardIndex,
  board,
  isActive,
  isFreeMove,
  isGlobalWinner,
  isGameOver,
  currentPlayer,
  lastMove,
  isCellPlayable,
  onPlay,
}: LocalBoardProps) {
  const owner = boardStatusOwner(board.status);
  const isResolved = board.status !== "OPEN";
  const winningLine = owner ? findLocalWinningLine(board.cells) : null;

  const surface = isResolved
    ? "bg-surface/70"
    : isActive
      ? `bg-surface-raised ${isFreeMove ? "free-move-pulse" : ACTIVE_RING[currentPlayer]}`
      : "bg-surface/80";

  return (
    <motion.div
      role="group"
      aria-label={describeBoard(boardIndex, board, isActive)}
      data-testid={`board-${boardIndex}`}
      data-board-state={isResolved ? board.status : isActive ? (isFreeMove ? "FREE" : "TARGET") : "IDLE"}
      animate={{ opacity: isResolved || isActive || isGameOver ? 1 : 0.72, scale: isActive && !isFreeMove ? 1.015 : 1 }}
      transition={{ duration: 0.22 }}
      className={`relative grid aspect-square grid-cols-3 gap-[3%] rounded-[9%] p-[4.5%] transition-[background-color,box-shadow] duration-300 ${surface} ${
        isGlobalWinner ? "ring-2 ring-white/80" : ""
      }`}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-[7%] top-[4%] z-10 text-[0.55rem] font-semibold tracking-widest text-white/30 sm:text-[0.62rem]"
      >
        {BOARD_LABELS[boardIndex]}
      </span>

      {board.cells.map((value, cellIndex) => (
        <div
          key={cellIndex}
          className={`min-h-0 min-w-0 transition-opacity duration-300 ${isResolved ? "opacity-30" : ""}`}
        >
          <Cell
            boardIndex={boardIndex}
            cellIndex={cellIndex}
            value={value}
            playable={isCellPlayable(boardIndex, cellIndex)}
            currentPlayer={currentPlayer}
            isLastMove={lastMove?.boardIndex === boardIndex && lastMove.cellIndex === cellIndex}
            onPlay={onPlay}
          />
        </div>
      ))}

      {winningLine && owner && (
        <svg viewBox="0 0 3 3" aria-hidden="true" className="pointer-events-none absolute inset-0 size-full p-[4.5%]">
          <motion.line
            {...getLineEndpoints(winningLine.line)}
            stroke="currentColor"
            strokeWidth={0.12}
            strokeLinecap="round"
            className={PLAYER_TEXT_CLASS[owner]}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        </svg>
      )}

      {isResolved && (
        <motion.div
          data-testid={`board-${boardIndex}-result`}
          className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-[9%] bg-ink/45"
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.28, duration: 0.25, ease: "easeOut" }}
        >
          {owner ? (
            <Mark player={owner} strokeWidth={9} className="size-[68%] drop-shadow-[0_0_14px_currentColor]" />
          ) : (
            <span className="text-[0.6rem] sm:text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              Draw
            </span>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
