import type { ExpectConfig } from "./types";

export const STEP_TIMEOUT_MS = 10_000;
export const PLAN_TIMEOUT_MS = 300_000;
export const NAVIGATION_SETTLE_MS = 500;
export const SCREENSHOT_QUALITY = 80;
export const MAX_STEPS_PER_PLAN = 50;
export const MAX_DIFF_SIZE_BYTES = 100_000;
export const EXPECT_STATE_DIR = ".svelte-scan-expect";

export const RELEVANT_EXTENSIONS = new Set([".svelte", ".ts", ".js", ".css", ".html"]);

export const DEFAULT_EXPECT_CONFIG: ExpectConfig = {
  baseUrl: "http://localhost:3000",
  timeout: 10_000,
  headless: true,
  cookies: false,
  recording: false,
  provider: "anthropic",
  ci: false,
  ciTimeout: 300_000,
};
