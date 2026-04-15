<p align="center">
  <img src="logo.svg" width="80" height="80" alt="svelte-scan logo">
</p>

# svelte-scan

SvelteKit dev tool. Monitors runtime health, inspects elements, and runs AI-driven browser tests.

## Features

### Health Monitoring

Observes your running app and surfaces problems in a dev toolbar:

- **DOM mutations** with color-coded flash overlay (purple/yellow/red by frequency)
- **Runaway effects** detection (warns at 10+/sec, critical at 50+/sec)
- **Memory leaks** from orphaned listeners, intervals, timeouts
- **Reactivity stats** tracking signal, derived, and effect counts
- **Console errors/warnings** capture (including failed fetch requests)
- **Server-side logs** forwarded via HMR WebSocket
- **Interaction latency** with INP-style classification (good/needs-improvement/poor)
- **FPS meter** and HMR pause/resume
- **Copy for AI** formats all diagnostics as markdown for Claude Code / Cursor

### Element Inspector

Click-to-inspect any element:

- CSS selector generation (id > data-attr > classes > nth-child)
- Source file resolution via Svelte dev-mode `__svelte_meta`
- Open in editor via Vite's `/__open-in-editor` endpoint
- Page freeze (CSS animations, WAAPI, timers)
- Keyboard claiming during inspect mode

### Expect (Browser Testing)

AI-driven browser testing from git diffs. Reads your changes, generates a test plan via LLM, runs it against Playwright, and reports results. See [`src/expect/README.md`](src/expect/README.md).

## Setup

```svelte
<!-- +layout.svelte -->
<script lang="ts">
  import { browser, dev } from '$app/environment'
  import type { Component } from 'svelte'

  let SvelteScan: Component<{ workspaceRoot?: string }> | null = $state(null)

  $effect(() => {
    if (browser && dev) {
      import('@heyramzi/svelte-scan').then((m) => (SvelteScan = m.SvelteScan))
    }
  })
</script>

{@render children()}

{#if SvelteScan}
  <SvelteScan workspaceRoot="/path/to/project" />
{/if}
```

### Vite Plugin (server log forwarding)

```typescript
// vite.config.ts
import { svelteScanServerLogs } from "@heyramzi/svelte-scan/vite-plugin";

export default defineConfig({
  plugins: [svelteScanServerLogs(), sveltekit()],
});
```

## Props

| Prop            | Type                                                            | Default         | Description                     |
| --------------- | --------------------------------------------------------------- | --------------- | ------------------------------- |
| `observers`     | `Partial<SvelteScanConfig['observers']>`                        | all enabled     | Toggle individual observers     |
| `toolbar`       | `boolean`                                                       | `true`          | Show/hide the dev toolbar       |
| `overlay`       | `boolean`                                                       | `true`          | Show/hide the flash overlay     |
| `position`      | `'bottom-left' \| 'bottom-right' \| 'top-left' \| 'top-right'` | `'bottom-left'` | Toolbar position                |
| `workspaceRoot` | `string`                                                       | `undefined`     | Root path for source resolution |

## Structure

```
svelte-scan/
├── index.ts              # Exports: SvelteScan, svelteScan API, plugin system, types
├── vite-plugin.ts        # Vite plugin for server log forwarding + HMR patch
├── bin/svelte-scan.ts    # CLI entry point (health, init, expect commands)
├── src/
│   ├── Svibe.svelte      # Root component (mounts toolbar in Shadow DOM)
│   ├── api.ts            # Public svelteScan singleton (on, getReport, start/stop)
│   ├── result.ts         # Result<T,E> type for error handling
│   ├── core/
│   │   ├── collector.ts  # Central event bus with memoized stats
│   │   ├── types.ts      # All event types, config, constants
│   │   ├── dom-utils.ts  # Shared DOM utilities
│   │   ├── format.ts     # Shared arg stringification
│   │   ├── fps.ts        # FPS meter with start/stop
│   │   ├── plugins.ts    # Plugin registration system
│   │   └── notifications.ts  # Notification queue/expiry
│   ├── observers/        # 7 observers: DOM, effects, leaks, reactivity, console, server, interactions
│   ├── inspector/        # Element inspector with annotations, export, and source resolution
│   ├── ui/               # Toolbar, flash overlay, inspector overlay, styles
│   └── expect/           # AI-driven browser testing (see expect/README.md)
```

