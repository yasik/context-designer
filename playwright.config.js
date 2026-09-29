import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  use: {
    baseURL: "http://127.0.0.1:4321",
    viewport: { width: 1440, height: 1100 },
  },
  webServer: {
    command: "pnpm preview --host 127.0.0.1 --port 4321 --ignore-lock",
    url: "http://127.0.0.1:4321",
    reuseExistingServer: false,
  },
});
