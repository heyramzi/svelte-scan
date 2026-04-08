// === Events emitted by observers ===

export type DomEvent = {
  type: "dom";
  target: Element;
  rect: DOMRect;
  timestamp: number;
};

export type EffectEvent = {
  type: "effect";
  id: string;
  component: string;
  count: number;
  timestamp: number;
};

export type LeakEvent = {
  type: "leak";
  component: string;
  leakType: "listener" | "interval" | "timeout" | "raf";
  details: string;
};

export type ReactivityEvent = {
  type: "reactivity";
  signals: number;
  deriveds: number;
  effects: number;
  maxDepth: number;
};

export type ConsoleEvent = {
  type: "console";
  level: "error" | "warn";
  message: string;
  source: string;
  timestamp: number;
};

export type ServerLogEvent = {
  type: "server";
  level: "info" | "warn" | "error";
  message: string;
  timestamp: number;
  stack?: string;
};

export type InteractionPhases = {
  handler: number;
  reactive: number;
  paint: number;
  composite: number;
};

export type InteractionEvent = {
  type: "interaction";
  eventType: "click" | "keydown" | "input";
  target: Element;
  component: string;
  duration: number;
  phases: InteractionPhases;
  classification: "good" | "needs-improvement" | "poor";
  timestamp: number;
};

export type ScanEvent =
  | DomEvent
  | EffectEvent
  | LeakEvent
  | ReactivityEvent
  | ConsoleEvent
  | ServerLogEvent
  | InteractionEvent;

// === Aggregated stats for the toolbar ===

export type HotSpot = {
  element: Element;
  component: string;
  mutations: number;
};

export type EffectOffender = {
  id: string;
  component: string;
  count: number;
  severity: "warning" | "critical";
};

export type LeakRecord = {
  component: string;
  leakType: LeakEvent["leakType"];
  details: string;
  timestamp: number;
};

export type ConsoleRecord = {
  level: ConsoleEvent["level"];
  message: string;
  source: string;
  timestamp: number;
};

export type ServerLogRecord = {
  level: ServerLogEvent["level"];
  message: string;
  timestamp: number;
  stack?: string;
};

export type InteractionRecord = {
  eventType: InteractionEvent["eventType"];
  component: string;
  duration: number;
  phases: InteractionPhases;
  classification: InteractionEvent["classification"];
  timestamp: number;
};

export type AggregatedStats = {
  mutationsPerSec: number;
  hotSpots: HotSpot[];
  effectOffenders: EffectOffender[];
  leaks: LeakRecord[];
  consoleErrors: ConsoleRecord[];
  serverLogs: ServerLogRecord[];
  interactions: InteractionRecord[];
  reactivity: {
    signals: number;
    deriveds: number;
    effects: number;
    maxDepth: number;
  };
};

// === Configuration ===

export type SvibeConfig = {
  observers: {
    dom: boolean;
    effects: boolean;
    leaks: boolean;
    reactivity: boolean;
    console: boolean;
    server: boolean;
    interactions: boolean;
  };
  toolbar: boolean;
  overlay: boolean;
  position: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  workspaceRoot?: string;
  server?: {
    bufferSize?: number;
  };
};

export const DEFAULT_CONFIG: SvibeConfig = {
  observers: {
    dom: true,
    effects: true,
    leaks: true,
    reactivity: true,
    console: true,
    server: true,
    interactions: true,
  },
  toolbar: true,
  overlay: true,
  position: "bottom-left",
};

// === Observer interface ===

export type Observer = {
  start(): void;
  stop(): void;
  destroy(): void;
};

// === Collector interface ===

export type Collector = {
  emit(event: ScanEvent): void;
  subscribe<T extends ScanEvent["type"]>(
    type: T,
    callback: (event: Extract<ScanEvent, { type: T }>) => void,
  ): () => void;
  getStats(): AggregatedStats;
  reset(): void;
  resetServerLogs(): void;
  destroy(): void;
};

// === Server log payload (shared between Vite plugin and server observer) ===

export type ServerLogPayload = {
  level: ServerLogEvent["level"];
  message: string;
  timestamp: number;
  stack?: string;
};

// === Serializable health report (no Element refs, used by Vite plugin + CLI) ===

export type SerializableHealthReport = {
  mutationsPerSec: number;
  hotSpots: { component: string; mutations: number }[];
  effectOffenders: {
    id: string;
    component: string;
    count: number;
    severity: EffectOffender["severity"];
  }[];
  leaks: LeakRecord[];
  consoleErrors: ConsoleRecord[];
  serverLogs: ServerLogRecord[];
  interactions: {
    eventType: InteractionEvent["eventType"];
    component: string;
    duration: number;
    classification: InteractionEvent["classification"];
    timestamp: number;
  }[];
  reactivity: {
    signals: number;
    deriveds: number;
    effects: number;
    maxDepth: number;
  };
  timestamp: number;
};

// === Constants ===

export const IGNORE_ATTR = "data-svibe-ignore";
export const EFFECT_WARN_THRESHOLD = 10;
export const EFFECT_CRITICAL_THRESHOLD = 50;
export const NOTIFICATION_EXPIRY_MS = 5 * 60 * 1000;
export const NOTIFICATION_MAX = 100;
export const DOM_HOTSPOT_THRESHOLD = 30;
export const MAX_CANVAS_RECTS = 500;
export const FLASH_DURATION_MS = 300;
export const STATS_POLL_INTERVAL_MS = 1000;
export const SERVER_LOG_BUFFER_SIZE = 50;
