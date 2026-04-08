import { describe, it, expect, beforeEach, vi } from "vitest";
import { readNotes, writeNotes, readSettings, writeSettings, clearPageStorage } from "./storage";
import { DEFAULT_SETTINGS } from "./constants";
import type { InspectorNote, InspectorSettings } from "./types";

const store: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => {
    store[key] = value;
  },
  removeItem: (key: string) => {
    delete store[key];
  },
  clear: () => {
    for (const key in store) delete store[key];
  },
};

describe("storage", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", mockLocalStorage);
    mockLocalStorage.clear();
  });

  it("reads empty notes for new page", () => {
    expect(readNotes("/test")).toEqual([]);
  });

  it("round-trips notes", () => {
    const note: InspectorNote = {
      id: "n1",
      kind: "element",
      note: "test note",
      targetSummary: "<div>",
      targetLabel: "div.container",
      componentName: "App",
      tagName: "div",
      filePath: "/src/App.svelte",
      shortFileName: "App.svelte",
      lineNumber: 10,
      columnNumber: 2,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      anchor: {
        domPath: "body > div",
        relativeX: 0.5,
        relativeY: 0.5,
        viewportX: 100,
        viewportY: 200,
      },
    };
    writeNotes("/test", [note]);
    expect(readNotes("/test")).toEqual([note]);
  });

  it("reads default settings when none saved", () => {
    expect(readSettings("/test")).toEqual(DEFAULT_SETTINGS);
  });

  it("round-trips settings", () => {
    const settings: InspectorSettings = {
      ...DEFAULT_SETTINGS,
      outputMode: "forensic",
      markerColor: "#ff0000",
    };
    writeSettings("/test", settings);
    expect(readSettings("/test")).toEqual(settings);
  });

  it("clears page storage", () => {
    writeNotes("/test", []);
    writeSettings("/test", DEFAULT_SETTINGS);
    clearPageStorage("/test");
    expect(readNotes("/test")).toEqual([]);
  });
});
