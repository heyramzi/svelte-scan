# Architecture

Three modules, all dev-mode only.

## Health monitoring (`core/` + `observers/` + `ui/`)

- **Collector** (`core/collector.ts`): central event bus with time-based stats memoization.
  Observers emit events, the toolbar polls stats.
- **Shared utilities** (`core/dom-utils.ts`, `core/format.ts`): DOM ancestor checks, component
  name resolution, arg stringification.
- **Observers** (8): DOM mutations, effects, leaks, reactivity, console, server, interactions,
  HMR. Seven implement `{ start(), stop(), destroy() }`; the HMR observer exposes
  `{ pause(), resume(), paused, destroy() }` instead.
- **Toolbar** (`ui/Toolbar.svelte`): pill plus expandable panel with tabs. CSS injected via a JS
  string, no external stylesheet.
- **Canvas overlay** (`ui/canvas-overlay.ts`): colour-coded DOM mutation highlights on a single
  `<canvas>` with RAF-driven fading rects.
- **Vite plugin** (`vite-plugin.ts`): patches server-side console methods, forwards via the HMR
  WebSocket (`svelte-scan:server-log`).

## Element inspector (`inspector/`)

`controller.svelte.ts` (state machine, runes), `selector.ts` (CSS selector generation: id >
data-attr > classes > nth-child), `source.ts` (`__svelte_meta` to file:line:column),
`freeze.ts` (pauses CSS animations, WAAPI, timers), `keyboard.ts` (claims keys during inspect),
`notes.ts` (annotation persistence), `export.ts` (compact/standard/detailed/forensic formatters),
`formatter.ts` (markdown for AI agents).

## Expect (`expect/`)

`types.ts` + `constants.ts`, `diff.ts` (git diff parser), `planner.ts` (AI test plan from
diffs), `providers.ts` (Anthropic, OpenAI, Gemini), `runner.ts` (Playwright steps, dynamic
import, no hard dep), `recorder.ts` (rrweb), `reporter.ts`.

Tests are colocated (`file.test.ts`), jsdom environment. Not every module has one: the console,
server and HMR observers, the inspector's `capture`, `controller.svelte` and `keyboard`, and the
expect `constants`, `types` and `index` files have none.
