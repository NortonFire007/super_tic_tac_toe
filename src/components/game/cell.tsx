"use client";

import { motion } from "motion/react";
import { BOARD_LABELS, CELL_NAMES } from "@/game/constants";
import { describeLocation } from "@/game/move-notation";
import type { CellValue, Player } from "@/game/types";
import { Mark } from "./mark";

interface CellProps {
  boardIndex: number;
  cellIndex: number;
  value: CellValue;
  playable: boolean;
  currentPlayer: Player;
  isLastMove: boolean;
  /** Number of the move that filled this cell, or null while empty. */
  moveNumber: number | null;
  /** The cell is being previewed from the move list (or hovered). */
  isHighlighted: boolean;
  onPlay: (boardIndex: number, cellIndex: number) => void;
}

function describeCell(boardIndex: number, cellIndex: number, value: CellValue) {
  const position = `Board ${BOARD_LABELS[boardIndex]}, ${CELL_NAMES[cellIndex]}`;
  return `${position}, ${value ? `occupied by ${value}` : "empty"}`;
}

export function Cell({ boardIndex, cellIndex, value, playable, currentPlayer, isLastMove, moveNumber, isHighlighted, onPlay }: CellProps) {
  const isMarked = isHighlighted || isLastMove;

  return (
    <motion.button
      type="button"
      disabled={!playable}
      aria-label={describeCell(boardIndex, cellIndex, value)}
      title={describeLocation({ boardIndex, cellIndex })}
      data-testid={`cell-${boardIndex}-${cellIndex}`}
      data-highlighted={isHighlighted}
      data-last-move={isLastMove}
      onClick={() => onPlay(boardIndex, cellIndex)}
      whileTap={playable ? { scale: 0.86 } : undefined}
      transition={{ duration: 0.1 }}
      className={[
        "group relative block aspect-square w-full min-h-0 min-w-0 rounded-[18%] p-[14%] transition-[background-color,box-shadow]",
        playable
          ? "cursor-pointer bg-white/[0.07] hover:bg-white/[0.16] focus-visible:bg-white/[0.16]"
          : "cursor-default bg-white/[0.05]",
        isHighlighted ? "bg-white/[0.2] ring-2 ring-white shadow-[0_0_14px_rgb(255_255_255/0.45)]" : isLastMove ? "ring-1 ring-white/50" : "",
      ].join(" ")}
    >
      {value ? (
        <Mark player={value} animated={isLastMove} className="size-full" />
      ) : (
        playable && (
          <Mark
            player={currentPlayer}
            className="size-full opacity-0 transition-opacity duration-150 group-hover:opacity-35 group-focus-visible:opacity-35"
          />
        )
      )}
      {isMarked && moveNumber !== null && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-[12%] -top-[12%] z-10 grid min-w-[1.35em] place-items-center rounded-full bg-fg px-[0.3em] text-[0.5rem] font-bold leading-[1.35em] text-ink sm:text-[0.6rem]"
        >
          {moveNumber}
        </span>
      )}
    </motion.button>
  );
}
