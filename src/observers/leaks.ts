/* oxlint-disable unbound-method, no-unsafe-type-assertion -- intentional prototype patching for leak detection */
import type { Collector, Observer } from "../core/types";

type Handle = {
  type: "listener" | "interval" | "timeout";
  id: number | string;
  details: string;
};

export type LeakDetector = Observer & {
  enterComponent(name: string): void;
  exitComponent(): void;
  checkLeaks(component: string): void;
};

function listenerKey(
  target: EventTarget,
  type: string,
  fn: EventListener | EventListenerObject,
): string {
  const tag = target instanceof Element ? target.tagName : "obj";
  const fnStr = typeof fn === "function" ? fn.toString().slice(0, 50) : String(fn);
  return `${tag}-${type}-${fnStr}`;
}

// eslint-disable-next-line max-lines-per-function -- complex observer setup
export function createLeakDetector(collector: Collector): LeakDetector {
  let started = false;
  let currentComponent: string | null = null;
  const componentHandles = new Map<string, Set<Handle>>();

  let origSetInterval: typeof globalThis.setInterval;
  let origClearInterval: typeof globalThis.clearInterval;
  let origSetTimeout: typeof globalThis.setTimeout;
  let origClearTimeout: typeof globalThis.clearTimeout;
  let origAddEventListener: typeof EventTarget.prototype.addEventListener;
  let origRemoveEventListener: typeof EventTarget.prototype.removeEventListener;

  const activeIntervals = new Set<number>();
  const activeTimeouts = new Set<number>();
  const activeListeners = new Map<string, Handle>();

  function addHandle(handle: Handle): void {
    if (!currentComponent) return;
    const handles = componentHandles.get(currentComponent) ?? new Set();
    handles.add(handle);
    componentHandles.set(currentComponent, handles);
  }

  function removeHandle(type: Handle["type"], id: number | string): void {
    for (const [, handles] of componentHandles) {
      for (const h of handles) {
        if (h.type === type && h.id === id) {
          handles.delete(h);
          return;
        }
      }
    }
  }

  function start(): void {
    started = true;
    origSetInterval = globalThis.setInterval;
    origClearInterval = globalThis.clearInterval;

    globalThis.setInterval = function patchedSetInterval(
      this: typeof globalThis,
      ...args: Parameters<typeof setInterval>
    ) {
      const id = origSetInterval.apply(this, args);
      const numId = Number(id);
      activeIntervals.add(numId);
      addHandle({ type: "interval", id: numId, details: `setInterval(${args[1]}ms)` });
      return id;
    } as typeof setInterval;

    globalThis.clearInterval = function patchedClearInterval(
      id?: Parameters<typeof clearInterval>[0],
    ) {
      if (id !== undefined) {
        const numId = Number(id);
        activeIntervals.delete(numId);
        removeHandle("interval", numId);
      }
      return origClearInterval.call(globalThis, id);
    } as typeof clearInterval;

    origSetTimeout = globalThis.setTimeout;
    origClearTimeout = globalThis.clearTimeout;

    globalThis.setTimeout = function patchedSetTimeout(
      this: typeof globalThis,
      ...args: Parameters<typeof setTimeout>
    ) {
      const id = origSetTimeout.apply(this, args);
      const numId = Number(id);
      activeTimeouts.add(numId);
      addHandle({ type: "timeout", id: numId, details: `setTimeout(${args[1]}ms)` });
      return id;
    } as typeof setTimeout;

    globalThis.clearTimeout = function patchedClearTimeout(
      id?: Parameters<typeof clearTimeout>[0],
    ) {
      if (id !== undefined) {
        const numId = Number(id);
        activeTimeouts.delete(numId);
        removeHandle("timeout", numId);
      }
      return origClearTimeout.call(globalThis, id);
    } as typeof clearTimeout;

    origAddEventListener = EventTarget.prototype.addEventListener;
    origRemoveEventListener = EventTarget.prototype.removeEventListener;

    EventTarget.prototype.addEventListener = function patchedAddEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject | null,
      options?: boolean | AddEventListenerOptions,
    ) {
      if (listener) {
        const key = listenerKey(this, type, listener as EventListener);
        const handle: Handle = {
          type: "listener",
          id: key,
          details: `${type} on ${this instanceof Element ? this.tagName : "EventTarget"}`,
        };
        activeListeners.set(key, handle);
        addHandle(handle);
      }
      return origAddEventListener.call(this, type, listener, options);
    };

    EventTarget.prototype.removeEventListener = function patchedRemoveEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject | null,
      options?: boolean | EventListenerOptions,
    ) {
      if (listener) {
        const key = listenerKey(this, type, listener as EventListener);
        activeListeners.delete(key);
        removeHandle("listener", key);
      }
      return origRemoveEventListener.call(this, type, listener, options);
    };
  }

  function stop(): void {
    if (!started) return;
    started = false;
    globalThis.setInterval = origSetInterval;
    globalThis.clearInterval = origClearInterval;
    globalThis.setTimeout = origSetTimeout;
    globalThis.clearTimeout = origClearTimeout;
    EventTarget.prototype.addEventListener = origAddEventListener;
    EventTarget.prototype.removeEventListener = origRemoveEventListener;
  }

  function destroy(): void {
    stop();
    componentHandles.clear();
    activeIntervals.clear();
    activeTimeouts.clear();
    activeListeners.clear();
  }

  function enterComponent(name: string): void {
    currentComponent = name;
  }

  function exitComponent(): void {
    currentComponent = null;
  }

  function checkLeaks(component: string): void {
    const handles = componentHandles.get(component);
    if (!handles) return;

    for (const handle of handles) {
      let stillActive = false;
      switch (handle.type) {
        case "interval":
          stillActive = activeIntervals.has(handle.id as number);
          break;
        case "timeout":
          stillActive = activeTimeouts.has(handle.id as number);
          break;
        case "listener":
          stillActive = activeListeners.has(handle.id as string);
          break;
      }

      if (stillActive) {
        collector.emit({
          type: "leak",
          component,
          leakType: handle.type,
          details: handle.details,
        });
      }
    }
  }

  return { start, stop, destroy, enterComponent, exitComponent, checkLeaks };
}
