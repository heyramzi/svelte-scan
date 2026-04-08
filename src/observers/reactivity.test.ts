/* oxlint-disable upsys/no-snake-case-props, no-unsafe-type-assertion -- Svelte internal API uses snake_case (user_effect); test mocks use `as any` */
import { describe, it, expect, vi, afterEach } from "vitest";
import { createReactivityObserver } from "./reactivity";
import { createCollector } from "../core/collector";

describe("createReactivityObserver", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("counts state and derived creations", async () => {
    const fakeState = vi.fn((v: unknown) => ({ v }));
    const fakeDerived = vi.fn((fn: () => unknown) => ({ fn }));
    const fakeInternals = { state: fakeState, derived: fakeDerived, user_effect: vi.fn() };

    const collector = createCollector();
    const handler = vi.fn();
    collector.subscribe("reactivity", handler);

    const observer = createReactivityObserver(collector, fakeInternals as any);
    observer.start();

    fakeInternals.state(0);
    fakeInternals.state(1);
    fakeInternals.derived(() => 42);

    await new Promise((r) => setTimeout(r, 1100));

    expect(handler).toHaveBeenCalled();
    const event = handler.mock.calls[0][0];
    expect(event.type).toBe("reactivity");
    expect(event.signals).toBe(2);
    expect(event.deriveds).toBe(1);

    observer.destroy();
  });

  it("restores originals on destroy", () => {
    const origState = vi.fn();
    const origDerived = vi.fn();
    const fakeInternals = { state: origState, derived: origDerived, user_effect: vi.fn() };

    const collector = createCollector();
    const observer = createReactivityObserver(collector, fakeInternals as any);
    observer.start();
    observer.destroy();

    expect(fakeInternals.state).toBe(origState);
    expect(fakeInternals.derived).toBe(origDerived);
  });
});
