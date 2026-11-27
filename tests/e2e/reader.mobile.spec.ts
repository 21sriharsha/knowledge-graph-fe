import { expect, SAMPLE, test } from "./fixtures";

test.describe("mobile layout (X02: no horizontal scroll)", () => {
  for (const path of ["/", `/articles/${SAMPLE.article}`, `/topics/${SAMPLE.topic}`, "/search?q=postgres", "/graph"]) {
    test(`no horizontal overflow on ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });
  }
});
