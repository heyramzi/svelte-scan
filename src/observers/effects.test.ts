
import { describe, it, expect, vi, afterEach } from "vitest";
import { createEffectTracker } from "./effects";
import { createCollector } from "../core/collector";

describe("createEffectTracker", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reports effect executions when patching succeeds", async () => {
    const fakeEffect = vi.fn((fn: () => void) => fn());
    const fakeInternals = { user_effect: fakeEffect };

    const collector = createCollector();
    const handler = vi.fn();
    collector.subscribe("effect", handler);

    const tracker = createEffectTracker(collector, fakeInternals as any);
    tracker.start();

    expect(fakeInternals.user_effect).not.toBe(fakeEffect);

    // Call the patched version multiple times to exceed threshold
    for (let i = 0; i < 12; i++) {
      fakeInternals.user_effect(() => {});
    }

    // Wait for the polling cycle
    await new Promise((r) => setTimeout(r, 1100));

    expect(handler).toHaveBeenCalled();

    tracker.destroy();
  });

  it("restores original function on destroy", () => {
    const original = vi.fn();
    const fakeInternals = { user_effect: original };

    const collector = createCollector();
    const tracker = createEffectTracker(collector, fakeInternals as any);
    tracker.start();

    expect(fakeInternals.user_effect).not.toBe(original);

    tracker.destroy();

    expect(fakeInternals.user_effect).toBe(original);
  });
});
