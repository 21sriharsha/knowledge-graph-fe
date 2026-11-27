import type { Page } from "@playwright/test";
import { expect, seriousA11yViolations, test } from "./fixtures";

/**
 * Studio E2E against the real local backend in AUTH_MODE=dev (personas map to the backend's local
 * HTTP Basic users). Tests that change data restore it before finishing.
 */
// These tests share (and some mutate) backend state: run them one at a time.
test.describe.configure({ mode: "serial" });

async function signIn(page: Page, persona: "admin" | "author", next = "/studio") {
  await page.goto(`/signin?next=${encodeURIComponent(next)}`);
  await page.getByTestId(`signin-dev-${persona}`).click();
}

test.describe("F01 authentication and access", () => {
  test("F01-AC-1 anonymous studio visit goes to sign-in and returns after", async ({ page, consoleErrors }) => {
    await page.goto("/studio/repositories");
    await expect(page).toHaveURL(/\/signin\?next=%2Fstudio%2Frepositories/);
    await page.getByTestId("signin-dev-admin").click();
    await expect(page).toHaveURL(/\/studio\/repositories$/);
    await expect(page.getByTestId("view-studio")).toBeVisible();
    void consoleErrors;
  });

  test("F01-AC-2 off-site next parameter is ignored", async ({ page, consoleErrors }) => {
    await page.goto("/signin?next=https://evil.example/steal");
    await page.getByTestId("signin-dev-admin").click();
    await expect(page).toHaveURL(/localhost:3000\/$/);
    void consoleErrors;
  });

  test("F01-AC-4 author has no Accounts tab and gets the admins-only state", async ({ page, consoleErrors }) => {
    await signIn(page, "author", "/studio/accounts");
    await expect(page.getByRole("navigation", { name: "Studio sections" }).getByRole("link", { name: "Accounts" })).toHaveCount(0);
    await expect(page.getByText("Admins only")).toBeVisible();
    void consoleErrors;
  });

  test("F01-AC-5 sign out ends the session", async ({ page, consoleErrors }) => {
    await signIn(page, "admin", "/studio/articles");
    await page.getByTestId("account-menu-btn").click();
    await page.getByTestId("menu-signout").click();
    await expect(page).toHaveURL(/localhost:3000\/$/);
    await page.goto("/studio/articles");
    await expect(page).toHaveURL(/\/signin/);
    void consoleErrors;
  });
});

test.describe("F08 repositories", () => {
  test.beforeEach(async ({ page }) => signIn(page, "admin", "/studio/repositories"));

  test("F08-AC-4 cards show missing token/webhook warnings", async ({ page, consoleErrors }) => {
    await expect(page.getByTestId("source-card").first()).toBeVisible();
    await expect(page.getByTestId("notice-webhook").first()).toBeVisible();
    await expect(page.getByTestId("notice-token").first()).toBeVisible();
    void consoleErrors;
  });

  test("F08-AC-1/2 Azure needs a project; API base URL must be https", async ({ page, consoleErrors }) => {
    await page.getByTestId("connect-repo").click();
    const drawer = page.getByTestId("drawer");
    await expect(drawer).toBeVisible();
    await expect(page.getByTestId("source-project")).toHaveCount(0);
    await page.getByTestId("source-type").selectOption("AZURE_DEVOPS");
    await expect(page.getByTestId("source-project")).toBeVisible();
    await page.getByTestId("source-displayName").fill("Test");
    await page.getByTestId("source-owner").fill("org");
    await page.getByTestId("source-repository").fill("repo");
    await page.getByTestId("source-apiBaseUrl").fill("http://git.example");
    await page.getByTestId("source-save").click();
    await expect(drawer.getByText("Required for Azure DevOps")).toBeVisible();
    await expect(drawer.getByText("Must be an https:// URL")).toBeVisible();
    void consoleErrors;
  });

  test("X02-AC-7 Esc with unsaved changes asks before discarding", async ({ page, consoleErrors }) => {
    await page.getByTestId("connect-repo").click();
    await page.getByTestId("source-displayName").fill("Unsaved");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Discard" })).toBeVisible();
    await expect(page.getByTestId("drawer")).toBeVisible();
    await page.getByRole("button", { name: "Discard" }).click();
    await expect(page.getByTestId("drawer")).toBeHidden();
    void consoleErrors;
  });

  test("F08-AC-3 edit shows 'leave blank to keep' for configured secrets or 'Not configured'", async ({ page, consoleErrors }) => {
    await page.getByTestId("source-edit").first().click();
    await expect(page.getByTestId("drawer").getByText(/Not configured|Configured — leave blank/).first()).toBeVisible();
    void consoleErrors;
  });

  test("F08-AC-5 Sync now starts a run", async ({ page, consoleErrors }) => {
    await page.getByTestId("source-sync").first().click();
    await expect(page.getByTestId("toast").filter({ hasText: "Sync started" })).toBeVisible();
    void consoleErrors;
  });

  test("F08 repositories page has no serious a11y violations", async ({ page, consoleErrors }) => {
    await expect(page.getByTestId("source-card").first()).toBeVisible();
    expect(await seriousA11yViolations(page)).toEqual([]);
    void consoleErrors;
  });
});

