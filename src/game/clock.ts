import type { Player } from "./types";

export const DEFAULT_TIME_LIMIT_SECONDS = 300;
export const MAX_TIME_LIMIT_SECONDS = 99 * 60 + 59;
/** At or below this many milliseconds the clock is shown as running low. */
export const LOW_TIME_MS = 30_000;

/** A chess-style clock: only the player to move is charged, from `turnStartedAt`. */
export interface Clock {
  /** Time banked by each player as of `turnStartedAt`. */
  readonly remaining: Readonly<Record<Player, number>>;
  readonly turnStartedAt: number;
}

export const createClock = (limitSeconds: number, now: number): Clock => ({
  remaining: { X: limitSeconds * 1000, O: limitSeconds * 1000 },
  turnStartedAt: now,
});

/** Time left for `player`, never negative; only the player to move is losing time. */
export function getTimeLeft(clock: Clock, player: Player, activePlayer: Player | null, now: number): number {
  const elapsed = player === activePlayer ? Math.max(0, now - clock.turnStartedAt) : 0;
  return Math.max(0, clock.remaining[player] - elapsed);
}

/** Charges the active player for their elapsed time and starts the next turn at `now`. */
export function passTurn(clock: Clock, activePlayer: Player, now: number): Clock {
  return {
    remaining: { ...clock.remaining, [activePlayer]: getTimeLeft(clock, activePlayer, activePlayer, now) },
    turnStartedAt: now,
  };
}

/** Whole seconds, rounded up so the display only reads 0:00 once time has truly run out. */
export function formatClock(ms: number): string {
  const totalSeconds = Math.ceil(Math.max(0, ms) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/** Parses "m:ss", "mm:ss" or plain minutes ("5") into seconds; null if invalid or out of range. */
export function parseTimeLimit(input: string): number | null {
  const match = /^\s*(\d{1,2})(?::([0-5]?\d))?\s*$/.exec(input);
  if (!match) return null;
  const seconds = Number(match[1]) * 60 + Number(match[2] ?? 0);
  return seconds >= 1 && seconds <= MAX_TIME_LIMIT_SECONDS ? seconds : null;
}

export const formatTimeLimit = (seconds: number) => formatClock(seconds * 1000);
