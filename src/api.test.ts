import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createSvelteScanAPI } from "./api";
import type { SvelteScanAPI } from "./api";

describe("svelte-scan API", () => {
  let api: SvelteScanAPI;

  beforeEach(() => {
    api = createSvelteScanAPI();
  });

  afterEach(() => {
    api.destroy();
  });

  describe("lifecycle", () => {
    it("starts and reports running", () => {
      expect(api.isRunning()).toBe(false);
      api.start();
      expect(api.isRunning()).toBe(true);
    });

    it("start is idempotent", () => {
      api.start();
      api.start();
      expect(api.isRunning()).toBe(true);
    });

    it("stop pauses but keeps stats readable", () => {
      api.start();
      const collector = api.getCollector()!;
      collector.emit({
        type: "leak",
        component: "Test.svelte",
        leakType: "interval",
        details: "test",
      });

      api.stop();
      expect(api.isRunning()).toBe(false);

      const report = api.getReport();
      expect(report.leaks).toHaveLength(1);
    });

    it("destroy tears down collector", () => {
      api.start();
      api.destroy();
      expect(api.isRunning()).toBe(false);
      expect(api.getCollector()).toBeNull();
    });

    it("getReport returns empty stats before start", () => {
      const report = api.getReport();
      expect(report.mutationsPerSec).toBe(0);
      expect(report.leaks).toHaveLength(0);
      expect(report.effectOffenders).toHaveLength(0);
    });
  });

  describe("event subscription", () => {
    it("subscribes to a specific event type", () => {
      api.start();
      const handler = vi.fn();
      api.on("leak", handler);

      api.getCollector()!.emit({
        type: "leak",
        component: "Test.svelte",
        leakType: "timeout",
        details: "test leak",
      });

      expect(handler).toHaveBeenCalledOnce();
    });

    it("unsubscribes correctly", () => {
      api.start();
      const handler = vi.fn();
      const unsub = api.on("leak", handler);
      unsub();

      api.getCollector()!.emit({
        type: "leak",
        component: "Test.svelte",
        leakType: "timeout",
        details: "test leak",
      });

      expect(handler).not.toHaveBeenCalled();
    });

    it("wildcard subscribes to all event types", () => {
      api.start();
      const handler = vi.fn();
      api.on("*", handler);

      const collector = api.getCollector()!;
      collector.emit({
        type: "leak",
        component: "A.svelte",
        leakType: "interval",
        details: "a",
      });
      collector.emit({
        type: "console",
        level: "error",
        message: "err",
        source: "test",
        timestamp: Date.now(),
      });

      expect(handler).toHaveBeenCalledTimes(2);
    });

    it("wildcard unsubscribe removes all listeners", () => {
      api.start();
      const handler = vi.fn();
      const unsub = api.on("*", handler);
      unsub();

      api.getCollector()!.emit({
        type: "leak",
        component: "A.svelte",
        leakType: "interval",
        details: "a",
      });

      expect(handler).not.toHaveBeenCalled();
    });

    it("on() lazily creates collector even before start()", () => {
      const handler = vi.fn();
      api.on("leak", handler);

      // Collector was created by on()
      expect(api.getCollector()).not.toBeNull();

      api.getCollector()!.emit({
        type: "leak",
        component: "Test.svelte",
        leakType: "raf",
        details: "test",
      });

      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe("getReport", () => {
    it("returns aggregated stats from collector", () => {
      api.start();
      const collector = api.getCollector()!;

      collector.emit({
        type: "effect",
        id: "eff-1",
        component: "Counter.svelte",
        count: 15,
        timestamp: Date.now(),
      });

      const report = api.getReport();
      expect(report.effectOffenders).toHaveLength(1);
      expect(report.effectOffenders[0].component).toBe("Counter.svelte");
    });
  });
});
