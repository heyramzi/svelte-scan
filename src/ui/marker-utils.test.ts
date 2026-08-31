// @vitest-environment jsdom
import { describe, expect, it } from "vite-plus/test";
import type { InspectorNote } from "../inspector/types";
import { buildRenderedMarkers } from "./marker-utils";

function mockRect(left: number, top: number, width: number, height: number): DOMRect {
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON: () => "",
  } as DOMRect;
}

describe("buildRenderedMarkers", () => {
  it("renders one visible marker per selected element for group notes", () => {
    const note: InspectorNote = {
      id: "note-1",
      kind: "group",
      note: "Grouped issue",
      targetSummary: "2 elements",
      targetLabel: "Group of 2",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      componentName: null,
      tagName: "button",
      filePath: "",
      shortFileName: "",
      lineNumber: null,
      columnNumber: null,
      anchor: {
        selectedDomPaths: ["#first", "#second"],
        anchorDomPath: "#first",
        bounds: { left: 20, top: 40, width: 200, height: 80 },
        fallbackMarker: { xPercent: 20, yAbsolute: 80 },
      },
    };

    const elementRects = new Map<string, DOMRect>([
      ["#first", mockRect(20, 40, 80, 24)],
      ["#second", mockRect(180, 110, 90, 24)],
    ]);

    const markers = buildRenderedMarkers([note], (path) => {
      const rect = elementRects.get(path);
      return rect ? { rect } : null;
    });

    expect(markers).toHaveLength(2);
    expect(markers.map((marker) => marker.note.id)).toEqual(["note-1", "note-1"]);
  });
});
