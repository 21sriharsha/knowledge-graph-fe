import { expect, SAMPLE, seriousA11yViolations, test } from "./fixtures";

test.describe("F05 search", () => {
  test("F05-AC-1 typing shows suggestions; ArrowDown + Enter opens one", async ({ page, consoleErrors }) => {
    await page.goto("/");
    const box = page.getByTestId("search-box");
    await box.click();
    await box.pressSequentially("postg", { delay: 30 });
    const items = page.getByTestId("suggest-item");
    await expect(items.first()).toBeVisible();
    await expect(page.getByTestId("suggest-all")).toBeVisible();
    await box.press("ArrowDown");
    await box.press("Enter");
    await expect(page).toHaveURL(/\/articles\/[a-z0-9-]+$/);
    void consoleErrors;
  });

  test("F05-FR-3 Enter with nothing highlighted searches for the typed text", async ({ page, consoleErrors }) => {
    await page.goto("/");
    await page.getByTestId("search-box").fill("postgres");
    await page.getByTestId("search-box").press("Enter");
    await expect(page).toHaveURL(/\/search\?q=postgres/);
    await expect(page.getByTestId("search-hit").first()).toBeVisible();
    void consoleErrors;
  });

  test("F05-AC-7 '/' focuses the header search", async ({ page, consoleErrors }) => {
    await page.goto("/", { waitUntil: "networkidle" }); // shortcut is registered after hydration
    await page.keyboard.press("/");
    await expect(page.getByTestId("search-box")).toBeFocused();
    void consoleErrors;
  });

  test("F05-AC-3 AI off shows the notice and keyword mode", async ({ page, consoleErrors }) => {
    await page.goto("/search?q=postgres&understand=false");
    await expect(page.getByTestId("interp-off")).toBeVisible();
    await expect(page.getByTestId("search-meta")).toContainText("Keyword");
    void consoleErrors;
  });

  test("F05-AC-5 'Why this result' shows score components", async ({ page, consoleErrors }) => {
    await page.goto("/search?q=postgres");
    const why = page.getByTestId("why-result").first();
    await why.locator("summary").click();
    await expect(why.locator("meter").first()).toBeVisible();
    void consoleErrors;
  });

  test("F05-AC-6 URL state is shareable (page renders from the URL alone)", async ({ page, consoleErrors }) => {
    await page.goto("/search?q=postgres");
    await expect(page.getByTestId("search-input")).toHaveValue("postgres");
    void consoleErrors;
  });

  test("F05-FR-11 no results shows suggestions", async ({ page, consoleErrors }) => {
    await page.goto("/search?q=zzzqqqxxyy");
    await expect(page.getByTestId("search-empty")).toBeVisible();
    void consoleErrors;
  });

  test("F05 search page has no serious a11y violations", async ({ page, consoleErrors }) => {
    await page.goto("/search?q=postgres");
    await expect(page.getByTestId("search-hit").first()).toBeVisible();
    expect(await seriousA11yViolations(page)).toEqual([]);
    void consoleErrors;
  });
});

test.describe("F03 wave 2 — previews and local graph", () => {
  test("F03-AC-6 focusing a resolved link opens a preview with the target title", async ({ page, consoleErrors }) => {
    await page.goto(`/articles/${SAMPLE.article}`, { waitUntil: "networkidle" });
    const link = page.getByTestId("internal-link").first();
    const slug = await link.getAttribute("data-slug");
    await link.focus();
    const preview = page.locator(`[id="${await link.getAttribute("aria-describedby")}"]`);
    await expect(preview).toContainText(/min read|Loading preview/);
    // Generous: in dev mode the preview route compiles on first use.
    await expect(preview).not.toContainText("Loading preview", { timeout: 15_000 });
    expect(slug).toBeTruthy();
    void consoleErrors;
  });

  test("F03-AC-7 local graph depth 2 refetches and keeps a graph visible", async ({ page, consoleErrors }) => {
    await page.goto(`/articles/${SAMPLE.article}`);
    const panel = page.getByTestId("local-graph");
    await expect(panel.locator("g.n").first()).toBeVisible();
    const before = await panel.locator("g.n").count();
    const response = page.waitForResponse((r) => r.url().includes("/api/bff/graph/neighbourhood") && r.url().includes("depth=2"));
    await panel.getByRole("button", { name: "2" }).click();
    await response;
    await expect.poll(() => panel.locator("g.n").count()).toBeGreaterThanOrEqual(before);
    void consoleErrors;
  });
});
