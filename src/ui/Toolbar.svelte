<script lang="ts">
// =========================
// IMPORTS
// =========================
import { onDestroy } from 'svelte'
import { version } from '../../package.json'
import { IGNORE_ATTR, type Collector, type AggregatedStats, type SvelteScanConfig } from '../core/types'
import { createFpsMeter } from '../core/fps'
import type { HmrObserver } from '../observers/hmr'
import { Copy, Check, X, Pause, Play, Settings, StickyNote, Trash2, Type, MousePointer, SquareDashedMousePointer, Group, Monitor, Server } from '@lucide/svelte'
import { OUTPUT_MODE_OPTIONS, POSITION_LABELS } from '../inspector/constants'
import { readConfig, writeConfig } from '../core/config-storage'
import type { InspectorPosition } from '../inspector/types'
import { InspectorController } from '../inspector/controller.svelte'
import { countFrontendIssues, countServerIssues, formatFrontendForLLM, formatOverviewForLLM, formatServerLogsForLLM, getToolbarSeverity } from './toolbar-utils'
import InspectorOverlay from './InspectorOverlay.svelte'
import NoteComposer from './NoteComposer.svelte'

// =========================
// TYPES
// =========================
type Props = {
	collector: Collector
	config: SvelteScanConfig
	hmrObserver: HmrObserver
}

type Corner = SvelteScanConfig['position']
type Tab = 'overview' | 'issues' | 'console' | 'server' | 'inp' | 'notes'

// =========================
// PROPS
// =========================
let { collector, config = $bindable(), hmrObserver }: Props = $props()

// Restore persisted config (position, overlay, observers)
const savedConfig = readConfig()
config.position = savedConfig.position
config.overlay = savedConfig.overlay
config.observers = { ...config.observers, ...savedConfig.observers }

// =========================
// STATE
// =========================
let expanded = $state(false)
let activeTab = $state<Tab>('overview')
let stats = $state<AggregatedStats>({
	mutationsPerSec: 0,
	hotSpots: [],
	effectOffenders: [],
	leaks: [],
	consoleErrors: [],
	serverLogs: [],
	interactions: [],
	reactivity: { signals: 0, deriveds: 0, effects: 0, maxDepth: 0 },
})
let dragging = $state(false)
let didDrag = $state(false)
let dragStart = $state<{ x: number; y: number; time: number } | null>(null)
let dragPos = $state<{ x: number; y: number } | null>(null)
let animating = $state(false)
let copied = $state<'frontend' | 'server' | 'shared' | null>(null)
let fps = $state(60)
let hmrPaused = $state(false)
let pillEl = $state<HTMLElement | null>(null)
let visible = $state(true)
let showSettings = $state(false)
const SETTINGS_TAB_KEY = 'svibe:settings-tab'
const storedTab = typeof localStorage !== 'undefined' ? localStorage.getItem(SETTINGS_TAB_KEY) as 'general' | 'inspector' | 'observers' | null : null
let settingsTab = $state<'general' | 'inspector' | 'observers'>(storedTab ?? 'general')
let panelReady = $state(false)
const fpsMeter = createFpsMeter()
const inspectorController = new InspectorController()

const SHORTCUT_KEY = 't'
const SHORTCUT_LABEL = 'T'
const INSPECT_KEY = 'i'
const INSPECT_LABEL = 'I'
const COPY_KEY = 'c'
const COPY_LABEL = 'C'
const HMR_KEY = 'p'
const HMR_LABEL = 'P'
const LOGS_KEY = 'l'
const LOGS_LABEL = 'L'

const OBSERVER_LABELS: { key: keyof SvelteScanConfig['observers']; label: string; desc: string }[] = [
	{ key: 'dom', label: 'DOM Mutations', desc: 'Tracks element additions, removals, and attribute changes' },
	{ key: 'effects', label: 'Effects', desc: 'Flags $effect calls that fire too frequently' },
	{ key: 'leaks', label: 'Leak Detection', desc: 'Finds uncleared listeners, intervals, and timeouts' },
	{ key: 'reactivity', label: 'Reactivity', desc: 'Counts active signals, deriveds, and effects' },
	{ key: 'console', label: 'Console', desc: 'Captures console.error and console.warn messages' },
	{ key: 'server', label: 'Server Logs', desc: 'Forwards server-side console output via HMR' },
	{ key: 'interactions', label: 'INP / Interactions', desc: 'Measures click, keydown, and input response times' },
]

const OVERLAY_DESC = 'Highlights DOM mutations with colored overlays in real-time'

const EDGE_MARGIN = 16
const DRAG_THRESHOLD = 4

// =========================
// DERIVED
// =========================
let consoleErrorCount = $derived(stats.consoleErrors.filter((e) => e.level === 'error').length)
let consoleWarnCount = $derived(stats.consoleErrors.filter((e) => e.level === 'warn').length)
let serverErrorCount = $derived(stats.serverLogs.filter((e) => e.level === 'error').length)
let serverWarnCount = $derived(stats.serverLogs.filter((e) => e.level === 'warn').length)
let serverBadgeCount = $derived(serverErrorCount + serverWarnCount)
let issueCount = $derived(countFrontendIssues(stats))
let serverIssueCount = $derived(countServerIssues(stats))
let severity = $derived<'green' | 'yellow' | 'red'>(getToolbarSeverity(stats))

let fpsColor = $derived(
	fps < 30 ? 'var(--sv-red)' : fps < 50 ? 'var(--sv-yellow)' : 'var(--sv-text-muted)',
)

let slowInteractions = $derived(stats.interactions.filter((i) => i.classification !== 'good'))

// =========================
// EFFECTS
// =========================
$effect(() => {
	if (!expanded) return
	const interval = setInterval(() => {
		stats = collector.getStats()
		fps = fpsMeter.getFps()
	}, 500)
	return () => clearInterval(interval)
})

