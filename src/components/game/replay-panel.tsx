"use client";

import { ArrowLeft, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Pause, Play } from "lucide-react";
import { formatTimeLimit } from "@/game/clock";
import { MoveList } from "./move-list";
import type { ReplayView } from "./use-replay";

interface ReplayPanelProps {
  view: ReplayView;
  onGoTo: (position: number) => void;
  onTogglePlay: () => void;
  onExit: () => void;
  highlightedMoveNumber: number | null;
  onHighlightMove: (moveNumber: number | null) => void;
}

const CONTROL_BUTTON =
  "grid h-10 flex-1 place-items-center rounded-xl bg-white/[0.06] transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white/[0.06]";

const pad = (value: number) => value.toString().padStart(2, "0");

/** "08.10.26 · 14:32" */
function formatCompactDateTime(timestamp: number) {
  const date = new Date(timestamp);
  const day = `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${pad(date.getFullYear() % 100)}`;
  return `${day} · ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** "08:47" */
function formatDuration(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.round(milliseconds / 1000));
  return `${pad(Math.floor(totalSeconds / 60))}:${pad(totalSeconds % 60)}`;
}

function ReplayDetails({ view }: { view: ReplayView }) {
  const { record, replay, total } = view;
  const mode = replay.timeLimitSeconds === null ? "Classic" : `Timed · ${formatTimeLimit(replay.timeLimitSeconds)} per player`;
  const result = record.winner ? `${record.winner} won` : "Draw";

  return (
    <section aria-label="Game replay" data-testid="replay-details" className="rounded-2xl bg-surface p-4 ring-1 ring-white/5">
      <h2 className="font-display text-lg font-semibold leading-tight">Game Replay</h2>
      <div className="mt-2 space-y-0.5 text-sm text-muted">
        <div>X vs {record.mode === "AI" ? "AI" : "O"}</div>
        <div>{mode}</div>
        <div>
          <time dateTime={new Date(replay.startedAt).toISOString()}>{formatCompactDateTime(replay.startedAt)}</time>
        </div>
        <div>Duration: {formatDuration(record.finishedAt - replay.startedAt)}</div>
        <div>
          {total} moves · <span className="font-semibold text-fg">{result}</span>
        </div>
      </div>
    </section>
  );
}

export function ReplayPanel({ view, onGoTo, onTogglePlay, onExit, highlightedMoveNumber, onHighlightMove }: ReplayPanelProps) {
  const { position, total, isPlaying } = view;
  const atStart = position === 0;
  const atEnd = position === total;

  return (
    <>
      <ReplayDetails view={view} />

      <section aria-label="Replay controls" data-testid="replay-controls" className="sticky bottom-2 z-20 space-y-2 rounded-2xl bg-surface/95 p-2 shadow-lg ring-1 ring-white/10 backdrop-blur lg:static lg:bg-transparent lg:p-0 lg:shadow-none lg:ring-0">
        <div className="flex gap-2">
          <button type="button" aria-label="First" title="First" onClick={() => onGoTo(0)} disabled={atStart} className={CONTROL_BUTTON}>
            <ChevronsLeft className="size-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Previous"
            title="Previous"
            onClick={() => onGoTo(position - 1)}
            disabled={atStart}
            className={CONTROL_BUTTON}
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={isPlaying ? "Pause" : "Play"}
            title={isPlaying ? "Pause" : "Play"}
            onClick={onTogglePlay}
            className={CONTROL_BUTTON}
          >
            {isPlaying ? <Pause className="size-5" aria-hidden="true" /> : <Play className="size-5" aria-hidden="true" />}
          </button>
          <button type="button" aria-label="Next" title="Next" onClick={() => onGoTo(position + 1)} disabled={atEnd} className={CONTROL_BUTTON}>
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
          <button type="button" aria-label="Last" title="Last" onClick={() => onGoTo(total)} disabled={atEnd} className={CONTROL_BUTTON}>
            <ChevronsRight className="size-5" aria-hidden="true" />
          </button>
        </div>
        <p role="status" className="text-center text-sm tabular-nums text-muted" data-testid="replay-position">
          Move {position} of {total}
        </p>
      </section>

      <MoveList
        moves={view.replay.moves}
        currentMoveNumber={position}
        highlightedMoveNumber={highlightedMoveNumber}
        onSelect={onGoTo}
        onHighlightMove={onHighlightMove}
      />

      <button
        type="button"
        onClick={onExit}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-fg px-4 py-2.5 text-sm font-semibold text-ink transition-transform hover:scale-[1.01] active:scale-[0.98]"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to game
      </button>
    </>
  );
}
