// @vitest-environment jsdom
import { describe, it, expect } from "vite-plus/test";
import { formatElementsForAI, formatOptimizationPrompt } from "./formatter";
import type { SelectedElement } from "./types";
import type { AggregatedStats } from "../core/types";

function makeRect(w: number, h: number): DOMRect {
  return {
    x: 0,
    y: 0,
    width: w,
    height: h,
    top: 0,
    left: 0,
    bottom: h,
    right: w,
    toJSON: () => ({}),
  } as DOMRect;
}

function emptyStats(): AggregatedStats {
  return {
    mutationsPerSec: 0,
    hotSpots: [],
    effectOffenders: [],
    leaks: [],
    consoleErrors: [],
    serverLogs: [],
    interactions: [],
    reactivity: { signals: 0, deriveds: 0, effects: 0, maxDepth: 0 },
  };
}

describe("formatElementsForAI", () => {
  it("returns 'No elements selected' when empty", () => {
    const result = formatElementsForAI([]);
    expect(result).toContain("No elements selected");
  });

  it("formats a single element with source info", () => {
    const el: SelectedElement = {
      element: document.createElement("button"),
      selector: '[data-testid="archive-btn"]',
      source: {
        file: "src/components/features/projects/ProjectCard.svelte",
        line: 42,
        column: 3,
        component: "ProjectCard.svelte",
      },
      rect: makeRect(120, 36),
      tagName: "button",
      classes: ["btn-primary", "ml-2"],
      id: null,
      attributes: {},
    };

    const result = formatElementsForAI([el]);

    expect(result).toContain("## Selected Elements (svibe)");
    expect(result).toContain('<button class="btn-primary ml-2">');
    expect(result).toContain("ProjectCard.svelte");
    expect(result).toContain("42:3");
    expect(result).toContain("Selector: [data-testid");
    expect(result).toContain("Classes: btn-primary, ml-2");
    expect(result).toContain("Size: 120x36px");
  });

  it("formats element without source info", () => {
    const el: SelectedElement = {
      element: document.createElement("div"),
      selector: "div:nth-child(1)",
      source: null,
      rect: makeRect(800, 64),
      tagName: "div",
      classes: [],
      id: null,
      attributes: {},
    };

    const result = formatElementsForAI([el]);

    expect(result).toContain("`<div>`");
    expect(result).not.toContain(" in ");
    expect(result).toContain("Size: 800x64px");
  });

  it("formats multiple elements", () => {
    const elements: SelectedElement[] = [
      {
        element: document.createElement("button"),
        selector: ".btn",
        source: null,
        rect: makeRect(100, 32),
        tagName: "button",
        classes: ["btn"],
        id: null,
        attributes: {},
      },
      {
        element: document.createElement("span"),
        selector: ".label",
        source: null,
        rect: makeRect(50, 16),
        tagName: "span",
        classes: ["label"],
        id: null,
        attributes: {},
      },
    ];

    const result = formatElementsForAI(elements);
    expect(result).toContain("<button");
    expect(result).toContain("<span");
  });
});

describe("formatOptimizationPrompt", () => {
  it("returns 'No issues detected' for empty stats", () => {
    const result = formatOptimizationPrompt(emptyStats());
    expect(result).toContain("No issues detected");
  });

  it("reports slow interactions", () => {
    const stats = emptyStats();
    stats.interactions = [
      {
        eventType: "click",
        component: "ProjectList.svelte",
        duration: 450,
        phases: { handler: 200, reactive: 150, paint: 80, composite: 20 },
        classification: "poor",
        timestamp: Date.now(),
      },
    ];

    const result = formatOptimizationPrompt(stats);

    expect(result).toContain("### Slow Interactions");
    expect(result).toContain("click");
    expect(result).toContain("450ms");
    expect(result).toContain("poor");
  });

  it("does not report fast interactions", () => {
    const stats = emptyStats();
    stats.interactions = [
      {
        eventType: "click",
        component: "Button.svelte",
        duration: 50,
        phases: { handler: 20, reactive: 15, paint: 10, composite: 5 },
        classification: "good",
        timestamp: Date.now(),
      },
    ];

    const result = formatOptimizationPrompt(stats);
    expect(result).toContain("No issues detected");
  });

  it("reports runaway effects", () => {
    const stats = emptyStats();
    stats.effectOffenders = [
      { id: "e1", component: "ProjectCard.svelte", count: 82, severity: "critical" },
    ];

    const result = formatOptimizationPrompt(stats);

    expect(result).toContain("### Runaway Effects");
    expect(result).toContain("[CRITICAL]");
    expect(result).toContain("82 executions");
  });

  it("reports hot spots", () => {
    const stats = emptyStats();
    stats.hotSpots = [
      {
        element: document.createElement("div"),
        component: "ProjectCard.svelte",
        mutations: 25,
      },
    ];

    const result = formatOptimizationPrompt(stats);

    expect(result).toContain("### Hot Spots");
    expect(result).toContain("25 mutations");
    expect(result).toContain("25/sec");
  });

  it("reports memory leaks", () => {
    const stats = emptyStats();
    stats.leaks = [
      {
        component: "ProjectCard.svelte",
        leakType: "interval",
        details: "setInterval(1000ms)",
        timestamp: Date.now(),
      },
    ];

    const result = formatOptimizationPrompt(stats);

    expect(result).toContain("### Memory Leaks");
    expect(result).toContain("interval");
    expect(result).toContain("setInterval(1000ms)");
  });

  it("reports console errors", () => {
    const stats = emptyStats();
    stats.consoleErrors = [
      {
        level: "error",
        message: "TypeError: Cannot read properties of undefined",
        source: "src/lib/example/service.ts:42:15",
        timestamp: Date.now(),
      },
    ];

    const result = formatOptimizationPrompt(stats);

    expect(result).toContain("### Console Errors");
    expect(result).toContain("[ERROR]");
    expect(result).toContain("TypeError");
    expect(result).toContain("Source: src/lib/example/service.ts:42:15");
  });

  it("includes SvelteKit footer when issues exist", () => {
    const stats = emptyStats();
    stats.effectOffenders = [{ id: "e1", component: "A.svelte", count: 20, severity: "warning" }];

    const result = formatOptimizationPrompt(stats);
    expect(result).toContain("Svelte 5 runes");
    expect(result).toContain("Suggest fixes");
  });

  it("reports multiple issue categories together", () => {
    const stats = emptyStats();
    stats.effectOffenders = [{ id: "e1", component: "A.svelte", count: 50, severity: "critical" }];
    stats.leaks = [
      { component: "B.svelte", leakType: "listener", details: "click", timestamp: Date.now() },
    ];
    stats.consoleErrors = [
      { level: "warn", message: "Deprecated API", source: "", timestamp: Date.now() },
    ];

    const result = formatOptimizationPrompt(stats);

    expect(result).toContain("### Runaway Effects");
    expect(result).toContain("### Memory Leaks");
    expect(result).toContain("### Console Errors");
  });
});
