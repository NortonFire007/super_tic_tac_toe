"use client";

import { useCallback, useReducer } from "react";
import type { Difficulty } from "@/game/ai/ai-player";
import { applyMove, createNewGame, getMoveError, replayHistory } from "@/game/engine";
import type { CellPosition, GameState, Player } from "@/game/types";

export type GameMode = "LOCAL" | "AI";

export interface GameSettings {
  mode: GameMode;
  /** The side controlled by the human in AI mode. */
  humanPlayer: Player;
  difficulty: Difficulty;
}

export const DEFAULT_SETTINGS: GameSettings = { mode: "LOCAL", humanPlayer: "X", difficulty: "MEDIUM" };

interface Session {
  /** Identifies this game across undo/replay, so history can tell games apart. */
  gameId: string;
  game: GameState;
  settings: GameSettings;
}

type SessionAction =
  | { type: "play"; move: CellPosition & { player: Player } }
  | { type: "newGame"; settings: GameSettings; gameId: string }
  | { type: "undo" };

const newGameId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const isAiTurn = (game: GameState, settings: GameSettings) =>
  settings.mode === "AI" && game.status === "IN_PROGRESS" && game.currentPlayer !== settings.humanPlayer;

/** How many moves to keep when undoing, or null when there is nothing to undo. */
export function getUndoMoveCount({ game, settings }: Session): number | null {
  const total = game.history.length;
  if (settings.mode === "LOCAL") return total > 0 ? total - 1 : null;

  // Against the AI, roll back to the human's previous turn.
  for (let keep = total - 1; keep >= 0; keep--) {
    if (replayHistory(game.history, keep).currentPlayer === settings.humanPlayer) return keep;
  }
  return null;
}

function sessionReducer(session: Session, action: SessionAction): Session {
  switch (action.type) {
    case "newGame":
      return { gameId: action.gameId, game: createNewGame(), settings: action.settings };
    case "play":
      // Stale or illegal requests (e.g. a late AI answer after a restart) are dropped, never half-applied.
      return getMoveError(session.game, action.move) === null
        ? { ...session, game: applyMove(session.game, action.move) }
        : session;
    case "undo": {
      const keep = getUndoMoveCount(session);
      return keep === null ? session : { ...session, game: replayHistory(session.game.history, keep) };
    }
  }
}

export function useGameSession() {
  const [session, dispatch] = useReducer(sessionReducer, undefined, () => ({
    gameId: newGameId(),
    game: createNewGame(),
    settings: DEFAULT_SETTINGS,
  }));

  const play = useCallback(
    (boardIndex: number, cellIndex: number) =>
      dispatch({ type: "play", move: { boardIndex, cellIndex, player: session.game.currentPlayer } }),
    [session.game.currentPlayer],
  );
  const playForAi = useCallback(
    (move: CellPosition, player: Player) => dispatch({ type: "play", move: { ...move, player } }),
    [],
  );
  const startNewGame = useCallback((settings: GameSettings) => dispatch({ type: "newGame", settings, gameId: newGameId() }), []);
  const undo = useCallback(() => dispatch({ type: "undo" }), []);

  return {
    gameId: session.gameId,
    game: session.game,
    settings: session.settings,
    canUndo: getUndoMoveCount(session) !== null,
    play,
    playForAi,
    startNewGame,
    undo,
  };
}