// Poll less frequently when collapsed (pill only needs FPS + issue count)
$effect(() => {
	if (expanded) return
	const interval = setInterval(() => {
		stats = collector.getStats()
		fps = fpsMeter.getFps()
	}, 2000)
	return () => clearInterval(interval)
})

onDestroy(() => fpsMeter.destroy())

function onKeydownGlobal(e: KeyboardEvent) {
	const target = e.target as HTMLElement
	const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
	// Read the real key, bypassing the keyboard claimer's override
	const key = inspectorController.realKey(e)
	// Allow C key even when typing in svibe's own composer textarea
	if (!e.metaKey && !e.ctrlKey && !e.altKey && !isInput) {
		if (key === SHORTCUT_KEY) {
			e.preventDefault()
			if (expanded) {
				showSettings = false
				expanded = false
			} else {
				expanded = true
			}
		}
		if (key === INSPECT_KEY) {
			e.preventDefault()
			inspectorController.toggle()
		}
		if (key === COPY_KEY) {
			e.preventDefault()
			if (inspectorController.composer) {
				inspectorController.saveComposer()
			} else if (inspectorController.notes.length > 0) {
				inspectorController.copyNotes()
			} else {
				doCopy(formatFrontendForLLM(stats), undefined, 'frontend')
			}
		}
		if (key === HMR_KEY) {
			e.preventDefault()
			toggleHmr()
		}
		if (key === LOGS_KEY) {
			e.preventDefault()
			doCopy(formatServerLogsForLLM(stats), undefined, 'server')
		}
	}
	// Handle C key when focused on svibe's composer textarea
	if (!e.metaKey && !e.ctrlKey && !e.altKey && isInput && inspectorController.composer && key === COPY_KEY) {
		const isSvibeInput = (target as HTMLElement).closest?.('[data-svelte-scan-overlay]')
		if (isSvibeInput) {
			e.preventDefault()
			inspectorController.saveComposer()
		}
	}
}
// All event listeners on document/window directly (not <svelte:window>)
// because the toolbar is mounted inside Shadow DOM where <svelte:window> may not propagate correctly
document.addEventListener('keydown', onKeydownGlobal)
document.addEventListener('keydown', inspectorController.handleKeyDown)
document.addEventListener('keyup', inspectorController.handleKeyUp)
document.addEventListener('pointermove', inspectorController.handlePointerMove)
window.addEventListener('resize', inspectorController.handleViewportChange)
window.addEventListener('scroll', inspectorController.handleViewportChange)
document.addEventListener('mousemove', onMouseMove)
document.addEventListener('mouseup', onMouseUp)
document.addEventListener('click', onWindowClick, true)

onDestroy(() => {
	document.removeEventListener('keydown', onKeydownGlobal)
	document.removeEventListener('keydown', inspectorController.handleKeyDown)
	document.removeEventListener('keyup', inspectorController.handleKeyUp)
	document.removeEventListener('pointermove', inspectorController.handlePointerMove)
	window.removeEventListener('resize', inspectorController.handleViewportChange)
	window.removeEventListener('scroll', inspectorController.handleViewportChange)
	document.removeEventListener('mousemove', onMouseMove)
	document.removeEventListener('mouseup', onMouseUp)
	document.removeEventListener('click', onWindowClick, true)
	inspectorController.destroy()
})

$effect(() => {
	if (animating && dragPos) {
		const target = getCornerPos(config.position)
		requestAnimationFrame(() => {
			dragPos = target
		})
	}
})

$effect(() => {
	if (expanded) {
		panelReady = false
		requestAnimationFrame(() => {
			panelReady = true
		})
	}
})

// =========================
// FUNCTIONS
// =========================

function getCornerPos(corner: Corner): { x: number; y: number } {
	const vw = window.innerWidth
	const vh = window.innerHeight
	const w = pillEl?.offsetWidth ?? 160
	const h = pillEl?.offsetHeight ?? 30

	const positions: Record<Corner, { x: number; y: number }> = {
		'top-left': { x: EDGE_MARGIN, y: EDGE_MARGIN },
		'top-right': { x: vw - w - EDGE_MARGIN, y: EDGE_MARGIN },
		'bottom-left': { x: EDGE_MARGIN, y: vh - h - EDGE_MARGIN },
		'bottom-right': { x: vw - w - EDGE_MARGIN, y: vh - h - EDGE_MARGIN },
	}
	return positions[corner]
}

function resolveCorner(x: number, y: number): Corner {
	const vw = window.innerWidth
	const vh = window.innerHeight
	const w = pillEl?.offsetWidth ?? 160
	const h = pillEl?.offsetHeight ?? 30
	const cx = x + w / 2
	const cy = y + h / 2

	const isLeft = cx < vw / 2
	const isTop = cy < vh / 2

	return isTop ? (isLeft ? 'top-left' : 'top-right') : isLeft ? 'bottom-left' : 'bottom-right'
}

function onMouseDown(e: MouseEvent) {
	if (e.button !== 0) return
	if ((e.target as HTMLElement).closest('.sv-pill-btn, .sv-header-btn')) return
	e.preventDefault()
	const rect = pillEl?.getBoundingClientRect()
	dragStart = {
		x: e.clientX - (rect?.left ?? 0),
		y: e.clientY - (rect?.top ?? 0),
		time: Date.now(),
	}
	dragPos = { x: rect?.left ?? 0, y: rect?.top ?? 0 }
	dragging = false
	didDrag = false
}

