import { getLegalMoves } from "../engine";
import type { CellPosition, GameState } from "../types";
import { MinimaxSearch, type SearchLimits } from "./search";

export type Difficulty = "EASY" | "MEDIUM" | "HARD";

export const DIFFICULTIES: readonly Difficulty[] = ["EASY", "MEDIUM", "HARD"];

interface DifficultyProfile extends SearchLimits {
  /** Chance of choosing one of the next-best moves instead of the best (Easy only). */
  readonly slipProbability: number;
  readonly slipCandidates: number;
}

export const DIFFICULTY_PROFILES: Record<Difficulty, DifficultyProfile> = {
  EASY: { maxDepth: 2, nodeBudget: 6_000, slipProbability: 0.3, slipCandidates: 4 },
  MEDIUM: { maxDepth: 5, nodeBudget: 40_000, slipProbability: 0, slipCandidates: 1 },
  HARD: { maxDepth: 16, nodeBudget: 250_000, slipProbability: 0, slipCandidates: 1 },
};

/**
 * Picks a move for the player to move. Deterministic for a given state and difficulty,
 * except that Easy may deliberately slip using `random`.
 */
export function chooseMove(state: GameState, difficulty: Difficulty, random: () => number = Math.random): CellPosition {
  const legalMoves = getLegalMoves(state);
  if (legalMoves.length === 0) throw new Error("chooseMove called on a position with no legal moves");
  if (legalMoves.length === 1) return legalMoves[0];

  const profile = DIFFICULTY_PROFILES[difficulty];
  const search = new MinimaxSearch(profile.nodeBudget);

  if (profile.slipProbability > 0) {
    const ranked = search.scoreRootMoves(state, profile.maxDepth);
    const slips = random() < profile.slipProbability;
    const pool = slips ? ranked.slice(0, profile.slipCandidates) : ranked.slice(0, 1);
    const { boardIndex, cellIndex } = pool[Math.floor(random() * pool.length)];
    return { boardIndex, cellIndex };
  }

  return search.findBestMove(state, profile.maxDepth).move;
}
