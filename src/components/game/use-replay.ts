"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { reconstructGame } from "@/game/engine";
import { getOpponent } from "@/game/rules";
import type { GameState } from "@/game/types";
import type { GameRecord, ReplayData } from "./use-game-history";

const AUTOPLAY_INTERVAL_MS = 900;

interface ReplayState {
  record: GameRecord;
  replay: ReplayData;
  /** Moves applied so far: 0 is the empty board, `replay.moves.length` the final position. */
  position: number;
  playing: boolean;
}

export interface ReplayView {
  record: GameRecord;
  replay: ReplayData;
  game: GameState;
  position: number;
  total: number;
  isPlaying: boolean;
}

/** Replays a finished game from its stored moves, always through the real engine. */
export function useReplay() {
  const [state, setState] = useState<ReplayState | null>(null);

  const total = state?.replay.moves.length ?? 0;
  const isPlaying = state !== null && state.playing && state.position < total;

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(
      () => setState((current) => (current && current.position < total ? { ...current, position: current.position + 1 } : current)),
      AUTOPLAY_INTERVAL_MS,
    );
    return () => clearInterval(timer);
  }, [isPlaying, total]);

  const view = useMemo<ReplayView | null>(() => {
    if (!state) return null;
    const { record, replay, position } = state;
    const timeoutLoser = record.reason === "TIMEOUT" && record.winner ? getOpponent(record.winner) : null;
    return {
      record,
      replay,
      game: reconstructGame(replay.moves, position, timeoutLoser),
      position,
      total: replay.moves.length,
      isPlaying,
    };
  }, [state, isPlaying]);

  /** Opens a record at its start (move 0); records without move data cannot be replayed. */
  const open = useCallback((record: GameRecord) => {
    if (!record.replay) return;
    setState({ record, replay: record.replay, position: 0, playing: false });
  }, []);

  const close = useCallback(() => setState(null), []);

  /** Jumps to a position (clamped to 0…total) and stops autoplay. */
  const goTo = useCallback(
    (position: number) =>
      setState((current) =>
        current && {
          ...current,
          position: Math.min(Math.max(position, 0), current.replay.moves.length),
          playing: false,
        },
      ),
    [],
  );

  /** Starts or stops autoplay; starting at the end rewinds to the beginning first. */
  const togglePlay = useCallback(
    () =>
      setState((current) => {
        if (!current) return current;
        if (current.playing && current.position < current.replay.moves.length) return { ...current, playing: false };
        const position = current.position >= current.replay.moves.length ? 0 : current.position;
        return { ...current, position, playing: true };
      }),
    [],
  );

  return { replay: view, open, close, goTo, togglePlay };
}
