<p align="center">
  <img src="logo.svg" width="80" height="80" alt="svibe logo">
</p>

# svibe

SvelteKit Vibe. A unified dev tool that monitors runtime health, inspects elements, and runs browser tests.

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

  let Svibe: Component<{ workspaceRoot?: string }> | null = $state(null)

  $effect(() => {
    if (browser && dev) {
      import('@heyramzi/svibe').then((m) => (Svibe = m.Svibe))
    }
  })
</script>

{@render children()}

{#if Svibe}
  <Svibe workspaceRoot="/path/to/project" />
{/if}
```

### Vite Plugin (server log forwarding)

```typescript
// vite.config.ts
import { svibeServerLogs } from "@heyramzi/svibe/vite-plugin";

export default defineConfig({
  plugins: [svibeServerLogs(), sveltekit()],
});
```

## Props

| Prop            | Type                                                           | Default         | Description                     |
| --------------- | -------------------------------------------------------------- | --------------- | ------------------------------- |
| `observers`     | `Partial<SvibeConfig['observers']>`                            | all enabled     | Toggle individual observers     |
| `toolbar`       | `boolean`                                                      | `true`          | Show/hide the dev toolbar       |
| `overlay`       | `boolean`                                                      | `true`          | Show/hide the flash overlay     |
| `position`      | `'bottom-left' \| 'bottom-right' \| 'top-left' \| 'top-right'` | `'bottom-left'` | Toolbar position                |
| `workspaceRoot` | `string`                                                       | `undefined`     | Root path for source resolution |

## Structure

```
svibe/
├── index.ts              # Exports: Svibe, svibe API, plugin system, types
├── vite-plugin.ts        # Vite plugin for server log forwarding + HMR patch
├── bin/svibe.ts          # CLI entry point (health, init, expect commands)
├── src/
│   ├── Svibe.svelte      # Root component (mounts toolbar in Shadow DOM)
│   ├── api.ts            # Public svibe singleton (on, getReport, start/stop)
│   ├── result.ts         # Result<T,E> type for error handling
│   ├── core/
│   │   ├── collector.ts  # Central event bus with memoized stats
│   │   ├── types.ts      # All event types, config, constants
│   │   ├── dom-utils.ts  # Shared DOM utilities (isIgnored, resolveComponentName)
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
import { svibe } from "@heyramzi/svibe";

// Subscribe to events
const unsub = svibe.on("dom", (event) => console.log(event.target));
const unsubAll = svibe.on("*", (event) => console.log(event.type));

// Get aggregated stats
const report = svibe.getReport();

// Lifecycle
svibe.start();
svibe.stop();
svibe.destroy();
```

## Plugin System

```typescript
import { registerPlugin } from "@heyramzi/svibe";

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
npx @heyramzi/svibe health
npx @heyramzi/svibe health --url http://localhost:5173 --json

# Set up Playwright + state directory (--ci generates GitHub Actions workflow)
npx @heyramzi/svibe init
npx @heyramzi/svibe init --ci

# Generate + run tests from your uncommitted changes
npx @heyramzi/svibe expect

# Generate plan without running
npx @heyramzi/svibe expect --plan-only

# Run a saved plan
npx @heyramzi/svibe expect --run .svibe-expect/plan-xxx.json

# List saved plans
npx @heyramzi/svibe expect --list

# Options
npx @heyramzi/svibe expect --base-url http://localhost:5173 --headed --timeout 15000
npx @heyramzi/svibe expect --provider openai   # anthropic (default), openai, gemini
npx @heyramzi/svibe expect --cookies            # Forward cookies from base URL
```

Requires an API key for your chosen provider (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, or `GEMINI_API_KEY`).

## Production Safety

svibe is dev-only and must never be bundled in production. The package uses [conditional exports](https://nodejs.org/api/packages.html#conditional-exports) to enforce this:

- **`development`** condition: resolves to the real source code
- **`default`** condition: resolves to `stub.ts` (all exports are `null`/no-ops)

Bundlers that support the `development` condition (Vite in dev mode, webpack with `resolve.conditionNames`) will load svibe. Production builds automatically get the zero-cost stub.

If your bundler doesn't support conditional exports, use one of these approaches:

```typescript
// Option 1: Dynamic import with @vite-ignore (recommended)
if (browser && dev) {
  import(/* @vite-ignore */ "$lib/svibe/index").then((m) => (Svibe = m.Svibe));
}

// Option 2: Vite alias to stub in production builds
// vite.config.ts
export default defineConfig(({ command }) => ({
  resolve:
    command === "build"
      ? {
          alias: { "$lib/svibe/index": resolve("src/lib/svibe/stub.ts") },
        }
      : undefined,
}));
```

## Requirements

- Svelte 5+ (for the dev tool component, optional for CLI-only usage)
- SvelteKit (dev mode only, zero production impact)
- Node 18+ (for CLI)

## Inspired By

svibe draws ideas and patterns from these projects:

- [react-scan](https://github.com/aidenybai/react-scan) by Aiden Bai -- render tracking, interaction latency classification, AI optimization prompts, OffscreenCanvas overlay architecture
- [react-grab](https://github.com/aidenybai/react-grab) by Aiden Bai -- element inspector, page freeze system (CSS/WAAPI/timers), source resolution, keyboard claiming, structured AI context output
- [agentation](https://github.com/benjitaylor/agentation) by Benji Taylor -- click-to-annotate UI elements for AI agents, CSS selector generation, multi-select patterns
- [sv-agentation](https://github.com/SikandarJODD/sv-agentation) by Sikandar -- Svelte 5 port of agentation concepts
- [expect](https://github.com/millionco/expect) by Million -- AI-driven browser testing from code changes

## License

MIT
