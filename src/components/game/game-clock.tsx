import { type Clock, formatClock, getTimeLeft, LOW_TIME_MS } from "@/game/clock";
import type { GameState, Player } from "@/game/types";
import { Mark } from "./mark";

interface GameClockProps {
  game: GameState;
  clock: Clock;
  now: number;
}

const PLAYERS: Player[] = ["X", "O"];

export function GameClock({ game, clock, now }: GameClockProps) {
  const active = game.status === "IN_PROGRESS" ? game.currentPlayer : null;

  return (
    <section aria-label="Player clocks" className="grid grid-cols-2 gap-3" data-testid="game-clock">
      {PLAYERS.map((player) => {
        const left = getTimeLeft(clock, player, active, now);
        const isActive = player === active;
        const isLow = left <= LOW_TIME_MS;
        const timedOut = game.timeoutLoser === player;

        return (
          <div
            key={player}
            data-testid={`clock-${player}`}
            data-active={isActive}
            data-low={isLow}
            className={`flex items-center gap-3 rounded-2xl px-4 py-3 ring-1 transition-colors ${
              isLow && (isActive || timedOut) ? "bg-red-500/15 ring-red-400/70" : "bg-surface"
            } ${isActive ? "ring-2 ring-white/60" : "ring-white/5"} ${isActive && isLow ? "low-time-pulse" : ""} ${
              isActive || timedOut ? "" : "opacity-60"
            }`}
          >
            <Mark player={player} className="size-6 shrink-0" />
            <div>
              <p className="text-xs uppercase tracking-wider text-muted">{player} time</p>
              <p
                className={`font-display text-2xl font-semibold leading-none tabular-nums ${isLow ? "text-red-400" : ""}`}
                data-testid={`clock-${player}-time`}
              >
                {formatClock(left)}
              </p>
            </div>
          </div>
        );
      })}
    </section>
  );
}
