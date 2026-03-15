import { defineConfig, devices } from "@playwright/test";

const host = "127.0.0.1";
const port = process.env.PLAYWRIGHT_PORT ?? "5173";
const baseURL = `http://${host}:${port}`;
const reuseExistingServer = !process.env.CI && !process.env.PLAYWRIGHT_NO_REUSE_SERVER;

export default defineConfig({
  testDir: "./tests/playwright",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
  webServer: {
    command: `yarn dev --host ${host} --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer,
    timeout: 120_000,
  },
});
