/* oxlint-disable eslint/max-lines-per-function -- factory function, splitting would hurt cohesion */
import {
  EFFECT_WARN_THRESHOLD,
  EFFECT_CRITICAL_THRESHOLD,
  SERVER_LOG_BUFFER_SIZE,
  type Collector,
  type ScanEvent,
  type AggregatedStats,
  type HotSpot,
  type EffectOffender,
  type LeakRecord,
  type ConsoleRecord,
  type ServerLogRecord,
  type InteractionRecord,
  type DomEvent,
  type EffectEvent,
  type ReactivityEvent,
} from "./types";
import { resolveComponentName } from "./dom-utils";

type Subscribers = {
  [K in ScanEvent["type"]]: Set<(event: Extract<ScanEvent, { type: K }>) => void>;
};

const MAX_INTERACTIONS = 50;

export function createCollector(): Collector {
  const subscribers: Subscribers = {
    dom: new Set(),
    effect: new Set(),
    leak: new Set(),
    reactivity: new Set(),
    console: new Set(),
    server: new Set(),
    interaction: new Set(),
  };

  const domEvents: DomEvent[] = [];
  const effectMap = new Map<string, EffectEvent>();
  const leaks: LeakRecord[] = [];
  const consoleErrors: ConsoleRecord[] = [];
  const serverLogs: ServerLogRecord[] = [];
  const interactions: InteractionRecord[] = [];
  let lastReactivity: ReactivityEvent = {
    type: "reactivity",
    signals: 0,
    deriveds: 0,
    effects: 0,
    maxDepth: 0,
  };
  let destroyed = false;
  let cachedStats: AggregatedStats | null = null;
  let cacheTime = 0;
  const CACHE_TTL_MS = 250;

  function invalidateCache(): void {
    cachedStats = null;
  }

  function emit(event: ScanEvent): void {
    if (destroyed) return;

    // eslint-disable-next-line no-unsafe-type-assertion -- subscriber map is keyed by event type
    const subs = subscribers[event.type] as Set<(event: ScanEvent) => void>;
    for (const cb of subs) {
      cb(event);
    }

    switch (event.type) {
      case "dom":
        domEvents.push(event);
        {
          const cutoff = Date.now() - 1000;
          const firstValid = domEvents.findIndex((e) => e.timestamp >= cutoff);
          if (firstValid > 0) {
            domEvents.splice(0, firstValid);
          } else if (firstValid === -1) {
            domEvents.length = 0;
          }
        }
        break;
      case "effect":
        effectMap.set(event.id, event);
        break;
      case "leak":
        leaks.push({
          component: event.component,
          leakType: event.leakType,
          details: event.details,
          timestamp: Date.now(),
        });
        break;
      case "reactivity":
        lastReactivity = event;
        break;
      case "console":
        consoleErrors.push({
          level: event.level,
          message: event.message,
          source: event.source,
          timestamp: event.timestamp,
        });
        break;
      case "server":
        serverLogs.push({
          level: event.level,
          message: event.message,
          timestamp: event.timestamp,
          stack: event.stack,
        });
        // Ring buffer: drop oldest when over limit
        if (serverLogs.length > SERVER_LOG_BUFFER_SIZE) {
          serverLogs.splice(0, serverLogs.length - SERVER_LOG_BUFFER_SIZE);
        }
        break;
      case "interaction":
        interactions.push({
          eventType: event.eventType,
          component: event.component,
          duration: event.duration,
          phases: event.phases,
          classification: event.classification,
          timestamp: event.timestamp,
        });
        // Keep last 50 interactions
        if (interactions.length > MAX_INTERACTIONS) {
          interactions.splice(0, interactions.length - MAX_INTERACTIONS);
        }
        break;
    }

    invalidateCache();
  }

  function subscribe<T extends ScanEvent["type"]>(
    type: T,
    callback: (event: Extract<ScanEvent, { type: T }>) => void,
  ): () => void {
    // eslint-disable-next-line no-unsafe-type-assertion -- subscriber map is keyed by event type
    const subs = subscribers[type] as Set<typeof callback>;
    subs.add(callback);
    return () => subs.delete(callback);
  }

  function getStats(): AggregatedStats {
    const now = Date.now();
    if (cachedStats && now - cacheTime < CACHE_TTL_MS) return cachedStats;

    const recentDom = domEvents.filter((e) => now - e.timestamp < 1000);
    const hotSpots = buildHotSpots(recentDom);
    const effectOffenders = buildEffectOffenders(effectMap);

    const stats: AggregatedStats = {
      mutationsPerSec: recentDom.length,
      hotSpots,
      effectOffenders,
      leaks: [...leaks],
      consoleErrors: [...consoleErrors],
      serverLogs: [...serverLogs],
      interactions: [...interactions],
      reactivity: {
        signals: lastReactivity.signals,
        deriveds: lastReactivity.deriveds,
        effects: lastReactivity.effects,
        maxDepth: lastReactivity.maxDepth,
      },
    };

    cachedStats = stats;
    cacheTime = now;
    return stats;
  }

  function reset(): void {
    invalidateCache();
    domEvents.length = 0;
    effectMap.clear();
    leaks.length = 0;
    consoleErrors.length = 0;
    serverLogs.length = 0;
    interactions.length = 0;
    lastReactivity = { type: "reactivity", signals: 0, deriveds: 0, effects: 0, maxDepth: 0 };
  }

  function resetServerLogs(): void {
    invalidateCache();
    serverLogs.length = 0;
  }

  function destroy(): void {
    destroyed = true;
    for (const subs of Object.values(subscribers)) {
      subs.clear();
    }
    reset();
  }

  return { emit, subscribe, getStats, reset, resetServerLogs, destroy };
}

function buildHotSpots(recentDom: DomEvent[]): HotSpot[] {
  const elementCounts = new Map<Element, { component: string; count: number }>();
  for (const e of recentDom) {
    const existing = elementCounts.get(e.target);
    if (existing) {
      existing.count++;
    } else {
      elementCounts.set(e.target, { component: resolveComponentName(e.target), count: 1 });
    }
  }
  const spots: HotSpot[] = [...elementCounts.entries()].map(([element, { component, count }]) => ({
    element,
    component,
    mutations: count,
  }));
  spots.sort((a, b) => b.mutations - a.mutations);
  return spots.slice(0, 5);
}

function buildEffectOffenders(effectMap: Map<string, EffectEvent>): EffectOffender[] {
  const offenders: EffectOffender[] = [...effectMap.values()]
    .filter((e) => e.count >= EFFECT_WARN_THRESHOLD)
    .map((e) => ({
      id: e.id,
      component: e.component,
      count: e.count,
      severity: e.count >= EFFECT_CRITICAL_THRESHOLD ? "critical" : "warning",
    }));
  offenders.sort((a, b) => b.count - a.count);
  return offenders;
}
