import { expect, test } from "@playwright/test";
import { board, cell, FREE_MOVE_SETUP, playMoves, startGame, TOP_ROW_VICTORY, trackRuntimeErrors } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("Flow A: X can play in any of the 81 cells of a new game", async ({ page }) => {
  const errors = trackRuntimeErrors(page);
  await page.reload();
  await expect(page.getByTestId("turn-indicator")).toHaveText("Player X to move");
  await expect(page.locator('[data-testid^="cell-"]')).toHaveCount(81);
  await expect(page.locator('[data-testid^="cell-"]:enabled')).toHaveCount(81);
  await expect(page.getByTestId("target-banner")).toContainText("Anywhere");
  errors.expectNone();
});

test("Flows B and C: the played cell routes the opponent to the matching board", async ({ page }) => {
  await cell(page, 7, 4).click();
  await expect(page.getByTestId("turn-indicator")).toHaveText("Player O to move");
  await expect(page.getByTestId("target-banner")).toContainText("Board E");
  await expect(board(page, 4)).toHaveAttribute("data-board-state", "TARGET");
  await expect(page.locator('[data-testid^="cell-"]:enabled')).toHaveCount(9);
  await expect(cell(page, 4, 8)).toBeEnabled();
  await expect(cell(page, 0, 0)).toBeDisabled();

  await cell(page, 4, 0).click();
  await expect(page.getByTestId("target-banner")).toContainText("Board A");
  await expect(board(page, 0)).toHaveAttribute("data-board-state", "TARGET");
  await expect(cell(page, 0, 8)).toBeEnabled();
  await expect(cell(page, 4, 8)).toBeDisabled();
});

test("occupied cells cannot be played again", async ({ page }) => {
  await playMoves(page, [[0, 4], [4, 0]]);
  await expect(cell(page, 0, 4)).toBeDisabled();
  await expect(cell(page, 0, 4)).toHaveAccessibleName(/: X$/);
});

test("Flows D and E: winning a board resolves it and a closed target gives a Free Move", async ({ page }) => {
  await playMoves(page, FREE_MOVE_SETUP.slice(0, 5));
  await expect(board(page, 4)).toHaveAttribute("data-board-state", "X_WON");
  await expect(page.getByTestId("board-4-result")).toBeVisible();
  await expect(page.getByTestId("target-banner")).toContainText("Board C");
  await expect(cell(page, 4, 5)).toBeDisabled();
  await expect(page.getByTestId("score-X")).toHaveText("1");

  await playMoves(page, [FREE_MOVE_SETUP[5]]);
  await expect(page.getByTestId("turn-indicator")).toHaveText("Player X to move");
  await expect(page.getByTestId("target-banner")).toContainText("Free Move");
  await expect(board(page, 3)).toHaveAttribute("data-board-state", "FREE");
  await expect(cell(page, 3, 3)).toBeEnabled();
  await expect(cell(page, 8, 8)).toBeEnabled();
  await expect(cell(page, 4, 8)).toBeDisabled();

  // The free move grants no extra turn and still routes the opponent by cell index.
  await cell(page, 3, 6).click();
  await expect(page.getByTestId("turn-indicator")).toHaveText("Player O to move");
  await expect(page.getByTestId("target-banner")).toContainText("Board G");
});

test("Flow F: a global winning line ends the game immediately", async ({ page }) => {
  const errors = trackRuntimeErrors(page);
  await playMoves(page, TOP_ROW_VICTORY);

  await expect(page.getByTestId("result-headline")).toHaveText("X wins");
  await expect(page.getByTestId("global-win-line")).toBeAttached();
  await expect(page.locator('[data-testid^="cell-"]:enabled')).toHaveCount(0);
  await expect(page.getByTestId("score-X")).toHaveText("3");
  await expect(page.getByTestId("score-O")).toHaveText("2");
  await expect(page.getByRole("button", { name: "Undo" })).toBeEnabled();
  errors.expectNone();
});

test("Flow G: a new game resets all 81 cells and X starts again", async ({ page }) => {
  await playMoves(page, TOP_ROW_VICTORY);
  await startGame(page, { mode: "LOCAL" });

  await expect(page.getByTestId("turn-indicator")).toHaveText("Player X to move");
  await expect(page.locator('[data-testid^="cell-"]:enabled')).toHaveCount(81);
  await expect(page.locator('[data-testid^="cell-"][aria-label$=": empty"]')).toHaveCount(81);
  await expect(page.getByTestId("score-X")).toHaveText("0");
  await expect(page.getByTestId("global-win-line")).toHaveCount(0);
  await expect(page.getByTestId("target-banner")).toContainText("Anywhere");
});

test("undo takes back the last move in local multiplayer", async ({ page }) => {
  await expect(page.getByRole("button", { name: "Undo" })).toBeDisabled();
  await playMoves(page, [[4, 4], [4, 0]]);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByTestId("turn-indicator")).toHaveText("Player O to move");
  await expect(cell(page, 4, 0)).toBeEnabled();
  await expect(page.getByTestId("target-banner")).toContainText("Board E");
});

test("the rules dialog opens, is labelled and closes with Escape", async ({ page }) => {
  await page.getByRole("button", { name: "How to play" }).click();
  const dialog = page.getByRole("dialog", { name: "How to play" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Free Move");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("the game is playable with the keyboard alone", async ({ page }) => {
  await cell(page, 4, 4).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("turn-indicator")).toHaveText("Player O to move");
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toHaveAttribute("data-testid", /^cell-4-/);
});

test("Timed mode: clocks hand over on a move and the player who runs out loses on time", async ({ page }) => {
  const errors = trackRuntimeErrors(page);
  await page.getByRole("button", { name: "New game" }).click();
  const dialog = page.getByRole("dialog", { name: "New game" });
  await dialog.getByRole("button", { name: "Timed" }).click();
  await dialog.getByLabel(/Time per player/).fill("0:03");
  await dialog.getByRole("button", { name: "Start game" }).click();

  await expect(page.getByTestId("clock-X-time")).toHaveText(/0:0[23]/);
  await expect(page.getByTestId("clock-O-time")).toHaveText("0:03");
  await cell(page, 0, 4).click();
  await expect(page.getByTestId("clock-O")).toHaveAttribute("data-active", "true");

  await expect(page.getByTestId("result-headline")).toHaveText("Time Out", { timeout: 6_000 });
  await expect(page.getByTestId("game-status")).toContainText("O ran out of time — X wins");
  await expect(page.getByTestId("clock-O-time")).toHaveText("0:00");
  await expect(page.locator('[data-testid^="cell-"]:enabled')).toHaveCount(0);
  errors.expectNone();
});
