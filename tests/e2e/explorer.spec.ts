import { expect, seriousA11yViolations, test } from "./fixtures";

test.describe("F06 graph explorer", () => {
  // F06-FR-7: with reduced motion the simulation settles before first paint, so nodes are stable targets.
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
  });

  test("F06-AC-1 defaults: link distance 130, repel 360, all nodes inside the canvas", async ({ page, consoleErrors }) => {
    await page.goto("/graph");
    const panel = page.getByTestId("graph-panel");
    await expect(panel.getByLabel("Link distance")).toHaveValue("130");
    await expect(panel.getByLabel("Repel")).toHaveValue("360");
    const nodes = page.getByTestId("graph-node");
    await expect(nodes.first()).toBeVisible();
    await page.waitForTimeout(1500); // let the simulation settle
    const box = await page.getByTestId("graph-svg").boundingBox();
    for (const node of await nodes.all()) {
      const b = (await node.boundingBox())!;
      expect(b.x).toBeGreaterThanOrEqual(box!.x - 2);
      expect(b.x + b.width).toBeLessThanOrEqual(box!.x + box!.width + 2);
    }
    void consoleErrors;
  });

  test("F06-AC-2/3 hover shows exactly one card; labels hidden at default zoom", async ({ page, consoleErrors }) => {
    await page.goto("/graph");
    const node = page.getByTestId("graph-node").first().locator("circle.core");
    await expect(node).toBeVisible();
    const opacities = await page.locator("g.n text").evaluateAll((els) => els.map((e) => getComputedStyle(e).opacity));
    expect(opacities.every((o) => o === "0")).toBe(true);
    await node.hover();
    await expect(page.locator(".kg-tip.on")).toHaveCount(1);
    await expect(page.locator("g.n title")).toHaveCount(0);
    void consoleErrors;
  });

  test("F06-AC-5 taxonomy scope centres on a topic; clicking a leaf re-centres", async ({ page, consoleErrors }) => {
    await page.goto("/graph?focus=topic:postgresql&depth=1");
    await expect(page.getByTestId("graph-focus")).toHaveValue("topic:postgresql");
    const leaf = page.locator('g.n:not(.focus)[data-slug="postgres"] circle.core');
    await expect(leaf).toBeVisible();
    await leaf.click();
    await expect(page).toHaveURL(/focus=tag%3Apostgres|focus=tag:postgres/);
    await expect(page.getByTestId("graph-focus")).toHaveValue("tag:postgres");
    void consoleErrors;
  });

  test("F06-AC-6 tags off while centred on a tag keeps the centre and shows only topics", async ({ page, consoleErrors }) => {
    await page.goto("/graph?focus=tag:postgres&depth=1");
    await expect(page.getByTestId("graph-node").first()).toBeVisible();
    await page.getByTestId("graph-include-tags").click();
    await expect(page).toHaveURL(/tags=0/);
    await expect(page.locator("g.n.focus")).toHaveCount(1);
    await expect.poll(async () => (await page.locator('g.n:not(.focus) text').allTextContents()).every((t) => !t.startsWith("#"))).toBe(true);
    void consoleErrors;
  });

  test("F06-AC-7 unchecking a topic hides its article nodes", async ({ page, consoleErrors }) => {
    await page.goto("/graph");
    await expect(page.getByTestId("graph-node").first()).toBeVisible();
    const before = await page.getByTestId("graph-node").count();
    await page.getByTestId("graph-topics").getByLabel("PostgreSQL").uncheck();
    await expect.poll(() => page.getByTestId("graph-node").count()).toBeLessThan(before);
    void consoleErrors;
  });

  test("F06-AC-9 /graph?focus=tag:postgres opens the taxonomy scope", async ({ page, consoleErrors }) => {
    await page.goto("/graph?focus=tag:postgres");
    await expect(page.getByTestId("scope-local")).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("g.n.focus")).toHaveCount(1);
    void consoleErrors;
  });

  test("F06 selecting an article node opens the side card", async ({ page, consoleErrors }) => {
    await page.goto("/graph");
    // Target the dot: the node group's box includes its (hidden) label, so its centre can miss.
    await page.getByTestId("graph-node").first().locator("circle.core").click();
    await expect(page.getByTestId("graph-card")).toBeVisible();
    await expect(page.getByTestId("graph-card-open")).toHaveAttribute("href", /\/articles\//);
    void consoleErrors;
  });

  test("F06 explorer has no serious a11y violations", async ({ page, consoleErrors }) => {
    await page.goto("/graph");
    await expect(page.getByTestId("graph-node").first()).toBeVisible();
    expect(await seriousA11yViolations(page)).toEqual([]);
    void consoleErrors;
  });
});
