
export const INSPECTOR_STYLES = `
/* =============================================
   svibe inspector overlay
   Hover outlines, note markers, composer panel,
   selection rects, drag rect, block overlay.
   All scoped under [data-svelte-scan-toolbar].
   ============================================= */

/* =============================================
   HOVER OUTLINE
   Tracks hovered element with smooth transitions.
   ============================================= */

[data-svelte-scan-toolbar] .sv-hover-outline {
  position: fixed;
  z-index: 9998;
  box-sizing: border-box;
  border: 1.5px solid color-mix(in srgb, var(--sv-marker-color, var(--sv-accent)) 70%, transparent);
  border-radius: 6px;
  background: color-mix(in srgb, var(--sv-marker-color, var(--sv-accent)) 5%, transparent);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--sv-marker-color, var(--sv-accent)) 12%, transparent) inset;
  pointer-events: none;
  transition:
    left 180ms cubic-bezier(0.22, 1, 0.36, 1),
    top 180ms cubic-bezier(0.22, 1, 0.36, 1),
    width 180ms cubic-bezier(0.22, 1, 0.36, 1),
    height 180ms cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform;
}

/* =============================================
   HOVER BADGE
   Tag name + source info + open button below outline.
   ============================================= */

[data-svelte-scan-toolbar] .sv-hover-badge {
  position: fixed;
  z-index: 9999;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: min(19.5rem, calc(100vw - 16px));
  padding: 6px 8px 6px 10px;
  border: 1px solid var(--sv-border);
  border-radius: 11px;
  background: var(--sv-bg);
  backdrop-filter: blur(16px) saturate(1.6);
  -webkit-backdrop-filter: blur(16px) saturate(1.6);
  color: var(--sv-text);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4), 0 1px 3px rgba(0, 0, 0, 0.3);
  pointer-events: none;
  transition:
    left 180ms cubic-bezier(0.22, 1, 0.36, 1),
    top 180ms cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform;
}

[data-svelte-scan-toolbar] .sv-hover-label {
  display: block;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: var(--sv-text);
  font-size: 0.8rem;
  font-style: italic;
  font-weight: 600;
  line-height: 1.15;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--sv-mono);
}

[data-svelte-scan-toolbar] .sv-hover-source {
  display: block;
  flex-shrink: 0;
  color: var(--sv-text-dim);
  font-size: 0.7rem;
  font-family: var(--sv-mono);
  white-space: nowrap;
}

[data-svelte-scan-toolbar] .sv-hover-action {
  display: inline-flex;
  flex-shrink: 0;
  gap: 0.34rem;
  align-items: center;
  padding: 0 0 0 8px;
  border: none;
  border-left: 1px solid var(--sv-border);
  border-radius: 0;
  background: transparent;
  color: var(--sv-text-muted);
  font: inherit;
  font-size: 0.72rem;
  line-height: 1;
  cursor: pointer;
  pointer-events: auto;
  transition:
    color 160ms ease,
    opacity 160ms ease,
    transform 160ms ease;
}

[data-svelte-scan-toolbar] .sv-hover-action:hover:not(:disabled) {
  color: var(--sv-text);
  transform: translateY(-0.5px);
}

[data-svelte-scan-toolbar] .sv-hover-action:disabled {
  opacity: 0.38;
  cursor: not-allowed;
}

[data-svelte-scan-toolbar] .sv-hover-kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1rem;
  height: 1rem;
  padding: 0 0.2rem;
  border: 1px solid var(--sv-border);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--sv-text-muted);
  font-size: 0.64rem;
  font-family: var(--sv-mono);
}

/* =============================================
   NOTE MARKERS
   Fixed numbered circles anchored to elements.
   ============================================= */

[data-svelte-scan-toolbar] .sv-note-marker {
  position: fixed;
  z-index: 9997;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: 1.5px solid rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  background: var(--sv-marker-color, var(--sv-accent));
  color: #ffffff;
  font-family: var(--sv-sans);
  font-size: 0.7rem;
  font-weight: 700;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3);
  transform: translate(-50%, -50%);
  cursor: pointer;
  will-change: transform, opacity;
  transition:
    opacity 180ms ease,
    transform 180ms ease,
    box-shadow 180ms ease,
    filter 180ms ease;
}

[data-svelte-scan-toolbar] .sv-note-marker:hover,
[data-svelte-scan-toolbar] .sv-note-marker.sv-marker-hovered,
[data-svelte-scan-toolbar] .sv-note-marker:focus-visible {
  transform: translate(-50%, -50%) scale(1.06);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5), 0 4px 16px rgba(0, 0, 0, 0.3);
}

[data-svelte-scan-toolbar] .sv-note-marker.sv-marker-active {
  filter: saturate(1.14);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5), 0 4px 16px rgba(0, 0, 0, 0.3);
}

[data-svelte-scan-toolbar] .sv-note-marker.sv-marker-hidden {
  opacity: 0;
  pointer-events: none;
  transform: translate(-50%, -50%) scale(0.9);
}

[data-svelte-scan-toolbar] .sv-note-marker.sv-marker-unresolved {
  opacity: 0.78;
}

/* =============================================
   COMPOSER PANEL
   Floating input panel for note creation/editing.
   ============================================= */

[data-svelte-scan-toolbar] .sv-composer {
  position: fixed;
  z-index: 9999;
  width: min(280px, calc(100vw - 28px));
  padding: 12px 12px 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  background: rgba(29, 29, 31, 0.985);
  backdrop-filter: blur(18px) saturate(1.6);
  -webkit-backdrop-filter: blur(18px) saturate(1.6);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5), 0 8px 32px rgba(0, 0, 0, 0.3);
  font-family: var(--sv-sans);
  font-size: 13px;
  color: var(--sv-text);
}

[data-svelte-scan-toolbar] .sv-composer-quote {
  margin-bottom: 8px;
  padding: 7px 8px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--sv-text-muted);
  font-size: 0.76rem;
  font-style: italic;
  line-height: 1.4;
}

[data-svelte-scan-toolbar] .sv-composer-textarea {
  width: 100%;
  min-height: 64px;
  padding: 10px 11px;
  border: 1px solid color-mix(in srgb, var(--sv-marker-color, var(--sv-accent)) 88%, transparent);
  border-radius: 11px;
  background: rgba(37, 37, 40, 1);
  color: var(--sv-text);
  font: inherit;
  font-size: 0.84rem;
  line-height: 1.34;
  resize: none;
  outline: none;
  box-sizing: border-box;
  -webkit-font-smoothing: antialiased;
}

[data-svelte-scan-toolbar] .sv-composer-textarea::placeholder {
  color: var(--sv-text-dim);
}

[data-svelte-scan-toolbar] .sv-composer-textarea:focus {
  border-color: var(--sv-marker-color, var(--sv-accent));
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--sv-marker-color, var(--sv-accent)) 20%, transparent);
}

[data-svelte-scan-toolbar] .sv-composer-textarea::-webkit-scrollbar {
  width: 6px;
}

[data-svelte-scan-toolbar] .sv-composer-textarea::-webkit-scrollbar-track {
  background: transparent;
}

[data-svelte-scan-toolbar] .sv-composer-textarea::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 3px;
}

[data-svelte-scan-toolbar] .sv-composer-textarea::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.25);
}

[data-svelte-scan-toolbar] .sv-composer-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}

[data-svelte-scan-toolbar] .sv-composer-delete,
[data-svelte-scan-toolbar] .sv-composer-cancel,
[data-svelte-scan-toolbar] .sv-composer-submit {
  border: none;
  background: transparent;
  font: inherit;
  cursor: pointer;
  transition:
    transform 160ms ease,
    opacity 160ms ease,
    background 160ms ease,
    color 160ms ease;
}

[data-svelte-scan-toolbar] .sv-composer-delete {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  margin-right: auto;
  border-radius: 999px;
  color: var(--sv-red);
}

[data-svelte-scan-toolbar] .sv-composer-delete:hover {
  background: rgba(248, 113, 113, 0.12);
}

[data-svelte-scan-toolbar] .sv-composer-cancel {
  padding: 0.4rem 0.875rem;
  border-radius: 999px;
  color: var(--sv-text-muted);
  font-size: 0.82rem;
  font-weight: 500;
}

[data-svelte-scan-toolbar] .sv-composer-cancel:hover {
  opacity: 0.92;
  background: rgba(255, 255, 255, 0.08);
  color: var(--sv-text);
}

[data-svelte-scan-toolbar] .sv-composer-cancel.sv-inactive {
  opacity: 0.4;
}

[data-svelte-scan-toolbar] .sv-composer-submit {
  padding: 0.4rem 0.875rem;
  border-radius: 999px;
  background: var(--sv-marker-color, var(--sv-accent));
  color: #ffffff;
  font-size: 0.82rem;
  font-weight: 500;
}

[data-svelte-scan-toolbar] .sv-composer-submit:hover:not(:disabled) {
  opacity: 0.92;
  transform: translateY(-1px);
}

[data-svelte-scan-toolbar] .sv-composer-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* Anchor marker (+ icon at element origin) */
[data-svelte-scan-toolbar] .sv-composer-anchor {
  position: fixed;
  z-index: 9998;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  margin-left: -11px;
  margin-top: -11px;
  padding: 0;
  border: none;
  border-radius: 100px;
  background: var(--sv-marker-color, var(--sv-accent));
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  pointer-events: none;
  cursor: default;
}

[data-svelte-scan-toolbar] .sv-composer-anchor span {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
}

/* =============================================
   SELECTION OUTLINES
   Solid for elements, dashed for groups/areas.
   ============================================= */

[data-svelte-scan-toolbar] .sv-selection-outline {
  position: fixed;
  z-index: 9996;
  box-sizing: border-box;
  pointer-events: none;
}

[data-svelte-scan-toolbar] .sv-selection-outline.sv-solid {
  border: 1.5px solid color-mix(in srgb, var(--sv-marker-color, var(--sv-accent)) 70%, transparent);
  border-radius: 4px;
  background: color-mix(in srgb, var(--sv-marker-color, var(--sv-accent)) 5%, transparent);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--sv-marker-color, var(--sv-accent)) 12%, transparent) inset;
}

[data-svelte-scan-toolbar] .sv-selection-outline.sv-dashed {
  border: 2px dashed color-mix(in srgb, var(--sv-marker-color, var(--sv-accent)) 72%, transparent);
  border-radius: 4px;
  background: color-mix(in srgb, var(--sv-marker-color, var(--sv-accent)) 6%, transparent);
}

[data-svelte-scan-toolbar] .sv-selection-highlight {
  position: fixed;
  z-index: 9996;
  box-sizing: border-box;
  border-radius: 3px;
  background: color-mix(in srgb, var(--sv-marker-color, var(--sv-accent)) 18%, transparent);
  pointer-events: none;
}

/* =============================================
   AREA DRAG RECT
   Dashed rect drawn during rubber-band selection.
   ============================================= */

[data-svelte-scan-toolbar] .sv-area-drag {
  position: fixed;
  z-index: 9997;
  box-sizing: border-box;
  border: 2px dashed color-mix(in srgb, var(--sv-marker-color, var(--sv-accent)) 72%, transparent);
  border-radius: 4px;
  background: color-mix(in srgb, var(--sv-marker-color, var(--sv-accent)) 6%, transparent);
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--sv-marker-color, var(--sv-accent)) 10%, transparent),
    inset 0 0 0 1px color-mix(in srgb, var(--sv-marker-color, var(--sv-accent)) 12%, transparent);
  pointer-events: none;
}

/* =============================================
   BLOCK OVERLAY
   Full-screen transparent overlay capturing pointer
   events during inspect mode.
   ============================================= */

[data-svelte-scan-toolbar] .sv-block-overlay {
  position: fixed;
  inset: 0;
  z-index: 9990;
  background: transparent;
  cursor: crosshair;
  pointer-events: auto;
}

/* =============================================
   NOTE PREVIEW CARD
   Tooltip shown when hovering a note marker.
   ============================================= */

[data-svelte-scan-toolbar] .sv-note-preview {
  position: fixed;
  z-index: 9998;
  width: min(236px, calc(100vw - 24px));
  padding: 9px 12px 10px;
  border: 1px solid var(--sv-border);
  border-radius: 16px;
  background: var(--sv-bg);
  backdrop-filter: blur(16px) saturate(1.6);
  -webkit-backdrop-filter: blur(16px) saturate(1.6);
  color: var(--sv-text);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4), 0 1px 3px rgba(0, 0, 0, 0.3);
  pointer-events: none;
}

[data-svelte-scan-toolbar] .sv-note-preview-title {
  margin-bottom: 4px;
  overflow: hidden;
  color: var(--sv-text-muted);
  font-size: 0.79rem;
  font-style: italic;
  font-weight: 600;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

[data-svelte-scan-toolbar] .sv-note-preview-body {
  font-size: 0.78rem;
  line-height: 1.28;
  color: var(--sv-text);
}
`;
