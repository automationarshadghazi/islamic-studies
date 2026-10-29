import { defineConfig } from "@playwright/test";
import chromium from "@sparticuz/chromium";
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { brotliDecompressSync } from "node:zlib";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const external = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
const env = { ...process.env };
if (!external && process.platform === "linux") {
  const libraries = fileURLToPath(
    new URL("./.cache/browser-libs/", import.meta.url),
  );
  mkdirSync(libraries, { recursive: true });
  if (!existsSync(libraries + "lib/libnss3.so")) {
    const tar = libraries + "al2023.tar";
    writeFileSync(
      tar,
      brotliDecompressSync(
        readFileSync(
          new URL(
            "./node_modules/@sparticuz/chromium/bin/al2023.tar.br",
            import.meta.url,
          ),
        ),
      ),
    );
    execFileSync("tar", ["-xf", tar, "-C", libraries]);
  }
  env.LD_LIBRARY_PATH =
    libraries + "lib" + (env.LD_LIBRARY_PATH ? ":" + env.LD_LIBRARY_PATH : "");
}
export default defineConfig({
  testDir: "./tests",
  timeout: 30000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3000",
    headless: true,
    launchOptions: {
      executablePath: external || (await chromium.executablePath()),
      env,
      args: [
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-zygote",
      ],
    },
  },
  webServer: {
    command: "npm start",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
  reporter: "list",
});
