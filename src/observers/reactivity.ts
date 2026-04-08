import { STATS_POLL_INTERVAL_MS, type Collector, type Observer } from "../core/types";
import { isSupportedSvelteVersion } from "../core/compat";

type SvelteInternals = {
  state: (v: unknown, stack?: unknown) => unknown;
  derived: (fn: () => unknown) => unknown;
};

export function createReactivityObserver(
  collector: Collector,
  internals: SvelteInternals,
): Observer {
  if (!isSupportedSvelteVersion()) {
    console.warn("[svibe] Unsupported Svelte version, reactivity tracking disabled");
    return { start() {}, stop() {}, destroy() {} };
  }

  let origState: SvelteInternals["state"] | null = null;
  let origDerived: SvelteInternals["derived"] | null = null;
  let pollInterval: ReturnType<typeof setInterval> | null = null;

  let signalCount = 0;
  let derivedCount = 0;

  function start(): void {
    if (origState) return;

    origState = internals.state;
    origDerived = internals.derived;

    // oxlint-ignore-next-line no-raw-try-catch -- intentional safety wrapper for monkey-patching Svelte internals
    try {
      internals.state = function patchedState(v, stack?) {
        signalCount++;
        return origState!.call(this, v, stack);
      };

      internals.derived = function patchedDerived(fn) {
        derivedCount++;
        return origDerived!.call(this, fn);
      };

      pollInterval = setInterval(() => {
        collector.emit({
          type: "reactivity",
          signals: signalCount,
          deriveds: derivedCount,
          effects: 0,
          maxDepth: 0,
        });
      }, STATS_POLL_INTERVAL_MS);
    } catch {
      console.warn("[svibe] Failed to patch state/derived, reactivity tracking disabled");
      origState = null;
      origDerived = null;
    }
  }

  function stop(): void {
    if (origState) {
      internals.state = origState;
      origState = null;
    }
    if (origDerived) {
      internals.derived = origDerived;
      origDerived = null;
    }
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  }

  function destroy(): void {
    stop();
    signalCount = 0;
    derivedCount = 0;
  }

  return { start, stop, destroy };
}
