"use client";

import { useCallback } from "react";
import { replayHistory } from "@/game/engine";
import type { GameResultReason, Move, Player } from "@/game/types";
import type { GameMode } from "./use-game-session";
import { usePersistentState } from "./use-persistent-state";

/** Everything needed to replay a game: its ordered moves plus how it was played. */
export interface ReplayData {
  startedAt: number;
  /** Seconds per player, or null for Classic (untimed) play. */
  timeLimitSeconds: number | null;
  moves: readonly Move[];
}

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
  /** Absent for games saved before replays existed; those can only be listed, not replayed. */
  replay?: ReplayData;
}

const MAX_RECORDS = 200;
const EMPTY: GameRecord[] = [];

const isNumber = (value: unknown): value is number => typeof value === "number";

const isMove = (value: unknown): value is Move => {
  const move = value as Move | null;
  return (
    typeof move === "object" &&
    move !== null &&
    (move.player === "X" || move.player === "O") &&
    isNumber(move.boardIndex) &&
    isNumber(move.cellIndex) &&
    isNumber(move.moveNumber)
  );
};

/** Only replay data that the engine accepts move by move may be offered for replay. */
function isReplayable(value: unknown): value is ReplayData {
  const replay = value as ReplayData | null;
  if (typeof replay !== "object" || replay === null) return false;
  if (!isNumber(replay.startedAt) || !(replay.timeLimitSeconds === null || isNumber(replay.timeLimitSeconds))) return false;
  if (!Array.isArray(replay.moves) || !replay.moves.every(isMove)) return false;
  try {
    replayHistory(replay.moves);
    return true;
  } catch {
    return false;
  }
}

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

/** Keeps every readable record; a record whose move list is corrupt stays listed but loses its replay. */
const parseRecords = (value: unknown): GameRecord[] =>
  Array.isArray(value)
    ? value.filter(isRecord).map(({ replay, ...record }) => (isReplayable(replay) ? { ...record, replay } : record))
    : EMPTY;

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
