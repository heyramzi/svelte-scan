import type { InspectorNote, AnnotationSnapshot, InspectorSettings } from "./types";
import { buildDomPath } from "./dom-path";
import { generateSelector } from "./selector";
import { resolveSource } from "./source";

const COMPUTED_STYLE_KEYS = [
  "background-color",
  "font-size",
  "font-weight",
  "padding",
  "border-radius",
  "color",
  "display",
  "box-shadow",
];

function captureComputedStyles(element: Element): Record<string, string> | null {
  // oxlint-ignore-next-line stop-slop/no-raw-try-catch
  try {
    const computed = window.getComputedStyle(element);
    const result: Record<string, string> = {};
    for (const key of COMPUTED_STYLE_KEYS) {
      const value = computed.getPropertyValue(key);
      if (value) result[key] = value;
    }
    return Object.keys(result).length > 0 ? result : null;
  } catch {
    return null;
  }
}

function captureAccessibility(element: Element): string | null {
  const role = element.getAttribute("role");
  const ariaLabel = element.getAttribute("aria-label");
  const parts: string[] = [];
  if (role) parts.push(`role=${role}`);
  if (ariaLabel) parts.push(`aria-label="${ariaLabel}"`);
  return parts.length > 0 ? parts.join(", ") : null;
}

function captureComponentTree(element: Element): {
  filtered: string[];
  smart: string[];
  all: string[];
} {
  const all: string[] = [];
  let current: Element | null = element;

  while (current) {
    const source = resolveSource(current);
    if (source && !all.includes(source.component)) {
      all.push(source.component);
    }
    current = current.parentElement;
  }

  return { filtered: all.slice(0, 1), smart: all.slice(0, 3), all };
}

export function buildAnnotationSnapshot(
  note: InspectorNote,
  element: Element | null,
  settings: InspectorSettings,
): AnnotationSnapshot {
  const rect = element?.getBoundingClientRect();
  const domPath = element ? buildDomPath(element) : null;
  const selector = element ? generateSelector(element) : null;
  const components =
    element && settings.includeComponentContext
      ? captureComponentTree(element)
      : { filtered: [], smart: [], all: [] };
  const computedStyles =
    element && settings.includeComputedStyles ? captureComputedStyles(element) : null;
  const accessibility = element ? captureAccessibility(element) : null;

  const nearbyText = element?.textContent?.trim().slice(0, 80) ?? null;

  return {
    id: note.id,
    kind: note.kind,
    comment: note.note,
    targetSummary: note.targetSummary,
    targetLabel: note.targetLabel,
    elementPath: domPath,
    timestamp: note.updatedAt,
    source: {
      componentName: note.componentName,
      tagName: note.tagName,
      filePath: note.filePath,
      shortFileName: note.shortFileName,
      lineNumber: note.lineNumber,
      columnNumber: note.columnNumber,
    },
    element: {
      selector,
      fullDomPath: domPath,
      cssClasses: element ? Array.from(element.classList) : [],
      components,
      boundingBox: rect
        ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
        : null,
      position: rect
        ? {
            x: Math.round(rect.left),
            y: Math.round(rect.top),
            xPercent: window.innerWidth > 0 ? Math.round((rect.left / window.innerWidth) * 100) : 0,
            yAbsolute: Math.round(rect.top + window.scrollY),
          }
        : null,
      selectedText: note.kind === "text" ? note.anchor.selectedText : null,
      nearbyText,
      accessibility,
      computedStyles,
    },
    page: {
      title: document.title || window.location.pathname,
      pathname: window.location.pathname,
      url: window.location.href,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      userAgent: navigator.userAgent,
      devicePixelRatio: window.devicePixelRatio || 1,
      timestamp: new Date().toISOString(),
    },
  };
}
