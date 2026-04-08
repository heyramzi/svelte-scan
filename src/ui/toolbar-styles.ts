/* oxlint-disable stop-slop/no-em-dash -- CSS template string, not prose */
export const TOOLBAR_STYLES = `
/* =============================================
   svibe toolbar
   Aesthetic: utilitarian dev instrument.
   Dark glass, tight spacing, monospace metrics.
   ============================================= */

[data-svibe-toolbar] {
  --sv-bg: rgba(15, 15, 28, 0.92);
  --sv-surface: rgba(30, 30, 52, 0.85);
  --sv-border: rgba(255, 255, 255, 0.08);
  --sv-border-hover: rgba(255, 255, 255, 0.14);
  --sv-text: rgba(255, 255, 255, 0.88);
  --sv-text-dim: rgba(255, 255, 255, 0.44);
  --sv-text-muted: rgba(255, 255, 255, 0.56);
  --sv-green: #34d399;
  --sv-yellow: #fbbf24;
  --sv-red: #f87171;
  --sv-info: #60a5fa;
  --sv-svelte: #ff3e00;
  --sv-accent: #a78bfa;
  --sv-mono: ui-monospace, 'SF Mono', 'Cascadia Mono', 'Segoe UI Mono', Menlo, monospace;
  --sv-sans: system-ui, -apple-system, sans-serif;
  --sv-ease: cubic-bezier(0.22, 1, 0.36, 1);

  position: fixed;
  z-index: 100000;
  font-family: var(--sv-sans);
  font-size: 13px;
  line-height: 1;
  color: var(--sv-text);
  pointer-events: auto;
  -webkit-font-smoothing: antialiased;
}

[data-svibe-toolbar] * {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* --- Focus --- */

[data-svibe-toolbar] :focus-visible {
  outline: 2px solid var(--sv-accent);
  outline-offset: 2px;
}

[data-svibe-toolbar] button:focus-visible {
  outline-offset: -1px;
}

/* --- Drag states --- */

[data-svibe-toolbar].sv-dragging {
  cursor: grabbing;
  transition: none !important;
}

[data-svibe-toolbar].sv-dragging .sv-pill,
[data-svibe-toolbar].sv-dragging .sv-panel {
  opacity: 0.8;
  transform: scale(0.97);
}

[data-svibe-toolbar].sv-dragging .sv-header {
  cursor: grabbing;
}

[data-svibe-toolbar].sv-animating {
  transition: left 0.35s var(--sv-ease), top 0.35s var(--sv-ease);
}

/* Pill wrapper (pill + shortcuts below) */
[data-svibe-toolbar] .sv-pill-wrapper {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

/* Bottom: reverse so hints are above pill, keeping pill flush to edge */
[data-svibe-toolbar].sv-pos-bottom .sv-pill-wrapper {
  flex-direction: column-reverse;
}

/* Right: align hints to right edge */
[data-svibe-toolbar].sv-pos-right .sv-pill-wrapper {
  align-items: flex-end;
}


/* =============================================
   PILL (collapsed)
   Layout: [logo svibe] · [fps] [issues] [copy]
   ============================================= */

[data-svibe-toolbar] .sv-pill {
  display: flex;
  align-items: center;
  gap: 0;
  height: 40px;
  padding: 0 8px 0 10px;
  background: var(--sv-bg);
  backdrop-filter: blur(16px) saturate(1.6);
  -webkit-backdrop-filter: blur(16px) saturate(1.6);
  border: 1px solid var(--sv-border);
  border-radius: 20px;
  overflow: visible;
  cursor: grab;
  user-select: none;
  box-shadow: 0 1px 3px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.15);
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s, opacity 0.15s;
  will-change: transform;
}

[data-svibe-toolbar] .sv-pill:hover {
  border-color: var(--sv-border-hover);
  box-shadow: 0 1px 3px rgba(0,0,0,0.3), 0 8px 32px rgba(0,0,0,0.25);
}

[data-svibe-toolbar] .sv-pill:active {
  transform: scale(0.97);
}

/* Brand group: logo + name */
[data-svibe-toolbar] .sv-brand {
  display: flex;
  align-items: center;
  gap: 5px;
  padding-right: 8px;
  border-right: 1px solid var(--sv-border);
  margin-right: 6px;
  height: 16px;
}

[data-svibe-toolbar] .sv-logo {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

/* Metrics group */
[data-svibe-toolbar] .sv-metrics {
  display: flex;
  align-items: center;
  gap: 6px;
}

[data-svibe-toolbar] .sv-pill-actions {
  display: flex;
  align-items: center;
  gap: 1px;
  margin-left: 8px;
  padding-left: 6px;
  border-left: 1px solid var(--sv-border);
}

[data-svibe-toolbar] .sv-fps {
  font-family: var(--sv-mono);
  font-weight: 600;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  min-width: 22px;
  text-align: right;
  letter-spacing: -0.02em;
}

[data-svibe-toolbar] .sv-fps-unit {
  font-size: 9px;
  font-weight: 400;
  color: var(--sv-text-dim);
  margin-left: 1px;
}

/* Issue count dot */
[data-svibe-toolbar] .sv-issues {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  border-radius: 10px;
  font-family: var(--sv-mono);
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
}

[data-svibe-toolbar] .sv-issues-green {
  background: rgba(52, 211, 153, 0.15);
  color: var(--sv-green);
}

[data-svibe-toolbar] .sv-issues-yellow {
  background: rgba(251, 191, 36, 0.18);
  color: var(--sv-yellow);
}

[data-svibe-toolbar] .sv-issues-red {
  background: rgba(248, 113, 113, 0.18);
  color: var(--sv-red);
}

/* Pill action button */
[data-svibe-toolbar] .sv-pill-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: none;
  border: none;
  border-radius: 12px;
  color: var(--sv-text-dim);
  cursor: pointer;
  transition: color 0.12s, background 0.12s;
  flex-shrink: 0;
}

/* Expand touch target to 44px for accessibility */
[data-svibe-toolbar] .sv-pill-btn::before {
  content: '';
  position: absolute;
  inset: -10px;
}

[data-svibe-toolbar] .sv-pill-btn:hover {
  color: var(--sv-text);
  background: rgba(255,255,255,0.06);
}

[data-svibe-toolbar] .sv-pill-btn:disabled {
  opacity: 0.38;
  cursor: default;
}

[data-svibe-toolbar] .sv-pill-btn:disabled:hover {
  color: var(--sv-text-dim);
  background: none;
}

[data-svibe-toolbar] .sv-pill-btn-danger:hover {
  color: var(--sv-red);
  background: rgba(248, 113, 113, 0.12);
}

[data-svibe-toolbar] .sv-pill-btn svg {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
}

/* =============================================
   PANEL (expanded)
   ============================================= */

[data-svibe-toolbar] .sv-panel {
  width: min(400px, calc(100vw - 32px));
  max-height: 460px;
  background: var(--sv-bg);
  backdrop-filter: blur(20px) saturate(1.6);
  -webkit-backdrop-filter: blur(20px) saturate(1.6);
  border: 1px solid var(--sv-border);
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2), 0 12px 40px rgba(0,0,0,0.3);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Panel header */
[data-svibe-toolbar] .sv-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 6px 8px 12px;
  border-bottom: 1px solid var(--sv-border);
}

[data-svibe-toolbar] .sv-header-brand {
  display: flex;
  align-items: center;
  gap: 6px;
}

[data-svibe-toolbar] .sv-header-brand span {
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--sv-text-muted);
}

[data-svibe-toolbar] .sv-header-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

[data-svibe-toolbar] .sv-header-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  background: none;
  border: none;
  border-radius: 6px;
  color: var(--sv-text-dim);
  cursor: pointer;
  transition: color 0.12s, background 0.12s;
}

[data-svibe-toolbar] .sv-header-btn::before {
  content: '';
  position: absolute;
  inset: -9px;
}

[data-svibe-toolbar] .sv-header-btn:hover {
  color: var(--sv-text);
  background: rgba(255,255,255,0.06);
}

[data-svibe-toolbar] .sv-header-btn svg {
  width: 14px;
  height: 14px;
}

[data-svibe-toolbar] .sv-header-btn.sv-hmr-paused,
[data-svibe-toolbar] .sv-pill-btn.sv-hmr-paused {
  color: var(--sv-red);
  background: rgba(248, 113, 113, 0.12);
}

/* Tabs */
[data-svibe-toolbar] .sv-tabs {
  display: flex;
  padding: 4px 6px;
  gap: 4px;
  background: rgba(255,255,255,0.03);
  border-bottom: 1px solid var(--sv-border);
}

[data-svibe-toolbar] .sv-tab {
  flex: 1;
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 6px 8px;
  background: none;
  border: 1px solid transparent;
  color: var(--sv-text-dim);
  cursor: pointer;
  font-family: var(--sv-sans);
  font-size: 11px;
  font-weight: 500;
  text-align: center;
  letter-spacing: 0.01em;
  border-radius: 8px;
  transition: color 0.15s, background 0.15s, border-color 0.15s, box-shadow 0.15s;
}

[data-svibe-toolbar] .sv-tab:hover {
  color: var(--sv-text-muted);
  background: rgba(255,255,255,0.06);
}

[data-svibe-toolbar] .sv-tab-active {
  color: var(--sv-text);
  background: rgba(255,255,255,0.08);
  border-color: rgba(255,255,255,0.08);
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}

/* Tab badge */
[data-svibe-toolbar] .sv-tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 14px;
  height: 14px;
  padding: 0 3px;
  border-radius: 7px;
  font-family: var(--sv-mono);
  font-size: 9px;
  font-weight: 600;
}

/* Content area */
[data-svibe-toolbar] .sv-content {
  padding: 12px 16px;
  max-height: 340px;
  overflow-y: auto;
  flex: 1;
}

[data-svibe-toolbar] .sv-content::-webkit-scrollbar,
[data-svibe-toolbar] .sv-settings::-webkit-scrollbar {
  width: 4px;
}

[data-svibe-toolbar] .sv-content::-webkit-scrollbar-track,
[data-svibe-toolbar] .sv-settings::-webkit-scrollbar-track {
  background: transparent;
}

[data-svibe-toolbar] .sv-content::-webkit-scrollbar-thumb,
[data-svibe-toolbar] .sv-settings::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.1);
  border-radius: 2px;
}

/* Overview stat rows */
[data-svibe-toolbar] .sv-stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 2px;
}

[data-svibe-toolbar] .sv-stat + .sv-stat {
  border-top: 1px solid rgba(255,255,255,0.04);
}

[data-svibe-toolbar] .sv-stat-label {
  color: var(--sv-text-dim);
  font-size: 13px;
}

[data-svibe-toolbar] .sv-stat-value {
  font-family: var(--sv-mono);
  font-weight: 600;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

/* List items (hotspots, effects, leaks, console) */
[data-svibe-toolbar] .sv-item {
  padding: 6px 2px;
  border-radius: 4px;
  transition: background 0.1s;
}

[data-svibe-toolbar] .sv-item + .sv-item {
  border-top: 1px solid rgba(255,255,255,0.04);
}

[data-svibe-toolbar] .sv-item:hover {
  background: rgba(255,255,255,0.03);
}

[data-svibe-toolbar] .sv-item-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

[data-svibe-toolbar] .sv-item-row > div {
  flex: 1;
  min-width: 0;
}

[data-svibe-toolbar] .sv-item-title {
  font-weight: 500;
  font-size: 12px;
  margin-bottom: 2px;
  display: flex;
  align-items: center;
  gap: 5px;
}

[data-svibe-toolbar] .sv-item-detail {
  color: var(--sv-text-dim);
  font-family: var(--sv-mono);
  font-size: 11px;
}

[data-svibe-toolbar] .sv-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 14px;
  height: 14px;
  padding: 0 4px;
  border-radius: 3px;
  font-family: var(--sv-mono);
  font-size: 9px;
  font-weight: 600;
}

[data-svibe-toolbar] .sv-badge-green {
  background: rgba(52, 211, 153, 0.15);
  color: var(--sv-green);
}

[data-svibe-toolbar] .sv-badge-yellow {
  background: rgba(251, 191, 36, 0.18);
  color: var(--sv-yellow);
}

[data-svibe-toolbar] .sv-badge-red {
  background: rgba(248, 113, 113, 0.18);
  color: var(--sv-red);
}

/* Copy button on items */
[data-svibe-toolbar] .sv-copy-item {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  background: none;
  border: none;
  color: var(--sv-text-dim);
  cursor: pointer;
  border-radius: 4px;
  opacity: 0.4;
  transition: opacity 0.12s, background 0.12s, color 0.12s;
}

[data-svibe-toolbar] .sv-copy-item:hover,
[data-svibe-toolbar] .sv-copy-item:focus-visible {
  opacity: 1;
  background: rgba(255,255,255,0.06);
  color: var(--sv-text);
}

[data-svibe-toolbar] .sv-copy-item svg {
  width: 12px;
  height: 12px;
}

/* Empty state */
[data-svibe-toolbar] .sv-empty {
  text-align: center;
  padding: 20px 0;
  color: var(--sv-text-dim);
  font-size: 12px;
}

[data-svibe-toolbar] .sv-console-msg {
  word-break: break-word;
  font-size: 12px;
}

/* Section label inside merged tabs (e.g. Issues) */
[data-svibe-toolbar] .sv-section-label {
  padding: 8px 2px 4px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--sv-text-dim);
}

[data-svibe-toolbar] .sv-section-label:first-child {
  padding-top: 0;
}

/* Server tab */
[data-svibe-toolbar] .sv-level-icon {
  font-size: 10px;
  line-height: 1;
  flex-shrink: 0;
}

[data-svibe-toolbar] .sv-level-info {
  color: var(--sv-info);
}

[data-svibe-toolbar] .sv-level-warn {
  color: var(--sv-yellow);
}

[data-svibe-toolbar] .sv-level-error {
  color: var(--sv-red);
}

[data-svibe-toolbar] .sv-stack-hint {
  color: var(--sv-text-dim);
  font-style: italic;
  font-size: 9px;
}

[data-svibe-toolbar] .sv-server-actions {
  display: flex;
  gap: 4px;
  padding: 4px 2px 6px;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  margin-bottom: 4px;
}

[data-svibe-toolbar] .sv-server-copy,
[data-svibe-toolbar] .sv-server-clear {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--sv-border);
  border-radius: 4px;
  color: var(--sv-text-dim);
  font-family: var(--sv-sans);
  font-size: 10px;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}

[data-svibe-toolbar] .sv-server-copy:hover,
[data-svibe-toolbar] .sv-server-clear:hover {
  background: rgba(255,255,255,0.08);
  color: var(--sv-text);
}

[data-svibe-toolbar] .sv-server-copy svg {
  width: 11px;
  height: 11px;
}

/* =============================================
   SETTINGS PANEL
   ============================================= */

[data-svibe-toolbar] .sv-settings {
  padding: 8px 12px;
  max-height: 340px;
  overflow-y: auto;
  flex: 1;
}

[data-svibe-toolbar] .sv-settings-section {
  padding-bottom: 8px;
}

[data-svibe-toolbar] .sv-settings-section + .sv-settings-section {
  padding-top: 8px;
  border-top: 1px solid rgba(255,255,255,0.06);
}

[data-svibe-toolbar] .sv-settings-section-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--sv-text-dim);
  padding: 4px 0 6px;
}

/* Toggle row */
[data-svibe-toolbar] .sv-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 7px 4px;
  background: none;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.1s;
}

[data-svibe-toolbar] .sv-toggle-row:hover {
  background: rgba(255,255,255,0.04);
}

[data-svibe-toolbar] .sv-toggle-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  min-width: 0;
}

[data-svibe-toolbar] .sv-toggle-label {
  font-size: 12px;
  color: var(--sv-text);
}

[data-svibe-toolbar] .sv-toggle-desc {
  font-size: 10px;
  color: var(--sv-text-dim);
  line-height: 1.3;
  text-align: left;
}

/* Toggle switch track */
[data-svibe-toolbar] .sv-toggle-track {
  position: relative;
  width: 32px;
  height: 18px;
  border-radius: 9px;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.08);
  flex-shrink: 0;
  transition: background 0.2s var(--sv-ease), border-color 0.2s;
}

[data-svibe-toolbar] .sv-toggle-track.sv-toggle-on {
  background: rgba(52, 211, 153, 0.3);
  border-color: rgba(52, 211, 153, 0.4);
}

/* Toggle thumb */
[data-svibe-toolbar] .sv-toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 12px;
  height: 12px;
  border-radius: 6px;
  background: var(--sv-text-dim);
  transition: transform 0.2s var(--sv-ease), background 0.2s;
}

[data-svibe-toolbar] .sv-toggle-on .sv-toggle-thumb {
  transform: translateX(14px);
  background: var(--sv-green);
}

/* Gear button active state */
[data-svibe-toolbar] .sv-header-btn.sv-settings-active {
  color: var(--sv-accent);
  background: rgba(167, 139, 250, 0.1);
}

/* =============================================
   INSPECTOR SETTINGS (inside settings panel)
   ============================================= */

/* Output mode value display */
[data-svibe-toolbar] .sv-output-mode-value {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  font-weight: 500;
  color: var(--sv-text);
}

[data-svibe-toolbar] .sv-mode-dots {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

[data-svibe-toolbar] .sv-mode-dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: rgba(255,255,255,0.2);
  transition: background 0.15s, transform 0.15s;
}

[data-svibe-toolbar] .sv-mode-dot.sv-mode-dot-active {
  background: var(--sv-text);
  transform: scale(1.3);
}

/* Marker color row */
[data-svibe-toolbar] .sv-color-row-wrapper {
  padding: 7px 4px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

[data-svibe-toolbar] .sv-settings-label {
  font-size: 10px;
  color: var(--sv-text-dim);
}

[data-svibe-toolbar] .sv-color-row {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

[data-svibe-toolbar] .sv-color-swatch {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 50%;
  background: var(--sv-swatch);
  color: #fff;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s;
}

[data-svibe-toolbar] .sv-color-swatch:hover {
  transform: translateY(-1px);
}

[data-svibe-toolbar] .sv-color-swatch.sv-color-active {
  border-color: var(--sv-green);
  box-shadow: 0 0 0 2px rgba(52, 211, 153, 0.2);
}

[data-svibe-toolbar] .sv-color-swatch svg {
  width: 10px;
  height: 10px;
}

/* Position picker */
[data-svibe-toolbar] .sv-position-picker {
  padding: 6px;
  margin: 4px 4px 0;
  border: 1px solid var(--sv-border);
  border-radius: 10px;
  background: rgba(255,255,255,0.02);
}

[data-svibe-toolbar] .sv-position-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 3px;
}

[data-svibe-toolbar] .sv-position-corners {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3px;
}

[data-svibe-toolbar] .sv-position-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 22px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--sv-text-dim);
  cursor: pointer;
  transition: color 0.12s, background 0.12s;
}

[data-svibe-toolbar] .sv-position-chip:hover {
  color: var(--sv-text);
  background: rgba(255,255,255,0.06);
}

[data-svibe-toolbar] .sv-position-chip.sv-position-active {
  background: rgba(52, 211, 153, 0.12);
  box-shadow: inset 0 0 0 1px rgba(52, 211, 153, 0.25);
  color: var(--sv-text);
}

[data-svibe-toolbar] .sv-position-gap {
  min-height: 22px;
}

/* Position icon: small box with dot */
[data-svibe-toolbar] .sv-position-icon {
  position: relative;
  display: inline-flex;
  width: 12px;
  height: 12px;
  border: 1px solid currentColor;
  border-radius: 2px;
  opacity: 0.5;
}

[data-svibe-toolbar] .sv-position-chip.sv-position-active .sv-position-icon {
  opacity: 1;
}

[data-svibe-toolbar] .sv-position-icon::after {
  content: '';
  position: absolute;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: currentColor;
}

[data-svibe-toolbar] .sv-position-top-left::after { top: 1px; left: 1px; }
[data-svibe-toolbar] .sv-position-top-center::after { top: 1px; left: 50%; transform: translateX(-50%); }
[data-svibe-toolbar] .sv-position-top-right::after { top: 1px; right: 1px; }
[data-svibe-toolbar] .sv-position-mid-left::after { top: 50%; left: 1px; transform: translateY(-50%); }
[data-svibe-toolbar] .sv-position-mid-right::after { top: 50%; right: 1px; transform: translateY(-50%); }
[data-svibe-toolbar] .sv-position-bottom-left::after { bottom: 1px; left: 1px; }
[data-svibe-toolbar] .sv-position-bottom-center::after { bottom: 1px; left: 50%; transform: translateX(-50%); }
[data-svibe-toolbar] .sv-position-bottom-right::after { bottom: 1px; right: 1px; }

/* =============================================
   Expand / Collapse animations
   ============================================= */

@keyframes sv-pill-in {
  0%   { opacity: 0; transform: scaleX(0.3) scaleY(0.8); }
  50%  { opacity: 1; transform: scaleX(1.02) scaleY(1); }
  100% { opacity: 1; transform: scaleX(1) scaleY(1); }
}

@keyframes sv-panel-in {
  from { opacity: 0; transform: scale(0.96); }
  to   { opacity: 1; transform: scale(1); }
}

[data-svibe-toolbar] .sv-pill {
  animation: sv-pill-in 0.25s var(--sv-ease) both;
  transform-origin: left center;
}

/* Right positions: pill grows from right edge */
[data-svibe-toolbar].sv-pos-right .sv-pill {
  transform-origin: right center;
}

[data-svibe-toolbar] .sv-panel {
  opacity: 0;
  transform-origin: top center;
}

[data-svibe-toolbar] .sv-panel.sv-panel-ready {
  animation: sv-panel-in 0.2s var(--sv-ease) both;
}

/* Bottom positions: grow upward */
[data-svibe-toolbar].sv-pos-bottom .sv-panel {
  transform-origin: bottom center;
}

@media (prefers-reduced-motion: reduce) {
  [data-svibe-toolbar] .sv-pill,
  [data-svibe-toolbar] .sv-panel {
    animation: none;
  }
  [data-svibe-toolbar] * {
    transition-duration: 0.01ms !important;
  }
}

/* =============================================
   INSPECT MODE
   ============================================= */

/* Inspect button active state */
[data-svibe-toolbar] .sv-header-btn.sv-inspect-active,
[data-svibe-toolbar] .sv-pill-btn.sv-inspect-active {
  color: var(--sv-green);
  background: rgba(52, 211, 153, 0.12);
}

/* Shortcut hint footer */
[data-svibe-toolbar] .sv-shortcut-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 5px 12px;
  border-top: 1px solid var(--sv-border);
  color: var(--sv-text-dim);
  font-size: 11px;
}

[data-svibe-toolbar] .sv-shortcut-kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 18px;
  padding: 0 5px;
  background: rgba(255,255,255,0.06);
  border: 1px solid var(--sv-border);
  border-radius: 4px;
  font-family: var(--sv-mono);
  font-size: 10px;
  font-weight: 600;
  color: var(--sv-text-muted);
}

[data-svibe-toolbar] .sv-shortcut-sep {
  color: var(--sv-border);
  margin: 0 1px;
}

/* =============================================
   NOTES TAB
   ============================================= */

[data-svibe-toolbar] .sv-note-kind-icon {
  display: inline-flex;
  align-items: center;
  color: var(--sv-text-dim);
  flex-shrink: 0;
}

[data-svibe-toolbar] .sv-note-kind-icon svg {
  width: 12px;
  height: 12px;
}

[data-svibe-toolbar] .sv-note-text {
  margin-top: 2px;
  line-height: 1.3;
  white-space: pre-wrap;
  word-break: break-word;
}

[data-svibe-toolbar] .sv-note-actions {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex-shrink: 0;
}

[data-svibe-toolbar] .sv-note-action-visible {
  opacity: 0.5;
}

[data-svibe-toolbar] .sv-item:hover .sv-note-action-visible {
  opacity: 1;
}

[data-svibe-toolbar] .sv-note-count {
  font-family: var(--sv-mono);
  font-size: 11px;
  font-weight: 600;
  color: var(--sv-green);
}

[data-svibe-toolbar] .sv-pill-btn-with-badge {
  position: relative;
}

[data-svibe-toolbar] .sv-icon-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 15px;
  height: 15px;
  padding: 0 3px;
  border-radius: 8px;
  font-family: var(--sv-mono);
  font-size: 9px;
  font-weight: 700;
  line-height: 1;
  pointer-events: none;
}

[data-svibe-toolbar] .sv-icon-badge-green {
  background: rgba(74, 222, 128, 0.2);
  color: var(--sv-green);
}

[data-svibe-toolbar] .sv-icon-badge-yellow {
  background: rgba(250, 204, 21, 0.2);
  color: var(--sv-yellow);
}

[data-svibe-toolbar] .sv-icon-badge-red {
  background: rgba(248, 113, 113, 0.2);
  color: var(--sv-red);
}

[data-svibe-toolbar] .sv-delete-all-active {
  color: var(--sv-red) !important;
  border-color: rgba(248, 113, 113, 0.3) !important;
}

/* Phase breakdown bars */
[data-svibe-toolbar] .sv-phase-bars {
  display: flex;
  height: 6px;
  border-radius: 3px;
  overflow: hidden;
  margin-top: 4px;
  background: rgba(255, 255, 255, 0.05);
}

[data-svibe-toolbar] .sv-phase-bar {
  height: 100%;
  min-width: 1px;
}

[data-svibe-toolbar] .sv-phase-bar.sv-phase-handler {
  background: var(--sv-info);
}

[data-svibe-toolbar] .sv-phase-bar.sv-phase-reactive {
  background: #a78bfa;
}

[data-svibe-toolbar] .sv-phase-bar.sv-phase-paint {
  background: #34d399;
}

[data-svibe-toolbar] .sv-phase-bar.sv-phase-composite {
  background: #fbbf24;
}

/* Phase legend */
[data-svibe-toolbar] .sv-phase-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 3px;
}

[data-svibe-toolbar] .sv-phase-label {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  color: var(--sv-text-muted);
}

[data-svibe-toolbar] .sv-phase-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

[data-svibe-toolbar] .sv-phase-dot.sv-phase-handler {
  background: var(--sv-info);
}

[data-svibe-toolbar] .sv-phase-dot.sv-phase-reactive {
  background: #a78bfa;
}

[data-svibe-toolbar] .sv-phase-dot.sv-phase-paint {
  background: #34d399;
}

[data-svibe-toolbar] .sv-phase-dot.sv-phase-composite {
  background: #fbbf24;
}
`;
