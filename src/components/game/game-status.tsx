"use client";

import { AnimatePresence, motion } from "motion/react";
import { BOARD_LABELS, BOARD_NAMES } from "@/game/constants";
import { countLocalBoardsWon, getFinalResult } from "@/game/engine";
import type { GameState, Player } from "@/game/types";
import type { GameSettings } from "./use-game-session";
import { Mark } from "./mark";

interface GameStatusProps {
  game: GameState;
  settings: GameSettings;
  aiThinking: boolean;
  /** Omitted while replaying, where there is no game to restart. */
  onPlayAgain?: () => void;
}

function describeResult(game: GameState): { headline: string; detail: string } {
  const result = getFinalResult(game);
  const { X, O } = countLocalBoardsWon(game);
  if (!result) return { headline: "", detail: "" };
  if (result.reason === "TIMEOUT") {
    return { headline: "Time Out", detail: `${game.timeoutLoser} ran out of time — ${result.winner} wins` };
  }
  if (result.reason === "GLOBAL_LINE") {
    return { headline: `${result.winner} wins`, detail: "Three boards in a row" };
  }
  if (result.reason === "MAJORITY") {
    return { headline: `${result.winner} wins`, detail: `No moves left — most boards: ${Math.max(X, O)} to ${Math.min(X, O)}` };
  }
  return { headline: "Draw", detail: `No moves left — boards are level at ${X} each` };
}

function describeTarget(game: GameState): { title: string; hint: string } {
  const { target } = game;
  if (target.mode === "FREE_MOVE") return { title: "Free Move", hint: "Choose any open board" };
  if (target.mode === "BOARD") {
    return {
      title: `Board ${BOARD_LABELS[target.boardIndex]} — ${BOARD_NAMES[target.boardIndex]}`,
      hint: "You must play in the highlighted board",
    };
  }
  return { title: "Anywhere", hint: "First move — play in any cell" };
}

function playerName(player: Player, settings: GameSettings) {
  if (settings.mode === "LOCAL") return `Player ${player}`;
  return player === settings.humanPlayer ? `You (${player})` : `AI (${player})`;
}

export function GameStatus({ game, settings, aiThinking, onPlayAgain }: GameStatusProps) {
  const over = game.status !== "IN_PROGRESS";
  const result = describeResult(game);
  const target = describeTarget(game);
  const isFreeMove = game.target.mode === "FREE_MOVE";
  const winner = getFinalResult(game)?.winner ?? null;

  return (
    <section
      aria-label="Game status"
      data-testid="game-status"
      className="rounded-2xl bg-surface p-4 ring-1 ring-white/5 sm:p-5"
    >
      <div role="status" aria-live="polite" className="flex items-center gap-4">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={over ? `over-${game.status}` : game.currentPlayer}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            className="grid size-14 shrink-0 place-items-center rounded-xl bg-white/[0.06]"
          >
            {over && !winner ? (
              <span className="font-display text-xl font-semibold text-muted">=</span>
            ) : (
              <Mark player={winner ?? game.currentPlayer} className="size-9" />
            )}
          </motion.div>
        </AnimatePresence>

        <div className="min-w-0">
          {over ? (
            <>
              <p className="font-display text-2xl font-semibold leading-tight" data-testid="result-headline">
                {result.headline}
              </p>
              <p className="text-sm text-muted">{result.detail}</p>
            </>
          ) : (
            <>
              <p className="font-display text-lg font-semibold leading-tight" data-testid="turn-indicator">
                {playerName(game.currentPlayer, settings)} to move
              </p>
              <p className="text-sm text-muted">
                {aiThinking ? "AI is thinking…" : isFreeMove ? "Choose any open board" : target.hint}
              </p>
            </>
          )}
        </div>
      </div>

      {!over && (
        <motion.div
          key={`${game.target.mode}-${game.target.mode === "BOARD" ? game.target.boardIndex : ""}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          data-testid="target-banner"
          className={`mt-4 rounded-xl px-4 py-2.5 text-sm font-medium ${
            isFreeMove ? "free-move-pulse bg-free/15 text-free" : "bg-white/[0.06] text-fg"
          }`}
        >
          <span className="text-muted">Target: </span>
          {isFreeMove ? "Free Move — choose any open board" : target.title}
        </motion.div>
      )}

      {over && onPlayAgain && (
        <button
          type="button"
          onClick={onPlayAgain}
          className="mt-4 w-full rounded-xl bg-fg px-4 py-2.5 text-sm font-semibold text-ink transition-transform hover:scale-[1.01] active:scale-[0.98]"
        >
          Play again
        </button>
      )}
    </section>
  );
}
