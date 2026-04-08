import { describe, expect, it, vi } from "vitest";
import { executePlan, executeStep } from "./runner";
import type { ExpectConfig, TestPlan, TestStep } from "./types";

function createMockPage() {
  return {
    goto: vi.fn().mockResolvedValue(undefined),
    locator: vi.fn().mockReturnValue({
      click: vi.fn().mockResolvedValue(undefined),
      fill: vi.fn().mockResolvedValue(undefined),
      hover: vi.fn().mockResolvedValue(undefined),
      selectOption: vi.fn().mockResolvedValue(undefined),
      textContent: vi.fn().mockResolvedValue("Hello World"),
    }),
    waitForTimeout: vi.fn().mockResolvedValue(undefined),
    screenshot: vi.fn().mockResolvedValue(Buffer.from("fake-screenshot")),
    waitForLoadState: vi.fn().mockResolvedValue(undefined),
  };
}

function step(overrides: Partial<TestStep> = {}): TestStep {
  return {
    id: "s1",
    description: "test step",
    action: "click",
    target: "#btn",
    ...overrides,
  };
}

const defaultConfig = { timeout: 5000 };

describe("executeStep", () => {
  it("navigate calls page.goto with correct URL", async () => {
    const page = createMockPage();
    const result = await executeStep(
      page,
      step({ action: "navigate", target: "http://localhost:3000/home" }),
      defaultConfig,
    );

    expect(page.goto).toHaveBeenCalledWith("http://localhost:3000/home");
    expect(page.waitForLoadState).toHaveBeenCalledWith("networkidle");
    expect(result.status).toBe("passed");
  });

  it("click calls locator.click", async () => {
    const page = createMockPage();
    const result = await executeStep(
      page,
      step({ action: "click", target: "#submit" }),
      defaultConfig,
    );

    expect(page.locator).toHaveBeenCalledWith("#submit");
    expect(page.locator("#submit").click).toHaveBeenCalled();
    expect(result.status).toBe("passed");
  });

  it("fill calls locator.fill with value", async () => {
    const page = createMockPage();
    const result = await executeStep(
      page,
      step({ action: "fill", target: "#email", value: "test@example.com" }),
      defaultConfig,
    );

    expect(page.locator).toHaveBeenCalledWith("#email");
    expect(page.locator("#email").fill).toHaveBeenCalledWith("test@example.com");
    expect(result.status).toBe("passed");
  });

  it("assert passes when text contains expected value", async () => {
    const page = createMockPage();
    const result = await executeStep(
      page,
      step({ action: "assert", target: "#heading", value: "Hello" }),
      defaultConfig,
    );

    expect(result.status).toBe("passed");
  });

  it("assert fails when text doesn't match", async () => {
    const page = createMockPage();
    page.locator.mockReturnValue({
      textContent: vi.fn().mockResolvedValue("Goodbye"),
      click: vi.fn(),
      fill: vi.fn(),
      hover: vi.fn(),
      selectOption: vi.fn(),
    });

    const result = await executeStep(
      page,
      step({ action: "assert", target: "#heading", value: "Hello" }),
      defaultConfig,
    );

    expect(result.status).toBe("failed");
    expect(result.error).toContain("Assertion failed");
  });

  it("screenshot returns base64 string", async () => {
    const page = createMockPage();
    const result = await executeStep(page, step({ action: "screenshot" }), defaultConfig);

    expect(result.status).toBe("passed");
    expect(result.screenshot).toBe(Buffer.from("fake-screenshot").toString("base64"));
  });

  it("returns 'failed' status on error with error message", async () => {
    const page = createMockPage();
    page.goto.mockRejectedValue(new Error("Network error"));

    const result = await executeStep(
      page,
      step({ action: "navigate", target: "http://bad-url" }),
      defaultConfig,
    );

    expect(result.status).toBe("failed");
    expect(result.error).toBe("Network error");
  });

  it("measures duration", async () => {
    const page = createMockPage();
    const result = await executeStep(
      page,
      step({ action: "click", target: "#btn" }),
      defaultConfig,
    );

    expect(result.duration).toBeGreaterThanOrEqual(0);
    expect(typeof result.duration).toBe("number");
  });

  it("hover calls locator.hover", async () => {
    const page = createMockPage();
    const result = await executeStep(
      page,
      step({ action: "hover", target: "#menu" }),
      defaultConfig,
    );

    expect(page.locator).toHaveBeenCalledWith("#menu");
    expect(page.locator("#menu").hover).toHaveBeenCalled();
    expect(result.status).toBe("passed");
  });

  it("select calls locator.selectOption", async () => {
    const page = createMockPage();
    const result = await executeStep(
      page,
      step({ action: "select", target: "#country", value: "us" }),
      defaultConfig,
    );

    expect(page.locator).toHaveBeenCalledWith("#country");
    expect(page.locator("#country").selectOption).toHaveBeenCalledWith("us");
    expect(result.status).toBe("passed");
  });
});

