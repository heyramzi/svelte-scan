import { describe, it, expect } from "vitest";
import {
  formatCompact,
  formatStandard,
  formatDetailed,
  formatForensic,
  formatPayload,
} from "./export";
import type { ExportPayload, AnnotationSnapshot } from "./types";

const BASE_SNAPSHOT: AnnotationSnapshot = {
  id: "n1",
  kind: "element",
  comment: "Button is too small",
  targetSummary: '<button class="submit">',
  targetLabel: "button.submit",
  elementPath: "body > form > button",
  timestamp: "2026-01-01T00:00:00Z",
  source: {
    componentName: "Form",
    tagName: "button",
    filePath: "/src/Form.svelte",
    shortFileName: "Form.svelte",
    lineNumber: 42,
    columnNumber: 4,
  },
  element: {
    selector: "button.submit",
    fullDomPath: "body > form > button:nth-child(2)",
    cssClasses: ["submit"],
    components: { filtered: ["Form"], smart: ["Form"], all: ["Form", "App"] },
    boundingBox: { left: 100, top: 200, width: 120, height: 40 },
    position: { x: 100, y: 200, xPercent: 50, yAbsolute: 200 },
    selectedText: null,
    nearbyText: "Submit your form",
    accessibility: "role=button",
    computedStyles: { "font-size": "14px", "background-color": "rgb(0, 123, 255)" },
  },
  page: {
    title: "Test Page",
    pathname: "/test",
    url: "http://localhost/test",
    viewport: { width: 1280, height: 720 },
    userAgent: "test",
    devicePixelRatio: 2,
    timestamp: "2026-01-01T00:00:00Z",
  },
};

const PAYLOAD: ExportPayload = {
  title: "Test Page",
  outputMode: "standard",
  url: "http://localhost/test",
  viewport: { width: 1280, height: 720 },
  userAgent: "test",
  devicePixelRatio: 2,
  timestamp: "2026-01-01T00:00:00Z",
  annotations: [BASE_SNAPSHOT],
};

describe("export", () => {
  it("formats compact markdown", () => {
    const md = formatCompact(PAYLOAD);
    expect(md).toContain("Feedback");
    expect(md).toContain("Button is too small");
    expect(md).toContain(".submit");
  });

  it("formats standard markdown", () => {
    const md = formatStandard(PAYLOAD);
    expect(md).toContain("Page Feedback");
    expect(md).toContain("Form.svelte:42:4");
    expect(md).toContain("button.submit");
  });

  it("formats detailed markdown", () => {
    const md = formatDetailed(PAYLOAD);
    expect(md).toContain("Selector");
    expect(md).toContain("Components");
    expect(md).toContain("Bounding box");
  });

  it("formats forensic markdown", () => {
    const md = formatForensic(PAYLOAD);
    expect(md).toContain("Environment");
    expect(md).toContain("Device Pixel Ratio");
    expect(md).toContain("Computed Styles");
  });

  it("dispatches by output mode", () => {
    expect(formatPayload({ ...PAYLOAD, outputMode: "compact" })).toContain("Feedback");
    expect(formatPayload({ ...PAYLOAD, outputMode: "forensic" })).toContain("Environment");
  });

  it("handles empty annotations", () => {
    const md = formatPayload({ ...PAYLOAD, annotations: [] });
    expect(md).toContain("No feedback");
  });
});
