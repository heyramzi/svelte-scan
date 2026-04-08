import type {
  InspectorNote,
  InspectorSettings,
  HoverInfo,
  ComposerState,
  DragSelectionState,
  GroupSelectionPreview,
  ExportPayload,
  ElementAnchor,
  NoteSourceInfo,
} from "./types";
import { DEFAULT_SETTINGS, DELETE_ALL_DELAY_MS } from "./constants";
import { readNotes, writeNotes, readSettings, writeSettings } from "./storage";
import { createPageFreezer } from "./freeze";
import { createKeyboardClaimer } from "./keyboard";
import { generateSelector } from "./selector";
import { resolveSource, openInEditor } from "./source";
import { buildDomPath, resolveDomPath } from "./dom-path";
import { captureTextSelection, buildGroupBounds } from "./selection";
import {
  buildElementNote,
  buildTextNote,
  buildGroupNote,
  buildAreaNote,
  updateNoteText,
  buildTargetLabel,
  buildTargetSummary,
  buildSourceFromElement,
  buildFallbackMarker,
} from "./notes";
import { buildAnnotationSnapshot } from "./capture";
import { formatPayload } from "./export";

export class InspectorController {
  // --- Reactive state ---
  enabled = $state(false);
  notes = $state<InspectorNote[]>([]);
  settings = $state({ ...DEFAULT_SETTINGS });
  hoverInfo = $state<HoverInfo | null>(null);
  composer = $state<ComposerState | null>(null);
  noteDraft = $state("");
  activeNoteId = $state<string | null>(null);
  selectionPreview = $state<GroupSelectionPreview | null>(null);
  dragSelection = $state<DragSelectionState | null>(null);
  copyFeedback = $state(false);

  toolbar = $state({
    expanded: false,
    dragging: false,
    settingsOpen: false,
    notesVisible: true,
    position: { x: 0, y: 0 },
  });

  deleteAllState = $state({
    active: false,
    remainingMs: DELETE_ALL_DELAY_MS,
    progress: 0,
  });