describe("executePlan", () => {
  const config: ExpectConfig = {
    baseUrl: "http://localhost:3000",
    timeout: 5000,
    headless: true,
    cookies: false,
    recording: false,
    provider: "anthropic",
    ci: false,
    ciTimeout: 300_000,
  };

  function plan(steps: TestStep[]): TestPlan {
    return {
      id: "plan1",
      title: "Test Plan",
      description: "A test plan",
      steps,
      baseUrl: "http://localhost:3000",
      createdAt: Date.now(),
    };
  }

  it("runs all steps sequentially", async () => {
    const page = createMockPage();
    const steps = [
      step({ id: "s1", action: "click", target: "#a" }),
      step({ id: "s2", action: "click", target: "#b" }),
      step({ id: "s3", action: "click", target: "#c" }),
    ];

    const results = await executePlan(page, plan(steps), config);

    expect(results).toHaveLength(3);
    expect(results.every((r) => r.status === "passed")).toBe(true);
  });

  it("calls onStep callback after each step", async () => {
    const page = createMockPage();
    const onStep = vi.fn();
    const steps = [
      step({ id: "s1", action: "click", target: "#a" }),
      step({ id: "s2", action: "click", target: "#b" }),
    ];

    await executePlan(page, plan(steps), config, onStep);

    expect(onStep).toHaveBeenCalledTimes(2);
    expect(onStep.mock.calls[0][0].stepId).toBe("s1");
    expect(onStep.mock.calls[1][0].stepId).toBe("s2");
  });

  it("returns all results", async () => {
    const page = createMockPage();
    const steps = [
      step({ id: "s1", action: "click", target: "#a" }),
      step({ id: "s2", action: "click", target: "#b" }),
    ];

    const results = await executePlan(page, plan(steps), config);

    expect(results).toHaveLength(2);
    expect(results[0].stepId).toBe("s1");
    expect(results[1].stepId).toBe("s2");
  });

  it("stops on navigation failure and skips remaining steps", async () => {
    const page = createMockPage();
    page.goto.mockRejectedValue(new Error("Navigation failed"));

    const steps = [
      step({ id: "s1", action: "navigate", target: "http://bad" }),
      step({ id: "s2", action: "click", target: "#a" }),
      step({ id: "s3", action: "click", target: "#b" }),
    ];

    const results = await executePlan(page, plan(steps), config);

    expect(results).toHaveLength(3);
    expect(results[0].status).toBe("failed");
    expect(results[1].status).toBe("skipped");
    expect(results[2].status).toBe("skipped");
  });

  it("continues on assertion failure", async () => {
    const page = createMockPage();
    page.locator.mockReturnValue({
      click: vi.fn().mockResolvedValue(undefined),
      fill: vi.fn().mockResolvedValue(undefined),
      hover: vi.fn().mockResolvedValue(undefined),
      selectOption: vi.fn().mockResolvedValue(undefined),
      textContent: vi.fn().mockResolvedValue("Wrong text"),
    });

    const steps = [
      step({ id: "s1", action: "assert", target: "#h", value: "Expected" }),
      step({ id: "s2", action: "click", target: "#btn" }),
    ];

    const results = await executePlan(page, plan(steps), config);

    expect(results).toHaveLength(2);
    expect(results[0].status).toBe("failed");
    expect(results[1].status).toBe("passed");
  });
});
