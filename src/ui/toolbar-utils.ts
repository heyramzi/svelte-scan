import type { AggregatedStats } from "../core/types";

export function countToolbarIssues(stats: AggregatedStats): number {
  return countFrontendIssues(stats) + countServerIssues(stats);
}

export function countFrontendIssues(stats: AggregatedStats): number {
  return (
    stats.effectOffenders.length +
    stats.leaks.length +
    stats.hotSpots.length +
    stats.consoleErrors.length
  );
}

export function countServerIssues(stats: AggregatedStats): number {
  return stats.serverLogs.filter((entry) => entry.level !== "info").length;
}

export function getToolbarSeverity(stats: AggregatedStats): "green" | "yellow" | "red" {
  const hasRedIssue =
    stats.leaks.length > 0 ||
    stats.consoleErrors.some((entry) => entry.level === "error") ||
    stats.serverLogs.some((entry) => entry.level === "error") ||
    stats.effectOffenders.some((entry) => entry.severity === "critical");

  if (hasRedIssue) return "red";

  const hasYellowIssue =
    stats.effectOffenders.length > 0 ||
    stats.consoleErrors.some((entry) => entry.level === "warn") ||
    stats.serverLogs.some((entry) => entry.level === "warn") ||
    stats.mutationsPerSec > 50;

  return hasYellowIssue ? "yellow" : "green";
}

export function formatServerLogsForLLM(stats: AggregatedStats): string {
  if (stats.serverLogs.length === 0) return "No server logs.";

  const lines: string[] = ["## Server Logs (svibe)", ""];
  for (const entry of stats.serverLogs) {
    const time = new Date(entry.timestamp).toLocaleTimeString("en-US", { hour12: false });
    lines.push(`- [${entry.level.toUpperCase()} ${time}] ${entry.message}`);
    if (entry.stack) {
      lines.push(`  Stack: ${entry.stack.split("\n").slice(1, 3).join(" | ").trim()}`);
    }
  }

  return lines.join("\n");
}

export function formatFrontendForLLM(stats: AggregatedStats): string {
  const lines: string[] = [];
  lines.push("## svibe frontend report");
  lines.push("");
  lines.push(`Mutations/sec: ${stats.mutationsPerSec}`);
  lines.push(
    `Signals: ${stats.reactivity.signals} | Deriveds: ${stats.reactivity.deriveds} | Effects: ${stats.reactivity.effects}`,
  );
  lines.push("");

  if (stats.hotSpots.length > 0) {
    lines.push("### Hot Spots");
    for (const spot of stats.hotSpots) {
      lines.push(`- ${spot.component}: ${spot.mutations} mutations (${spot.mutations}/sec)`);
    }
    lines.push("");
  }

  if (stats.effectOffenders.length > 0) {
    lines.push("### Runaway Effects");
    for (const effect of stats.effectOffenders) {
      lines.push(
        `- [${effect.severity.toUpperCase()}] ${effect.component}: ${effect.count} executions (${effect.id})`,
      );
    }
    lines.push("");
  }

  if (stats.leaks.length > 0) {
    lines.push("### Memory Leaks");
    for (const leak of stats.leaks) {
      lines.push(`- ${leak.component}: ${leak.leakType} (${leak.details})`);
    }
    lines.push("");
  }

  if (stats.consoleErrors.length > 0) {
    lines.push("### Console Errors & Warnings");
    for (const entry of stats.consoleErrors) {
      lines.push(`- [${entry.level.toUpperCase()}] ${entry.message}`);
      lines.push(`  Source: ${entry.source}`);
    }
    lines.push("");
  }

  if (countToolbarIssues(stats) === 0) {
    lines.push("No frontend issues detected.");
  }

  return lines.join("\n").trimEnd();
}

export function formatOverviewForLLM(stats: AggregatedStats): string {
  const lines = [formatFrontendForLLM(stats)];

  if (stats.serverLogs.length > 0) {
    lines.push("");
    lines.push(formatServerLogsForLLM(stats));
  }

  return lines.join("\n").trimEnd();
}
