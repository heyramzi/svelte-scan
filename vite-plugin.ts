import type { Plugin } from "vite";
import type { ServerLogPayload, SerializableHealthReport } from "./src/core/types";
import { argsToString } from "./src/core/format";

// Cached report from browser, shared across plugin instances
let cachedReport: SerializableHealthReport | null = null;

// Ring buffer for server logs so SSR errors survive until the browser connects
const SERVER_REPLAY_BUFFER_SIZE = 50;
const replayBuffer: ServerLogPayload[] = [];

/**
 * Inline script injected before /@vite/client to patch WebSocket.prototype.
 * Because this is a classic (non-module) script, it executes synchronously
 * before Vite's module-type client script registers its message listener.
 * This lets Svibe's pause/resume actually block HMR updates.
 */
const HMR_PATCH_SCRIPT = `
<script data-svibe-hmr>
(function(){
  var HMR_TYPES = ["update","full-reload","prune","custom"];
  var paused = false;
  var origAdd = WebSocket.prototype.addEventListener;
  var origRemove = WebSocket.prototype.removeEventListener;
  var wrapperMap = new WeakMap();

  WebSocket.prototype.addEventListener = function(type, listener, options) {
    if (type === "message" && typeof listener === "function") {
      var ws = this;
      var wrapped = function(event) {
        if (paused) {
          try {
            var data = JSON.parse(event.data);
            if (data && data.type && HMR_TYPES.indexOf(data.type) !== -1) return;
          } catch(e) {}
        }
        listener.call(ws, event);
      };
      wrapperMap.set(listener, wrapped);
      return origAdd.call(this, type, wrapped, options);
    }
    return origAdd.call(this, type, listener, options);
  };

  WebSocket.prototype.removeEventListener = function(type, listener, options) {
    if (type === "message" && typeof listener === "function") {
      var wrapped = wrapperMap.get(listener);
      if (wrapped) {
        wrapperMap.delete(listener);
        return origRemove.call(this, type, wrapped, options);
      }
    }
    return origRemove.call(this, type, listener, options);
  };

  window.__svibe_hmr = {
    pause: function() { paused = true; },
    resume: function() { paused = false; },
    get paused() { return paused; },
    destroy: function() {
      paused = false;
      WebSocket.prototype.addEventListener = origAdd;
      WebSocket.prototype.removeEventListener = origRemove;
    }
  };
})();
</script>`;

function svibeStub(): Plugin {
  const EMPTY_MODULE = "export const Svibe = null; export default {};";
  return {
    name: "svibe-stub",
    enforce: "pre",
    apply: "build",
    resolveId(source) {
      if (source.includes("svibe") && !source.includes("vite-plugin")) return "\0svibe:stub";
    },
    load(id) {
      if (id === "\0svibe:stub") return EMPTY_MODULE;
    },
  };
}

export function svibeServerLogs(): Plugin[] {
  const serverPlugin: Plugin = {
  let originalInfo: typeof console.info | null = null;
  let originalWarn: typeof console.warn | null = null;
  let originalError: typeof console.error | null = null;
  let ws: { send: (event: string, payload: unknown) => void } | null = null;

  function sendAndBuffer(payload: ServerLogPayload): void {
    if (replayBuffer.length >= SERVER_REPLAY_BUFFER_SIZE) replayBuffer.shift();
    replayBuffer.push(payload);
    ws?.send("svibe:server-log", payload);
  }

  return {
    name: "svibe-server-logs",
    apply: "serve",

    transformIndexHtml: {
      order: "pre",
      handler(html) {
        // Inject before any other scripts so the patch is in place
        // when /@vite/client registers its WebSocket listener
        return html.replace("<head>", "<head>" + HMR_PATCH_SCRIPT);
      },
    },

    configureServer(server) {
      ws = server.ws;

      // Listen for health reports pushed from the browser
      server.ws.on("svibe:push-report", (data: SerializableHealthReport) => {
        cachedReport = data;
      });

      // Serve health report via HTTP for CLI consumption
      server.middlewares.use("/__svibe/report", (_req, res) => {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Access-Control-Allow-Origin", "*");
        if (!cachedReport) {
          res.statusCode = 503;
          res.end(
            JSON.stringify({
              error: "No report available. Is the app running with <Svibe /> mounted?",
            }),
          );
          return;
        }
        res.end(JSON.stringify(cachedReport));
      });

      originalInfo = console.info;
      originalWarn = console.warn;
      originalError = console.error;

      // Replay buffered logs when browser connects
      server.ws.on("svibe:request-replay", () => {
        ws?.send("svibe:replay-logs", replayBuffer.slice());
      });

      console.info = (...args: unknown[]) => {
        originalInfo!.apply(console, args);
        sendAndBuffer({
          level: "info",
          message: argsToString(args),
          timestamp: Date.now(),
        });
      };

      console.warn = (...args: unknown[]) => {
        originalWarn!.apply(console, args);
        sendAndBuffer({
          level: "warn",
          message: argsToString(args),
          timestamp: Date.now(),
        });
      };

      console.error = (...args: unknown[]) => {
        originalError!.apply(console, args);
        const stack = args[0] instanceof Error ? args[0].stack : undefined;
        sendAndBuffer({
          level: "error",
          message: argsToString(args),
          timestamp: Date.now(),
          stack,
        });
      };

      // Capture unhandled exceptions
      process.on("uncaughtException", (err) => {
        sendAndBuffer({
          level: "error",
          message: `Uncaught: ${err.message}`,
          timestamp: Date.now(),
          stack: err.stack,
        });
      });

      process.on("unhandledRejection", (reason) => {
        const message = reason instanceof Error ? reason.message : String(reason);
        const stack = reason instanceof Error ? reason.stack : undefined;
        sendAndBuffer({
          level: "error",
          message: `Unhandled rejection: ${message}`,
          timestamp: Date.now(),
          stack,
        });
      });
    },
  };

  return [svibeStub(), serverPlugin];
}
