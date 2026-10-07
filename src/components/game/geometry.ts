import type { WinningLine } from "@/game/rules";

const GRID_SIZE = 3;

/** Centre of a cell/board in a 3×3 grid drawn in a 3×3 SVG viewBox. */
const centerOf = (index: number) => ({
  x: (index % GRID_SIZE) + 0.5,
  y: Math.floor(index / GRID_SIZE) + 0.5,
});

/** Endpoints of a winning line, extended slightly past the outer centres. */
export function getLineEndpoints(line: WinningLine, overshoot = 0.28) {
  const start = centerOf(line[0]);
  const end = centerOf(line[2]);
  const length = Math.hypot(end.x - start.x, end.y - start.y);
  const dx = ((end.x - start.x) / length) * overshoot;
  const dy = ((end.y - start.y) / length) * overshoot;
  return { x1: start.x - dx, y1: start.y - dy, x2: end.x + dx, y2: end.y + dy };
}
