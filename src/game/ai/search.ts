import { WINNING_LINES } from "../constants";
import { applyMove, getFinalResult, getLegalMoves, isGameOver } from "../engine";
import { getOpponent } from "../rules";
import type { CellPosition, GameState, Player } from "../types";
import { BOARD_IMPORTANCE, completesLine, evaluateForMover, hasWinningCell, WEIGHTS } from "./evaluation";

export interface SearchLimits {
  /** Deepest iteration of iterative deepening. */
  readonly maxDepth: number;
  /** Total nodes allowed; deterministic stand-in for a time limit. */
  readonly nodeBudget: number;
}

export interface ScoredMove extends CellPosition {
  readonly score: number;
}

type BoundType = "EXACT" | "LOWER" | "UPPER";

interface TranspositionEntry {
  readonly depth: number;
  readonly score: number;
  readonly bound: BoundType;
  readonly bestMove: CellPosition | null;
}

/** Move-ordering bonuses; only the relative order matters. */
const ORDERING = {
  COMPLETES_GLOBAL_LINE_HINT: 5_000,
  WINS_LOCAL_BOARD: 1_000,
  BLOCKS_LOCAL_WIN: 300,
  GIVES_OPPONENT_FREE_MOVE: -450,
  SENDS_OPPONENT_TO_WINNABLE_BOARD: -600,
  TRANSPOSITION_MOVE: 100_000,
} as const;

const NEGATIVE_INFINITY_SCORE = -WEIGHTS.WIN * 10;

class SearchBudgetExceeded extends Error {}

const isSameMove = (a: CellPosition | null, b: CellPosition) =>
  a !== null && a.boardIndex === b.boardIndex && a.cellIndex === b.cellIndex;

function positionKey(state: GameState): string {
  let key = state.currentPlayer;
  key += state.target.mode === "BOARD" ? state.target.boardIndex : state.target.mode[0];
  for (const board of state.boards) {
    if (board.status === "OPEN") {
      for (const cell of board.cells) key += cell ?? "-";
    } else {
      key += board.status[0];
    }
  }
  return key;
}

export class MinimaxSearch {
  private readonly table = new Map<string, TranspositionEntry>();
  private nodesVisited = 0;

  constructor(private readonly nodeBudget: number) {}

  /** Best move found by iterative deepening, together with the deepest completed depth. */
  findBestMove(state: GameState, maxDepth: number): { move: CellPosition; depth: number } {
    const rootMoves = getLegalMoves(state);
    let best = { move: this.orderMoves(state, rootMoves, null)[0], depth: 0 };

    for (let depth = 1; depth <= maxDepth; depth++) {
      try {
        const scored = this.searchRoot(state, depth, best.move);
        const { boardIndex, cellIndex } = scored[0];
        best = { move: { boardIndex, cellIndex }, depth };
        if (Math.abs(scored[0].score) >= WEIGHTS.WIN / 2) break; // forced result found
      } catch (error) {
        if (error instanceof SearchBudgetExceeded) break;
        throw error;
      }
    }
    return best;
  }

  /** Scores every root move with a full window (no pruning between siblings), best first. */
  scoreRootMoves(state: GameState, depth: number): ScoredMove[] {
    return this.searchRoot(state, depth, null, true);
  }

  private searchRoot(
    state: GameState,
    depth: number,
    previousBest: CellPosition | null,
    fullWindow = false,
  ): ScoredMove[] {
    const mover = state.currentPlayer;
    const moves = this.orderMoves(state, getLegalMoves(state), previousBest);
    const scored: ScoredMove[] = [];
    let alpha = NEGATIVE_INFINITY_SCORE;

    for (const move of moves) {
      const child = applyMove(state, move);
      const score = this.scoreChild(child, mover, depth - 1, fullWindow ? NEGATIVE_INFINITY_SCORE : alpha, -NEGATIVE_INFINITY_SCORE, 1);
      scored.push({ ...move, score });
      if (!fullWindow) alpha = Math.max(alpha, score);
    }
    // Array.prototype.sort is stable, so ties keep the move-ordering order (deterministic).
    return scored.sort((a, b) => b.score - a.score);
  }

