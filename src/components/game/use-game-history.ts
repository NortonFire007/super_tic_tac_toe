"use client";

import { useCallback } from "react";
import type { GameResultReason, Player } from "@/game/types";
import type { GameMode } from "./use-game-session";
import { usePersistentState } from "./use-persistent-state";

/** A finished game, as shown in the history list. */
export interface GameRecord {
  /** Session game id; lets an undone-then-replayed game replace its own record. */
  id: string;
  finishedAt: number;
  mode: GameMode;
  winner: Player | null;
  reason: GameResultReason;
  boards: Record<Player, number>;
  moves: number;
}

const MAX_RECORDS = 200;
const EMPTY: GameRecord[] = [];

const isRecord = (value: unknown): value is GameRecord => {
  const record = value as GameRecord | null;
  return (
    typeof record === "object" &&
    record !== null &&
    typeof record.id === "string" &&
    typeof record.finishedAt === "number" &&
    typeof record.boards?.X === "number" &&
    typeof record.boards?.O === "number" &&
    typeof record.moves === "number"
  );
};

const parseRecords = (value: unknown): GameRecord[] => (Array.isArray(value) ? value.filter(isRecord) : EMPTY);

export function useGameHistory() {
  const [records, update] = usePersistentState("utt:history", EMPTY, parseRecords);

  /** Adds a record (newest first). Does nothing if this game is already recorded. */
  const saveRecord = useCallback(
    (record: GameRecord) =>
      update((current) =>
        current.some((existing) => existing.id === record.id) ? current : [record, ...current].slice(0, MAX_RECORDS),
      ),
    [update],
  );

  /** Drops a game's record, e.g. when undo reopens a finished game. */
  const discardRecord = useCallback(
    (id: string) => update((current) => (current.some((r) => r.id === id) ? current.filter((r) => r.id !== id) : current)),
    [update],
  );

  const clearHistory = useCallback(() => update(() => EMPTY), [update]);

  return { records, saveRecord, discardRecord, clearHistory };
}
