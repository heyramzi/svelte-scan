/* oxlint-disable unbound-method -- test verifies event listener registration/cleanup */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createInteractionObserver } from "./interactions";
import { createCollector } from "../core/collector";
import { IGNORE_ATTR } from "../core/types";

/**
 * Wait for queueMicrotask + rAF + setTimeout(0) to flush, matching the
 * phase measurement callbacks in the observer. In jsdom, rAF is polyfilled
 * with setTimeout so a short delay covers all frames.
 */
function waitForMeasurement(): Promise<void> {
  return new Promise((r) => setTimeout(r, 150));
}

describe("createInteractionObserver", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    // Mock performance.now for deterministic durations
    vi.spyOn(performance, "now");
  });

  afterEach(() => {
    container.remove();
    vi.restoreAllMocks();
  });

  it("registers event listeners on start()", () => {
    const collector = createCollector();
    const spy = vi.spyOn(document, "addEventListener");

    const observer = createInteractionObserver(collector);
    observer.start();

    const registeredTypes = spy.mock.calls.map((call) => call[0]);
    expect(registeredTypes).toContain("click");
    expect(registeredTypes).toContain("keydown");
    expect(registeredTypes).toContain("input");

    observer.destroy();
  });

  it("emits interaction events for slow clicks", async () => {
    const collector = createCollector();
    const handler = vi.fn();
    collector.subscribe("interaction", handler);

    // Simulate a slow interaction with phase timing:
    // Call 1: now (debounce), Call 2: t1 (handler end)
    // Call 3: t2 (microtask/reactive), Call 4: t3 (rAF/paint)
    // Call 5: t4 (setTimeout/composite) = 1300 => duration 300ms
    let callCount = 0;
    vi.mocked(performance.now).mockImplementation(() => {
      callCount++;
      if (callCount <= 4) return 1000;
      return 1300; // 300ms later = needs-improvement
    });

    const observer = createInteractionObserver(collector);
    observer.start();

    const button = document.createElement("button");
    container.appendChild(button);
    button.click();

    await waitForMeasurement();

    expect(handler).toHaveBeenCalledTimes(1);
    const event = handler.mock.calls[0][0];
    expect(event.type).toBe("interaction");
    expect(event.eventType).toBe("click");
    expect(event.classification).toBe("needs-improvement");
    expect(event.phases).toBeDefined();
    expect(typeof event.phases.handler).toBe("number");
    expect(typeof event.phases.reactive).toBe("number");
    expect(typeof event.phases.paint).toBe("number");
    expect(typeof event.phases.composite).toBe("number");

    observer.destroy();
  });

  it("does not emit for fast (good) interactions", async () => {
    const collector = createCollector();
    const handler = vi.fn();
    collector.subscribe("interaction", handler);

    let callCount = 0;
    vi.mocked(performance.now).mockImplementation(() => {
      callCount++;
      if (callCount <= 4) return 1000;
      return 1050; // 50ms = good, should not emit
    });

    const observer = createInteractionObserver(collector);
    observer.start();

    const button = document.createElement("button");
    container.appendChild(button);
    button.click();

    await waitForMeasurement();

    expect(handler).not.toHaveBeenCalled();

    observer.destroy();
  });

  it("classifies >500ms interactions as poor", async () => {
    const collector = createCollector();
    const handler = vi.fn();
    collector.subscribe("interaction", handler);

    let callCount = 0;
    vi.mocked(performance.now).mockImplementation(() => {
      callCount++;
      if (callCount <= 4) return 1000;
      return 1600; // 600ms = poor
    });

    const observer = createInteractionObserver(collector);
    observer.start();

    const button = document.createElement("button");
    container.appendChild(button);
    button.click();

    await waitForMeasurement();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].classification).toBe("poor");

    observer.destroy();
  });

  it("skips events on elements with data-svibe-ignore", async () => {
    const collector = createCollector();
    const handler = vi.fn();
    collector.subscribe("interaction", handler);

    let callCount = 0;
    vi.mocked(performance.now).mockImplementation(() => {
      callCount++;
      if (callCount <= 4) return 1000;
      return 1300;
    });

    const observer = createInteractionObserver(collector);
    observer.start();

    const ignored = document.createElement("div");
    ignored.setAttribute(IGNORE_ATTR, "");
    container.appendChild(ignored);

    const button = document.createElement("button");
    ignored.appendChild(button);
    button.click();

    await waitForMeasurement();

    expect(handler).not.toHaveBeenCalled();

    observer.destroy();
  });

  it("skips events inside data-svibe-toolbar", async () => {
    const collector = createCollector();
    const handler = vi.fn();
    collector.subscribe("interaction", handler);

    let callCount = 0;
    vi.mocked(performance.now).mockImplementation(() => {
      callCount++;
      if (callCount <= 4) return 1000;
      return 1300;
    });

    const observer = createInteractionObserver(collector);
    observer.start();

    const toolbar = document.createElement("div");
    toolbar.setAttribute("data-svibe-toolbar", "");
    container.appendChild(toolbar);

    const button = document.createElement("button");
    toolbar.appendChild(button);
    button.click();

    await waitForMeasurement();

    expect(handler).not.toHaveBeenCalled();

    observer.destroy();
  });

  it("removes listeners on stop()", async () => {
    const collector = createCollector();
    const handler = vi.fn();
    collector.subscribe("interaction", handler);

    let callCount = 0;
    vi.mocked(performance.now).mockImplementation(() => {
      callCount++;
      if (callCount <= 4) return 1000;
      return 1300;
    });

    const observer = createInteractionObserver(collector);
    observer.start();
    observer.stop();

    const button = document.createElement("button");
    container.appendChild(button);
    button.click();

    await waitForMeasurement();

    expect(handler).not.toHaveBeenCalled();

    observer.destroy();
  });

  it("debounces rapid events from the same target", async () => {
    const collector = createCollector();
    const handler = vi.fn();
    collector.subscribe("interaction", handler);

    // First click: now=1000, t1=1000, phases resolve, t4=1300 (needs-improvement)
    // Second click: now=1050, debounced because 1050-1000 < 500
    let callCount = 0;
    vi.mocked(performance.now).mockImplementation(() => {
      callCount++;
      // Calls 1-2: first click (now + t1)
      // Call 3: second click handleEvent (debounce check => skipped, 1050-1000<500)
      // Calls 4-5: first click phase callbacks (t2, t3)
      // Call 6: first click t4 measurement
      if (callCount <= 2) return 1000;
      if (callCount === 3) return 1050; // 50ms after first = within debounce window
      if (callCount <= 5) return 1000;
      return 1300;
    });

    const observer = createInteractionObserver(collector);
    observer.start();

    const button = document.createElement("button");
    container.appendChild(button);

    button.click();
    button.click(); // rapid second click, should be debounced

    await waitForMeasurement();

    expect(handler).toHaveBeenCalledTimes(1);

    observer.destroy();
  });
});