function onMouseMove(e: MouseEvent) {
	if (!dragStart) return
	const dx = e.clientX - dragStart.x - (dragPos?.x ?? 0)
	const dy = e.clientY - dragStart.y - (dragPos?.y ?? 0)

	if (!dragging && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
		dragging = true
		didDrag = true
	}

	if (dragging) {
		dragPos = {
			x: e.clientX - dragStart.x,
			y: e.clientY - dragStart.y,
		}
	}
}

function onMouseUp() {
	if (!dragStart) return

	if (didDrag && dragPos) {
		config.position = resolveCorner(dragPos.x, dragPos.y)
		writeConfig(config)
		animating = true

		setTimeout(() => {
			dragPos = null
			animating = false
		}, 350)
	} else {
		dragPos = null
		expanded = !expanded
	}

	dragging = false
	dragStart = null
}

function getPositionStyle(): string {
	if (dragPos && (dragging || animating)) {
		return `left: ${dragPos.x}px; top: ${dragPos.y}px; right: auto; bottom: auto`
	}

	const xProp = config.position.includes('right') ? 'right' : 'left'
	const yProp = config.position.includes('bottom') ? 'bottom' : 'top'
	return `${xProp}: ${EDGE_MARGIN}px; ${yProp}: ${EDGE_MARGIN}px`
}

function formatTabForLLM(tab: Tab): string {
	switch (tab) {
		case 'console': {
			if (stats.consoleErrors.length === 0) return 'No console errors or warnings.'
			const lines: string[] = ['## Console Errors & Warnings (svibe)', '']
			for (const entry of stats.consoleErrors) {
				lines.push(`- [${entry.level.toUpperCase()}] ${entry.message}`)
				lines.push(`  Source: ${entry.source}`)
			}
			return lines.join('\n')
		}
		case 'server':
			return formatServerLogsForLLM(stats)
		case 'issues': {
			const lines: string[] = ['## Issues (svibe)', '']
			if (stats.hotSpots.length > 0) {
				lines.push('### Hot Spots')
				for (const spot of stats.hotSpots) {
					lines.push(`- ${spot.component}: ${spot.mutations} mutations (${spot.mutations}/sec)`)
				}
				lines.push('')
			}
			if (stats.effectOffenders.length > 0) {
				lines.push('### Runaway Effects')
				for (const eff of stats.effectOffenders) {
					lines.push(`- [${eff.severity.toUpperCase()}] ${eff.component}: ${eff.count} executions (${eff.id})`)
				}
				lines.push('')
			}
			if (stats.leaks.length > 0) {
				lines.push('### Memory Leaks')
				for (const leak of stats.leaks) {
					lines.push(`- ${leak.component}: ${leak.leakType} (${leak.details})`)
				}
				lines.push('')
			}
			if (stats.hotSpots.length === 0 && stats.effectOffenders.length === 0 && stats.leaks.length === 0) {
				lines.push('No issues detected.')
			}
			return lines.join('\n')
		}
		case 'inp': {
			if (slowInteractions.length === 0) return 'No slow interactions.'
			const lines: string[] = ['## Slow Interactions (svibe)', '']
			for (const i of slowInteractions) {
				lines.push(`- [${i.classification.toUpperCase()}] ${i.component}: ${i.eventType} ${i.duration}ms`)
			}
			return lines.join('\n')
		}
		case 'notes':
			return ''
		case 'overview':
			return formatOverviewForLLM(stats)
	}
}

let _hasContent = $derived(
	stats.hotSpots.length > 0
		|| stats.effectOffenders.length > 0
		|| stats.leaks.length > 0
		|| stats.consoleErrors.length > 0
		|| stats.serverLogs.length > 0
		|| stats.mutationsPerSec > 0
		|| stats.reactivity.signals > 0,
)

async function copyFrontendReport(e?: MouseEvent) {
	await doCopy(formatFrontendForLLM(stats), e, 'frontend')
}

async function copyServerLogs(e?: MouseEvent) {
	await doCopy(formatServerLogsForLLM(stats), e, 'server')
}

function purgeServerLogs(e?: MouseEvent) {
	e?.stopPropagation()
	collector.resetServerLogs?.()
	stats = collector.getStats()
}

async function doCopy(text: string, e?: MouseEvent, target: 'frontend' | 'server' | 'shared' = 'shared') {
	e?.stopPropagation()
	await navigator.clipboard.writeText(text)
	copied = target
	setTimeout(() => {
		if (copied === target) copied = null
	}, 1200)
}

function setPosition(pos: Corner) {
	const rect = pillEl?.getBoundingClientRect()
	if (rect) {
		dragPos = { x: rect.left, y: rect.top }
	}
	config.position = pos
	writeConfig(config)
	animating = true
	setTimeout(() => {
		dragPos = null
		animating = false
	}, 350)
}

function onWindowClick(e: MouseEvent) {
	inspectorController.handleClick(e)
}

function setSettingsTab(tab: typeof settingsTab) {
	settingsTab = tab
	try { localStorage.setItem(SETTINGS_TAB_KEY, tab) } catch { /* storage unavailable */ }
}

function cycleOutputMode() {
	const current = OUTPUT_MODE_OPTIONS.findIndex((o) => o.value === inspectorController.settings.outputMode)
	const next = (current + 1) % OUTPUT_MODE_OPTIONS.length
	inspectorController.setSetting("outputMode",OUTPUT_MODE_OPTIONS[next].value)
}

function toggleHmr(e?: MouseEvent) {
	e?.stopPropagation()
	if (hmrPaused) {
		hmrObserver.resume()
		hmrPaused = false
	} else {
		hmrObserver.pause()
		hmrPaused = true
	}
}

function toggleObserver(key: keyof SvelteScanConfig['observers']) {
	config.observers[key] = !config.observers[key]
	writeConfig(config)
}

function toggleOverlay() {
	config.overlay = !config.overlay
	writeConfig(config)
}
</script>