  // --- Internals ---
  private pageKey: string;
  private freezer = createPageFreezer();
  private keyboardClaimer = createKeyboardClaimer();
  private shiftHeld = false;
  private metaHeld = false;
  private selectedElements: Element[] = [];
  private deleteAllTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.pageKey = typeof window !== "undefined" ? window.location.pathname || "/" : "/";
    this.notes = readNotes(this.pageKey);
    this.settings = readSettings(this.pageKey);
  }

  // --- Public API ---

  /** Read the real key from an event, bypassing the claimer override */
  realKey = (e: KeyboardEvent): string => this.keyboardClaimer.realKey(e);

  toggle = () => {
    if (this.enabled) {
      this.deactivate();
    } else {
      this.activate();
    }
  };

  activate = () => {
    this.enabled = true;
    this.keyboardClaimer.claim();
    if (this.settings.pauseAnimations) this.freezer.freeze();
    if (this.settings.blockPageInteractions) this.blockInteractions();
  };

  deactivate = () => {
    this.enabled = false;
    this.hoverInfo = null;
    this.selectionPreview = null;
    this.dragSelection = null;
    this.keyboardClaimer.release();
    this.freezer.unfreeze();
    this.selectedElements = [];
  };

  destroy = () => {
    this.deactivate();
    this.freezer.destroy();
    this.keyboardClaimer.destroy();
    this.cancelDeleteAll();
  };

  // --- Settings ---

  setSetting = <K extends keyof InspectorSettings>(key: K, value: InspectorSettings[K]) => {
    this.settings = { ...this.settings, [key]: value };
    this.persistSettings();
  };

  setPauseAnimations = (value: boolean) => {
    this.setSetting("pauseAnimations", value);
    if (this.enabled) {
      if (value) this.freezer.freeze();
      else this.freezer.unfreeze();
    }
  };

  // --- Note operations ---

  saveComposer = () => {
    if (!this.composer) return;
    const text = this.noteDraft.trim();

    if (this.composer.noteId) {
      if (!text) return;
      // Update existing
      this.notes = this.notes.map((n) =>
        n.id === this.composer!.noteId ? updateNoteText(n, text) : n,
      );
    } else {
      // Create new — empty text is allowed (captures component details only)
      const note = this.buildNoteFromComposer(text);
      if (note) this.notes = [...this.notes, note];
    }

    this.persistNotes();
    this.closeComposer();
    // Auto-copy after saving
    this.copyNotes();
  };

  deleteNote = (id: string) => {
    this.notes = this.notes.filter((n) => n.id !== id);
    this.persistNotes();
    if (this.composer?.noteId === id) this.closeComposer();
  };

  openNote = (id: string) => {
    const note = this.notes.find((n) => n.id === id);
    if (!note) return;
    this.activeNoteId = id;
    this.noteDraft = note.note;
    this.composer = {
      noteId: note.id,
      noteKind: note.kind,
      initialValue: note.note,
      targetSummary: note.targetSummary,
      targetLabel: note.targetLabel,
      placeholder: "Edit your annotation...",
      accentColor: this.settings.markerColor,
      markerLeft: 0,
      markerTop: 0,
      outlineRects: [],
      highlightRects: [],
      selectedText: note.kind === "text" ? note.anchor.selectedText : null,
      anchor: note.anchor,
      componentName: note.componentName,
      tagName: note.tagName,
      filePath: note.filePath,
      shortFileName: note.shortFileName,
      lineNumber: note.lineNumber,
      columnNumber: note.columnNumber,
    };
  };

  closeComposer = () => {
    this.composer = null;
    this.noteDraft = "";
    this.activeNoteId = null;
  };

  updateNoteDraft = (value: string) => {
    this.noteDraft = value;
  };

  requestDeleteAll = () => {
    if (this.deleteAllState.active) {
      this.cancelDeleteAll();
      return;
    }
    this.deleteAllState = { active: true, remainingMs: DELETE_ALL_DELAY_MS, progress: 0 };
    const start = Date.now();
    this.deleteAllTimer = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, DELETE_ALL_DELAY_MS - elapsed);
      this.deleteAllState = {
        active: true,
        remainingMs: remaining,
        progress: elapsed / DELETE_ALL_DELAY_MS,
      };
      if (remaining <= 0) {
        this.notes = [];
        this.persistNotes();
        this.cancelDeleteAll();
        this.closeComposer();
      }
    }, 50);
  };

  cancelDeleteAll = () => {
    if (this.deleteAllTimer) clearInterval(this.deleteAllTimer);
    this.deleteAllTimer = null;
    this.deleteAllState = { active: false, remainingMs: DELETE_ALL_DELAY_MS, progress: 0 };
  };

  // --- Copy ---

  copyNotes = async () => {
    if (this.notes.length === 0) return;

    const snapshots = this.notes.map((note) => {
      const element = this.resolveNoteElement(note);
      return buildAnnotationSnapshot(note, element, this.settings);
    });

    const payload: ExportPayload = {
      title: document.title || window.location.pathname,
      outputMode: this.settings.outputMode,
      url: window.location.href,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      userAgent: navigator.userAgent,
      devicePixelRatio: window.devicePixelRatio || 1,
      timestamp: new Date().toISOString(),
      annotations: snapshots,
    };

    const markdown = formatPayload(payload);
    await navigator.clipboard.writeText(markdown);

    this.copyFeedback = true;
    setTimeout(() => {
      this.copyFeedback = false;
    }, 1200);

    if (this.settings.clearOnCopy) {
      this.notes = [];
      this.persistNotes();
      this.closeComposer();
      this.deactivate();
    }
  };

  // --- Toolbar ---

  toggleToolbar = () => {
    this.toolbar = { ...this.toolbar, expanded: !this.toolbar.expanded };
  };
  closeToolbar = () => {
    this.toolbar = { ...this.toolbar, expanded: false, settingsOpen: false };
  };
  toggleSettings = () => {
    this.toolbar = { ...this.toolbar, settingsOpen: !this.toolbar.settingsOpen };
  };
  toggleNotesVisibility = () => {
    this.toolbar = { ...this.toolbar, notesVisible: !this.toolbar.notesVisible };
  };

  // --- Event handlers (called from Svelte component) ---

  handlePointerMove = (e: PointerEvent) => {
    if (!this.enabled || this.composer) return;
    const target = e.target as Element;
    if (
      !target ||
      target.closest?.("[data-svibe-toolbar]") ||
      target.closest?.("[data-inspector-ui]")
    )
      return;

    // Skip expensive work if hovering the same element
    if (target === this.hoverInfo?.element) return;

    const rect = target.getBoundingClientRect();
    const source = resolveSource(target);
    this.hoverInfo = {
      element: target,
      rect,
      selector: generateSelector(target),
      source,
      tagName: target.tagName.toLowerCase(),
      dimensions: { width: Math.round(rect.width), height: Math.round(rect.height) },
    };
  };

  handleClick = (e: MouseEvent) => {
    if (!this.enabled || this.composer) return;
    const target = e.target as Element;
    if (
      !target ||
      target.closest?.("[data-svibe-toolbar]") ||
      target.closest?.("[data-inspector-ui]")
    )
      return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    // Check for text selection first
    const textSel = captureTextSelection();
    if (textSel) {
      this.openTextComposer(textSel);
      return;
    }

    // Shift+click: add to group selection
    if (this.shiftHeld) {
      if (!this.selectedElements.includes(target)) {
        this.selectedElements.push(target);
      }
      this.selectionPreview = this.buildSelectionPreview();
      return;
    }

    // Normal click: open element composer
    this.openElementComposer(target, e.clientX, e.clientY);
  };

  handleKeyDown = (e: KeyboardEvent) => {
    // Read the real key, bypassing the claimer's override
    const key = this.keyboardClaimer.realKey(e);

    if (key === "Shift") this.shiftHeld = true;
    if (key === "Meta" || key === "Control") this.metaHeld = true;

    if (key === "Escape") {
      if (this.composer) {
        this.closeComposer();
      } else if (this.selectedElements.length > 0) {
        this.selectedElements = [];
        this.selectionPreview = null;
      } else if (this.enabled) {
        this.deactivate();
      }
    }

    // "C" to confirm group selection (copy is handled by Toolbar's onKeydownGlobal)
    if (this.enabled && !this.composer && key === "c" && this.selectedElements.length > 1) {
      this.openGroupComposer();
    }

    // "O" to open source in editor
    if (this.enabled && !this.composer && key === "o" && this.hoverInfo?.source) {
      openInEditor(this.hoverInfo.source);
    }

    // "F" to toggle freeze
    if (this.enabled && !this.composer && key === "f") {
      if (this.settings.pauseAnimations) this.freezer.unfreeze();
      else this.freezer.freeze();
      this.settings = { ...this.settings, pauseAnimations: !this.settings.pauseAnimations };
    }
  };

  handleKeyUp = (e: KeyboardEvent) => {
    const key = this.keyboardClaimer.realKey(e);
    if (key === "Shift") this.shiftHeld = false;
    if (key === "Meta" || key === "Control") this.metaHeld = false;

    // When shift released with multiple elements, open group composer
    if (key === "Shift" && this.selectedElements.length > 1 && this.enabled && !this.composer) {
      this.openGroupComposer();
    }
  };

  handleViewportChange = () => {
    this.hoverInfo = null;
  };

  open = () => {
    if (this.hoverInfo?.source) openInEditor(this.hoverInfo.source);
  };

  // --- Private helpers ---

  private openElementComposer(target: Element, clientX: number, clientY: number) {
    const rect = target.getBoundingClientRect();
    const domPath = buildDomPath(target);
    if (!domPath) return;

    const relativeX =
      rect.width > 0 ? Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) : 0.5;
    const relativeY =
      rect.height > 0 ? Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)) : 0.5;

    const anchor: ElementAnchor = {
      domPath,
      relativeX,
      relativeY,
      viewportX: clientX,
      viewportY: clientY,
    };
    const source = buildSourceFromElement(target, resolveSource);

    this.composer = {
      noteId: null,
      noteKind: "element",
      initialValue: "",
      targetSummary: buildTargetSummary(target),
      targetLabel: buildTargetLabel(target),
      placeholder: "Describe the issue with this element...",
      accentColor: this.settings.markerColor,
      markerLeft: Math.max(
        12,
        Math.min(window.innerWidth - 12, rect.left + rect.width * relativeX),
      ),
      markerTop: Math.max(
        12,
        Math.min(window.innerHeight - 12, rect.top + rect.height * relativeY),
      ),
      outlineRects: [{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }],
      highlightRects: [],
      selectedText: null,
      anchor,
      ...source,
    };
    this.noteDraft = "";
    this.hoverInfo = null;
  }

  private openTextComposer(textSel: NonNullable<ReturnType<typeof captureTextSelection>>) {
    const source = buildSourceFromElement(textSel.commonAncestor, resolveSource);

    this.composer = {
      noteId: null,
      noteKind: "text",
      initialValue: "",
      targetSummary: `<${textSel.commonAncestor.tagName.toLowerCase()}>`,
      targetLabel: buildTargetLabel(textSel.commonAncestor),
      placeholder: "What about this text?",
      accentColor: this.settings.markerColor,
      markerLeft: textSel.markerLeft,
      markerTop: textSel.markerTop,
      outlineRects: [
        {
          left: textSel.bounds.left,
          top: textSel.bounds.top,
          width: textSel.bounds.width,
          height: textSel.bounds.height,
        },
      ],
      highlightRects: textSel.rects.map((r) => ({
        left: r.left,
        top: r.top,
        width: r.width,
        height: r.height,
      })),
      selectedText: textSel.anchor.selectedText,
      anchor: textSel.anchor,
      ...source,
    };
    this.noteDraft = "";
    this.hoverInfo = null;
  }

  private openGroupComposer() {
    if (this.selectedElements.length < 2) return;
    const rects = this.selectedElements.map((el) => el.getBoundingClientRect());
    const bounds = buildGroupBounds(rects);
    if (!bounds) return;

    const anchorEl = this.selectedElements[0];
    const source = buildSourceFromElement(anchorEl, resolveSource);
    const paths = this.selectedElements
      .map((el) => buildDomPath(el))
      .filter((p): p is string => p !== null);
    if (paths.length === 0) return;

    const anchorPath = paths[0];
    const fallback = buildFallbackMarker(bounds);

    this.composer = {
      noteId: null,
      noteKind: "group",
      initialValue: "",
      targetSummary: `${this.selectedElements.length} elements`,
      targetLabel: `Group of ${this.selectedElements.length}`,
      placeholder: `Describe the issue with these ${this.selectedElements.length} elements...`,
      accentColor: this.settings.markerColor,
      markerLeft: bounds.left + bounds.width / 2,
      markerTop: bounds.top,
      outlineRects: rects.map((r) => ({
        left: r.left,
        top: r.top,
        width: r.width,
        height: r.height,
      })),
      highlightRects: [],
      selectedText: null,
      anchor: {
        selectedDomPaths: paths,
        anchorDomPath: anchorPath,
        bounds,
        fallbackMarker: fallback,
      },
      ...source,
    };
    this.noteDraft = "";
    this.hoverInfo = null;
    this.selectedElements = [];
    this.selectionPreview = null;
  }

  private buildNoteFromComposer(text: string): InspectorNote | null {
    if (!this.composer) return null;
    const c = this.composer;
    const source: NoteSourceInfo = {
      componentName: c.componentName,
      tagName: c.tagName,
      filePath: c.filePath,
      shortFileName: c.shortFileName,
      lineNumber: c.lineNumber,
      columnNumber: c.columnNumber,
    };
    const params = {
      anchor: c.anchor as never,
      source,
      targetLabel: c.targetLabel,
      targetSummary: c.targetSummary,
    };

    let note: InspectorNote;
    switch (c.noteKind) {
      case "element":
        note = buildElementNote(params as Parameters<typeof buildElementNote>[0]);
        break;
      case "text":
        note = buildTextNote(params as Parameters<typeof buildTextNote>[0]);
        break;
      case "group":
        note = buildGroupNote(params as Parameters<typeof buildGroupNote>[0]);
        break;
      case "area":
        note = buildAreaNote(params as Parameters<typeof buildAreaNote>[0]);
        break;
      default:
        return null;
    }
    return updateNoteText(note, text);
  }

  private buildSelectionPreview(): GroupSelectionPreview | null {
    if (this.selectedElements.length === 0) return null;
    const rects = this.selectedElements
      .filter((el) => document.contains(el))
      .map((el) => el.getBoundingClientRect())
      .map((r) => ({ left: r.left, top: r.top, width: r.width, height: r.height }));
    return rects.length > 0 ? { rects } : null;
  }

  private resolveNoteElement(note: InspectorNote): Element | null {
    switch (note.kind) {
      case "element":
        return resolveDomPath(note.anchor.domPath);
      case "text":
        return resolveDomPath(note.anchor.commonAncestorPath);
      case "group":
        return resolveDomPath(note.anchor.anchorDomPath);
      case "area":
        return null;
    }
  }

  private persistNotes() {
    writeNotes(this.pageKey, this.notes);
  }
  private persistSettings() {
    writeSettings(this.pageKey, this.settings);
  }
  private blockInteractions() {
    /* Add pointer-events overlay in UI component */
  }
}
