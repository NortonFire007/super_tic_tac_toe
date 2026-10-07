"use client";

import { motion } from "motion/react";
import { BOARD_LABELS, BOARD_NAMES } from "@/game/constants";
import type { CellValue, Player } from "@/game/types";
import { Mark } from "./mark";

interface CellProps {
  boardIndex: number;
  cellIndex: number;
  value: CellValue;
  playable: boolean;
  currentPlayer: Player;
  isLastMove: boolean;
  onPlay: (boardIndex: number, cellIndex: number) => void;
}

function describeCell(boardIndex: number, cellIndex: number, value: CellValue) {
  const position = `Board ${BOARD_LABELS[boardIndex]} (${BOARD_NAMES[boardIndex]}), cell ${cellIndex + 1} (${BOARD_NAMES[cellIndex]})`;
  return `${position}: ${value ?? "empty"}`;
}

export function Cell({ boardIndex, cellIndex, value, playable, currentPlayer, isLastMove, onPlay }: CellProps) {
  return (
    <motion.button
      type="button"
      disabled={!playable}
      aria-label={describeCell(boardIndex, cellIndex, value)}
      data-testid={`cell-${boardIndex}-${cellIndex}`}
      onClick={() => onPlay(boardIndex, cellIndex)}
      whileTap={playable ? { scale: 0.86 } : undefined}
      transition={{ duration: 0.1 }}
      className={[
        "group relative block aspect-square w-full min-h-0 min-w-0 rounded-[18%] p-[14%] transition-colors",
        playable
          ? "cursor-pointer bg-white/[0.07] hover:bg-white/[0.16] focus-visible:bg-white/[0.16]"
          : "cursor-default bg-white/[0.05]",
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
    </motion.button>
  );
}
