"use client";

import { useEffect } from "react";
import { chooseMove } from "@/game/ai/ai-player";
import type { AiRequest, AiResponse } from "@/game/ai/ai.worker";
import type { CellPosition, GameState, Player } from "@/game/types";
import { isAiTurn, type GameSettings } from "./use-game-session";

/** Even instant answers wait this long so the opponent's move is easy to follow. */
const MIN_THINKING_MS = 450;

function requestMoveInWorker(request: AiRequest, onMove: (move: CellPosition | null) => void) {
  const worker = new Worker(new URL("../../game/ai/ai.worker.ts", import.meta.url), { type: "module" });
  worker.onmessage = (event: MessageEvent<AiResponse>) => onMove(event.data.move);
  worker.onerror = () => onMove(null);
  worker.postMessage(request);
  return () => worker.terminate();
}

/**
 * Computes the AI's reply off the main thread (Web Worker) and plays it.
 * Returns true while it is the AI's turn (i.e. while it is thinking).
 */
export function useAiOpponent(
  game: GameState,
  settings: GameSettings,
  playForAi: (move: CellPosition, player: Player) => void,
): boolean {
  const aiToMove = isAiTurn(game, settings);

  useEffect(() => {
    if (!aiToMove) return;

    const startedAt = performance.now();
    const player = game.currentPlayer;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const deliver = (move: CellPosition | null) => {
      if (cancelled || !move) return;
      const wait = Math.max(0, MIN_THINKING_MS - (performance.now() - startedAt));
      timer = setTimeout(() => {
        if (!cancelled) playForAi(move, player);
      }, wait);
    };

    let stopWorker: (() => void) | undefined;
    try {
      stopWorker = requestMoveInWorker({ requestId: 0, state: game, difficulty: settings.difficulty }, deliver);
    } catch {
      // Workers unavailable: fall back to a deferred main-thread search.
      timer = setTimeout(() => deliver(chooseMove(game, settings.difficulty)), 0);
    }

    return () => {
      cancelled = true;
      clearTimeout(timer);
      stopWorker?.();
    };
  }, [aiToMove, game, settings.difficulty, playForAi]);

  return aiToMove;
}
