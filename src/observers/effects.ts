/* oxlint-disable stop-slop/no-raw-try-catch -- standalone package, no @heyramzi/utils dependency */
import {
  EFFECT_WARN_THRESHOLD,
  STATS_POLL_INTERVAL_MS,
  type Collector,
  type Observer,
} from "../core/types";
import { isSupportedSvelteVersion } from "../core/compat";

type SvelteInternals = {
  // oxlint-ignore-next-line no-snake-case-props -- Svelte internal API uses snake_case
  user_effect: (fn: () => void | (() => void)) => void;
};

type EffectEntry = {
  id: string;
  component: string;
  count: number;
  lastReset: number;
};

function componentFromStack(stack: string): string {
  const lines = stack.split("\n");
  for (const line of lines) {
    const match = line.match(/\/([^/]+\.svelte)/);
    if (match) return match[1];
  }
  return "unknown";
}

function effectIdFromStack(stack: string): string {
  const lines = stack.split("\n");
  for (const line of lines) {
    const match = line.match(/([^/]+\.svelte:\d+:\d+)/);
    if (match) return match[1];
  }
  for (let i = 3; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line && !line.includes("effects.ts") && !line.includes("node_modules")) {
      return `anon:${line}`;
    }
  }
  return `anon:${lines.slice(3, 5).join("|")}`;
}

export function createEffectTracker(collector: Collector, internals: SvelteInternals): Observer {
  if (!isSupportedSvelteVersion()) {
    console.warn("[svibe] Unsupported Svelte version, effect tracking disabled");
    return { start() {}, stop() {}, destroy() {} };
  }

  let original: SvelteInternals["user_effect"] | null = null;
  let pollInterval: ReturnType<typeof setInterval> | null = null;
  const effects = new Map<string, EffectEntry>();

  function start(): void {
    if (original) return;

    original = internals.user_effect;

    // oxlint-ignore-next-line no-raw-try-catch -- intentional safety wrapper for monkey-patching Svelte internals
    try {
      internals.user_effect = function patchedUserEffect(fn) {
        const stack = new Error().stack ?? "";
        const id = effectIdFromStack(stack);
        const component = componentFromStack(stack);

        const existing = effects.get(id);
        if (existing) {
          existing.count++;
        } else {
          effects.set(id, { id, component, count: 1, lastReset: Date.now() });
        }

        return original!.call(this, fn);
      };

      pollInterval = setInterval(() => {
        const now = Date.now();
        for (const [, entry] of effects) {
          const elapsed = (now - entry.lastReset) / 1000;
          const rate = elapsed > 0 ? entry.count / elapsed : entry.count;
          if (rate >= EFFECT_WARN_THRESHOLD) {
            collector.emit({
              type: "effect",
              id: entry.id,
              component: entry.component,
              count: entry.count,
              timestamp: now,
            });
          }
          entry.count = 0;
          entry.lastReset = now;
        }
      }, STATS_POLL_INTERVAL_MS);
    } catch {
      console.warn("[svibe] Failed to patch user_effect, effect tracking disabled");
      original = null;
    }
  }

  function stop(): void {
    if (original) {
      internals.user_effect = original;
      original = null;
    }
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  }

  function destroy(): void {
    stop();
    effects.clear();
  }

  return { start, stop, destroy };
}
