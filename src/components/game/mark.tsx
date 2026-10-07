"use client";

import { motion } from "motion/react";
import type { Player } from "@/game/types";

interface MarkProps {
  player: Player;
  /** Draw the mark stroke by stroke (used for the move that was just played). */
  animated?: boolean;
  strokeWidth?: number;
  className?: string;
}

export const PLAYER_TEXT_CLASS: Record<Player, string> = { X: "text-x", O: "text-o" };

const STROKE_DRAW = { duration: 0.24, ease: "easeOut" } as const;

/** Shape-based X / O glyph, so players are distinguishable without relying on colour. */
export function Mark({ player, animated = false, strokeWidth = 11, className = "" }: MarkProps) {
  const draw = (delay = 0) =>
    animated
      ? { initial: { pathLength: 0, opacity: 0 }, animate: { pathLength: 1, opacity: 1 }, transition: { ...STROKE_DRAW, delay } }
      : {};

  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      aria-hidden="true"
      className={`${PLAYER_TEXT_CLASS[player]} ${className}`}
    >
      {player === "X" ? (
        <>
          <motion.path d="M26 26 L74 74" {...draw()} />
          <motion.path d="M74 26 L26 74" {...draw(0.1)} />
        </>
      ) : (
        <motion.circle cx="50" cy="50" r="27" {...draw()} />
      )}
    </svg>
  );
}
