"use client";

import { useState } from "react";
import { DIFFICULTIES, type Difficulty } from "@/game/ai/ai-player";
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

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        onStart(settings);
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

      {hasProgress && <p className="text-sm text-muted">The current game will be discarded.</p>}

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
          className="flex-1 rounded-xl bg-fg px-4 py-3 text-sm font-semibold text-ink transition-transform active:scale-[0.98]"
        >
          Start game
        </button>
      </div>
    </form>
  );
}
