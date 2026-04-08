import type { StepResult, TestPlan, TestReport } from "./types";

export function createReport(plan: TestPlan, results: StepResult[]): TestReport {
  if (results.length === 0) {
    return {
      planId: plan.id,
      status: "error",
      results: [],
      duration: 0,
      summary: "No test results received",
      timestamp: Date.now(),
    };
  }

  let passed = 0;
  let failed = 0;
  let skipped = 0;
  let duration = 0;

  for (const r of results) {
    if (r.status === "passed") passed++;
    else if (r.status === "failed") failed++;
    else skipped++;
    duration += r.duration;
  }

  const total = results.length;

  let status: TestReport["status"] = "passed";
  if (failed > 0) status = "failed";

  const parts: string[] = [`${passed}/${total} steps passed`];
  if (failed > 0) parts.push(`${failed} failed`);
  if (skipped > 0) parts.push(`${skipped} skipped`);

  return {
    planId: plan.id,
    status,
    results,
    duration,
    summary: parts.join(", "),
    timestamp: Date.now(),
  };
}

export function formatReportMarkdown(report: TestReport): string {
  const statusIcon = report.status === "passed" ? "PASS" : "FAIL";
  const lines: string[] = [
    `# Test Report [${statusIcon}]`,
    "",
    `**Status**: ${report.status}`,
    `**Duration**: ${formatDuration(report.duration)}`,
    `**Summary**: ${report.summary}`,
    "",
    "## Steps",
    "",
  ];

  for (const result of report.results) {
    const icon = result.status === "passed" ? "[x]" : "[ ]";
    const duration = formatDuration(result.duration);
    lines.push(`- ${icon} ${result.stepId} (${duration})`);

    if (result.error) {
      lines.push(`  - Error: ${result.error}`);
    }
  }

  return lines.join("\n");
}

export function formatReportForToolbar(report: TestReport): {
  label: string;
  color: "green" | "red" | "yellow";
} {
  if (report.status === "error") {
    return { label: "Error", color: "yellow" };
  }

  const passed = report.results.filter((r) => r.status === "passed").length;
  const label = `${passed}/${report.results.length} passed`;
  const color = report.status === "passed" ? "green" : "red";

  return { label, color };
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}
