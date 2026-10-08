"use client";

import { MotionConfig } from "motion/react";
import { CircleHelp, History, Plus, Undo2 } from "lucide-react";
import { useEffect, useState } from "react";
import { countLocalBoardsWon, getFinalResult } from "@/game/engine";
import { GameClock } from "./game-clock";
import { GameBoard } from "./game-board";
import { GameStatus } from "./game-status";
import { MoveList } from "./move-list";
import { ReplayPanel } from "./replay-panel";
import { HistoryDialog } from "./history-dialog";
import { NewGameDialog } from "./new-game-dialog";
import { RulesDialog } from "./rules-dialog";
import { Scoreboard } from "./scoreboard";
import { useAiOpponent } from "./use-ai-opponent";
import { useClockTicker } from "./use-clock-ticker";
import { useGameHistory } from "./use-game-history";
import { DEFAULT_SETTINGS, isAiTurn, useGameSession } from "./use-game-session";
import { useReplay } from "./use-replay";

const SECONDARY_BUTTON =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-white/[0.06] px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white/[0.06]";

export function GameScreen() {
  const { gameId, startedAt, game, settings, clock, canUndo, play, playForAi, startNewGame, undo, expire, setPaused } = useGameSession();
  const now = useClockTicker(game, clock, expire);
  const aiThinking = useAiOpponent(game, settings, playForAi);
  const [isNewGameOpen, setNewGameOpen] = useState(false);
  const [isRulesOpen, setRulesOpen] = useState(false);
  const [isHistoryOpen, setHistoryOpen] = useState(false);
  const { records, saveRecord, discardRecord, clearHistory } = useGameHistory();
  const { replay, open: openReplay, close: closeReplay, goTo, togglePlay } = useReplay();
  const [highlightedMoveNumber, setHighlightedMoveNumber] = useState<number | null>(null);

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
      replay: { startedAt, timeLimitSeconds: settings.timeLimitSeconds, moves: game.history },
    });
  }, [game, gameId, startedAt, settings.mode, settings.timeLimitSeconds, saveRecord, discardRecord]);

  // The clock stops while a dialog or a replay covers the game.
  const dialogOpen = isNewGameOpen || isRulesOpen || isHistoryOpen || replay !== null;
  useEffect(() => setPaused(dialogOpen), [dialogOpen, setPaused]);

  const hasProgress = game.history.length > 0 && game.status === "IN_PROGRESS";
  const inputEnabled = !isAiTurn(game, settings);
  const closeNewGame = () => setNewGameOpen(false);
  const closeRules = () => setRulesOpen(false);
  const closeHistory = () => setHistoryOpen(false);
  const startReplay: typeof openReplay = (record) => {
    openReplay(record);
    setHighlightedMoveNumber(null);
    setHistoryOpen(false);
  };
  const exitReplay = () => {
    closeReplay();
    setHighlightedMoveNumber(null);
  };

  // While replaying, the board shows the historical position and is read-only.
  const shownGame = replay?.game ?? game;
  const highlightedMove =
    highlightedMoveNumber === null ? null : ((replay?.replay.moves ?? game.history)[highlightedMoveNumber - 1] ?? null);
  const shownSettings = replay ? { ...DEFAULT_SETTINGS, mode: "LOCAL" as const } : settings;

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
            <GameStatus
              game={shownGame}
              settings={shownSettings}
              aiThinking={!replay && aiThinking}
              onPlayAgain={replay ? undefined : () => setNewGameOpen(true)}
            />
          </div>

          <div className="lg:col-start-1 lg:row-span-2 lg:row-start-1">
            <GameBoard
              game={shownGame}
              inputEnabled={inputEnabled && !replay}
              onPlay={play}
              markLastMove={replay !== null}
              highlightedMove={highlightedMove}
              onHighlightMove={setHighlightedMoveNumber}
            />
          </div>

          <aside className="space-y-3 px-2 sm:px-0 lg:col-start-2 lg:row-start-2">
            {clock && !replay && <GameClock game={game} clock={clock} now={now} />}
            <Scoreboard game={shownGame} />
            {replay ? (
              <ReplayPanel
                view={replay}
                onGoTo={goTo}
                onTogglePlay={togglePlay}
                onExit={exitReplay}
                highlightedMoveNumber={highlightedMoveNumber}
                onHighlightMove={setHighlightedMoveNumber}
              />
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setNewGameOpen(true)} className={SECONDARY_BUTTON}>
                    <Plus className="size-4" aria-hidden="true" />
                    New game
                  </button>
                  <button
                    type="button"
                    onClick={undo}
                    disabled={!canUndo}
                    title={clock ? "Undo is not available in timed games" : undefined}
                    className={SECONDARY_BUTTON}
                  >
                    <Undo2 className="size-4" aria-hidden="true" />
                    Undo
                  </button>
                </div>
                <p className="text-center text-xs text-muted">
                  {settings.mode === "LOCAL"
                    ? "Local multiplayer"
                    : `Single player · you are ${settings.humanPlayer} · ${settings.difficulty.toLowerCase()}`}
                  {clock && " · timed"}
                </p>
                <MoveList
                  moves={game.history}
                  currentMoveNumber={game.history.length}
                  highlightedMoveNumber={highlightedMoveNumber}
                  onHighlightMove={setHighlightedMoveNumber}
                />
              </>
            )}
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
      <HistoryDialog open={isHistoryOpen} records={records} onReplay={startReplay} onClear={clearHistory} onClose={closeHistory} />
    </MotionConfig>
  );
}
