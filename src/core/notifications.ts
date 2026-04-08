import {
  EFFECT_WARN_THRESHOLD,
  EFFECT_CRITICAL_THRESHOLD,
  NOTIFICATION_EXPIRY_MS,
  NOTIFICATION_MAX,
  DOM_HOTSPOT_THRESHOLD,
  type Collector,
  type InteractionEvent,
  type EffectEvent,
  type LeakEvent,
  type ConsoleEvent,
  type ServerLogEvent,
  type DomEvent,
} from "./types";

export type Severity = "info" | "warning" | "critical";

export type NotificationCategory = "interaction" | "effect" | "leak" | "console" | "server" | "dom";

export type Notification = {
  id: string;
  severity: Severity;
  category: NotificationCategory;
  title: string;
  detail: string;
  timestamp: number;
  seen: boolean;
};

export type NotificationManager = {
  getNotifications(): Notification[];
  getUnseen(): Notification[];
  markAllSeen(): void;
  clear(): void;
  destroy(): void;
};

let nextId = 0;

function genId(): string {
  return `sv-notif-${++nextId}`;
}

export function createNotificationManager(collector: Collector): NotificationManager {
  const notifications: Notification[] = [];
  const unsubs: Array<() => void> = [];
  let destroyed = false;

  // Track DOM mutations per element for hotspot detection
  const domCounts = new Map<
    Element,
    { count: number; resetTimer: ReturnType<typeof setTimeout> }
  >();

  function push(n: Omit<Notification, "id" | "seen" | "timestamp">): void {
    if (destroyed) return;

    const notification: Notification = {
      ...n,
      id: genId(),
      seen: false,
      timestamp: Date.now(),
    };

    notifications.push(notification);

    // Ring buffer: drop oldest when over cap
    if (notifications.length > NOTIFICATION_MAX) {
      notifications.splice(0, notifications.length - NOTIFICATION_MAX);
    }
  }

  function expireOld(): void {
    const cutoff = Date.now() - NOTIFICATION_EXPIRY_MS;
    const firstValid = notifications.findIndex((n) => n.timestamp >= cutoff);
    if (firstValid > 0) {
      notifications.splice(0, firstValid);
    } else if (firstValid === -1 && notifications.length > 0) {
      notifications.length = 0;
    }
  }

  // Subscribe to interaction events
  unsubs.push(
    collector.subscribe("interaction", (event: InteractionEvent) => {
      const severity: Severity = event.duration > 500 ? "critical" : "warning";
      push({
        severity,
        category: "interaction",
        title: `Slow ${event.eventType} in ${event.component}`,
        detail: `${Math.round(event.duration)}ms (${event.classification})`,
      });
    }),
  );

  // Subscribe to effect events
  unsubs.push(
    collector.subscribe("effect", (event: EffectEvent) => {
      if (event.count >= EFFECT_CRITICAL_THRESHOLD) {
        push({
          severity: "critical",
          category: "effect",
          title: `Runaway effect in ${event.component}`,
          detail: `${event.count} executions/sec (${event.id})`,
        });
      } else if (event.count >= EFFECT_WARN_THRESHOLD) {
        push({
          severity: "warning",
          category: "effect",
          title: `Frequent effect in ${event.component}`,
          detail: `${event.count} executions/sec (${event.id})`,
        });
      }
    }),
  );

  // Subscribe to leak events
  unsubs.push(
    collector.subscribe("leak", (event: LeakEvent) => {
      push({
        severity: "warning",
        category: "leak",
        title: `Leak in ${event.component}`,
        detail: `${event.leakType}: ${event.details}`,
      });
    }),
  );

  // Subscribe to console events (errors only)
  unsubs.push(
    collector.subscribe("console", (event: ConsoleEvent) => {
      if (event.level === "error") {
        push({
          severity: "warning",
          category: "console",
          title: "Console error",
          detail: event.message.length > 120 ? event.message.slice(0, 120) + "..." : event.message,
        });
      }
    }),
  );

  // Subscribe to server events (errors and warnings)
  unsubs.push(
    collector.subscribe("server", (event: ServerLogEvent) => {
      if (event.level === "error") {
        push({
          severity: "critical",
          category: "server",
          title: "Server error",
          detail: event.message.length > 120 ? event.message.slice(0, 120) + "..." : event.message,
        });
      } else if (event.level === "warn") {
        push({
          severity: "warning",
          category: "server",
          title: "Server warning",
          detail: event.message.length > 120 ? event.message.slice(0, 120) + "..." : event.message,
        });
      }
    }),
  );

  // Subscribe to DOM events for hotspot detection
  unsubs.push(
    collector.subscribe("dom", (event: DomEvent) => {
      const existing = domCounts.get(event.target);
      if (existing) {
        existing.count++;
        if (existing.count > DOM_HOTSPOT_THRESHOLD) {
          push({
            severity: "info",
            category: "dom",
            title: "DOM hot spot",
            detail: `${existing.count} mutations/sec on ${event.target.tagName.toLowerCase()}`,
          });
          // Reset count after notification to avoid spamming
          existing.count = 0;
        }
      } else {
        const resetTimer = setTimeout(() => {
          domCounts.delete(event.target);
        }, 1000);
        domCounts.set(event.target, { count: 1, resetTimer });
      }
    }),
  );

  function getNotifications(): Notification[] {
    expireOld();
    return [...notifications];
  }

  function getUnseen(): Notification[] {
    expireOld();
    return notifications.filter((n) => !n.seen);
  }

  function markAllSeen(): void {
    for (const n of notifications) {
      n.seen = true;
    }
  }

  function clear(): void {
    notifications.length = 0;
  }

  function destroy(): void {
    destroyed = true;
    for (const unsub of unsubs) {
      unsub();
    }
    unsubs.length = 0;
    notifications.length = 0;
    for (const entry of domCounts.values()) {
      clearTimeout(entry.resetTimer);
    }
    domCounts.clear();
  }

  return { getNotifications, getUnseen, markAllSeen, clear, destroy };
}
