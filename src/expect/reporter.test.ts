import { describe, expect, it } from "vite-plus/test";
import type { StepResult, TestPlan } from "./types";
import { createReport, formatReportForToolbar, formatReportMarkdown } from "./reporter";

const makePlan = (overrides?: Partial<TestPlan>): TestPlan => ({
  id: "plan-test",
  title: "Test plan",
  description: "A test plan",
  steps: [
    { id: "s1", description: "Step 1", action: "navigate", target: "/" },
    {
      id: "s2",
      description: "Step 2",
      action: "click",
      target: "button",
    },
    {
      id: "s3",
      description: "Step 3",
      action: "assert",
      value: "Hello",
    },
  ],
  baseUrl: "http://localhost:3000",
  createdAt: 1700000000000,
  ...overrides,
});

const passedResult = (stepId: string, duration = 100): StepResult => ({
  stepId,
  status: "passed",
  duration,
});

const failedResult = (stepId: string, error: string, duration = 200): StepResult => ({
  stepId,
  status: "failed",
  duration,
  error,
});

describe("createReport", () => {
  it("all steps pass gives status passed", () => {
    const results = [passedResult("s1"), passedResult("s2"), passedResult("s3")];
    const report = createReport(makePlan(), results);

    expect(report.status).toBe("passed");
    expect(report.planId).toBe("plan-test");
  });

  it("any step fails gives status failed", () => {
    const results = [
      passedResult("s1"),
      failedResult("s2", "Element not found"),
      passedResult("s3"),
    ];
    const report = createReport(makePlan(), results);

    expect(report.status).toBe("failed");
  });

  it("empty results gives status error", () => {
    const report = createReport(makePlan(), []);

    expect(report.status).toBe("error");
    expect(report.summary).toBe("No test results received");
  });

  it("duration is sum of step durations", () => {
    const results = [passedResult("s1", 150), passedResult("s2", 250), passedResult("s3", 100)];
    const report = createReport(makePlan(), results);

    expect(report.duration).toBe(500);
  });

  it("summary includes counts", () => {
    const results = [passedResult("s1"), failedResult("s2", "Timeout"), passedResult("s3")];
    const report = createReport(makePlan(), results);

    expect(report.summary).toContain("2/3 steps passed");
    expect(report.summary).toContain("1 failed");
  });

  it("summary includes skipped count", () => {
    const results: StepResult[] = [
      passedResult("s1"),
      { stepId: "s2", status: "skipped", duration: 0 },
      passedResult("s3"),
    ];
    const report = createReport(makePlan(), results);

    expect(report.summary).toContain("1 skipped");
  });
});

describe("formatReportMarkdown", () => {
  it("includes step descriptions via stepId", () => {
    const results = [passedResult("s1"), failedResult("s2", "Broken")];
    const report = createReport(makePlan(), results);
    const md = formatReportMarkdown(report);

    expect(md).toContain("s1");
    expect(md).toContain("s2");
  });

  it("shows errors for failed steps", () => {
    const results = [passedResult("s1"), failedResult("s2", "Element not visible")];
    const report = createReport(makePlan(), results);
    const md = formatReportMarkdown(report);

    expect(md).toContain("Error: Element not visible");
  });

  it("shows PASS header for passing report", () => {
    const results = [passedResult("s1")];
    const report = createReport(makePlan(), results);
    const md = formatReportMarkdown(report);

    expect(md).toContain("[PASS]");
  });

  it("shows FAIL header for failing report", () => {
    const results = [failedResult("s1", "oops")];
    const report = createReport(makePlan(), results);
    const md = formatReportMarkdown(report);

    expect(md).toContain("[FAIL]");
  });

  it("includes duration", () => {
    const results = [passedResult("s1", 1500)];
    const report = createReport(makePlan(), results);
    const md = formatReportMarkdown(report);

    expect(md).toContain("1.5s");
  });
});

describe("formatReportForToolbar", () => {
  it("green for passed", () => {
    const results = [passedResult("s1"), passedResult("s2")];
    const report = createReport(makePlan(), results);
    const toolbar = formatReportForToolbar(report);

    expect(toolbar.color).toBe("green");
    expect(toolbar.label).toBe("2/2 passed");
  });

  it("red for failed", () => {
    const results = [passedResult("s1"), failedResult("s2", "err")];
    const report = createReport(makePlan(), results);
    const toolbar = formatReportForToolbar(report);

    expect(toolbar.color).toBe("red");
    expect(toolbar.label).toBe("1/2 passed");
  });

  it("yellow for error", () => {
    const report = createReport(makePlan(), []);
    const toolbar = formatReportForToolbar(report);

    expect(toolbar.color).toBe("yellow");
    expect(toolbar.label).toBe("Error");
  });
});
