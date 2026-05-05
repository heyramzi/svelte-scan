<script lang="ts">
// =========================
// IMPORTS
// =========================
import { onDestroy, mount, unmount } from 'svelte'
import { dev, browser } from '$app/environment'
import { getSvelteInternals } from './core/internals'
import { DEFAULT_CONFIG, type SvelteScanConfig } from './core/types'
import { svibe } from './api'
import { createDomObserver } from './observers/dom'
import { createEffectTracker } from './observers/effects'
import { createLeakDetector } from './observers/leaks'
import { createReactivityObserver } from './observers/reactivity'
import { createConsoleObserver } from './observers/console'
import { createServerObserver } from './observers/server'
import { createHmrObserver } from './observers/hmr'
import { createInteractionObserver } from './observers/interactions'
import { createCanvasOverlay } from './ui/canvas-overlay'
import { TOOLBAR_STYLES } from './ui/toolbar-styles'
import { INSPECTOR_STYLES } from './ui/inspector-styles'
import Toolbar from './ui/Toolbar.svelte'

// =========================
// TYPES
// =========================
type Props = {
  observers?: Partial<SvelteScanConfig['observers']>
  toolbar?: boolean
  overlay?: boolean
  position?: SvelteScanConfig['position']
  workspaceRoot?: string
}

// =========================
// PROPS
// =========================
let {
  observers: observerConfig,
  toolbar = true,
  overlay = true,
  position = 'bottom-left',
  workspaceRoot,
}: Props = $props()

// =========================
// STATE
// =========================
// Skip in prod, SSR, or iframes
const isIframe = browser && window.self !== window.top
const skip = !dev || !browser || isIframe

// svelte-ignore state_referenced_locally
let config = $state<SvelteScanConfig>({
  observers: { ...DEFAULT_CONFIG.observers, ...observerConfig },
  toolbar,
  overlay,
  position,
  workspaceRoot,
})

if (!skip) {
  svibe.start()
}
const collector = !isIframe ? svibe.getCollector()! : null
const hmrObserver = !isIframe ? createHmrObserver() : null
const activeObservers = new Map<keyof SvelteScanConfig['observers'], { destroy(): void }>()

let canvasOverlay: ReturnType<typeof createCanvasOverlay> | null = null
let internals = $state.raw<Record<string, unknown> | null>(null)

let toolbarHostEl: HTMLDivElement | null = null
let toolbarInstance: Record<string, unknown> | null = null

// =========================
// EFFECTS
// =========================
$effect(() => {
  if (skip || !collector) return
  if (config.overlay && !canvasOverlay) {
    canvasOverlay = createCanvasOverlay(collector)
    canvasOverlay.mount(document.body)
  } else if (!config.overlay && canvasOverlay) {
    canvasOverlay.destroy()
    canvasOverlay = null
  }
})

$effect(() => {
  if (skip || !collector) return
  const want = config.observers
  ensureObserver('console', want.console, () => createConsoleObserver(collector))
  ensureObserver('server', want.server, () => createServerObserver(collector))
  ensureObserver('dom', want.dom, () => createDomObserver(collector))
  ensureObserver(
    'effects',
    want.effects && !!internals?.user_effect,
    () => createEffectTracker(collector, internals as Parameters<typeof createEffectTracker>[1]),
  )
  ensureObserver(
    'reactivity',
    want.reactivity && !!internals?.state,
    () => createReactivityObserver(collector, internals as Parameters<typeof createReactivityObserver>[1]),
  )
  ensureObserver('leaks', want.leaks, () => createLeakDetector(collector))
  ensureObserver('interactions', want.interactions, () => createInteractionObserver(collector))
})

$effect(() => {
  if (skip || !config.toolbar || !collector || !hmrObserver) return

  toolbarHostEl = document.createElement('div')
  toolbarHostEl.setAttribute('data-svelte-scan-toolbar', '')
  document.body.appendChild(toolbarHostEl)

  const shadow = toolbarHostEl.attachShadow({ mode: 'open' })

  const styleEl = document.createElement('style')
  styleEl.textContent = TOOLBAR_STYLES + '\n' + INSPECTOR_STYLES
  shadow.appendChild(styleEl)

  const mountTarget = document.createElement('div')
  shadow.appendChild(mountTarget)

  toolbarInstance = mount(Toolbar, {
    target: mountTarget,
    props: { collector, config, hmrObserver },
  })

  return () => {
    if (toolbarInstance) {
      unmount(toolbarInstance)
      toolbarInstance = null
    }
    toolbarHostEl?.remove()
    toolbarHostEl = null
  }
})

// =========================
// FUNCTIONS
// =========================
function ensureObserver<K extends keyof SvelteScanConfig['observers']>(
  key: K,
  enabled: boolean,
  factory: () => { start(): void; destroy(): void },
) {
  const has = activeObservers.has(key)
  if (enabled && !has) {
    const obs = factory()
    obs.start()
    activeObservers.set(key, obs)
  } else if (!enabled && has) {
    activeObservers.get(key)!.destroy()
    activeObservers.delete(key)
  }
}

// WHY: console/server/dom observers must start synchronously to catch errors
// that fire during hydration, before $effect runs in the microtask queue.
if (!skip && collector) {
  if (config.observers.console) {
    const obs = createConsoleObserver(collector)
    obs.start()
    activeObservers.set('console', obs)
  }
  if (config.observers.server) {
    const obs = createServerObserver(collector)
    obs.start()
    activeObservers.set('server', obs)
  }
  if (config.observers.dom) {
    const obs = createDomObserver(collector)
    obs.start()
    activeObservers.set('dom', obs)
  }
}

;(async () => {
  if (skip || !collector) return
  internals = await getSvelteInternals()
})()

// Push stats to Vite dev server so CLI can query them
const PUSH_INTERVAL = 2000
const pushInterval = !skip && collector && import.meta.hot ? setInterval(() => {
  const stats = collector.getStats()
  import.meta.hot!.send('svelte-scan:push-report', {
    mutationsPerSec: stats.mutationsPerSec,
    hotSpots: stats.hotSpots.map((s) => ({ component: s.component, mutations: s.mutations })),
    effectOffenders: stats.effectOffenders,
    leaks: stats.leaks,
    consoleErrors: stats.consoleErrors,
    serverLogs: stats.serverLogs,
    interactions: stats.interactions,
    reactivity: stats.reactivity,
    timestamp: Date.now(),
  })
}, PUSH_INTERVAL) : null

onDestroy(() => {
  if (pushInterval) clearInterval(pushInterval)
  for (const obs of activeObservers.values()) obs.destroy()
  activeObservers.clear()
  canvasOverlay?.destroy()
  canvasOverlay = null
  if (!skip) svibe.stop()
  hmrObserver?.destroy()
})
</script>

<!-- =========================== -->
<!-- MARKUP -->
<!-- =========================== -->
<!-- Toolbar is mounted into Shadow DOM via $effect above -->
