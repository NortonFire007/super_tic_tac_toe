import { countLocalBoardsWon } from "@/game/engine";
import type { GameState, Player } from "@/game/types";
import { Mark } from "./mark";

export function Scoreboard({ game }: { game: GameState }) {
  const counts = countLocalBoardsWon(game);
  const players: Player[] = ["X", "O"];

  return (
    <section aria-label="Local boards won" className="grid grid-cols-2 gap-3" data-testid="scoreboard">
      {players.map((player) => (
        <div
          key={player}
          className={`flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 ring-1 ${
            game.status === "IN_PROGRESS" && game.currentPlayer === player ? "ring-white/30" : "ring-white/5"
          }`}
        >
          <Mark player={player} className="size-7 shrink-0" />
          <div>
            <p className="text-xs uppercase tracking-wider text-muted">{player} boards</p>
            <p className="font-display text-2xl font-semibold leading-none" data-testid={`score-${player}`}>
              {counts[player]}
            </p>
          </div>
        </div>
      ))}
    </section>
  );
}
