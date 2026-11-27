import { test as base, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/** Fails a test on any browser console error or uncaught page error. */
export const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on("console", (m) => {
      // Expected 4xx (401/403/404 access-control and not-found flows) are logged by the browser as
      // resource errors; they're asserted in the tests themselves. 5xx always fails the test.
      if (m.type() === "error" && !/Failed to load resource: .* status of 4\d\d/.test(m.text())) errors.push(m.text());
    });
    page.on("pageerror", (e) => errors.push(String(e)));
    await use(errors);
    expect(errors, "browser console errors").toEqual([]);
  },
});

export { expect };

/** Serious/critical axe violations on the current page (X02 accessibility gate). */
export async function seriousA11yViolations(page: import("@playwright/test").Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  return results.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.nodes.length} node(s) — ${v.help}`);
}

/** A known article from the sample content repositories (T-0011). */
export const SAMPLE = {
  article: "hybrid-retrieval",
  articleTitle: "Hybrid Retrieval",
  topic: "postgresql",
  tag: "postgres",
  author: "anita-rao",
};
