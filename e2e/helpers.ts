import { expect, type Page } from "@playwright/test";

import type { MovePair } from "../src/game/test-fixtures";

export { FREE_MOVE_SETUP, TOP_ROW_VICTORY } from "../src/game/test-fixtures";

export const cell = (page: Page, boardIndex: number, cellIndex: number) =>
  page.getByTestId(`cell-${boardIndex}-${cellIndex}`);

export const board = (page: Page, boardIndex: number) => page.getByTestId(`board-${boardIndex}`);

export async function playMoves(page: Page, moves: readonly MovePair[]) {
  for (const [boardIndex, cellIndex] of moves) {
    await cell(page, boardIndex, cellIndex).click();
  }
}

/** Records console errors and uncaught exceptions so tests can assert a clean runtime. */
export function trackRuntimeErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("requestfailed", (request) => errors.push(`request failed: ${request.url()}`));
  return { expectNone: () => expect(errors).toEqual([]) };
}

export async function startGame(
  page: Page,
  options: { mode: "LOCAL" } | { mode: "AI"; side?: "X" | "O"; difficulty?: "Easy" | "Medium" | "Hard" },
) {
  await page.getByRole("button", { name: "New game" }).click();
  const dialog = page.getByRole("dialog", { name: "New game" });
  if (options.mode === "AI") {
    await dialog.getByRole("button", { name: "Single player" }).click();
    await dialog.getByRole("button", { name: options.side === "O" ? /Play as O/ : /Play as X/ }).click();
    await dialog.getByRole("button", { name: options.difficulty ?? "Easy", exact: true }).click();
  } else {
    await dialog.getByRole("button", { name: "Local multiplayer" }).click();
  }
  await dialog.getByRole("button", { name: "Start game" }).click();
  await expect(dialog).toBeHidden();
}
