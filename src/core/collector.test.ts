// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { createCollector } from "./collector";
import type {
  DomEvent,
  EffectEvent,
  LeakEvent,
  InteractionEvent,
  InteractionPhases,
} from "./types";

const DEFAULT_PHASES: InteractionPhases = { handler: 0, reactive: 0, paint: 0, composite: 0 };

describe("createCollector", () => {
  it("emits events to typed subscribers", () => {
    const collector = createCollector();
    const handler = vi.fn();

    collector.subscribe("dom", handler);

    const event: DomEvent = {
      type: "dom",
      target: document.createElement("div"),
      rect: new DOMRect(0, 0, 100, 50),
      timestamp: Date.now(),
    };
    collector.emit(event);

    expect(handler).toHaveBeenCalledWith(event);
  });

  it("does not cross-fire between event types", () => {
    const collector = createCollector();
    const domHandler = vi.fn();
    const effectHandler = vi.fn();

    collector.subscribe("dom", domHandler);
    collector.subscribe("effect", effectHandler);

    const event: DomEvent = {
      type: "dom",
      target: document.createElement("div"),
      rect: new DOMRect(0, 0, 100, 50),
      timestamp: Date.now(),
    };
    collector.emit(event);

    expect(domHandler).toHaveBeenCalledOnce();
    expect(effectHandler).not.toHaveBeenCalled();
  });

  it("unsubscribes correctly", () => {
    const collector = createCollector();
    const handler = vi.fn();

    const unsub = collector.subscribe("dom", handler);
    unsub();

    collector.emit({
      type: "dom",
      target: document.createElement("div"),
      rect: new DOMRect(0, 0, 100, 50),
      timestamp: Date.now(),
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it("tracks aggregated stats for effects", () => {
    const collector = createCollector();

    const event: EffectEvent = {
      type: "effect",
      id: "eff-1",
      component: "Counter.svelte",
      count: 15,
      timestamp: Date.now(),
    };
    collector.emit(event);

    const stats = collector.getStats();
    expect(stats.effectOffenders).toHaveLength(1);
    expect(stats.effectOffenders[0].component).toBe("Counter.svelte");
    expect(stats.effectOffenders[0].severity).toBe("warning");
  });

  it("tracks leak records", () => {
    const collector = createCollector();

    const event: LeakEvent = {
      type: "leak",
      component: "Timer.svelte",
      leakType: "interval",
      details: "setInterval not cleared",
    };
    collector.emit(event);

    const stats = collector.getStats();
    expect(stats.leaks).toHaveLength(1);
    expect(stats.leaks[0].leakType).toBe("interval");
  });

  it("tracks interaction records", () => {
    const collector = createCollector();

    const event: InteractionEvent = {
      type: "interaction",
      eventType: "click",
      target: document.createElement("button"),
      component: "Button.svelte",
      duration: 250,
      phases: DEFAULT_PHASES,
      classification: "needs-improvement",
      timestamp: Date.now(),
    };
    collector.emit(event);

    const stats = collector.getStats();
    expect(stats.interactions).toHaveLength(1);
    expect(stats.interactions[0].component).toBe("Button.svelte");
    expect(stats.interactions[0].classification).toBe("needs-improvement");
    expect(stats.interactions[0].phases).toEqual(DEFAULT_PHASES);
  });

  it("keeps only last 50 interactions", () => {
    const collector = createCollector();

    for (let i = 0; i < 60; i++) {
      collector.emit({
        type: "interaction",
        eventType: "click",
        target: document.createElement("button"),
        component: `Btn${i}.svelte`,
        duration: 100,
        phases: DEFAULT_PHASES,
        classification: "good",
        timestamp: Date.now(),
      });
    }

    const stats = collector.getStats();
    expect(stats.interactions).toHaveLength(50);
    expect(stats.interactions[0].component).toBe("Btn10.svelte");
  });

  it("clears server logs immediately even when stats are cached", () => {
    const collector = createCollector();

    collector.emit({
      type: "server",
      level: "error",
      message: "SSR failed",
      timestamp: Date.now(),
    });

    expect(collector.getStats().serverLogs).toHaveLength(1);

    collector.resetServerLogs();

    expect(collector.getStats().serverLogs).toHaveLength(0);
  });

  it("cleans up on destroy", () => {
    const collector = createCollector();
    const handler = vi.fn();
    collector.subscribe("dom", handler);

    collector.destroy();

    collector.emit({
      type: "dom",
      target: document.createElement("div"),
      rect: new DOMRect(0, 0, 100, 50),
      timestamp: Date.now(),
    });

    expect(handler).not.toHaveBeenCalled();
  });
});
