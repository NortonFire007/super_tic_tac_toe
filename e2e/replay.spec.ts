import { expect, test } from "@playwright/test";
import { cell, playMoves, TOP_ROW_VICTORY, trackRuntimeErrors } from "./helpers";

test("move list, history replay and read-only navigation", async ({ page }) => {
  const errors = trackRuntimeErrors(page);
  await page.goto("/");

  // 1. Playing populates the move list.
  await playMoves(page, TOP_ROW_VICTORY.slice(0, 2));
  await expect(page.getByTestId("move-1")).toHaveAccessibleName("Move 1: X, Board A, Middle Left");
  await expect(page.getByTestId("move-2")).toHaveAttribute("aria-current", "step");

  // 9. Hovering a move highlights its board and cell; hovering a cell highlights its move.
  await page.getByTestId("move-1").hover();
  await expect(cell(page, 0, 3)).toHaveAttribute("data-highlighted", "true");
  await expect(page.getByTestId("board-0")).toHaveAttribute("data-previewed", "true");
  await cell(page, 3, 0).hover();
  await expect(page.getByTestId("move-2")).toHaveAttribute("data-highlighted", "true");

  // 2. Finishing the game adds it to the history.
  await playMoves(page, TOP_ROW_VICTORY.slice(2));
  await expect(page.getByTestId("result-headline")).toHaveText("X wins");
  await page.getByRole("button", { name: "History" }).click();
  await expect(page.getByTestId("history-row")).toHaveCount(1);

  // 3. Open it as a replay.
  await page.getByRole("button", { name: "Replay", exact: true }).click();
  await expect(page.getByTestId("replay-details")).toContainText("17 moves");
  await expect(page.getByTestId("replay-position")).toHaveText("Move 17 of 17");

  // 4. Move 0 is the empty board.
  await page.getByRole("button", { name: "First", exact: true }).click();
  await expect(page.getByTestId("replay-position")).toHaveText("Move 0 of 17");
  await expect(page.locator('[data-testid^="cell-"][aria-label$=", empty"]')).toHaveCount(81);

  // 5. Forward, 6. backward.
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByTestId("replay-position")).toHaveText("Move 3 of 17");
  await page.getByRole("button", { name: "Previous", exact: true }).click();
  await expect(page.getByTestId("replay-position")).toHaveText("Move 2 of 17");

  // 7./8. Clicking a move shows the board after that move.
  await page.getByTestId("move-5").click();
  await expect(page.getByTestId("replay-position")).toHaveText("Move 5 of 17");
  await expect(cell(page, 0, 5)).toHaveAccessibleName("Board A, Middle Right, occupied by X");
  await expect(cell(page, 1, 3)).toHaveAccessibleName("Board B, Middle Left, empty");
  await expect(page.locator('[data-testid^="cell-"][aria-label$="occupied by X"], [data-testid^="cell-"][aria-label$="occupied by O"]')).toHaveCount(5);

  // 11. The replay board is read-only.
  await expect(page.locator('[data-testid^="cell-"]:enabled')).toHaveCount(0);
  await cell(page, 1, 3).click({ force: true });
  await expect(page.getByTestId("replay-position")).toHaveText("Move 5 of 17");
  await expect(cell(page, 1, 3)).toHaveAccessibleName("Board B, Middle Left, empty");

  // 10. The final position matches the original game.
  await page.getByRole("button", { name: "Last", exact: true }).click();
  await expect(page.getByTestId("result-headline")).toHaveText("X wins");
  await expect(page.getByTestId("global-win-line")).toBeAttached();
  await expect(page.getByTestId("score-X")).toHaveText("3");
  await expect(page.getByTestId("score-O")).toHaveText("2");

  // Leaving the replay returns to the finished live game, not a new one.
  await page.getByRole("button", { name: "Back to game" }).click();
  await expect(page.getByTestId("replay-controls")).toHaveCount(0);
  await expect(page.getByTestId("result-headline")).toHaveText("X wins");

  // The replay survives a reload.
  await page.reload();
  await page.getByRole("button", { name: "History" }).click();
  await page.getByRole("button", { name: "Replay", exact: true }).click();
  await expect(page.getByTestId("replay-position")).toHaveText("Move 17 of 17");
  errors.expectNone();
});

test("a timed game that ends on time replays with its timeout result", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "New game" }).click();
  const dialog = page.getByRole("dialog", { name: "New game" });
  await dialog.getByRole("button", { name: "Timed" }).click();
  await dialog.getByLabel(/Time per player/).fill("0:02");
  await dialog.getByRole("button", { name: "Start game" }).click();
  await cell(page, 0, 4).click();
  await expect(page.getByTestId("result-headline")).toHaveText("Time Out", { timeout: 6_000 });

  await page.getByRole("button", { name: "History" }).click();
  await page.getByRole("button", { name: "Replay", exact: true }).click();
  await expect(page.getByTestId("replay-details")).toContainText("Timed · 0:02 per player");
  await expect(page.getByTestId("result-headline")).toHaveText("Time Out");

  await page.getByRole("button", { name: "First", exact: true }).click();
  await expect(page.getByTestId("turn-indicator")).toHaveText("Player X to move");
  await page.getByRole("button", { name: "Last", exact: true }).click();
  await expect(page.getByTestId("game-status")).toContainText("O ran out of time — X wins");
});
