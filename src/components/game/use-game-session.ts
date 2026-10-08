"use client";

import { useCallback, useReducer } from "react";
import type { Difficulty } from "@/game/ai/ai-player";
import { type Clock, createClock, getTimeLeft, passTurn, pauseClock, resumeClock } from "@/game/clock";
import { applyMove, applyTimeout, createNewGame, getMoveError, replayHistory } from "@/game/engine";
import type { CellPosition, GameState, Player } from "@/game/types";

export type GameMode = "LOCAL" | "AI";

export interface GameSettings {
  mode: GameMode;
  /** The side controlled by the human in AI mode. */
  humanPlayer: Player;
  difficulty: Difficulty;
  /** Seconds each player gets for the whole game, or null for Classic (untimed) play. */
  timeLimitSeconds: number | null;
}

export const DEFAULT_SETTINGS: GameSettings = { mode: "LOCAL", humanPlayer: "X", difficulty: "MEDIUM", timeLimitSeconds: null };

interface Session {
  /** Identifies this game across undo/replay, so history can tell games apart. */
  gameId: string;
  /** When the game began (ms since epoch); stored with the game so its replay can show it. */
  startedAt: number;
  game: GameState;
  settings: GameSettings;
  /** Null in Classic mode. */
  clock: Clock | null;
}

type SessionAction =
  | { type: "play"; move: CellPosition & { player: Player }; now: number }
  | { type: "newGame"; settings: GameSettings; gameId: string; now: number }
  | { type: "timeout"; now: number }
  | { type: "setPaused"; paused: boolean; now: number }
  | { type: "undo" };

const newGameId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const startClock = (settings: GameSettings, now: number) =>
  settings.timeLimitSeconds === null ? null : createClock(settings.timeLimitSeconds, now);

export const isAiTurn = (game: GameState, settings: GameSettings) =>
  settings.mode === "AI" && game.status === "IN_PROGRESS" && game.currentPlayer !== settings.humanPlayer;

/** How many moves to keep when undoing, or null when there is nothing to undo. */
export function getUndoMoveCount({ game, settings }: Session): number | null {
  // Undo would let a player take back moves without paying for the time, so timed games disallow it.
  if (settings.timeLimitSeconds !== null) return null;
  const total = game.history.length;
  if (settings.mode === "LOCAL") return total > 0 ? total - 1 : null;

  // Against the AI, roll back to the human's previous turn.
  for (let keep = total - 1; keep >= 0; keep--) {
    if (replayHistory(game.history, keep).currentPlayer === settings.humanPlayer) return keep;
  }
  return null;
}

/** Ends the game on time if the player to move has none left; otherwise returns the session as is. */
function expireIfOutOfTime(session: Session, now: number): Session {
  const { game, clock } = session;
  if (!clock || game.status !== "IN_PROGRESS") return session;
  const loser = game.currentPlayer;
  if (getTimeLeft(clock, loser, loser, now) > 0) return session;
  return {
    ...session,
    game: applyTimeout(game, loser),
    clock: { remaining: { ...clock.remaining, [loser]: 0 }, turnStartedAt: now, running: false },
  };
}

function sessionReducer(session: Session, action: SessionAction): Session {
  switch (action.type) {
    case "newGame":
      return {
        gameId: action.gameId,
        startedAt: action.now,
        game: createNewGame(),
        settings: action.settings,
        clock: startClock(action.settings, action.now),
      };
    case "setPaused": {
      const { clock, game } = session;
      if (!clock || game.status !== "IN_PROGRESS") return session;
      return { ...session, clock: action.paused ? pauseClock(clock, game.currentPlayer, action.now) : resumeClock(clock, action.now) };
    }
    case "timeout":
      return expireIfOutOfTime(session, action.now);
    case "play": {
      // A move that arrives after the mover's time ran out loses to the timeout.
      const expired = expireIfOutOfTime(session, action.now);
      if (expired !== session) return expired;
      // Stale or illegal requests (e.g. a late AI answer after a restart) are dropped, never half-applied.
      if (getMoveError(session.game, action.move) !== null) return session;
      return {
        ...session,
        game: applyMove(session.game, { ...action.move, playedAt: action.now }),
        clock: session.clock && passTurn(session.clock, session.game.currentPlayer, action.now),
      };
    }
    case "undo": {
      const keep = getUndoMoveCount(session);
      if (keep === null) return session;
      return { ...session, game: replayHistory(session.game.history, keep) };
    }
  }
}

export function useGameSession() {
  const [session, dispatch] = useReducer(sessionReducer, undefined, () => ({
    gameId: newGameId(),
    startedAt: Date.now(),
    game: createNewGame(),
    settings: DEFAULT_SETTINGS,
    clock: null,
  }));

  const play = useCallback(
    (boardIndex: number, cellIndex: number) =>
      dispatch({ type: "play", move: { boardIndex, cellIndex, player: session.game.currentPlayer }, now: Date.now() }),
    [session.game.currentPlayer],
  );
  const playForAi = useCallback(
    (move: CellPosition, player: Player) => dispatch({ type: "play", move: { ...move, player }, now: Date.now() }),
    [],
  );
  const startNewGame = useCallback(
    (settings: GameSettings) => dispatch({ type: "newGame", settings, gameId: newGameId(), now: Date.now() }),
    [],
  );
  const undo = useCallback(() => dispatch({ type: "undo" }), []);
  const setPaused = useCallback(
    (paused: boolean) => dispatch({ type: "setPaused", paused, now: Date.now() }),
    [],
  );
  const expire = useCallback(() => dispatch({ type: "timeout", now: Date.now() }), []);

  return {
    gameId: session.gameId,
    startedAt: session.startedAt,
    game: session.game,
    settings: session.settings,
    clock: session.clock,
    canUndo: getUndoMoveCount(session) !== null,
    play,
    playForAi,
    startNewGame,
    undo,
    expire,
    setPaused,
  };
}
