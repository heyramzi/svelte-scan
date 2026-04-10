<script lang="ts">
// =========================
// IMPORTS
// =========================
import { backOut, cubicInOut } from 'svelte/easing'
import { fade, scale } from 'svelte/transition'
import type { InspectorController } from '../inspector/controller.svelte'
import { resolveDomPath } from '../inspector/dom-path'
import { buildRenderedMarkers } from './marker-utils'

// =========================
// PROPS
// =========================
let { controller }: { controller: InspectorController } = $props()

// =========================
// STATE
// =========================
let hoveredNoteId = $state<string | null>(null)

// =========================
// DERIVED
// =========================
let renderedMarkers = $derived(
	controller.toolbar.notesVisible
		? buildRenderedMarkers(controller.notes, (path) => {
				const element = resolveDomPath(path)
				const rect = element?.getBoundingClientRect()
				return rect ? { rect } : null
			})
		: []
)

// =========================
// FUNCTIONS
// =========================
function setHoveredNote(noteId: string | null) {
	if (controller.composer && noteId !== null) return
	hoveredNoteId = noteId
}

function getPreviewStyle(left: number, top: number) {
	const previewWidth = 236
	const clampedLeft = Math.min(
		Math.max(12, left - previewWidth * 0.58),
		(typeof window !== 'undefined' ? window.innerWidth : 1000) - previewWidth - 12,
	)
	const clampedTop = Math.max(12, top - 88)
	return `left:${clampedLeft}px;top:${clampedTop}px;`
}
</script>

<!-- =========================== -->
<!-- MARKUP -->
<!-- =========================== -->

{#if controller.enabled}
	<!-- Hover outline -->
	{#if controller.hoverInfo && !controller.composer}
		<div
			class="sv-hover-outline"
			data-svibe-overlay
			style="left:{controller.hoverInfo.rect.left}px;top:{controller.hoverInfo.rect.top}px;width:{controller.hoverInfo.rect.width}px;height:{controller.hoverInfo.rect.height}px;--sv-marker-color:{controller.settings.markerColor}"
			in:fade={{ duration: 100 }}
			out:fade={{ duration: 90 }}
		></div>
		<div
			class="sv-hover-badge"
			data-svibe-overlay
			style="left:{controller.hoverInfo.rect.left}px;top:{controller.hoverInfo.rect.bottom + 6}px"
			in:scale={{ duration: 120, start: 0.97 }}
			out:fade={{ duration: 90 }}
		>
			<span class="sv-hover-label">{controller.hoverInfo.tagName}{controller.hoverInfo.source ? ` — ${controller.hoverInfo.source.component}:${controller.hoverInfo.source.line}` : ''}</span>
			<span class="sv-hover-source">{controller.hoverInfo.dimensions.width}×{controller.hoverInfo.dimensions.height}</span>
			{#if controller.hoverInfo.source}
				<button class="sv-hover-action" data-svibe-overlay onclick={controller.open}>
					open <kbd class="sv-hover-kbd">o</kbd>
				</button>
			{/if}
		</div>
	{/if}

	<!-- Group selection preview -->
	{#if controller.selectionPreview}
		{#each controller.selectionPreview.rects as rect, index (`group-${index}`)}
			<div
				class="sv-selection-outline sv-dashed"
				data-svibe-overlay
				style="left:{rect.left}px;top:{rect.top}px;width:{rect.width}px;height:{rect.height}px;--sv-marker-color:{controller.settings.markerColor}"
			></div>
		{/each}
	{/if}

	<!-- Area drag rect -->
	{#if controller.dragSelection}
		<div
			class="sv-area-drag"
			data-svibe-overlay
			style="left:{controller.dragSelection.left}px;top:{controller.dragSelection.top}px;width:{controller.dragSelection.width}px;height:{controller.dragSelection.height}px;--sv-marker-color:{controller.settings.markerColor}"
		></div>
	{/if}
{/if}

<!-- Note markers (visible even when inspector not active) -->
{#each renderedMarkers as marker (marker.key)}
	<button
		class="sv-note-marker"
		class:sv-marker-active={controller.activeNoteId === marker.id}
		class:sv-marker-hovered={hoveredNoteId === marker.id}
		class:sv-marker-hidden={!controller.toolbar.notesVisible}
		data-svibe-overlay
		style="left:{marker.left}px;top:{marker.top}px;--sv-marker-color:{controller.settings.markerColor}"
		onclick={() => controller.openNote(marker.id)}
		onmouseenter={() => setHoveredNote(marker.id)}
		onmouseleave={() => setHoveredNote(null)}
		onfocus={() => setHoveredNote(marker.id)}
		onblur={() => setHoveredNote(null)}
		in:scale|global={{ duration: 180, start: 0.72, opacity: 0, easing: backOut }}
		out:scale|global={{ duration: 140, start: 1, opacity: 0, easing: cubicInOut }}
	>
		{marker.index}
	</button>

	{#if controller.toolbar.notesVisible && !controller.composer && hoveredNoteId === marker.id}
		<div
			class="sv-note-preview"
			data-svibe-overlay
			style={getPreviewStyle(marker.left, marker.top)}
			in:scale={{ duration: 150, start: 0.96 }}
			out:fade={{ duration: 120 }}
		>
			<div class="sv-note-preview-title">{marker.note.targetSummary}</div>
			<div class="sv-note-preview-body">{marker.note.note}</div>
		</div>
	{/if}
{/each}
