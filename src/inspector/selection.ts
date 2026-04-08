import type { RectBox, TextAnchor, MarkerFallback } from "./types";
import { buildDomPath } from "./dom-path";

export type CapturedTextSelection = {
  anchor: TextAnchor;
  commonAncestor: Element;
  rects: DOMRect[];
  bounds: RectBox;
  markerLeft: number;
  markerTop: number;
};

export function captureTextSelection(): CapturedTextSelection | null {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;

  const range = sel.getRangeAt(0);
  const commonAncestor = range.commonAncestorContainer;
  const ancestorEl =
    commonAncestor.nodeType === Node.ELEMENT_NODE
      ? (commonAncestor as Element)
      : commonAncestor.parentElement;

  if (!ancestorEl) return null;

  const commonAncestorPath = buildDomPath(ancestorEl) ?? "";
  const selectedText = sel.toString();

  const contextRange = document.createRange();
  contextRange.setStart(range.startContainer, Math.max(0, range.startOffset - 40));
  contextRange.setEnd(range.startContainer, range.startOffset);
  const contextBefore = contextRange.toString();

  const afterRange = document.createRange();
  afterRange.setStart(range.endContainer, range.endOffset);
  const endContainer = range.endContainer;
  const endMax =
    endContainer.nodeType === Node.TEXT_NODE
      ? (endContainer as Text).length
      : (endContainer as Element).childNodes.length;
  afterRange.setEnd(endContainer, Math.min(endMax, range.endOffset + 40));
  const contextAfter = afterRange.toString();

  const rects = Array.from(range.getClientRects()).filter((r) => r.width > 0 && r.height > 0);
  if (rects.length === 0) return null;

  const bounds = buildGroupBounds(rects);
  if (!bounds) return null;

  const fallbackMarker: MarkerFallback = {
    xPercent: ((bounds.left + bounds.width / 2) / window.innerWidth) * 100,
    yAbsolute: bounds.top + window.scrollY,
  };

  const anchor: TextAnchor = {
    commonAncestorPath,
    selectedText,
    contextBefore,
    contextAfter,
    startOffset: range.startOffset,
    endOffset: range.endOffset,
    fallbackMarker,
  };

  return {
    anchor,
    commonAncestor: ancestorEl,
    rects,
    bounds,
    markerLeft: bounds.left + bounds.width / 2,
    markerTop: bounds.top,
  };
}

export function buildGroupBounds(rects: DOMRect[]): RectBox | null {
  if (rects.length === 0) return null;

  let minLeft = Infinity;
  let minTop = Infinity;
  let maxRight = -Infinity;
  let maxBottom = -Infinity;

  for (const r of rects) {
    if (r.left < minLeft) minLeft = r.left;
    if (r.top < minTop) minTop = r.top;
    if (r.right > maxRight) maxRight = r.right;
    if (r.bottom > maxBottom) maxBottom = r.bottom;
  }

  return {
    left: minLeft,
    top: minTop,
    width: maxRight - minLeft,
    height: maxBottom - minTop,
  };
}

export function buildAreaRect(startX: number, startY: number, endX: number, endY: number): RectBox {
  const left = Math.min(startX, endX);
  const top = Math.min(startY, endY);
  const width = Math.abs(endX - startX);
  const height = Math.abs(endY - startY);
  return { left, top, width, height };
}
