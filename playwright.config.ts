import { defineConfig, devices } from "@playwright/test";

const storageState = process.env.OPERATIONS_STORAGE_STATE || ".auth/operations.json";

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "test-results",
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  reporter: [["html", { outputFolder: "playwright-report", open: "never" }], ["list"]],
  use: {
    baseURL: process.env.OPERATIONS_E2E_BASE_URL || "https://www.shamarconnect.com.br",
    trace: "retain-on-failure",
    video: "off",
    screenshot: "only-on-failure",
    storageState,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
