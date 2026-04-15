# CLAUDE.md

## What is svelte-scan?

A SvelteKit dev tool (`@heyramzi/svelte-scan`) that combines health monitoring, element inspection, and browser testing in one package. Dev-mode only, zero production impact.

## Commands

```bash
npx vitest run          # Run all tests
npx vitest run src/expect  # Run only expect tests
```

NEVER run `pnpm dev` or `pnpm build`.

## Architecture

Three modules, all dev-mode only:

### Health Monitoring (`core/` + `observers/` + `ui/`)

- **Collector** (`core/collector.ts`): Central event bus with time-based stats memoization. Observers emit events, toolbar polls stats.
- **Shared utilities** (`core/dom-utils.ts`, `core/format.ts`): DOM ancestor checks, component name resolution, arg stringification.
- **Observers** (7 total): DOM mutations, effects, leaks, reactivity, console, server, interactions. Each implements `{ start(), stop(), destroy() }`.
- **Toolbar** (`ui/Toolbar.svelte`): Pill + expandable panel with tabs. CSS injected via JS string (no external stylesheet).
- **Canvas overlay** (`ui/canvas-overlay.ts`): Color-coded DOM mutation highlights using a single `<canvas>` with RAF-driven fading rects.
- **Vite plugin** (`vite-plugin.ts`): Patches server-side console methods, forwards via HMR WebSocket (`svibe:server-log`).

### Element Inspector (`inspector/`)

- `controller.svelte.ts`: Inspection state machine with Svelte 5 runes
- `selector.ts`: CSS selector generation (id > data-attr > classes > nth-child)
- `source.ts`: `__svelte_meta` resolution to file:line:column
- `freeze.ts`: Pauses CSS animations, WAAPI, timers
- `keyboard.ts`: Claims keyboard events during inspect mode
- `notes.ts`: Annotation persistence per element/text/group
- `export.ts`: Typed formatters (compact/standard/detailed/forensic)
- `formatter.ts`: Markdown output for AI agents

### Expect (`expect/`)

- `types.ts` + `constants.ts`: Shared types and thresholds
- `diff.ts`: Git diff parser for changed files
- `planner.ts`: AI test plan generation from diffs
- `providers.ts`: AI provider abstraction (Anthropic, OpenAI, Gemini)
- `runner.ts`: Playwright step execution (dynamic import, no hard dep)
- `recorder.ts`: rrweb session recording
- `reporter.ts`: Test result formatting

## Conventions

- `type` not `interface` for TypeScript object types
- CSS classes: `sv-*` prefix
- CSS variables: `--sv-*` prefix
- Data attributes: `data-svibe-*`
- Ignore attribute: `data-svibe-ignore`
- HMR event: `svibe:server-log`
- Peer dep: `svelte ^5.0.0`
- Svelte 5 runes: `$state`, `$derived`, `$effect`, `$props`
- Section comments in .svelte files (IMPORTS, TYPES, PROPS, STATE, DERIVED, EFFECTS, FUNCTIONS, MARKUP)

## Testing

Tests are colocated (`file.test.ts` next to `file.ts`). Environment: jsdom. All observers and inspector modules have unit tests. Expect module has tests for each submodule.
