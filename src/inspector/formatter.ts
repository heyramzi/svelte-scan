import type { SelectedElement, OutputMode, AnnotationSnapshot, ExportPayload } from "./types";
import type { AggregatedStats } from "../core/types";
import { formatPayload } from "./export";

// Format selected elements as markdown for AI agents
export function formatElementsForAI(
  elements: SelectedElement[],
  outputMode: OutputMode = "compact",
): string {
  if (elements.length === 0) return "## Selected Elements (svibe)\n\nNo elements selected.";

  // For non-compact modes, build an ExportPayload and delegate to export formatters
  if (outputMode !== "compact") {
    const annotations: AnnotationSnapshot[] = elements.map((el, idx) => ({
      id: `sel-${idx}`,
      kind: "element" as const,
      comment: "",
      targetSummary: `<${el.tagName.toLowerCase()}${el.classes.length > 0 ? ` class="${el.classes.join(" ")}"` : ""}>`,
      targetLabel:
        el.classes.length > 0
          ? `${el.tagName.toLowerCase()}.${el.classes[0]}`
          : el.tagName.toLowerCase(),
      elementPath: el.selector,
      timestamp: new Date().toISOString(),
      source: {
        componentName: el.source?.component ?? null,
        tagName: el.tagName.toLowerCase(),
        filePath: el.source?.file ?? "",
        shortFileName: el.source?.component ?? "",
        lineNumber: el.source?.line ?? null,
        columnNumber: el.source?.column ?? null,
      },
      element: {
        selector: el.selector,
        fullDomPath: el.selector,
        cssClasses: el.classes,
        components: { filtered: [], smart: [], all: [] },
        boundingBox: {
          left: el.rect.left,
          top: el.rect.top,
          width: el.rect.width,
          height: el.rect.height,
        },
        position: {
          x: Math.round(el.rect.left),
          y: Math.round(el.rect.top),
          xPercent:
            typeof window !== "undefined" && window.innerWidth > 0
              ? Math.round((el.rect.left / window.innerWidth) * 100)
              : 0,
          yAbsolute: Math.round(el.rect.top + (typeof window !== "undefined" ? window.scrollY : 0)),
        },
        selectedText: null,
        nearbyText: null,
        accessibility: null,
        computedStyles: null,
      },
      page: {
        title: typeof document !== "undefined" ? document.title || window.location.pathname : "",
        pathname: typeof window !== "undefined" ? window.location.pathname : "",
        url: typeof window !== "undefined" ? window.location.href : "",
        viewport: {
          width: typeof window !== "undefined" ? window.innerWidth : 0,
          height: typeof window !== "undefined" ? window.innerHeight : 0,
        },
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
        devicePixelRatio: typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,
        timestamp: new Date().toISOString(),
      },
    }));

    const payload: ExportPayload = {
      title:
        typeof document !== "undefined"
          ? document.title || window.location.pathname
          : "Selected Elements",
      outputMode,
      url: typeof window !== "undefined" ? window.location.href : "",
      viewport: {
        width: typeof window !== "undefined" ? window.innerWidth : 0,
        height: typeof window !== "undefined" ? window.innerHeight : 0,
      },
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      devicePixelRatio: typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,
      timestamp: new Date().toISOString(),
      annotations,
    };

    return formatPayload(payload);
  }

  const lines = ["## Selected Elements (svibe)", ""];

  for (const el of elements) {
    const tag = el.tagName.toLowerCase();
    const classAttr = el.classes.length > 0 ? ` class="${el.classes.join(" ")}"` : "";
    const source = el.source
      ? ` in ${el.source.component} at ${el.source.file}:${el.source.line}:${el.source.column}`
      : "";

    lines.push(`- \`<${tag}${classAttr}>\`${source}`);
    lines.push(`  Selector: ${el.selector}`);

    if (el.classes.length > 0) {
      lines.push(`  Classes: ${el.classes.join(", ")}`);
    }

    const width = Math.round(el.rect.width);
    const height = Math.round(el.rect.height);
    lines.push(`  Size: ${width}x${height}px`);
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

// Format scan stats as a performance report for AI agents
export function formatOptimizationPrompt(stats: AggregatedStats): string {
  const sections: string[] = [];
  let hasIssues = false;

  // Slow interactions
  if (stats.interactions.length > 0) {
    const slow = stats.interactions.filter((i) => i.duration >= 200);
    if (slow.length > 0) {
      hasIssues = true;
      const lines = ["### Slow Interactions"];
      for (const interaction of slow) {
        const rating = interaction.classification;
        lines.push(
          `- ${interaction.eventType} on ${interaction.component} took ${Math.round(interaction.duration)}ms (${rating})`,
        );
      }
      sections.push(lines.join("\n"));
    }
  }

  // Runaway effects
  if (stats.effectOffenders.length > 0) {
    hasIssues = true;
    const lines = ["### Runaway Effects"];
    for (const effect of stats.effectOffenders) {
      const severity = effect.severity === "critical" ? "[CRITICAL]" : "[WARNING]";
      lines.push(`- ${severity} ${effect.component}: ${effect.count} executions`);
    }
    sections.push(lines.join("\n"));
  }

  // Hot spots (DOM mutations)
  if (stats.hotSpots.length > 0) {
    hasIssues = true;
    const lines = ["### Hot Spots"];
    for (const spot of stats.hotSpots) {
      const rate = spot.mutations > 0 ? ` (${spot.mutations}/sec)` : "";
      lines.push(`- ${spot.component}: ${spot.mutations} mutations${rate}`);
    }
    sections.push(lines.join("\n"));
  }

  // Memory leaks
  if (stats.leaks.length > 0) {
    hasIssues = true;
    const lines = ["### Memory Leaks"];
    for (const leak of stats.leaks) {
      const detail = leak.details ? ` (${leak.details})` : "";
      lines.push(`- ${leak.component}: ${leak.leakType}${detail}`);
    }
    sections.push(lines.join("\n"));
  }

  // Console errors
  if (stats.consoleErrors.length > 0) {
    hasIssues = true;
    const lines = ["### Console Errors"];
    for (const err of stats.consoleErrors) {
      const level = err.level === "error" ? "ERROR" : "WARN";
      lines.push(`- [${level}] ${err.message}`);
      if (err.source) {
        lines.push(`  Source: ${err.source}`);
      }
    }
    sections.push(lines.join("\n"));
  }

  if (!hasIssues) {
    return "## Performance Issues (svibe)\n\nNo issues detected.";
  }

  const header = "## Performance Issues (svibe)";
  const footer =
    "\nThe app uses SvelteKit with Svelte 5 runes ($state, $derived, $effect). Suggest fixes.";

  return [header, "", ...sections, footer].join("\n");
}
