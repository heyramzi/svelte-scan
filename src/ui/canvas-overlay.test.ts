// @vitest-environment jsdom
/* oxlint-disable no-unsafe-type-assertion -- test code casts Element to HTMLElement for style access */
import { describe, it, expect, afterEach, vi, beforeEach } from "vite-plus/test";
import { createCanvasOverlay } from "./canvas-overlay";
import { createCollector } from "../core/collector";

describe("createCanvasOverlay", () => {
  let container: HTMLDivElement;
  let collector: ReturnType<typeof createCollector>;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    collector = createCollector();
  });

  afterEach(() => {
    container.remove();
    collector.destroy();
    document.querySelectorAll("[data-svelte-scan-canvas-overlay]").forEach((el) => el.remove());
  });

  it("mount creates a canvas element in the container", () => {
    const overlay = createCanvasOverlay(collector);
    overlay.mount(container);
    const canvas = container.querySelector("canvas[data-svelte-scan-canvas-overlay]");
    expect(canvas).toBeTruthy();
    expect((canvas as HTMLElement)?.style.pointerEvents).toBe("none");
    overlay.destroy();
  });

  it("mount is idempotent", () => {
    const overlay = createCanvasOverlay(collector);
    overlay.mount(container);
    overlay.mount(container);
    expect(container.querySelectorAll("canvas").length).toBe(1);
    overlay.destroy();
  });

  it("subscribes to dom events from collector", () => {
    const overlay = createCanvasOverlay(collector);
    overlay.mount(container);

    // Emitting a dom event should not throw
    expect(() =>
      collector.emit({
        type: "dom",
        target: document.createElement("div"),
        rect: new DOMRect(10, 20, 100, 50),
        timestamp: Date.now(),
      }),
    ).not.toThrow();

    overlay.destroy();
  });

  it("skips zero-size rects", () => {
    const overlay = createCanvasOverlay(collector);
    overlay.mount(container);

    // Emit a zero-size rect — should not throw
    collector.emit({
      type: "dom",
      target: document.createElement("div"),
      rect: new DOMRect(0, 0, 0, 0),
      timestamp: Date.now(),
    });

    overlay.destroy();
  });

  it("skips viewport-sized rects", () => {
    const overlay = createCanvasOverlay(collector);
    overlay.mount(container);

    collector.emit({
      type: "dom",
      target: document.createElement("div"),
      rect: new DOMRect(0, 0, window.innerWidth, window.innerHeight),
      timestamp: Date.now(),
    });

    overlay.destroy();
  });

  it("destroy removes the canvas from the DOM", () => {
    const overlay = createCanvasOverlay(collector);
    overlay.mount(container);
    overlay.destroy();
    expect(container.querySelector("canvas")).toBeNull();
  });

  it("destroy cancels animation frame", () => {
    const spy = vi.spyOn(globalThis, "cancelAnimationFrame");
    const overlay = createCanvasOverlay(collector);
    overlay.mount(container);

    // Trigger a rect to start the RAF loop
    collector.emit({
      type: "dom",
      target: document.createElement("div"),
      rect: new DOMRect(10, 20, 100, 50),
      timestamp: Date.now(),
    });

    overlay.destroy();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("does not throw if destroy is called before mount", () => {
    const overlay = createCanvasOverlay(collector);
    expect(() => overlay.destroy()).not.toThrow();
  });
});
