import type { CellPosition, GameState } from "../types";
import { chooseMove, type Difficulty } from "./ai-player";

export interface AiRequest {
  readonly requestId: number;
  readonly state: GameState;
  readonly difficulty: Difficulty;
}

export interface AiResponse {
  readonly requestId: number;
  readonly move: CellPosition | null;
  readonly error?: string;
}

self.onmessage = (event: MessageEvent<AiRequest>) => {
  const { requestId, state, difficulty } = event.data;
  try {
    self.postMessage({ requestId, move: chooseMove(state, difficulty) } satisfies AiResponse);
  } catch (error) {
    self.postMessage({ requestId, move: null, error: String(error) } satisfies AiResponse);
  }
};
