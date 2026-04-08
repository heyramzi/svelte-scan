import { tryCatchAsync } from "../result";
import type { ExpectConfig, StepResult, TestAction, TestPlan, TestStep } from "./types";
import { NAVIGATION_SETTLE_MS, SCREENSHOT_QUALITY } from "./constants";

export type Cookie = {
  name: string;
  value: string;
  domain: string;
  path: string;
};

export async function extractCookies(baseUrl: string): Promise<Cookie[]> {
  const { execSync } = await import("node:child_process");
  const result = execSync(`curl -s -D - -o /dev/null "${baseUrl}"`, { encoding: "utf-8" });
  const cookies: Cookie[] = [];
  const url = new URL(baseUrl);

  for (const line of result.split("\n")) {
    const match = line.match(/^set-cookie:\s*(.+)/i);
    if (!match) continue;

    const cookieStr = match[1].trim();
    const parts = cookieStr.split(";").map((p) => p.trim());
    const [nameValue] = parts;
    if (!nameValue) continue;

    const eqIndex = nameValue.indexOf("=");
    if (eqIndex === -1) continue;

    const name = nameValue.slice(0, eqIndex);
    const value = nameValue.slice(eqIndex + 1);

    let domain = url.hostname;
    let path = "/";
    for (const part of parts.slice(1)) {
      const [key, val] = part.split("=").map((s) => s.trim());
      if (key.toLowerCase() === "domain" && val) domain = val;
      if (key.toLowerCase() === "path" && val) path = val;
    }

    cookies.push({ name, value, domain, path });
  }

  return cookies;
}

/* eslint-disable @typescript-eslint/no-explicit-any -- page is typed as any to avoid hard Playwright dependency */

async function executeNavigate(page: any, step: TestStep): Promise<void> {
  await page.goto(step.target);
  await page.waitForLoadState("networkidle");
}

async function executeClick(page: any, step: TestStep): Promise<void> {
  await page.locator(step.target).click();
}

async function executeFill(page: any, step: TestStep): Promise<void> {
  await page.locator(step.target).fill(step.value ?? "");
}

async function executeAssert(page: any, step: TestStep): Promise<void> {
  const text: string = await page.locator(step.target).textContent();
  if (!text?.includes(step.value ?? "")) {
    throw new Error(`Assertion failed: expected "${step.value}" in text "${text}"`);
  }
}

async function executeWait(page: any, step: TestStep): Promise<void> {
  await page.waitForTimeout(step.timeout ?? 1000);
}

async function executeScreenshot(page: any): Promise<string> {
  const buffer: { toString(encoding: string): string } = await page.screenshot({
    quality: SCREENSHOT_QUALITY,
    type: "jpeg",
  });
  return buffer.toString("base64");
}

async function executeHover(page: any, step: TestStep): Promise<void> {
  await page.locator(step.target).hover();
}

async function executeSelect(page: any, step: TestStep): Promise<void> {
  await page.locator(step.target).selectOption(step.value ?? "");
}

const ACTION_HANDLERS: Record<TestAction, (page: any, step: TestStep) => Promise<string | void>> = {
  navigate: executeNavigate,
  click: executeClick,
  fill: executeFill,
  assert: executeAssert,
  wait: executeWait,
  screenshot: executeScreenshot,
  hover: executeHover,
  select: executeSelect,
};

export async function executeStep(
  page: any,
  step: TestStep,
  config: { timeout: number },
): Promise<StepResult> {
  const start = performance.now();

  const handler = ACTION_HANDLERS[step.action];
  if (!handler) {
    return {
      stepId: step.id,
      status: "failed",
      duration: performance.now() - start,
      error: `Unknown action: ${step.action}`,
    };
  }

  const outcome = await tryCatchAsync(async () =>
    Promise.race([
      handler(page, step),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Step timed out after ${config.timeout}ms`)),
          step.timeout ?? config.timeout,
        ),
      ),
    ]),
  );

  const duration = performance.now() - start;

  if (outcome.ok) {
    return {
      stepId: step.id,
      status: "passed",
      duration,
      ...(typeof outcome.value === "string" ? { screenshot: outcome.value } : {}),
    };
  }

  return {
    stepId: step.id,
    status: "failed",
    duration,
    error: outcome.error.message,
  };
}

export async function executePlan(
  page: any,
  plan: TestPlan,
  config: ExpectConfig,
  onStep?: (result: StepResult) => void,
): Promise<StepResult[]> {
  const results: StepResult[] = [];

  for (const step of plan.steps) {
    const result = await executeStep(page, step, {
      timeout: config.timeout,
    });
    results.push(result);
    onStep?.(result);

    // Stop on navigation failures (critical), continue on assertion failures
    if (result.status === "failed" && step.action === "navigate") {
      // Mark remaining steps as skipped
      for (const remaining of plan.steps.slice(results.length)) {
        const skipped: StepResult = {
          stepId: remaining.id,
          status: "skipped",
          duration: 0,
        };
        results.push(skipped);
        onStep?.(skipped);
      }
      break;
    }

    // Small settle time after navigation
    if (step.action === "navigate" && result.status === "passed") {
      await page.waitForTimeout(NAVIGATION_SETTLE_MS);
    }
  }

  return results;
}

/**
 * Check if Playwright is available as a dependency.
 * Uses indirect dynamic import to avoid Vite static analysis.
 */
export async function checkPlaywrightAvailable(): Promise<boolean> {
  /* oxlint-disable no-implied-eval -- intentional Function constructor to bypass Vite static analysis */
  const dynamicImport = new Function("specifier", "return import(specifier)");
  /* oxlint-enable no-implied-eval */
  const result = await tryCatchAsync(async () => dynamicImport("playwright"));
  return result.ok;
}
