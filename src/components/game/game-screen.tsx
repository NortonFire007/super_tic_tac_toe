"use client";

import { MotionConfig } from "motion/react";
import { CircleHelp, History, Plus, Undo2 } from "lucide-react";
import { useEffect, useState } from "react";
import { countLocalBoardsWon, getFinalResult } from "@/game/engine";
import { GameBoard } from "./game-board";
import { GameStatus } from "./game-status";
import { HistoryDialog } from "./history-dialog";
import { NewGameDialog } from "./new-game-dialog";
import { RulesDialog } from "./rules-dialog";
import { Scoreboard } from "./scoreboard";
import { useAiOpponent } from "./use-ai-opponent";
import { useGameHistory } from "./use-game-history";
import { isAiTurn, useGameSession } from "./use-game-session";

const SECONDARY_BUTTON =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-white/[0.06] px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white/[0.06]";

export function GameScreen() {
  const { gameId, game, settings, canUndo, play, playForAi, startNewGame, undo } = useGameSession();
  const aiThinking = useAiOpponent(game, settings, playForAi);
  const [isNewGameOpen, setNewGameOpen] = useState(false);
  const [isRulesOpen, setRulesOpen] = useState(false);
  const [isHistoryOpen, setHistoryOpen] = useState(false);
  const { records, saveRecord, discardRecord, clearHistory } = useGameHistory();

  // Log each finished game once; undoing out of a finished game removes its entry again.
  useEffect(() => {
    const result = getFinalResult(game);
    if (!result) return discardRecord(gameId);
    saveRecord({
      id: gameId,
      finishedAt: Date.now(),
      mode: settings.mode,
      winner: result.winner,
      reason: result.reason,
      boards: countLocalBoardsWon(game),
      moves: game.history.length,
    });
  }, [game, gameId, settings.mode, saveRecord, discardRecord]);

  const hasProgress = game.history.length > 0 && game.status === "IN_PROGRESS";
  const inputEnabled = !isAiTurn(game, settings);
  const closeNewGame = () => setNewGameOpen(false);
  const closeRules = () => setRulesOpen(false);
  const closeHistory = () => setHistoryOpen(false);

  return (
    <MotionConfig reducedMotion="user">
      <main className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-4 px-2 py-4 sm:px-6 sm:py-6">
        <header className="flex items-center justify-between gap-3 px-2 sm:px-0">
          <h1 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
            Ultimate <span className="text-x">Tic</span>-<span className="text-o">Tac</span>-Toe
          </h1>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setHistoryOpen(true)} className={SECONDARY_BUTTON}>
              <History className="size-4" aria-hidden="true" />
              History
            </button>
            <button type="button" onClick={() => setRulesOpen(true)} className={SECONDARY_BUTTON}>
              <CircleHelp className="size-4" aria-hidden="true" />
              How to play
            </button>
          </div>
        </header>

        <div className="grid flex-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_21rem] lg:grid-rows-[auto_1fr] lg:gap-x-8">
          <div className="lg:col-start-2 lg:row-start-1">
            <GameStatus game={game} settings={settings} aiThinking={aiThinking} onPlayAgain={() => setNewGameOpen(true)} />
          </div>

          <div className="lg:col-start-1 lg:row-span-2 lg:row-start-1">
            <GameBoard game={game} inputEnabled={inputEnabled} onPlay={play} />
          </div>

          <aside className="space-y-3 px-2 sm:px-0 lg:col-start-2 lg:row-start-2">
            <Scoreboard game={game} />
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setNewGameOpen(true)} className={SECONDARY_BUTTON}>
                <Plus className="size-4" aria-hidden="true" />
                New game
              </button>
              <button type="button" onClick={undo} disabled={!canUndo} className={SECONDARY_BUTTON}>
                <Undo2 className="size-4" aria-hidden="true" />
                Undo
              </button>
            </div>
            <p className="text-center text-xs text-muted">
              {settings.mode === "LOCAL"
                ? "Local multiplayer"
                : `Single player · you are ${settings.humanPlayer} · ${settings.difficulty.toLowerCase()}`}
            </p>
          </aside>
        </div>
      </main>

      <NewGameDialog
        open={isNewGameOpen}
        current={settings}
        hasProgress={hasProgress}
        onStart={startNewGame}
        onClose={closeNewGame}
      />
      <RulesDialog open={isRulesOpen} onClose={closeRules} />
      <HistoryDialog open={isHistoryOpen} records={records} onClear={clearHistory} onClose={closeHistory} />
    </MotionConfig>
  );
}
