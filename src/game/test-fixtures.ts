export type MovePair = readonly [boardIndex: number, cellIndex: number];

/** 17 moves in which X wins boards A, B and C (top row) while O cooperates; O also wins D and E on the way. */
export const TOP_ROW_VICTORY: readonly MovePair[] = [
  [0, 3], [3, 0], [0, 4], [4, 0], [0, 5],
  [5, 1], [1, 3], [3, 1], [1, 4], [4, 1], [1, 5],
  [5, 2], [2, 3], [3, 2], [2, 4], [4, 2], [2, 5],
];

/** X wins the centre board; O's reply then routes X to the resolved centre board → Free Move. */
export const FREE_MOVE_SETUP: readonly MovePair[] = [[4, 0], [0, 4], [4, 1], [1, 4], [4, 2], [2, 4]];
