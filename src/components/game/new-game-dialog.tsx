"use client";

import { useState } from "react";
import { DIFFICULTIES, type Difficulty } from "@/game/ai/ai-player";
import { DEFAULT_TIME_LIMIT_SECONDS, formatTimeLimit, parseTimeLimit } from "@/game/clock";
import type { Player } from "@/game/types";
import { Modal } from "./modal";
import type { GameMode, GameSettings } from "./use-game-session";

interface NewGameDialogProps {
  open: boolean;
  current: GameSettings;
  /** True when a game is underway, so starting a new one discards progress. */
  hasProgress: boolean;
  onStart: (settings: GameSettings) => void;
  onClose: () => void;
}

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}

function Segmented<T extends string>({ label, value, options, onChange }: SegmentedProps<T>) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</legend>
      <div className="grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-ink p-1">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={option.value === value}
            onClick={() => onChange(option.value)}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              option.value === value ? "bg-surface-raised text-fg shadow ring-1 ring-white/10" : "text-muted hover:text-fg"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

const MODE_OPTIONS: { value: GameMode; label: string }[] = [
  { value: "LOCAL", label: "Local multiplayer" },
  { value: "AI", label: "Single player" },
];
type TimeControl = "CLASSIC" | "TIMED";
const TIME_CONTROL_OPTIONS: { value: TimeControl; label: string }[] = [
  { value: "CLASSIC", label: "Classic" },
  { value: "TIMED", label: "Timed" },
];
const SIDE_OPTIONS: { value: Player; label: string }[] = [
  { value: "X", label: "Play as X (first)" },
  { value: "O", label: "Play as O (second)" },
];
const DIFFICULTY_OPTIONS = DIFFICULTIES.map((value) => ({
  value,
  label: value.charAt(0) + value.slice(1).toLowerCase(),
}));

export function NewGameDialog({ open, current, hasProgress, onStart, onClose }: NewGameDialogProps) {
  return (
    <Modal open={open} title="New game" onClose={onClose}>
      {/* Remounted on each open so the form always starts from the current settings. */}
      {open && <NewGameForm current={current} hasProgress={hasProgress} onStart={onStart} onClose={onClose} />}
    </Modal>
  );
}

function NewGameForm({ current, hasProgress, onStart, onClose }: Omit<NewGameDialogProps, "open">) {
  const [settings, setSettings] = useState<GameSettings>(current);
  const update = (patch: Partial<GameSettings>) => setSettings((previous) => ({ ...previous, ...patch }));
  const [timeControl, setTimeControl] = useState<TimeControl>(current.timeLimitSeconds === null ? "CLASSIC" : "TIMED");
  const [timeText, setTimeText] = useState(formatTimeLimit(current.timeLimitSeconds ?? DEFAULT_TIME_LIMIT_SECONDS));
  const parsedTime = parseTimeLimit(timeText);
  const timeInvalid = timeControl === "TIMED" && parsedTime === null;

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (timeInvalid) return;
        onStart({ ...settings, timeLimitSeconds: timeControl === "TIMED" ? parsedTime : null });
        onClose();
      }}
    >
      <Segmented label="Mode" value={settings.mode} options={MODE_OPTIONS} onChange={(mode) => update({ mode })} />

      {settings.mode === "AI" && (
        <>
          <Segmented
            label="Your side"
            value={settings.humanPlayer}
            options={SIDE_OPTIONS}
            onChange={(humanPlayer) => update({ humanPlayer })}
          />
          <Segmented
            label="AI difficulty"
            value={settings.difficulty}
            options={DIFFICULTY_OPTIONS}
            onChange={(difficulty: Difficulty) => update({ difficulty })}
          />
        </>
      )}

      <Segmented label="Time control" value={timeControl} options={TIME_CONTROL_OPTIONS} onChange={setTimeControl} />

      {timeControl === "TIMED" && (
        <div className="space-y-2">
          <label htmlFor="time-limit" className="text-xs font-semibold uppercase tracking-wider text-muted">
            Time per player (m:ss)
          </label>
          <input
            id="time-limit"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={timeText}
            onChange={(event) => setTimeText(event.target.value)}
            aria-invalid={timeInvalid}
            aria-describedby={timeInvalid ? "time-limit-error" : undefined}
            placeholder="5:00"
            className="w-full rounded-xl bg-ink px-4 py-2.5 text-sm tabular-nums ring-1 ring-white/10 focus:outline-none focus:ring-white/40"
          />
          {timeInvalid && (
            <p id="time-limit-error" role="alert" className="text-sm text-red-400">
              Enter a time between 0:01 and 99:59, like 2:30 or 5:00.
            </p>
          )}
        </div>
      )}

      {hasProgress && <p className="text-sm text-muted">The current game will be discarded and will not be saved to history.</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-xl bg-white/[0.06] px-4 py-3 text-sm font-semibold transition-colors hover:bg-white/10"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={timeInvalid}
          className="flex-1 rounded-xl bg-fg px-4 py-3 disabled:opacity-40 text-sm font-semibold text-ink transition-transform active:scale-[0.98]"
        >
          Start game
        </button>
      </div>
    </form>
  );
}
