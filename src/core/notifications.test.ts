// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vite-plus/test";
import { createCollector } from "./collector";
import { createNotificationManager } from "./notifications";
import type { Collector } from "./types";

const DEFAULT_PHASES = { handler: 0, reactive: 0, paint: 0, composite: 0 };

describe("createNotificationManager", () => {
  let collector: Collector;

  beforeEach(() => {
    collector = createCollector();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("classifies interaction 200-500ms as warning", () => {
    const mgr = createNotificationManager(collector);

    collector.emit({
      type: "interaction",
      eventType: "click",
      target: document.createElement("button"),
      component: "Btn.svelte",
      duration: 300,
      phases: DEFAULT_PHASES,
      classification: "needs-improvement",
      timestamp: Date.now(),
    });

    const notifs = mgr.getNotifications();
    expect(notifs).toHaveLength(1);
    expect(notifs[0].severity).toBe("warning");
    expect(notifs[0].category).toBe("interaction");

    mgr.destroy();
  });

  it("classifies interaction >500ms as critical", () => {
    const mgr = createNotificationManager(collector);

    collector.emit({
      type: "interaction",
      eventType: "click",
      target: document.createElement("button"),
      component: "Btn.svelte",
      duration: 600,
      phases: DEFAULT_PHASES,
      classification: "poor",
      timestamp: Date.now(),
    });

    const notifs = mgr.getNotifications();
    expect(notifs).toHaveLength(1);
    expect(notifs[0].severity).toBe("critical");

    mgr.destroy();
  });

  it("classifies effect >=10/sec as warning", () => {
    const mgr = createNotificationManager(collector);

    collector.emit({
      type: "effect",
      id: "eff-1",
      component: "Counter.svelte",
      count: 15,
      timestamp: Date.now(),
    });

    const notifs = mgr.getNotifications();
    expect(notifs).toHaveLength(1);
    expect(notifs[0].severity).toBe("warning");
    expect(notifs[0].category).toBe("effect");

    mgr.destroy();
  });

  it("classifies effect >=50/sec as critical", () => {
    const mgr = createNotificationManager(collector);

    collector.emit({
      type: "effect",
      id: "eff-1",
      component: "Counter.svelte",
      count: 55,
      timestamp: Date.now(),
    });

    const notifs = mgr.getNotifications();
    expect(notifs).toHaveLength(1);
    expect(notifs[0].severity).toBe("critical");

    mgr.destroy();
  });

  it("ignores effects below threshold", () => {
    const mgr = createNotificationManager(collector);

    collector.emit({
      type: "effect",
      id: "eff-1",
      component: "Counter.svelte",
      count: 5,
      timestamp: Date.now(),
    });

    expect(mgr.getNotifications()).toHaveLength(0);

    mgr.destroy();
  });

  it("classifies any leak as warning", () => {
    const mgr = createNotificationManager(collector);

    collector.emit({
      type: "leak",
      component: "Timer.svelte",
      leakType: "interval",
      details: "setInterval not cleared",
    });

    const notifs = mgr.getNotifications();
    expect(notifs).toHaveLength(1);
    expect(notifs[0].severity).toBe("warning");
    expect(notifs[0].category).toBe("leak");

    mgr.destroy();
  });

  it("classifies console.error as warning", () => {
    const mgr = createNotificationManager(collector);

    collector.emit({
      type: "console",
      level: "error",
      message: "Something broke",
      source: "app.svelte",
      timestamp: Date.now(),
    });

    const notifs = mgr.getNotifications();
    expect(notifs).toHaveLength(1);
    expect(notifs[0].severity).toBe("warning");
    expect(notifs[0].category).toBe("console");

    mgr.destroy();
  });

  it("ignores console.warn (only errors create notifications)", () => {
    const mgr = createNotificationManager(collector);

    collector.emit({
      type: "console",
      level: "warn",
      message: "Warning message",
      source: "app.svelte",
      timestamp: Date.now(),
    });

    expect(mgr.getNotifications()).toHaveLength(0);

    mgr.destroy();
  });

  it("detects DOM hot spots with >30 mutations/sec", () => {
    const mgr = createNotificationManager(collector);
    const el = document.createElement("div");

    // Emit 31 DOM events for the same element within the same second
    for (let i = 0; i <= 30; i++) {
      collector.emit({
        type: "dom",
        target: el,
        rect: new DOMRect(0, 0, 100, 50),
        timestamp: Date.now(),
      });
    }

    const notifs = mgr.getNotifications();
    expect(notifs).toHaveLength(1);
    expect(notifs[0].severity).toBe("info");
    expect(notifs[0].category).toBe("dom");

    mgr.destroy();
  });

  it("expires notifications after 5 minutes", () => {
    const mgr = createNotificationManager(collector);

    collector.emit({
      type: "leak",
      component: "Timer.svelte",
      leakType: "interval",
      details: "setInterval not cleared",
    });

    expect(mgr.getNotifications()).toHaveLength(1);

    // Advance 5 minutes + 1ms
    vi.advanceTimersByTime(5 * 60 * 1000 + 1);

    expect(mgr.getNotifications()).toHaveLength(0);

    mgr.destroy();
  });

  it("caps at 100 notifications (ring buffer)", () => {
    const mgr = createNotificationManager(collector);

    for (let i = 0; i < 110; i++) {
      collector.emit({
        type: "leak",
        component: `Comp${i}.svelte`,
        leakType: "interval",
        details: `leak ${i}`,
      });
    }

    const notifs = mgr.getNotifications();
    expect(notifs).toHaveLength(100);
    // Oldest should have been dropped
    expect(notifs[0].detail).toBe("interval: leak 10");

    mgr.destroy();
  });

  it("markAllSeen marks all notifications as seen", () => {
    const mgr = createNotificationManager(collector);

    collector.emit({
      type: "leak",
      component: "A.svelte",
      leakType: "interval",
      details: "leak 1",
    });
    collector.emit({
      type: "leak",
      component: "B.svelte",
      leakType: "timeout",
      details: "leak 2",
    });

    expect(mgr.getUnseen()).toHaveLength(2);

    mgr.markAllSeen();

    expect(mgr.getUnseen()).toHaveLength(0);
    expect(mgr.getNotifications()).toHaveLength(2);

    mgr.destroy();
  });

  it("clear removes all notifications", () => {
    const mgr = createNotificationManager(collector);

    collector.emit({
      type: "leak",
      component: "A.svelte",
      leakType: "interval",
      details: "leak",
    });

    expect(mgr.getNotifications()).toHaveLength(1);

    mgr.clear();

    expect(mgr.getNotifications()).toHaveLength(0);

    mgr.destroy();
  });

  it("destroy stops collecting new notifications", () => {
    const mgr = createNotificationManager(collector);
    mgr.destroy();

    collector.emit({
      type: "leak",
      component: "A.svelte",
      leakType: "interval",
      details: "leak",
    });

    expect(mgr.getNotifications()).toHaveLength(0);
  });

  it("classifies server error as critical", () => {
    const mgr = createNotificationManager(collector);

    collector.emit({
      type: "server",
      level: "error",
      message: "[handleError] ReferenceError: SvelteSet is not defined",
      timestamp: Date.now(),
      stack: "at /src/routes/(app)/calls/+page.svelte:53:18",
    });

    const notifs = mgr.getNotifications();
    expect(notifs).toHaveLength(1);
    expect(notifs[0].severity).toBe("critical");
    expect(notifs[0].category).toBe("server");

    mgr.destroy();
  });

  it("classifies server warning as warning", () => {
    const mgr = createNotificationManager(collector);

    collector.emit({
      type: "server",
      level: "warn",
      message: "Deprecation warning: something old",
      timestamp: Date.now(),
    });

    const notifs = mgr.getNotifications();
    expect(notifs).toHaveLength(1);
    expect(notifs[0].severity).toBe("warning");
    expect(notifs[0].category).toBe("server");

    mgr.destroy();
  });

  it("ignores server info logs (no notification)", () => {
    const mgr = createNotificationManager(collector);

    collector.emit({
      type: "server",
      level: "info",
      message: "Server started on port 3000",
      timestamp: Date.now(),
    });

    expect(mgr.getNotifications()).toHaveLength(0);

    mgr.destroy();
  });

  it("getUnseen only returns unseen notifications", () => {
    const mgr = createNotificationManager(collector);

    collector.emit({
      type: "leak",
      component: "A.svelte",
      leakType: "interval",
      details: "leak 1",
    });

    mgr.markAllSeen();

    collector.emit({
      type: "leak",
      component: "B.svelte",
      leakType: "timeout",
      details: "leak 2",
    });

    const unseen = mgr.getUnseen();
    expect(unseen).toHaveLength(1);
    expect(unseen[0].title).toContain("B.svelte");

    mgr.destroy();
  });
});
