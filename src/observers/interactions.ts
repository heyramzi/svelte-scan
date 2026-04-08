/* oxlint-disable no-unsafe-type-assertion -- event type narrowing */
import {
  type Collector,
  type InteractionEvent,
  type InteractionPhases,
  type Observer,
} from "../core/types";
import { isIgnored, isInsideToolbar, resolveComponentName } from "../core/dom-utils";

const DEBOUNCE_MS = 500;
const GOOD_THRESHOLD = 200;
const POOR_THRESHOLD = 500;
const EVENT_TYPES = ["click", "keydown", "input"] as const;

function classify(duration: number): InteractionEvent["classification"] {
  if (duration < GOOD_THRESHOLD) return "good";
  if (duration < POOR_THRESHOLD) return "needs-improvement";
  return "poor";
}

export function createInteractionObserver(collector: Collector): Observer {
  const handlers: Array<{ type: string; handler: (e: Event) => void }> = [];
  const lastEventTime = new WeakMap<Element, number>();
  let running = false;

  function handleEvent(e: Event): void {
    const target = e.target;
    if (!target || !(target instanceof Element)) return;
    if (isIgnored(target)) return;
    if (isInsideToolbar(target)) return;

    // Debounce rapid events from same target
    const now = performance.now();
    const last = lastEventTime.get(target);
    if (last !== undefined && now - last < DEBOUNCE_MS) return;
    lastEventTime.set(target, now);

    const t0 = now;
    const eventType = e.type as InteractionEvent["eventType"];

    // Phase timing: handler -> reactive -> paint -> composite
    // t0 = event capture start (already captured above)
    // After handler returns, we're at t1
    const t1 = performance.now();

    queueMicrotask(() => {
      const t2 = performance.now();
      requestAnimationFrame(() => {
        const t3 = performance.now();
        setTimeout(() => {
          const t4 = performance.now();
          const duration = t4 - t0;
          const classification = classify(duration);

          // Only emit slow interactions
          if (classification === "good") return;

          const phases: InteractionPhases = {
            handler: t1 - t0,
            reactive: t2 - t1,
            paint: t3 - t2,
            composite: t4 - t3,
          };

          collector.emit({
            type: "interaction",
            eventType,
            target,
            component: resolveComponentName(target),
            duration,
            phases,
            classification,
            timestamp: Date.now(),
          });
        }, 0);
      });
    });
  }

  function start(): void {
    if (running) return;
    running = true;

    for (const type of EVENT_TYPES) {
      const handler = (e: Event) => handleEvent(e);
      document.addEventListener(type, handler, { capture: true, passive: true });
      handlers.push({ type, handler });
    }
  }

  function stop(): void {
    if (!running) return;
    running = false;

    for (const { type, handler } of handlers) {
      document.removeEventListener(type, handler, { capture: true });
    }
    handlers.length = 0;
  }

  function destroy(): void {
    stop();
  }

  return { start, stop, destroy };
}
