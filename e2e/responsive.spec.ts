import { expect, test } from "@playwright/test";
import { cell, playMoves, trackRuntimeErrors } from "./helpers";

const VIEWPORTS = [
  { name: "mobile", width: 360, height: 740 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "laptop", width: 1280, height: 720 },
  { name: "desktop", width: 1920, height: 1080 },
];

for (const viewport of VIEWPORTS) {
  test(`layout fits the ${viewport.name} viewport (${viewport.width}×${viewport.height})`, async ({ page }, testInfo) => {
    const errors = trackRuntimeErrors(page);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/");

    const hasHorizontalScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalScroll).toBe(false);

    const box = await page.getByTestId("game-board").boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(Math.min(viewport.width - 24, 300));
    expect(Math.abs(box!.width - box!.height)).toBeLessThan(2);

    await expect(page.getByTestId("turn-indicator")).toBeVisible();
    await expect(page.getByRole("button", { name: "New game" })).toBeVisible();

    // Cells stay tappable: no cell is smaller than 28px even on the narrowest phone.
    const cellBox = await cell(page, 4, 4).boundingBox();
    expect(cellBox!.width).toBeGreaterThanOrEqual(28);

    await playMoves(page, [[4, 4], [4, 0]]);
    await expect(page.getByTestId("target-banner")).toContainText("Board A");
    await page.waitForTimeout(700);
    await page.screenshot({ path: testInfo.outputPath(`${viewport.name}.png`), fullPage: true });
    errors.expectNone();
  });
}
