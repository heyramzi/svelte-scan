<script lang="ts">
// =========================
// IMPORTS
// =========================
import { fade, scale } from 'svelte/transition'
import { Plus, Trash2 } from '@lucide/svelte'
import type { InspectorController } from '../inspector/controller.svelte'

// =========================
// PROPS
// =========================
let { controller }: { controller: InspectorController } = $props()

// =========================
// STATE
// =========================
let textareaEl = null;

// =========================
// EFFECTS
// =========================
$effect(() => {
	if (controller.composer && textareaEl) {
		textareaEl.focus()
		textareaEl.setSelectionRange(textareaEl.value.length, textareaEl.value.length)
	}
})

// =========================
// FUNCTIONS
// =========================
function handleKeyDown(e: KeyboardEvent) {
	if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
		e.preventDefault()
		controller.saveComposer()
	}
	if (e.key === 'Escape') {
		e.preventDefault()
		controller.closeComposer()
	}
}
</script>

<!-- =========================== -->
<!-- MARKUP -->
<!-- =========================== -->

{#if controller.composer}
	<!-- Outline rects -->
	{#each controller.composer.outlineRects as rect, index (`outline-${index}`)}
		<div
			class="sv-selection-outline sv-solid"
			data-svelte-scan-overlay
			style="left:{rect.left}px;top:{rect.top}px;width:{rect.width}px;height:{rect.height}px;--sv-marker-color:{controller.composer.accentColor}"
			in:fade={{ duration: 130 }}
			out:fade={{ duration: 100 }}
		></div>
	{/each}

	<!-- Highlight rects (text selections) -->
	{#each controller.composer.highlightRects as rect, index (`highlight-${index}`)}
		<div
			class="sv-selection-highlight"
			data-svelte-scan-overlay
			style="left:{rect.left}px;top:{rect.top}px;width:{rect.width}px;height:{rect.height}px;--sv-marker-color:{controller.composer.accentColor}"
			in:fade={{ duration: 120 }}
			out:fade={{ duration: 90 }}
		></div>
	{/each}

	<!-- Anchor marker -->
	<button
		class="sv-composer-anchor"
		data-svelte-scan-overlay
		style="left:{controller.composer.markerLeft}px;top:{controller.composer.markerTop}px;--sv-marker-color:{controller.composer.accentColor}"
		type="button"
		in:scale|global={{ duration: 150, start: 0.74, opacity: 0 }}
		out:scale={{ duration: 120, start: 1, opacity: 0 }}
	>
		<span><Plus size={16} /></span>
	</button>

	<!-- Composer panel -->
	<div
		class="sv-composer"
		data-svelte-scan-overlay
		style="left:{Math.min(controller.composer.markerLeft + 16, (typeof window !== 'undefined' ? window.innerWidth : 1000) - 296)}px;top:{controller.composer.markerTop + 16}px"
		in:scale={{ duration: 180, start: 0.94, opacity: 0.18 }}
		out:scale|global={{ duration: 180, start: 0.85, opacity: 0 }}
	>
		{#if controller.composer.selectedText}
			<div class="sv-composer-quote">"{controller.composer.selectedText}"</div>
		{/if}

		<textarea
			bind:this={textareaEl}
			class="sv-composer-textarea"
			data-svelte-scan-overlay
			placeholder={controller.composer.placeholder}
			rows="2"
			style="--sv-marker-color:{controller.composer.accentColor}"
			value={controller.noteDraft}
			oninput={(e) => controller.updateNoteDraft((e.currentTarget as HTMLTextAreaElement).value)}
			onkeydown={handleKeyDown}
		></textarea>

		<div class="sv-composer-actions">
			{#if controller.composer.noteId}
				<button class="sv-composer-delete" onclick={() => controller.deleteNote(controller.composer!.noteId!)}>
					<Trash2 size={15} />
				</button>
			{/if}
			<button class="sv-composer-cancel" onclick={controller.closeComposer}>Cancel</button>
			<button
				class="sv-composer-submit"
				style="--sv-marker-color:{controller.composer.accentColor}"
				onclick={controller.saveComposer}
			>
				{controller.composer.noteId ? 'Save' : 'Add'}
			</button>
		</div>
	</div>
{/if}
