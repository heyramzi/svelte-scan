// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { createCollector } from "./core/collector";
import { createDomObserver } from "./observers/dom";
import { createCanvasOverlay } from "./ui/canvas-overlay";

describe("svibe integration", () => {
  it("full pipeline: DOM mutation triggers collector and canvas overlay", async () => {
    const collector = createCollector();
    const domObs = createDomObserver(collector);
    const overlay = createCanvasOverlay(collector);

    const container = document.createElement("div");
    document.body.appendChild(container);
    overlay.mount(container);
    domObs.start();

    const rects: DOMRect[] = [];
    collector.subscribe("dom", (event) => {
      rects.push(event.rect);
    });

    const el = document.createElement("div");
    el.style.width = "100px";
    el.style.height = "50px";
    document.body.appendChild(el);

    await new Promise((r) => setTimeout(r, 100));

    expect(rects.length).toBeGreaterThan(0);

    domObs.destroy();
    overlay.destroy();
    collector.destroy();
    el.remove();
    container.remove();
  });

  it("collector stats reflect mutations", async () => {
    const collector = createCollector();
    const domObs = createDomObserver(collector);
    domObs.start();

    for (let i = 0; i < 5; i++) {
      const el = document.createElement("span");
      el.textContent = `item-${i}`;
      document.body.appendChild(el);
    }

    await new Promise((r) => setTimeout(r, 100));

    const stats = collector.getStats();
    expect(stats.mutationsPerSec).toBeGreaterThanOrEqual(5);

    domObs.destroy();
    collector.destroy();
    document.querySelectorAll("span").forEach((el) => el.remove());
  });
});
