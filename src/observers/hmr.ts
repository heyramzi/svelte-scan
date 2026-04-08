/**
 * HMR observer that connects to the global WebSocket patch injected by
 * the Vite plugin. The patch runs as an inline script before /@vite/client,
 * so Vite's own WebSocket listener is already wrapped by the time this
 * module loads.
 *
 * Falls back to runtime patching if the global isn't available (e.g. tests).
 */
/* oxlint-disable unbound-method, no-unsafe-type-assertion -- intentional prototype patching and MessageEvent.data typing */
import { tryCatch } from "../result";

const HMR_TYPES = new Set(["update", "full-reload", "prune", "custom"]);

export type HmrObserver = {
  pause(): void;
  resume(): void;
  paused: boolean;
  destroy(): void;
};

type GlobalHmrPatch = {
  pause(): void;
  resume(): void;
  readonly paused: boolean;
  destroy(): void;
};

declare global {
  interface Window {
    __svibe_hmr?: GlobalHmrPatch;
  }
}

function isHmrMessage(event: Event): boolean {
  if (!(event instanceof MessageEvent)) return false;
  const raw = typeof event.data === "string" ? event.data : "";
  const result = tryCatch(() => JSON.parse(raw) as { type?: string });
  if (!result.ok) return false;
  return !!result.value.type && HMR_TYPES.has(result.value.type);
}

/**
 * If the Vite plugin injected the early patch, delegate to it.
 * Otherwise fall back to runtime patching (won't catch pre-existing listeners).
 */
export function createHmrObserver(): HmrObserver {
  // Use the early-injected global patch when available
  if (typeof window !== "undefined" && window.__svibe_hmr) {
    return window.__svibe_hmr;
  }

  // Fallback: runtime patching (tests, non-Vite environments)
  let paused = false;
  const origAdd = WebSocket.prototype.addEventListener;
  const origRemove = WebSocket.prototype.removeEventListener;
  const wrapperMap = new WeakMap<EventListener, EventListener>();

  WebSocket.prototype.addEventListener = function (
    this: WebSocket,
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ) {
    if (type === "message" && typeof listener === "function") {
      const wrapped: EventListener = (event: Event) => {
        if (paused && isHmrMessage(event)) return;
        listener.call(this, event);
      };
      wrapperMap.set(listener, wrapped);
      return origAdd.call(this, type, wrapped, options);
    }
    if (!listener) return;
    return origAdd.call(this, type, listener, options);
  };

  WebSocket.prototype.removeEventListener = function (
    this: WebSocket,
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions,
  ) {
    if (type === "message" && typeof listener === "function") {
      const wrapped = wrapperMap.get(listener);
      if (wrapped) {
        wrapperMap.delete(listener);
        return origRemove.call(this, type, wrapped, options);
      }
    }
    if (!listener) return;
    return origRemove.call(this, type, listener, options);
  };

  return {
    pause() {
      paused = true;
    },
    resume() {
      paused = false;
    },
    get paused() {
      return paused;
    },
    destroy() {
      paused = false;
      WebSocket.prototype.addEventListener = origAdd;
      WebSocket.prototype.removeEventListener = origRemove;
    },
  };
}
