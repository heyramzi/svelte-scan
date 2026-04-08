<script lang="ts">
// =========================
// IMPORTS
// =========================
import { onDestroy, mount, unmount } from 'svelte'
import { dev, browser } from '$app/environment'
import { getSvelteInternals } from './core/internals'
import { DEFAULT_CONFIG, type SvibeConfig } from './core/types'
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
  observers?: Partial<SvibeConfig['observers']>
  toolbar?: boolean
  overlay?: boolean
  position?: SvibeConfig['position']
  workspaceRoot?: string
}

// =========================
// PROPS
// =========================
let {
  observers: observerConfig,
  toolbar = true,
  overlay = false,
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
let config = $state<SvibeConfig>({
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
const activeObservers: { destroy(): void }[] = []

let canvasOverlay: ReturnType<typeof createCanvasOverlay> | null = null
if (!skip && collector && config.overlay) {
  canvasOverlay = createCanvasOverlay(collector)
  canvasOverlay.mount(document.body)
}

let toolbarHostEl: HTMLDivElement | null = null
let toolbarInstance: Record<string, unknown> | null = null

// =========================
// EFFECTS
// =========================
$effect(() => {
  if (skip || !config.toolbar || !collector || !hmrObserver) return

  toolbarHostEl = document.createElement('div')
  toolbarHostEl.setAttribute('data-svibe-toolbar', '')
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
// Console and DOM observers start synchronously so they catch errors
// that fire during hydration, before any async microtask resolves.
if (!skip && collector) {
  if (config.observers.console) {
    const consoleObs = createConsoleObserver(collector)
    consoleObs.start()
    activeObservers.push(consoleObs)
  }

  if (config.observers.server) {
    const serverObs = createServerObserver(collector)
    serverObs.start()
    activeObservers.push(serverObs)
  }

  if (config.observers.dom) {
    const domObs = createDomObserver(collector)
    domObs.start()
    activeObservers.push(domObs)
  }
}

async function initObservers() {
  if (skip || !collector) return
  const internals = await getSvelteInternals()
  if (internals) {
    if (config.observers.effects && internals.user_effect) {
      const effectObs = createEffectTracker(collector, internals as Parameters<typeof createEffectTracker>[1])
      effectObs.start()
      activeObservers.push(effectObs)
    }

    if (config.observers.reactivity && internals.state) {
      const reactObs = createReactivityObserver(collector, internals as Parameters<typeof createReactivityObserver>[1])
      reactObs.start()
      activeObservers.push(reactObs)
    }
  }

  if (config.observers.leaks) {
    const leakObs = createLeakDetector(collector)
    leakObs.start()
    activeObservers.push(leakObs)
  }

  if (config.observers.interactions) {
    const interactionObs = createInteractionObserver(collector)
    interactionObs.start()
    activeObservers.push(interactionObs)
  }
}

initObservers()

// Push stats to Vite dev server so CLI can query them
const PUSH_INTERVAL = 2000
const pushInterval = !skip && collector && import.meta.hot ? setInterval(() => {
  const stats = collector.getStats()
  import.meta.hot!.send('svibe:push-report', {
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
  for (const obs of activeObservers) {
    obs.destroy()
  }
  canvasOverlay?.destroy()
  if (!skip) svibe.stop()
  hmrObserver?.destroy()
})
</script>

<!-- =========================== -->
<!-- MARKUP -->
<!-- =========================== -->
<!-- Toolbar is mounted into Shadow DOM via $effect above -->
