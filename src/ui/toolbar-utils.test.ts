import { describe, expect, it } from "vitest";
import type { AggregatedStats } from "../core/types";
import {
  countFrontendIssues,
  countServerIssues,
  countToolbarIssues,
  formatFrontendForLLM,
  formatOverviewForLLM,
  getToolbarSeverity,
} from "./toolbar-utils";

function createStats(overrides: Partial<AggregatedStats> = {}): AggregatedStats {
  return {
    mutationsPerSec: 0,
    hotSpots: [],
    effectOffenders: [],
    leaks: [],
    consoleErrors: [],
    serverLogs: [],
    interactions: [],
    reactivity: { signals: 0, deriveds: 0, effects: 0, maxDepth: 0 },
    ...overrides,
  };
}

describe("toolbar-utils", () => {
  it("treats server errors as red-severity issues", () => {
    const stats = createStats({
      serverLogs: [{ level: "error", message: "Background regeneration failed", timestamp: 1 }],
    });

    expect(getToolbarSeverity(stats)).toBe("red");
    expect(countToolbarIssues(stats)).toBe(1);
    expect(countServerIssues(stats)).toBe(1);
    expect(countFrontendIssues(stats)).toBe(0);
  });

  it("treats server warnings as yellow-severity issues", () => {
    const stats = createStats({
      serverLogs: [{ level: "warn", message: "SSR fetch warning", timestamp: 1 }],
    });

    expect(getToolbarSeverity(stats)).toBe("yellow");
    expect(countToolbarIssues(stats)).toBe(1);
    expect(countServerIssues(stats)).toBe(1);
    expect(countFrontendIssues(stats)).toBe(0);
  });

  it("separates frontend and server issue counts", () => {
    const stats = createStats({
      consoleErrors: [
        {
          level: "error",
          message: "Hydration failed",
          source: "src/routes/+page.svelte",
          timestamp: Date.now(),
        },
      ],
      hotSpots: [{ component: "App", mutations: 100 }],
      serverLogs: [
        { level: "error", message: "SSR failed", timestamp: 1 },
        { level: "warn", message: "SSR warning", timestamp: 2 },
      ],
    });

    expect(countFrontendIssues(stats)).toBe(2);
    expect(countServerIssues(stats)).toBe(2);
    expect(countToolbarIssues(stats)).toBe(4);
  });

  it("includes server logs in the overview copy output", () => {
    const stats = createStats({
      serverLogs: [
        { level: "error", message: "Background regeneration failed", timestamp: 1 },
        { level: "info", message: "[Presentation] Completed", timestamp: 2 },
      ],
    });

    const output = formatOverviewForLLM(stats);

    expect(output).toContain("## Server Logs (svibe)");
    expect(output).toContain("Background regeneration failed");
    expect(output).toContain("[Presentation] Completed");
  });

  it("keeps frontend copy separate from server logs", () => {
    const stats = createStats({
      consoleErrors: [
        {
          level: "error",
          message: "Hydration failed",
          source: "src/routes/+page.svelte",
          timestamp: Date.now(),
        },
      ],
      serverLogs: [{ level: "error", message: "SSR failed", timestamp: 1 }],
    });

    const output = formatFrontendForLLM(stats);

    expect(output).toContain("## svibe frontend report");
    expect(output).toContain("Hydration failed");
    expect(output).not.toContain("## Server Logs (svibe)");
    expect(output).not.toContain("SSR failed");
  });
});
