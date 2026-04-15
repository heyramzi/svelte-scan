import { type Collector, type Observer, type ServerLogPayload } from "../core/types";

type HotModule = {
  on(event: string, handler: (payload: ServerLogPayload | ServerLogPayload[]) => void): void;
  off(event: string, handler: (payload: ServerLogPayload | ServerLogPayload[]) => void): void;
  send(event: string, payload: Record<string, never>): void;
};

function dedupKey(p: ServerLogPayload): string {
  return `${p.timestamp}:${p.level}:${p.message}`;
}

export function createServerObserver(collector: Collector): Observer {
  let cleanup: (() => void) | null = null;
  // Track seen timestamps to deduplicate replayed logs against live ones
  const seen = new Set<string>();

  function emitIfNew(payload: ServerLogPayload): void {
    const key = dedupKey(payload);
    if (seen.has(key)) return;
    seen.add(key);
    collector.emit({
      type: "server",
      level: payload.level,
      message: payload.message,
      timestamp: payload.timestamp,
      stack: payload.stack,
    });
  }

  function start(): void {
    if (cleanup) return;

    const hot = (import.meta as ImportMeta & { hot?: HotModule }).hot;
    if (!hot) return;

    const handler = (payload: ServerLogPayload) => {
      emitIfNew(payload);
    };

    const replayHandler = (logs: ServerLogPayload[]) => {
      for (const entry of logs) emitIfNew(entry);
    };

    hot.on("svelte-scan:server-log", handler);
    hot.on("svelte-scan:replay-logs", replayHandler);

    // Request buffered logs from the server (catches SSR errors that fired before we connected)
    hot.send("svelte-scan:request-replay", {});

    cleanup = () => {
      hot.off("svelte-scan:server-log", handler);
      hot.off("svelte-scan:replay-logs", replayHandler);
    };
  }

  function stop(): void {
    cleanup?.();
    cleanup = null;
  }

  function destroy(): void {
    stop();
    seen.clear();
  }

  return { start, stop, destroy };
}
