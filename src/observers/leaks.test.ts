/* oxlint-disable unbound-method -- test captures prototype refs to verify restore behavior */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createLeakDetector } from "./leaks";
import { createCollector } from "../core/collector";
import type { LeakEvent } from "../core/types";

describe("createLeakDetector", () => {
  let collector: ReturnType<typeof createCollector>;
  let handler: ReturnType<typeof vi.fn<(event: LeakEvent) => void>>;

  beforeEach(() => {
    collector = createCollector();
    handler = vi.fn();
    collector.subscribe("leak", handler);
  });

  it("detects setInterval not cleared", () => {
    const detector = createLeakDetector(collector);
    detector.start();

    detector.enterComponent("Timer.svelte");
    const id = setInterval(() => {}, 1000);
    detector.exitComponent();

    detector.checkLeaks("Timer.svelte");

    expect(handler).toHaveBeenCalled();
    expect(handler.mock.calls[0][0].leakType).toBe("interval");

    clearInterval(id);
    detector.destroy();
  });

  it("does not report cleared intervals", () => {
    const detector = createLeakDetector(collector);
    detector.start();

    detector.enterComponent("Clean.svelte");
    const id = setInterval(() => {}, 1000);
    clearInterval(id);
    detector.exitComponent();

    detector.checkLeaks("Clean.svelte");

    expect(handler).not.toHaveBeenCalled();

    detector.destroy();
  });

  it("detects addEventListener without removeEventListener", () => {
    const detector = createLeakDetector(collector);
    detector.start();

    const el = document.createElement("div");
    // eslint-disable-next-line unicorn/consistent-function-scoping -- test helper
    const fn = () => {};

    detector.enterComponent("Button.svelte");
    el.addEventListener("click", fn);
    detector.exitComponent();

    detector.checkLeaks("Button.svelte");

    expect(handler).toHaveBeenCalled();
    expect(handler.mock.calls[0][0].leakType).toBe("listener");

    el.removeEventListener("click", fn);
    detector.destroy();
  });

  it("restores original globals on destroy", () => {
    const origSetInterval = globalThis.setInterval;
    const origAddEvent = EventTarget.prototype.addEventListener;

    const detector = createLeakDetector(collector);
    detector.start();
    detector.destroy();

    expect(globalThis.setInterval).toBe(origSetInterval);
    expect(EventTarget.prototype.addEventListener).toBe(origAddEvent);
  });
});