test.describe("F09 sync history", () => {
  test("F09 runs list and run detail with pipeline", async ({ page, consoleErrors }) => {
    await signIn(page, "admin", "/studio/runs");
    const row = page.getByTestId("run-row").first();
    await expect(row).toBeVisible();
    await row.getByRole("link").click();
    await expect(page.getByTestId("run-summary")).toBeVisible();
    await expect(page.getByTestId("pipeline")).toContainText("Validate");
    await expect(page.getByTestId("diagnostics").or(page.getByTestId("diagnostics-empty"))).toBeVisible();
    void consoleErrors;
  });
});

test.describe("F07 studio articles", () => {
  test("F07-AC-2 unpublish takes an article offline (restored afterwards)", async ({ page, consoleErrors }) => {
    await signIn(page, "admin", "/studio/articles");
    const row = page.locator('[data-testid="studio-article-row"][data-slug="kubernetes-networking"]');
    await expect(row).toBeVisible();
    try {
      await row.getByTestId("act-unpublish").click();
      await row.getByTestId("confirm-yes").click();
      await expect(page.getByTestId("toast").filter({ hasText: "unpublished" })).toBeVisible();
      const pub = await page.context().newPage();
      await pub.goto("/articles/kubernetes-networking");
      await expect(pub.getByTestId("not-found")).toBeVisible();
      await pub.close();
    } finally {
      // Drafts are not listed by the backend (BG-21), so restore through the BFF directly.
      const restore = await page.request.post("/api/bff/studio/articles/kubernetes-networking/publish", {
        headers: { origin: new URL(page.url()).origin },
      });
      expect(restore.ok()).toBe(true);
    }
    await page.reload();
    await expect(row.getByTestId("state-pill")).toHaveText("Published");
    void consoleErrors;
  });

  test("F07-AC-3 cancelling archive changes nothing", async ({ page, consoleErrors }) => {
    await signIn(page, "admin", "/studio/articles");
    const row = page.getByTestId("studio-article-row").first();
    const before = await row.getByTestId("state-pill").textContent();
    const archive = row.getByTestId("act-archive");
    if (await archive.count()) {
      await archive.click();
      await row.getByRole("button", { name: "Cancel" }).click();
    }
    await expect(row.getByTestId("state-pill")).toHaveText(before!);
    void consoleErrors;
  });
});

test.describe("F10/F11 accounts and profile", () => {
  test("F10 admin sees the accounts page (empty without Supabase sign-ins)", async ({ page, consoleErrors }) => {
    await signIn(page, "admin", "/studio/accounts");
    await expect(page.getByTestId("accounts-table").or(page.getByTestId("accounts-empty"))).toBeVisible();
    void consoleErrors;
  });

  test("F11-AC-4 an account without a byline sees the not-linked message", async ({ page, consoleErrors }) => {
    await signIn(page, "author", "/studio/profile");
    await expect(page.getByText("Not linked to a byline")).toBeVisible();
    void consoleErrors;
  });
});
