import type { Collector, Observer } from "../core/types";
import { argsToString } from "../core/format";

function extractSource(stack: string | undefined): string {
  if (!stack) return "unknown";
  const lines = stack.split("\n");
  for (const line of lines) {
    if (line.includes("createConsoleObserver") || line.startsWith("Error")) continue;
    const match = line.match(/(?:at\s+)?(?:\S+\s+)?(?:\()?([^)]+\.(?:svelte|ts|js)[^)]*)\)?/);
    if (match) return match[1].trim();
  }
  return lines[1]?.trim() ?? "unknown";
}

export function createConsoleObserver(collector: Collector): Observer {
  let originalError: typeof console.error | null = null;
  let originalWarn: typeof console.warn | null = null;
  let originalFetch: typeof window.fetch | null = null;

  function start(): void {
    if (originalError) return;

    originalError = console.error;
    originalWarn = console.warn;
    originalFetch = window.fetch;

    console.error = (...args: unknown[]) => {
      originalError!.apply(console, args);
      const message = argsToString(args);
      const source = extractSource(new Error().stack);
      collector.emit({
        type: "console",
        level: "error",
        message,
        source,
        timestamp: Date.now(),
      });
    };

    console.warn = (...args: unknown[]) => {
      originalWarn!.apply(console, args);
      const message = argsToString(args);
      // Only capture Svelte-related warnings (hydration, reactivity, a11y, xyflow)
      const isSvelteWarning =
        message.includes("[svelte]") ||
        message.includes("svelte.dev/e/") ||
        message.includes("[React Flow]") ||
        message.includes("$state");
      if (!isSvelteWarning) return;
      const source = extractSource(new Error().stack);
      collector.emit({
        type: "console",
        level: "warn",
        message,
        source,
        timestamp: Date.now(),
      });
    };

    // Capture failed network requests (4xx/5xx) — these are logged by the browser
    // natively and bypass console.error, so fetch must be patched directly.
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const res = await originalFetch!(...args);
      if (!res.ok) {
        const url =
          typeof args[0] === "string"
            ? args[0]
            : args[0] instanceof URL
              ? args[0].href
              : args[0].url;
        collector.emit({
          type: "console",
          level: "error",
          message: `Failed to load resource: the server responded with a status of ${res.status} (${res.statusText})`,
          source: url,
          timestamp: Date.now(),
        });
      }
      return res;
    };

    // Also capture unhandled errors
    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);
  }

  function handleError(e: ErrorEvent): void {
    collector.emit({
      type: "console",
      level: "error",
      message: e.message,
      source: e.filename ? `${e.filename}:${e.lineno}:${e.colno}` : "unknown",
      timestamp: Date.now(),
    });
  }

  function handleRejection(e: PromiseRejectionEvent): void {
    const reason = e.reason;
    const message = reason instanceof Error ? `${reason.name}: ${reason.message}` : String(reason);
    const source = reason instanceof Error ? extractSource(reason.stack) : "unhandled promise";
    collector.emit({
      type: "console",
      level: "error",
      message,
      source,
      timestamp: Date.now(),
    });
  }

  function stop(): void {
    if (originalError) console.error = originalError;
    if (originalWarn) console.warn = originalWarn;
    if (originalFetch) window.fetch = originalFetch;
    originalError = null;
    originalWarn = null;
    originalFetch = null;
    window.removeEventListener("error", handleError);
    window.removeEventListener("unhandledrejection", handleRejection);
  }

  function destroy(): void {
    stop();
  }

  return { start, stop, destroy };
}
