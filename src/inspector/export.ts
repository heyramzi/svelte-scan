import type { ExportPayload, AnnotationSnapshot, OutputMode } from "./types";

function codeValue(v: string): string {
  return `\`${v.replace(/\s+/g, " ").trim()}\``;
}

function quoteValue(v: string): string {
  return `"${v.replace(/\s+/g, " ").trim()}"`;
}

function formatSource(s: AnnotationSnapshot): string {
  if (!s.source.filePath) return "Source unavailable";
  const line = s.source.lineNumber ?? "?";
  const col = s.source.columnNumber ?? "?";
  return `${s.source.filePath}:${line}:${col}`;
}

function formatShortSource(s: AnnotationSnapshot): string {
  if (!s.source.shortFileName) return "Source unavailable";
  if (s.source.lineNumber === null) return s.source.shortFileName;
  return `${s.source.shortFileName}:${s.source.lineNumber}:${s.source.columnNumber ?? "?"}`;
}

function formatComponents(s: AnnotationSnapshot): string {
  const vals =
    s.element.components.all.length > 0 ? s.element.components.all : s.element.components.smart;
  return vals.length > 0 ? vals.map((v) => `<${v}>`).join(" ") : "";
}

function formatStyles(s: AnnotationSnapshot): string {
  const styles = s.element.computedStyles;
  if (!styles) return "";
  const labels: Record<string, string> = {
    "background-color": "bg",
    "font-size": "font",
    "font-weight": "weight",
    padding: "padding",
    "border-radius": "radius",
    color: "color",
    display: "display",
    "box-shadow": "shadow",
  };
  return Object.entries(styles)
    .map(([k, v]) => `${labels[k] ?? k}: ${v}`)
    .join(", ");
}

export function formatCompact(payload: ExportPayload): string {
  return [
    `## Feedback: ${payload.title}`,
    "",
    ...payload.annotations.flatMap((s, i) => {
      const target = s.element.cssClasses[0] ? `.${s.element.cssClasses[0]}` : s.targetLabel;
      const src = formatShortSource(s);
      const textRef =
        s.kind === "text" && s.element.selectedText
          ? ` (re: ${quoteValue(s.element.selectedText)})`
          : "";
      return [`${i + 1}. **${target}** (${src}): ${s.comment}${textRef}`, ""];
    }),
  ].join("\n");
}

export function formatStandard(payload: ExportPayload): string {
  return [
    `## Page Feedback: ${payload.title}`,
    `**Viewport:** ${payload.viewport.width}x${payload.viewport.height}`,
    "",
    ...payload.annotations.flatMap((s, i) => {
      const lines = [
        `### ${i + 1}. ${s.targetLabel}`,
        `**Location:** ${codeValue(s.element.selector ?? s.targetSummary)}`,
        `**Source:** ${formatSource(s)}`,
      ];
      const comps = formatComponents(s);
      if (comps) lines.push(`**Components:** ${codeValue(comps)}`);
      if (s.element.selectedText) lines.push(`**Selected:** ${quoteValue(s.element.selectedText)}`);
      lines.push(`**Feedback:** ${s.comment}`, "");
      return lines;
    }),
  ].join("\n");
}

export function formatDetailed(payload: ExportPayload): string {
  return [
    `## Page Feedback: ${payload.title}`,
    `**Viewport:** ${payload.viewport.width}x${payload.viewport.height}`,
    `**URL:** ${payload.url}`,
    "",
    "---",
    "",
    ...payload.annotations.flatMap((s, i) => {
      const lines = [`### ${i + 1}. ${s.targetLabel}`, ""];
      if (s.element.selector) lines.push(`**Selector:** ${codeValue(s.element.selector)}`);
      lines.push(`**Source:** ${formatSource(s)}`);
      const comps = formatComponents(s);
      if (comps) lines.push(`**Components:** ${codeValue(comps)}`);
      const bb = s.element.boundingBox;
      if (bb && s.kind !== "text")
        lines.push(`**Bounding box:** x:${bb.left}, y:${bb.top}, ${bb.width}x${bb.height}px`);
      if (s.element.selectedText)
        lines.push(`**Selected text:** ${quoteValue(s.element.selectedText)}`);
      if (s.element.nearbyText) lines.push(`**Nearby text:** ${quoteValue(s.element.nearbyText)}`);
      lines.push("", `**Issue:** ${s.comment}`, "", "---", "");
      return lines;
    }),
  ].join("\n");
}

export function formatForensic(payload: ExportPayload): string {
  return [
    `## Page Feedback: ${payload.title}`,
    "",
    "**Environment:**",
    `- Viewport: ${payload.viewport.width}x${payload.viewport.height}`,
    `- URL: ${payload.url}`,
    `- User Agent: ${payload.userAgent}`,
    `- Timestamp: ${payload.timestamp}`,
    `- Device Pixel Ratio: ${payload.devicePixelRatio}`,
    "",
    "---",
    "",
    ...payload.annotations.flatMap((s, i) => {
      const lines = [`### ${i + 1}. ${s.targetLabel}`, ""];
      if (s.element.fullDomPath)
        lines.push(`**Full DOM Path:** ${codeValue(s.element.fullDomPath)}`);
      lines.push(`**Source:** ${formatSource(s)}`);
      const comps = formatComponents(s);
      if (comps) lines.push(`**Components:** ${codeValue(comps)}`);
      if (s.element.cssClasses.length > 0)
        lines.push(`**CSS Classes:** ${codeValue(s.element.cssClasses.join(", "))}`);
      if (s.element.selectedText)
        lines.push(`**Selected text:** ${quoteValue(s.element.selectedText)}`);
      const bb = s.element.boundingBox;
      const pos = s.element.position;
      if (bb && pos) {
        lines.push("**Position:**");
        lines.push(`- Bounding box: x:${bb.left}, y:${bb.top}`);
        lines.push(`- Dimensions: ${bb.width}x${bb.height}px`);
        lines.push(`- Annotation at: ${pos.xPercent}% from left, ${pos.yAbsolute}px from top`);
      }
      const styles = formatStyles(s);
      if (styles) lines.push(`**Computed Styles:** ${styles}`);
      if (s.element.accessibility) lines.push(`**Accessibility:** ${s.element.accessibility}`);
      lines.push("", `**Issue:** ${s.comment}`, "", "---", "");
      return lines;
    }),
  ].join("\n");
}

const FORMATTERS: Record<OutputMode, (p: ExportPayload) => string> = {
  compact: formatCompact,
  standard: formatStandard,
  detailed: formatDetailed,
  forensic: formatForensic,
};

export function formatPayload(payload: ExportPayload): string {
  if (payload.annotations.length === 0) return "## Feedback\n\nNo feedback added yet.";
  return (FORMATTERS[payload.outputMode] ?? formatStandard)(payload);
}
