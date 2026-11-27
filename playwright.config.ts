import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

/**
 * E2E against a running app + backend (CLAUDE.md: `pnpm dev` with the local backend). Tests assume the
 * three sample content repositories are ingested (T-0011): 6 articles, e.g. `hybrid-retrieval`.
 *
 * Browser: the system Chromium when present (no browser download), else Playwright's managed build
 * (`pnpm exec playwright install chromium`).
 */
const systemChromium = process.env.CHROMIUM_PATH ?? "/usr/bin/chromium";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    launchOptions: existsSync(systemChromium) ? { executablePath: systemChromium } : undefined,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1360, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /.*\.mobile\.spec\.ts/ },
  ],
});
