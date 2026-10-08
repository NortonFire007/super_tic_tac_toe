"use client";

import { useEffect, useState } from "react";
import { type Clock, getTimeLeft } from "@/game/clock";
import type { GameState } from "@/game/types";

const TICK_MS = 100;

/**
 * Re-renders about ten times a second while a clock is running and reports the current time.
 * Calls `onExpire` as soon as the player to move has no time left.
 */
export function useClockTicker(game: GameState, clock: Clock | null, onExpire: () => void): number {
  const [now, setNow] = useState(() => Date.now());
  const running = clock !== null && clock.running && game.status === "IN_PROGRESS";

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const current = Date.now();
      setNow(current);
      if (getTimeLeft(clock, game.currentPlayer, game.currentPlayer, current) === 0) onExpire();
    };
    tick();
    const id = setInterval(tick, TICK_MS);
    return () => clearInterval(id);
  }, [running, clock, game.currentPlayer, onExpire]);

  return now;
}
