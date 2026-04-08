import { describe, it, expect, vi } from "vitest";
import {
  createNoteId,
  buildElementNote,
  buildTextNote,
  updateNoteText,
  buildTargetLabel,
} from "./notes";
import type { ElementAnchor, TextAnchor, NoteSourceInfo } from "./types";

const SOURCE: NoteSourceInfo = {
  componentName: "App",
  tagName: "div",
  filePath: "/src/App.svelte",
  shortFileName: "App.svelte",
  lineNumber: 10,
  columnNumber: 2,
};

describe("notes", () => {
  it("generates unique IDs", () => {
    const ids = new Set(Array.from({ length: 100 }, createNoteId));
    expect(ids.size).toBe(100);
  });

  it("builds element note", () => {
    const anchor: ElementAnchor = {
      domPath: "body > div",
      relativeX: 0.5,
      relativeY: 0.5,
      viewportX: 100,
      viewportY: 200,
    };
    const note = buildElementNote({
      anchor,
      source: SOURCE,
      targetLabel: "div.app",
      targetSummary: '<div class="app">',
    });
    expect(note.kind).toBe("element");
    expect(note.note).toBe("");
    expect(note.anchor).toBe(anchor);
    expect(note.id).toBeTruthy();
  });

  it("builds text note", () => {
    const anchor: TextAnchor = {
      commonAncestorPath: "body > p",
      selectedText: "hello",
      contextBefore: "",
      contextAfter: "",
      startOffset: 0,
      endOffset: 5,
      fallbackMarker: { xPercent: 50, yAbsolute: 100 },
    };
    const note = buildTextNote({ anchor, source: SOURCE, targetLabel: "p", targetSummary: "<p>" });
    expect(note.kind).toBe("text");
    expect(note.anchor.selectedText).toBe("hello");
  });

  it("updates note text", () => {
    vi.useFakeTimers();
    const anchor: ElementAnchor = {
      domPath: "body > div",
      relativeX: 0.5,
      relativeY: 0.5,
      viewportX: 100,
      viewportY: 200,
    };
    const note = buildElementNote({
      anchor,
      source: SOURCE,
      targetLabel: "div",
      targetSummary: "<div>",
    });
    vi.advanceTimersByTime(1000);
    const updated = updateNoteText(note, "Fix this button");
    expect(updated.note).toBe("Fix this button");
    expect(updated.id).toBe(note.id);
    expect(updated.createdAt).toBe(note.createdAt);
    expect(updated.updatedAt).not.toBe(note.updatedAt);
    vi.useRealTimers();
  });

  it("builds target label from tag and class", () => {
    const el = document.createElement("button");
    el.className = "submit-btn primary";
    expect(buildTargetLabel(el)).toBe("button.submit-btn");
  });
});
