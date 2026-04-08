import { createCollector } from "./core/collector";
import type { AggregatedStats, Collector, ScanEvent } from "./core/types";

const EVENT_TYPES: ScanEvent["type"][] = [
  "dom",
  "effect",
  "leak",
  "console",
  "interaction",
  "server",
  "reactivity",
];

const EMPTY_STATS: AggregatedStats = {
  mutationsPerSec: 0,
  hotSpots: [],
  effectOffenders: [],
  leaks: [],
  consoleErrors: [],
  serverLogs: [],
  interactions: [],
  reactivity: { signals: 0, deriveds: 0, effects: 0, maxDepth: 0 },
};

export type SvibeAPI = {
  on<T extends ScanEvent["type"]>(
    type: T,
    cb: (event: Extract<ScanEvent, { type: T }>) => void,
  ): () => void;
  on(type: "*", cb: (event: ScanEvent) => void): () => void;
  getReport(): AggregatedStats;
  getCollector(): Collector | null;
  start(): void;
  stop(): void;
  isRunning(): boolean;
  destroy(): void;
};

function createSvibeAPI(): SvibeAPI {
  let collector: Collector | null = null;
  let running = false;

  function ensureCollector(): Collector {
    if (!collector) {
      collector = createCollector();
    }
    return collector;
  }

  function on(type: string, cb: (event: ScanEvent) => void): () => void {
    const c = ensureCollector();

    if (type === "*") {
      const unsubs = EVENT_TYPES.map((t) => c.subscribe(t, cb));
      return () => {
        for (const u of unsubs) u();
      };
    }

    // eslint-disable-next-line no-unsafe-type-assertion -- type narrowing handled by overload signatures
    return c.subscribe(type as ScanEvent["type"], cb);
  }

  function getReport(): AggregatedStats {
    if (!collector) return { ...EMPTY_STATS };
    return collector.getStats();
  }

  function getCollector(): Collector | null {
    return collector;
  }

  function start(): void {
    if (running) return;
    ensureCollector();
    running = true;
  }

  function stop(): void {
    running = false;
  }

  function isRunning(): boolean {
    return running;
  }

  function destroy(): void {
    running = false;
    if (collector) {
      collector.destroy();
      collector = null;
    }
  }

  return { on, getReport, getCollector, start, stop, isRunning, destroy };
}

export { createSvibeAPI };

export const svibe: SvibeAPI = createSvibeAPI();
