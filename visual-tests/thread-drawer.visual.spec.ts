import { expect, test, type Page } from "@playwright/test";

async function expectNoPanelOverflow(page: Page) {
  const overflow = await page.locator("[data-panel]").evaluateAll((panels: HTMLElement[]) =>
    panels
      .filter((panel) => panel.scrollWidth > panel.clientWidth)
      .map((panel) => ({
        state: panel.dataset.state ?? "copy option",
        width: panel.dataset.width ?? `${panel.clientWidth}`,
        clientWidth: panel.clientWidth,
        scrollWidth: panel.scrollWidth,
      })),
  );
  expect(overflow).toEqual([]);
}

test("thread drawer state matrix", async ({ page }) => {
  await page.goto("/?story=tuple--thread-drawer--state-matrix&mode=preview");
  const matrix = page.getByTestId("state-matrix");
  await expect(matrix).toBeVisible();
  await expectNoPanelOverflow(page);
  await expect(matrix).toHaveScreenshot("thread-drawer-state-matrix.png");
});

test("composer copy options", async ({ page }) => {
  await page.goto("/?story=tuple--thread-drawer--composer-copy&mode=preview");
  const options = page.getByTestId("composer-copy");
  await expect(options).toBeVisible();
  await expectNoPanelOverflow(page);
  await expect(options).toHaveScreenshot("thread-drawer-composer-copy.png");
});

test("out-of-call state matrix", async ({ page }) => {
  await page.goto("/?story=tuple--out-of-call--state-matrix&mode=preview");
  const matrix = page.getByTestId("launchpad-matrix");
  await expect(matrix).toBeVisible();
  await expectNoPanelOverflow(page);
  await page.locator('[data-state="Full launchpad"][data-width="360"] button').first().hover();
  await expect(matrix).toHaveScreenshot("out-of-call-state-matrix.png");
});
