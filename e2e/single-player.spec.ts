import { expect, test } from "@playwright/test";
import { cell, startGame, trackRuntimeErrors } from "./helpers";

const filledBy = (mark: "X" | "O") => `[data-testid^="cell-"][aria-label$=": ${mark}"]`;

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("the AI answers a human move in the board the move routes to", async ({ page }) => {
  const errors = trackRuntimeErrors(page);
  await startGame(page, { mode: "AI", side: "X", difficulty: "Medium" });

  await cell(page, 4, 4).click();
  await expect(page.getByText("AI is thinking…")).toBeVisible();
  await expect(page.locator(filledBy("O"))).toHaveCount(1, { timeout: 15_000 });
  // The AI had to play inside board E (index 4).
  await expect(page.locator('[data-testid^="cell-4-"][aria-label$=": O"]')).toHaveCount(1);
  await expect(page.getByTestId("turn-indicator")).toHaveText("You (X) to move");
  errors.expectNone();
});

test("input is locked while the AI is thinking", async ({ page }) => {
  await startGame(page, { mode: "AI", side: "X", difficulty: "Hard" });
  await cell(page, 4, 4).click();
  await expect(page.locator('[data-testid^="cell-"]:enabled')).toHaveCount(0);
  await expect(page.locator(filledBy("O"))).toHaveCount(1, { timeout: 20_000 });
  await expect(page.locator('[data-testid^="cell-"]:enabled').first()).toBeVisible();
});

test("playing as O makes the AI open the game as X", async ({ page }) => {
  await startGame(page, { mode: "AI", side: "O", difficulty: "Easy" });
  await expect(page.locator(filledBy("X"))).toHaveCount(1, { timeout: 15_000 });
  await expect(page.getByTestId("turn-indicator")).toHaveText("You (O) to move");
});

test("undo against the AI returns to the human's previous turn", async ({ page }) => {
  await startGame(page, { mode: "AI", side: "X", difficulty: "Easy" });
  await cell(page, 4, 4).click();
  await expect(page.locator(filledBy("O"))).toHaveCount(1, { timeout: 15_000 });
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.locator(filledBy("X"))).toHaveCount(0);
  await expect(page.locator(filledBy("O"))).toHaveCount(0);
  await expect(page.getByTestId("turn-indicator")).toHaveText("You (X) to move");
});