<!-- =========================== -->
<!-- MARKUP -->
<!-- =========================== -->
{#snippet svibeLogo()}
	<svg class="sv-logo" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
		<defs>
			<linearGradient id="sv-grad" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" stop-color="#a78bfa"></stop>
				<stop offset="100%" stop-color="#ff3e00"></stop>
			</linearGradient>
		</defs>
		<rect width="24" height="24" rx="12" fill="url(#sv-grad)"></rect>
		<g transform="translate(-9.78,-10) scale(0.022)">
			<path d="m1180.44,1048.28l-126.31-133.3,90.45-42.77c90.86-42.96,129.82-151.84,86.86-242.7-1.48-3.12-4.13-5.53-7.38-6.69-3.25-1.16-6.83-.99-9.95.49l-157.23,74.35c-3.2,1.43-6.3,2.9-9.32,4.41l-198.96,94.09c-28.24,13.36-48.52,39.67-54.25,70.38-5.73,30.71,3.71,62.56,25.23,85.18l126.31,133.3-90.45,42.77c-90.86,42.97-129.82,151.84-86.86,242.7,1.48,3.12,4.13,5.53,7.38,6.69.66.23,1.32.41,2,.54,2.68.5,5.46.15,7.95-1.03l365.51-172.84c28.24-13.36,48.52-39.67,54.25-70.38,5.73-30.71-3.71-62.56-25.23-85.18Zm32.54-395.63c28.23,75.23-5.62,161.07-79.53,196.03l-97.36,46.04c-13.31-17.79-43.36-63.88-33.92-106.74,5.59-25.37,24.68-46.36,56.78-62.49l154.03-72.84Zm-425.95,694.7c-28.23-75.23,5.62-161.07,79.53-196.03l98.31-46.49c14.88,16,51.38,60.2,44.52,102.19-4.2,25.7-24.84,47.22-61.35,63.96-.77.35-1.49.78-2.15,1.25l-158.85,75.12Zm353.26-167.05l-111.84,52.89c3.17-6.99,5.39-14.32,6.64-21.97,10.5-64.27-52.67-126.08-58.18-131.33l-138.45-146.1c-15.79-16.6-22.71-39.96-18.52-62.48,4.2-22.52,19.07-41.82,39.78-51.61l124.46-58.86c-3.31,6.88-5.81,14.09-7.46,21.64-14.73,67.2,43.34,134.2,45.82,137.02.07.08.14.14.21.22.04.04.07.09.12.14l138.69,146.36c15.79,16.6,22.71,39.96,18.52,62.48-4.2,22.52-19.07,41.82-39.78,51.61Z" fill="white"></path>
		</g>
	</svg>
{/snippet}


{#if visible}
<div
	{...{ [IGNORE_ATTR]: '' }}
	data-svelte-scan-toolbar
	class:sv-dragging={dragging}
	class:sv-animating={animating}
	class:sv-pos-bottom={config.position.includes('bottom')}
	class:sv-pos-right={config.position.includes('right')}
	style={getPositionStyle()}
>
	{#if !expanded}
		<!-- ============================= -->
		<!-- PILL -->
		<!-- ============================= -->
		<div class="sv-pill-wrapper">
			<div class="sv-pill" bind:this={pillEl} onmousedown={onMouseDown} aria-label="SVIBE health monitor" role="toolbar" tabindex="0">
				<div class="sv-brand">
					{@render svibeLogo()}
				</div>
				<div class="sv-metrics">
					<span class="sv-fps" style="color: {fpsColor}">{fps}<span class="sv-fps-unit">fps</span></span>
				</div>
				<div class="sv-pill-actions">
					<button class="sv-pill-btn" class:sv-hmr-paused={hmrPaused} onclick={toggleHmr} title={hmrPaused ? 'Resume HMR' : 'Pause HMR'} aria-label={hmrPaused ? 'Resume HMR' : 'Pause HMR'}>
						{#if hmrPaused}
							<Play size={13} />
						{:else}
							<Pause size={13} />
						{/if}
					</button>
					<button class="sv-pill-btn sv-pill-btn-with-badge" onclick={copyFrontendReport} title="Copy frontend report" aria-label="Copy frontend report">
						{#if copied === 'frontend'}
							<Check size={13} />
						{:else}
							<Monitor size={12} />
						{/if}
						{#if issueCount > 0}<span class="sv-icon-badge sv-icon-badge-{severity}">{issueCount}</span>{/if}
					</button>
					<button class="sv-pill-btn sv-pill-btn-with-badge" onclick={copyServerLogs} title="Copy server logs" aria-label="Copy server logs">
						{#if copied === 'server'}
							<Check size={13} />
						{:else}
							<Server size={12} />
						{/if}
						{#if serverIssueCount > 0}<span class="sv-icon-badge sv-icon-badge-red">{serverIssueCount}</span>{/if}
					</button>
					<button
						class="sv-pill-btn sv-pill-btn-danger"
						onclick={purgeServerLogs}
						title="Purge server logs"
						aria-label="Purge server logs"
						disabled={stats.serverLogs.length === 0}
					>
						<Trash2 size={12} />
					</button>
				</div>
			</div>
		</div>

	{:else}
		<!-- ============================= -->
		<!-- PANEL -->
		<!-- ============================= -->
		<div class="sv-panel" class:sv-panel-ready={panelReady} bind:this={pillEl}>
			<div class="sv-header" role="toolbar" onmousedown={onMouseDown} style="cursor: grab" tabindex="0">
				<div class="sv-header-brand">
					{@render svibeLogo()}
					<span>svibe</span>
					<span class="sv-version">v{version}</span>
				</div>
				<div class="sv-header-actions">
					<button class="sv-header-btn" class:sv-hmr-paused={hmrPaused} onclick={toggleHmr} title={hmrPaused ? 'Resume HMR' : 'Pause HMR'}>
						{#if hmrPaused}
							<Play size={13} />
						{:else}
							<Pause size={13} />
						{/if}
					</button>
					<button class="sv-header-btn" onclick={(e) => {
						if (activeTab === 'notes') { inspectorController.copyNotes(); e.stopPropagation() }
						else { doCopy(formatTabForLLM(activeTab), e) }
					}} title="Copy report">
						{#if copied === 'shared' || inspectorController.copyFeedback}
							<Check size={13} />
						{:else}
							<Copy size={12} />
						{/if}
					</button>
					<button class="sv-header-btn" class:sv-inspect-active={inspectorController.enabled} onclick={inspectorController.toggle} title="Inspect element ({INSPECT_LABEL})">
						{#if inspectorController.enabled}
							<SquareDashedMousePointer size={14} />
						{:else}
							<MousePointer size={14} />
						{/if}
					</button>
					<button class="sv-header-btn" class:sv-settings-active={showSettings} aria-expanded={showSettings} onclick={() => (showSettings = !showSettings)} title="Settings">
						<Settings size={14} />
					</button>
					<button class="sv-header-btn" onclick={() => { expanded = false; showSettings = false; if (inspectorController.enabled) inspectorController.deactivate() }} title="Collapse">
						<X size={14} />
					</button>
				</div>
			</div>

			{#if showSettings}
				<!-- ============================= -->
				<!-- SETTINGS (tabbed) -->
				<!-- ============================= -->
				<div class="sv-tabs" role="tablist">
					<button class="sv-tab" class:sv-tab-active={settingsTab === 'general'} role="tab" aria-selected={settingsTab === 'general'} onclick={() => setSettingsTab('general')}>General</button>
					<button class="sv-tab" class:sv-tab-active={settingsTab === 'inspector'} role="tab" aria-selected={settingsTab === 'inspector'} onclick={() => setSettingsTab('inspector')}>Inspector</button>
					<button class="sv-tab" class:sv-tab-active={settingsTab === 'observers'} role="tab" aria-selected={settingsTab === 'observers'} onclick={() => setSettingsTab('observers')}>Observers</button>
				</div>

				<div class="sv-settings" role="tabpanel">
					{#if settingsTab === 'general'}
						<div class="sv-settings-section">
							<div class="sv-settings-section-label">Display</div>
							<button class="sv-toggle-row" role="switch" aria-checked={config.overlay} onclick={toggleOverlay}>
								<div class="sv-toggle-info">
									<span class="sv-toggle-label">Flash Overlay</span>
									<span class="sv-toggle-desc">{OVERLAY_DESC}</span>
								</div>
								<span class="sv-toggle-track" class:sv-toggle-on={config.overlay}>
									<span class="sv-toggle-thumb"></span>
								</span>
							</button>
						</div>

						<div class="sv-settings-section">
							<div class="sv-settings-section-label">Position</div>
							<div class="sv-position-picker">
								<div class="sv-position-corners">
									{#each ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as pos (pos)}
										<button
											class="sv-position-chip"
											class:sv-position-active={config.position === pos}
											title={POSITION_LABELS[pos as InspectorPosition] ?? pos}
											onclick={() => setPosition(pos as Corner)}
										>
											<span class="sv-position-icon sv-position-{pos}"></span>
										</button>
									{/each}
								</div>
							</div>
						</div>

					{:else if settingsTab === 'inspector'}
						<button class="sv-toggle-row" onclick={cycleOutputMode}>
							<div class="sv-toggle-info">
								<span class="sv-toggle-label">Output Mode</span>
								<span class="sv-toggle-desc">Detail level for copied annotation output</span>
							</div>
							<span class="sv-output-mode-value">
								<span>{OUTPUT_MODE_OPTIONS.find((o) => o.value === inspectorController.settings.outputMode)?.label ?? 'Standard'}</span>
								<span class="sv-mode-dots">
									{#each OUTPUT_MODE_OPTIONS as _, idx (idx)}
										<span class="sv-mode-dot" class:sv-mode-dot-active={idx === OUTPUT_MODE_OPTIONS.findIndex((o) => o.value === inspectorController.settings.outputMode)}></span>
									{/each}
								</span>
							</span>
						</button>
						<button class="sv-toggle-row" role="switch" aria-checked={inspectorController.settings.blockPageInteractions} onclick={() => inspectorController.setSetting("blockPageInteractions", !inspectorController.settings.blockPageInteractions)}>
							<div class="sv-toggle-info">
								<span class="sv-toggle-label">Block page interactions</span>
								<span class="sv-toggle-desc">Prevent clicks from reaching the page while inspecting</span>
							</div>
							<span class="sv-toggle-track" class:sv-toggle-on={inspectorController.settings.blockPageInteractions}>
								<span class="sv-toggle-thumb"></span>
							</span>
						</button>
						<button class="sv-toggle-row" role="switch" aria-checked={inspectorController.settings.pauseAnimations} onclick={() => inspectorController.setPauseAnimations(!inspectorController.settings.pauseAnimations)}>
							<div class="sv-toggle-info">
								<span class="sv-toggle-label">Pause animations</span>
								<span class="sv-toggle-desc">Freeze CSS and Web Animations when inspector is active</span>
							</div>
							<span class="sv-toggle-track" class:sv-toggle-on={inspectorController.settings.pauseAnimations}>
								<span class="sv-toggle-thumb"></span>
							</span>
						</button>
						<button class="sv-toggle-row" role="switch" aria-checked={inspectorController.settings.clearOnCopy} onclick={() => inspectorController.setSetting("clearOnCopy", !inspectorController.settings.clearOnCopy)}>
							<div class="sv-toggle-info">
								<span class="sv-toggle-label">Clear on copy</span>
								<span class="sv-toggle-desc">Remove all annotations after copying to clipboard</span>
							</div>
							<span class="sv-toggle-track" class:sv-toggle-on={inspectorController.settings.clearOnCopy}>
								<span class="sv-toggle-thumb"></span>
							</span>
						</button>
						<button class="sv-toggle-row" role="switch" aria-checked={inspectorController.settings.includeComponentContext} onclick={() => inspectorController.setSetting("includeComponentContext", !inspectorController.settings.includeComponentContext)}>
							<div class="sv-toggle-info">
								<span class="sv-toggle-label">Component context</span>
								<span class="sv-toggle-desc">Include Svelte component name and source location</span>
							</div>
							<span class="sv-toggle-track" class:sv-toggle-on={inspectorController.settings.includeComponentContext}>
								<span class="sv-toggle-thumb"></span>
							</span>
						</button>
						<button class="sv-toggle-row" role="switch" aria-checked={inspectorController.settings.includeComputedStyles} onclick={() => inspectorController.setSetting("includeComputedStyles", !inspectorController.settings.includeComputedStyles)}>
							<div class="sv-toggle-info">
								<span class="sv-toggle-label">Computed styles</span>
								<span class="sv-toggle-desc">Attach resolved CSS properties to each annotation</span>
							</div>
							<span class="sv-toggle-track" class:sv-toggle-on={inspectorController.settings.includeComputedStyles}>
								<span class="sv-toggle-thumb"></span>
							</span>
						</button>

					{:else if settingsTab === 'observers'}
						{#each OBSERVER_LABELS as { key, label, desc } (key)}
							<button class="sv-toggle-row" role="switch" aria-checked={config.observers[key]} onclick={() => toggleObserver(key)}>
								<div class="sv-toggle-info">
									<span class="sv-toggle-label">{label}</span>
									<span class="sv-toggle-desc">{desc}</span>
								</div>
								<span class="sv-toggle-track" class:sv-toggle-on={config.observers[key]}>
									<span class="sv-toggle-thumb"></span>
								</span>
							</button>
						{/each}
					{/if}
				</div>

			{:else}

			<div class="sv-tabs" role="tablist">
				<button class="sv-tab" class:sv-tab-active={activeTab === 'overview'} role="tab" aria-selected={activeTab === 'overview'} onclick={() => (activeTab = 'overview')}>Overview</button>
				<button class="sv-tab" class:sv-tab-active={activeTab === 'issues'} role="tab" aria-selected={activeTab === 'issues'} onclick={() => (activeTab = 'issues')}>
					Issues{#if issueCount > 0}<span class="sv-tab-badge sv-badge-{severity}">{issueCount}</span>{/if}
				</button>
				<button class="sv-tab" class:sv-tab-active={activeTab === 'console'} role="tab" aria-selected={activeTab === 'console'} onclick={() => (activeTab = 'console')}>
					Console{#if stats.consoleErrors.length > 0}<span class="sv-tab-badge sv-badge-{consoleErrorCount > 0 ? 'red' : 'yellow'}">{stats.consoleErrors.length}</span>{/if}
				</button>
				<button class="sv-tab" class:sv-tab-active={activeTab === 'server'} role="tab" aria-selected={activeTab === 'server'} onclick={() => (activeTab = 'server')}>
					Server{#if serverBadgeCount > 0}<span class="sv-tab-badge sv-badge-{serverErrorCount > 0 ? 'red' : 'yellow'}">{serverBadgeCount}</span>{/if}
				</button>
				<button class="sv-tab" class:sv-tab-active={activeTab === 'inp'} role="tab" aria-selected={activeTab === 'inp'} onclick={() => (activeTab = 'inp')}>
					INP{#if slowInteractions.length > 0}<span class="sv-tab-badge sv-badge-yellow">{slowInteractions.length}</span>{/if}
				</button>
				<button class="sv-tab" class:sv-tab-active={activeTab === 'notes'} role="tab" aria-selected={activeTab === 'notes'} onclick={() => (activeTab = 'notes')}>
					Notes{#if inspectorController.notes.length > 0}<span class="sv-tab-badge sv-badge-green">{inspectorController.notes.length}</span>{/if}
				</button>
			</div>

			<div class="sv-content" role="tabpanel">
				{#if activeTab === 'overview'}
					<div class="sv-stat">
						<span class="sv-stat-label">Mutations/sec</span>
						<span class="sv-stat-value">{stats.mutationsPerSec}</span>
					</div>
					<div class="sv-stat">
						<span class="sv-stat-label">Signals</span>
						<span class="sv-stat-value">{stats.reactivity.signals}</span>
					</div>
					<div class="sv-stat">
						<span class="sv-stat-label">Deriveds</span>
						<span class="sv-stat-value">{stats.reactivity.deriveds}</span>
					</div>
					<div class="sv-stat">
						<span class="sv-stat-label">Effects</span>
						<span class="sv-stat-value">{stats.reactivity.effects}</span>
					</div>
					<div class="sv-stat">
						<span class="sv-stat-label">Leaks</span>
						<span class="sv-stat-value" style="color: {stats.leaks.length > 0 ? 'var(--sv-red)' : 'inherit'}">{stats.leaks.length}</span>
					</div>
					<div class="sv-stat">
						<span class="sv-stat-label">Console</span>
						<span class="sv-stat-value" style="color: {consoleErrorCount > 0 ? 'var(--sv-red)' : consoleWarnCount > 0 ? 'var(--sv-yellow)' : 'inherit'}">{stats.consoleErrors.length}</span>
					</div>
					<div class="sv-stat">
						<span class="sv-stat-label">Server</span>
						<span class="sv-stat-value" style="color: {serverErrorCount > 0 ? 'var(--sv-red)' : serverWarnCount > 0 ? 'var(--sv-yellow)' : 'inherit'}">{serverBadgeCount}</span>
					</div>

				{:else if activeTab === 'issues'}
					{#if issueCount === 0}
						<div class="sv-empty">All clear. Hot spots, runaway effects, and memory leaks will appear here.</div>
					{:else}
						{#if stats.hotSpots.length > 0}
							<div class="sv-section-label">Hot Spots</div>
							{#each stats.hotSpots as spot, idx (idx)}
								<div class="sv-item">
									<div class="sv-item-row">
										<div>
											<div class="sv-item-title">{spot.component}</div>
											<div class="sv-item-detail">{spot.mutations} mutations ({spot.mutations}/sec)</div>
										</div>
										<button class="sv-copy-item" onclick={(e) => doCopy(`${spot.component}: ${spot.mutations} mutations (${spot.mutations}/sec)`, e)}>
											<Copy size={12} />
										</button>
									</div>
								</div>
							{/each}
						{/if}

						{#if stats.effectOffenders.length > 0}
							<div class="sv-section-label">Runaway Effects</div>
							{#each stats.effectOffenders as offender (offender.id)}
								<div class="sv-item">
									<div class="sv-item-row">
										<div>
											<div class="sv-item-title">
												{offender.component}
												<span class="sv-badge sv-badge-{offender.severity === 'critical' ? 'red' : 'yellow'}">{offender.severity}</span>
											</div>
											<div class="sv-item-detail">{offender.count} executions (id: {offender.id})</div>
										</div>
										<button class="sv-copy-item" onclick={(e) => doCopy(`[${offender.severity.toUpperCase()}] ${offender.component}: ${offender.count} executions (${offender.id})`, e)}>
											<Copy size={12} />
										</button>
									</div>
								</div>
							{/each}
						{/if}

						{#if stats.leaks.length > 0}
							<div class="sv-section-label">Memory Leaks</div>
							{#each stats.leaks as leak, idx (idx)}
								<div class="sv-item">
									<div class="sv-item-row">
										<div>
											<div class="sv-item-title">{leak.component}</div>
											<div class="sv-item-detail">{leak.leakType}: {leak.details}</div>
										</div>
										<button class="sv-copy-item" onclick={(e) => doCopy(`${leak.component}: ${leak.leakType} (${leak.details})`, e)}>
											<Copy size={12} />
										</button>
									</div>
								</div>
							{/each}
						{/if}
					{/if}

				{:else if activeTab === 'console'}
					{#if stats.consoleErrors.length === 0}
						<div class="sv-empty">No console errors or warnings captured yet.</div>
					{:else}
						{#each stats.consoleErrors as entry, idx (idx)}
							<div class="sv-item">
								<div class="sv-item-row">
									<div>
										<div class="sv-item-title">
											<span class="sv-badge sv-badge-{entry.level === 'error' ? 'red' : 'yellow'}">{entry.level}</span>
											<span class="sv-console-msg">{entry.message.length > 120 ? entry.message.slice(0, 120) + '...' : entry.message}</span>
										</div>
										<div class="sv-item-detail">{entry.source}</div>
									</div>
									<button class="sv-copy-item" onclick={(e) => doCopy(`[${entry.level.toUpperCase()}] ${entry.message}\nSource: ${entry.source}`, e)}>
										<Copy size={12} />
									</button>
								</div>
							</div>
						{/each}
					{/if}

				{:else if activeTab === 'server'}
					<div class="sv-server-actions">
						<button class="sv-server-copy" onclick={(e) => doCopy(formatServerLogsForLLM(stats), e)}>
							<Copy size={12} /> Copy all
						</button>
						<button class="sv-server-clear" onclick={() => collector.resetServerLogs?.()}>
							Clear
						</button>
					</div>
					{#if stats.serverLogs.length === 0}
						<div class="sv-empty">No server logs. Server-side console output appears here via HMR.</div>
					{:else}
						{#each stats.serverLogs as entry, idx (idx)}
							<div class="sv-item">
								<div class="sv-item-row">
									<div>
										<div class="sv-item-title">
											<span class="sv-level-icon sv-level-{entry.level}">
												{#if entry.level === 'info'}&#8505;{:else if entry.level === 'warn'}&#9888;{:else}&#9679;{/if}
											</span>
											<span class="sv-console-msg">{entry.message.length > 120 ? entry.message.slice(0, 120) + '...' : entry.message}</span>
										</div>
										<div class="sv-item-detail">
											{new Date(entry.timestamp).toLocaleTimeString('en-US', { hour12: false })}
											{#if entry.stack}
												<span class="sv-stack-hint"> (has stack)</span>
											{/if}
										</div>
									</div>
									<button class="sv-copy-item" onclick={(e) => {
										const time = new Date(entry.timestamp).toLocaleTimeString('en-US', { hour12: false })
										const text = `[${entry.level.toUpperCase()} ${time}] ${entry.message}${entry.stack ? '\nStack: ' + entry.stack : ''}`
										doCopy(text, e)
									}}>
										<Copy size={12} />
									</button>
								</div>
							</div>
						{/each}
					{/if}

				{:else if activeTab === 'inp'}
					{#if slowInteractions.length === 0}
						<div class="sv-empty">No slow interactions. Click, keydown, and input events over 200ms appear here.</div>
					{:else}
						{#each slowInteractions as interaction, idx (idx)}
							<div class="sv-item">
								<div class="sv-item-row">
									<div>
										<div class="sv-item-title">
											{interaction.component}
											<span class="sv-badge sv-badge-{interaction.classification === 'poor' ? 'red' : 'yellow'}">{interaction.classification}</span>
										</div>
										<div class="sv-item-detail">{interaction.eventType}: {Math.round(interaction.duration)}ms</div>
										{#if interaction.phases}
											{@const total = interaction.phases.handler + interaction.phases.reactive + interaction.phases.paint + interaction.phases.composite}
											{#if total > 0}
												<div class="sv-phase-bars">
													<div class="sv-phase-bar sv-phase-handler" style="width: {(interaction.phases.handler / total) * 100}%" title="Handler: {Math.round(interaction.phases.handler)}ms"></div>
													<div class="sv-phase-bar sv-phase-reactive" style="width: {(interaction.phases.reactive / total) * 100}%" title="Reactive: {Math.round(interaction.phases.reactive)}ms"></div>
													<div class="sv-phase-bar sv-phase-paint" style="width: {(interaction.phases.paint / total) * 100}%" title="Paint: {Math.round(interaction.phases.paint)}ms"></div>
													<div class="sv-phase-bar sv-phase-composite" style="width: {(interaction.phases.composite / total) * 100}%" title="Composite: {Math.round(interaction.phases.composite)}ms"></div>
												</div>
												<div class="sv-phase-legend">
													<span class="sv-phase-label"><span class="sv-phase-dot sv-phase-handler"></span>Handler {Math.round(interaction.phases.handler)}ms</span>
													<span class="sv-phase-label"><span class="sv-phase-dot sv-phase-reactive"></span>Reactive {Math.round(interaction.phases.reactive)}ms</span>
													<span class="sv-phase-label"><span class="sv-phase-dot sv-phase-paint"></span>Paint {Math.round(interaction.phases.paint)}ms</span>
													<span class="sv-phase-label"><span class="sv-phase-dot sv-phase-composite"></span>Composite {Math.round(interaction.phases.composite)}ms</span>
												</div>
											{/if}
										{/if}
									</div>
									<button class="sv-copy-item" onclick={(e) => doCopy(`[${interaction.classification.toUpperCase()}] ${interaction.component}: ${interaction.eventType} ${Math.round(interaction.duration)}ms (handler: ${Math.round(interaction.phases.handler)}ms, reactive: ${Math.round(interaction.phases.reactive)}ms, paint: ${Math.round(interaction.phases.paint)}ms, composite: ${Math.round(interaction.phases.composite)}ms)`, e)}>
										<Copy size={12} />
									</button>
								</div>
							</div>
						{/each}
					{/if}

				{:else if activeTab === 'notes'}
					{#if inspectorController.notes.length > 0}
						<div class="sv-server-actions">
							<button class="sv-server-copy" onclick={(e) => { inspectorController.copyNotes(); e.stopPropagation() }}>
								<Copy size={12} /> Copy all
							</button>
							{#if inspectorController.deleteAllState.active}
								<button class="sv-server-clear sv-delete-all-active" onclick={() => inspectorController.cancelDeleteAll()}>
									Cancel ({Math.ceil(inspectorController.deleteAllState.remainingMs / 1000)}s)
								</button>
							{:else}
								<button class="sv-server-clear" onclick={() => inspectorController.requestDeleteAll()}>
									Clear all
								</button>
							{/if}
						</div>
					{/if}
					{#if inspectorController.notes.length === 0}
						<div class="sv-empty">No annotations yet. Use inspect mode to add notes.</div>
					{:else}
						{#each inspectorController.notes as note (note.id)}
							<div class="sv-item">
								<div class="sv-item-row">
									<div>
										<div class="sv-item-title">
											<span class="sv-note-kind-icon">
												{#if note.kind === 'element'}
													<MousePointer size={12} />
												{:else if note.kind === 'text'}
													<Type size={12} />
												{:else if note.kind === 'group'}
													<Group size={12} />
												{:else}
													<SquareDashedMousePointer size={12} />
												{/if}
											</span>
											<span>{note.targetLabel}</span>
										</div>
										<div class="sv-item-detail sv-note-text">{note.note}</div>
										<div class="sv-item-detail">{new Date(note.createdAt).toLocaleTimeString('en-US', { hour12: false })}</div>
									</div>
									<div class="sv-note-actions">
										<button class="sv-copy-item sv-note-action-visible" onclick={(e) => { e.stopPropagation(); inspectorController.openNote(note.id) }}>
											<StickyNote size={12} />
										</button>
										<button class="sv-copy-item sv-note-action-visible" onclick={(e) => { e.stopPropagation(); inspectorController.deleteNote(note.id) }}>
											<Trash2 size={12} />
										</button>
									</div>
								</div>
							</div>
						{/each}
					{/if}
				{/if}
			</div>
			{/if}

			<div class="sv-shortcut-hint">
				<span class="sv-shortcut-kbd">{INSPECT_LABEL}</span> inspect
				<span class="sv-shortcut-sep">·</span>
				<span class="sv-shortcut-kbd">{COPY_LABEL}</span> frontend
				<span class="sv-shortcut-sep">·</span>
				<span class="sv-shortcut-kbd">{LOGS_LABEL}</span> server
				<span class="sv-shortcut-sep">·</span>
				<span class="sv-shortcut-kbd">{HMR_LABEL}</span> {hmrPaused ? 'resume' : 'pause'}
				<span class="sv-shortcut-sep">·</span>
				<span class="sv-shortcut-kbd">{SHORTCUT_LABEL}</span> toggle
				{#if inspectorController.notes.length > 0}
					<span class="sv-shortcut-sep">·</span>
					<span class="sv-note-count">{inspectorController.notes.length}</span>
				{/if}
			</div>
		</div>
	{/if}

	<!-- ============================= -->
	<!-- INSPECTOR -->
	<!-- ============================= -->
	<InspectorOverlay controller={inspectorController} />
	<NoteComposer controller={inspectorController} />
</div>
{/if}