## Programmatic API

```typescript
import { svelteScan } from "@heyramzi/svelte-scan";

// Subscribe to events
const unsub = svelteScan.on("dom", (event) => console.log(event.target));
const unsubAll = svelteScan.on("*", (event) => console.log(event.type));

// Get aggregated stats
const report = svelteScan.getReport();

// Lifecycle
svelteScan.start();
svelteScan.stop();
svelteScan.destroy();
```

## Plugin System

```typescript
import { registerPlugin } from "@heyramzi/svelte-scan";

registerPlugin(
  {
    name: "my-plugin",
    description: "Custom observer",
    actions: [{ label: "Do thing", handler: () => console.log("done") }],
  },
  (api) => {
    const unsub = api.on("dom", (e) => {
      /* custom logic */
    });
    return () => unsub(); // cleanup
  },
);
```

## CLI

```bash
# Live health report from running app
npx @heyramzi/svelte-scan health
npx @heyramzi/svelte-scan health --url http://localhost:5173 --json

# Set up Playwright + state directory (--ci generates GitHub Actions workflow)
npx @heyramzi/svelte-scan init
npx @heyramzi/svelte-scan init --ci

# Generate + run tests from your uncommitted changes
npx @heyramzi/svelte-scan expect

# Generate plan without running
npx @heyramzi/svelte-scan expect --plan-only

# Run a saved plan
npx @heyramzi/svelte-scan expect --run .svelte-scan-expect/plan-xxx.json

# List saved plans
npx @heyramzi/svelte-scan expect --list

# Options
npx @heyramzi/svelte-scan expect --base-url http://localhost:5173 --headed --timeout 15000
npx @heyramzi/svelte-scan expect --provider openai   # anthropic (default), openai, gemini
npx @heyramzi/svelte-scan expect --cookies            # Forward cookies from base URL
```

Requires an API key for your chosen provider (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, or `GEMINI_API_KEY`).

## Production Safety

svelte-scan is dev-only and must never be bundled in production. The package uses [conditional exports](https://nodejs.org/api/packages.html#conditional-exports) to enforce this:

- **`development`** condition: resolves to the real source code
- **`default`** condition: resolves to `stub.ts` (all exports are `null`/no-ops)

Bundlers that support the `development` condition (Vite in dev mode, webpack with `resolve.conditionNames`) will load svelte-scan. Production builds automatically get the zero-cost stub.

If your bundler doesn't support conditional exports, use one of these approaches:

```typescript
// Option 1: Dynamic import with @vite-ignore (recommended)
if (browser && dev) {
  import(/* @vite-ignore */ "$lib/svelte-scan/index").then((m) => (SvelteScan = m.SvelteScan));
}

// Option 2: Vite alias to stub in production builds
// vite.config.ts
export default defineConfig(({ command }) => ({
  resolve:
    command === "build"
      ? {
          alias: { "$lib/svelte-scan/index": resolve("src/lib/svelte-scan/stub.ts") },
        }
      : undefined,
}));
```

## Requirements

- Svelte 5+ (for the dev tool component, optional for CLI-only usage)
- SvelteKit (dev mode only, zero production impact)
- Node 18+

## Inspired By

svelte-scan draws ideas and patterns from these projects:

- [react-scan](https://github.com/aidenybai/react-scan) by Aiden Bai — render tracking, interaction latency classification, AI optimization prompts, OffscreenCanvas overlay architecture
- [react-grab](https://github.com/aidenybai/react-grab) by Aiden Bai — element inspector, page freeze system (CSS/WAAPI/timers), source resolution, keyboard claiming, structured AI context output
- [agentation](https://github.com/benjitaylor/agentation) by Benji Taylor — click-to-annotate UI elements for AI agents, CSS selector generation, multi-select patterns
- [sv-agentation](https://github.com/SikandarJODD/sv-agentation) by Sikandar — Svelte 5 port of agentation concepts
- [expect](https://github.com/millionco/expect) by Million — AI-driven browser testing from code changes

## License

MIT
