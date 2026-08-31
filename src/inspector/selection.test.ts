// @vitest-environment jsdom
import { describe, it, expect } from "vite-plus/test";
import { captureTextSelection, buildGroupBounds, buildAreaRect } from "./selection";

describe("selection", () => {
  describe("captureTextSelection", () => {
    it("returns null when no text selected", () => {
      expect(captureTextSelection()).toBeNull();
    });
  });

  describe("buildGroupBounds", () => {
    it("computes bounding box of multiple rects", () => {
      const rects: DOMRect[] = [new DOMRect(10, 20, 100, 50), new DOMRect(50, 80, 120, 40)];
      const bounds = buildGroupBounds(rects);
      expect(bounds).toEqual({ left: 10, top: 20, width: 160, height: 100 });
    });

    it("returns null for empty array", () => {
      expect(buildGroupBounds([])).toBeNull();
    });
  });

  describe("buildAreaRect", () => {
    it("normalizes negative-direction drag", () => {
      const rect = buildAreaRect(200, 200, 100, 100);
      expect(rect).toEqual({ left: 100, top: 100, width: 100, height: 100 });
    });

    it("handles normal direction drag", () => {
      const rect = buildAreaRect(100, 100, 200, 200);
      expect(rect).toEqual({ left: 100, top: 100, width: 100, height: 100 });
    });
  });
});
