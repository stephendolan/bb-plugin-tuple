import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./visual-tests",
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  expect: {
    toHaveScreenshot: {
      animations: "disabled",
      scale: "css",
    },
  },
  use: {
    baseURL: "http://127.0.0.1:61111",
    browserName: "chromium",
    colorScheme: "dark",
    viewport: { width: 1600, height: 1400 },
  },
  webServer: {
    command: "ladle preview --outDir .ladle-build --host 127.0.0.1 --port 61111",
    url: "http://127.0.0.1:61111",
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
