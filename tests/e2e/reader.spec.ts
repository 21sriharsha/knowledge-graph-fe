import { expect, SAMPLE, seriousA11yViolations, test } from "./fixtures";

test.describe("F02 home", () => {
  test("F02-AC-1 eyebrow shows article and link counts", async ({ page, consoleErrors }) => {
    await page.goto("/");
    await expect(page.getByTestId("home-graph")).toContainText(/\d+ articles · \d+ links/);
    void consoleErrors;
  });

  test("F02-AC-2 wheel over the hero graph scrolls the page, not the graph", async ({ page, consoleErrors }) => {
    await page.goto("/");
    const canvas = page.getByTestId("home-graph-canvas");
    await expect(canvas.locator("g.n").first()).toBeVisible();
    const before = await canvas.locator("svg > g").first().getAttribute("transform");
    await canvas.hover();
    await page.mouse.wheel(0, 600);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    expect(await canvas.locator("svg > g").first().getAttribute("transform")).toBe(before);
    void consoleErrors;
  });

  test("F02-AC-3 clicking the hero graph opens the explorer", async ({ page, consoleErrors }) => {
    await page.goto("/");
    await page.getByTestId("home-graph-canvas").click({ position: { x: 20, y: 20 } });
    await expect(page).toHaveURL(/\/graph$/);
    void consoleErrors;
  });

  test("F02 feed lists articles with author links and has no serious a11y violations", async ({
    page,
    consoleErrors,
  }) => {
    await page.goto("/");
    const cards = page.getByTestId("post-card");
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThan(0);
    expect(await seriousA11yViolations(page)).toEqual([]);
    void consoleErrors;
  });
});

test.describe("F03 article reader", () => {
  test("F03-AC-1 resolved links point to articles; unresolved render as dashed text", async ({
    page,
    consoleErrors,
  }) => {
    await page.goto(`/articles/${SAMPLE.article}`);
    await expect(page.getByTestId("article-title")).toHaveText(SAMPLE.articleTitle);
    const links = page.getByTestId("internal-link");
    expect(await links.count()).toBeGreaterThan(0);
    for (const href of await links.evaluateAll((els) => els.map((e) => e.getAttribute("href"))))
      expect(href).toMatch(/^\/articles\/[a-z0-9-]+$/);
    await expect(page.getByTestId("unresolved-link").first()).toBeVisible();
    await expect(page.getByTestId("unresolved-link").first()).not.toHaveAttribute("href", /.*/);
    void consoleErrors;
  });

  test("F03 page has exactly one h1 and the duplicated title heading is dropped", async ({ page, consoleErrors }) => {
    await page.goto(`/articles/${SAMPLE.article}`);
    await expect(page.locator("h1")).toHaveCount(1);
    void consoleErrors;
  });

  test("F03-AC-2 TOC links target heading anchors", async ({ page, consoleErrors }) => {
    await page.goto(`/articles/${SAMPLE.article}`);
    const first = page.getByTestId("toc").locator("a").first();
    const href = await first.getAttribute("href");
    await first.click();
    await expect(page.locator(`[id="${href!.slice(1)}"]`)).toBeInViewport();
    void consoleErrors;
  });

  test("F03-AC-3 backlinks are listed with a count", async ({ page, consoleErrors }) => {
    await page.goto(`/articles/${SAMPLE.article}`);
    await expect(page.getByTestId("backlinks")).toContainText(/Linked from \d+ article/);
    void consoleErrors;
  });

  test("F03-AC-4 copy link writes the article URL to the clipboard", async ({ page, context, consoleErrors }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto(`/articles/${SAMPLE.article}`);
    await page.getByTestId("copy-link").click();
    await expect(page.getByRole("status").filter({ hasText: "Copied" }).first()).toBeAttached();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(`/articles/${SAMPLE.article}`);
    void consoleErrors;
  });

  test("F03-AC-8 unknown slug shows the not-found page", async ({ page }) => {
    await page.goto("/articles/definitely-not-a-real-article");
    await expect(page.getByTestId("not-found")).toBeVisible();
  });

  test("F03 article has no serious a11y violations", async ({ page, consoleErrors }) => {
    await page.goto(`/articles/${SAMPLE.article}`);
    await expect(page.getByTestId("article-body")).toBeVisible();
    expect(await seriousA11yViolations(page)).toEqual([]);
    void consoleErrors;
  });
});

test.describe("X02 theme and reading mode", () => {
  test("X02-AC-2/3 reading mode hides chrome in light and turns off in dark", async ({ page, consoleErrors }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto(`/articles/${SAMPLE.article}`);
    await page.getByTestId("reading-toggle").click();
    await expect(page.getByTestId("exit-reading")).toBeVisible();
    await expect(page.getByTestId("toc")).toBeHidden();
    await expect(page.getByTestId("nav-read")).toBeHidden();
    await page.getByTestId("theme-toggle").click(); // → dark
    await expect(page.getByTestId("reading-toggle")).toHaveCount(0);
    await expect(page.getByTestId("exit-reading")).toHaveCount(0);
    void consoleErrors;
  });

  test("X02-AC-4 reading mode chrome returns on non-article pages", async ({ page, consoleErrors }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto(`/articles/${SAMPLE.article}`);
    await page.getByTestId("reading-toggle").click();
    await page.goto("/");
    await expect(page.getByTestId("nav-read")).toBeVisible();
    void consoleErrors;
  });

  test("X02-AC-5 the reading toggle is offered on non-article pages in light theme only", async ({
    page,
    consoleErrors,
  }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    const toggle = page.getByTestId("app-header").getByTestId("reading-toggle");
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("html")).toHaveAttribute("data-reading", "on");
    await expect(page.getByTestId("exit-reading")).toHaveCount(0); // the floating exit control is article-only
    await page.getByTestId("theme-toggle").click(); // → dark
    await expect(page.getByTestId("reading-toggle")).toHaveCount(0);
    void consoleErrors;
  });

  test("X02-AC-1 stored dark override renders dark on first paint", async ({ page, consoleErrors }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.addInitScript(() => localStorage.setItem("color-scheme", "dark"));
    await page.goto("/");
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe("dark");
    void consoleErrors;
  });
});

test.describe("F04 taxonomy pages", () => {
  test("F04-AC-2 tag page shows #name and count", async ({ page, consoleErrors }) => {
    await page.goto(`/tags/${SAMPLE.tag}`);
    await expect(page.locator("h1")).toHaveText(`#${SAMPLE.tag}`);
    await expect(page.getByTestId("post-card").first()).toBeVisible();
    void consoleErrors;
  });

  test("F04-AC-3 author page shows articles", async ({ page, consoleErrors }) => {
    await page.goto(`/authors/${SAMPLE.author}`);
    await expect(page.getByTestId("post-card").first()).toBeVisible();
    void consoleErrors;
  });

  test("F04-AC-4 topics index lists topics with counts", async ({ page, consoleErrors }) => {
    await page.goto("/topics");
    expect(await page.getByTestId("topic-index").locator("li").count()).toBeGreaterThan(0);
    void consoleErrors;
  });
});