  /** Value of `child` for `mover`, who just moved. */
  private scoreChild(child: GameState, mover: Player, depth: number, alpha: number, beta: number, ply: number): number {
    if (isGameOver(child)) return this.terminalScore(child, mover, ply);
    return -this.negamax(child, depth, -beta, -alpha, ply);
  }

  private terminalScore(finished: GameState, mover: Player, ply: number): number {
    const winner = getFinalResult(finished)?.winner ?? null;
    if (winner === null) return 0;
    // Prefer faster wins and slower losses.
    return winner === mover ? WEIGHTS.WIN - ply : -(WEIGHTS.WIN - ply);
  }

  private negamax(state: GameState, depth: number, alpha: number, beta: number, ply: number): number {
    if (++this.nodesVisited > this.nodeBudget) throw new SearchBudgetExceeded();
    if (depth <= 0) return evaluateForMover(state);

    const originalAlpha = alpha;
    const key = positionKey(state);
    const cached = this.table.get(key);
    if (cached && cached.depth >= depth) {
      if (cached.bound === "EXACT") return cached.score;
      if (cached.bound === "LOWER") alpha = Math.max(alpha, cached.score);
      else beta = Math.min(beta, cached.score);
      if (alpha >= beta) return cached.score;
    }

    const mover = state.currentPlayer;
    let bestScore = NEGATIVE_INFINITY_SCORE;
    let bestMove: CellPosition | null = null;

    for (const move of this.orderMoves(state, getLegalMoves(state), cached?.bestMove ?? null)) {
      const score = this.scoreChild(applyMove(state, move), mover, depth - 1, alpha, beta, ply + 1);
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
      alpha = Math.max(alpha, score);
      if (alpha >= beta) break;
    }

    const bound: BoundType = bestScore <= originalAlpha ? "UPPER" : bestScore >= beta ? "LOWER" : "EXACT";
    this.table.set(key, { depth, score: bestScore, bound, bestMove });
    return bestScore;
  }

  /** Orders moves so likely-best ones are searched first, which makes alpha-beta prune more. */
  private orderMoves(state: GameState, moves: CellPosition[], preferred: CellPosition | null): CellPosition[] {
    const mover = state.currentPlayer;
    const opponent = getOpponent(mover);

    const priority = (move: CellPosition): number => {
      const board = state.boards[move.boardIndex];
      let score = BOARD_IMPORTANCE[move.boardIndex] + BOARD_IMPORTANCE[move.cellIndex];
      if (isSameMove(preferred, move)) score += ORDERING.TRANSPOSITION_MOVE;

      const winsBoard = completesLine(board.cells, move.cellIndex, mover);
      if (winsBoard) score += ORDERING.WINS_LOCAL_BOARD + this.globalLineBonus(state, move.boardIndex, mover);
      if (completesLine(board.cells, move.cellIndex, opponent)) score += ORDERING.BLOCKS_LOCAL_WIN;

      const destination = state.boards[move.cellIndex];
      const destinationResolved = destination.status !== "OPEN" || (move.cellIndex === move.boardIndex && winsBoard);
      if (destinationResolved) score += ORDERING.GIVES_OPPONENT_FREE_MOVE;
      else if (hasWinningCell(destination.cells, opponent)) score += ORDERING.SENDS_OPPONENT_TO_WINNABLE_BOARD;
      return score;
    };

    return moves
      .map((move) => ({ move, score: priority(move) }))
      .sort((a, b) => b.score - a.score)
      .map(({ move }) => move);
  }

  /** Cheap hint: does owning this board complete a global line? */
  private globalLineBonus(state: GameState, boardIndex: number, player: Player): number {
    const owned = state.boards.map((board) => board.status === `${player}_WON`);
    owned[boardIndex] = true;
    return WINNING_LINES.some((line) => line.includes(boardIndex) && line.every((index) => owned[index]))
      ? ORDERING.COMPLETES_GLOBAL_LINE_HINT
      : 0;
  }
}
