import type { InspectorNote, InspectorSettings } from "./types";
import { DEFAULT_SETTINGS, STORAGE_PREFIX } from "./constants";

function notesKey(pageKey: string): string {
  return `${STORAGE_PREFIX}:notes:${pageKey}`;
}

function settingsKey(pageKey: string): string {
  return `${STORAGE_PREFIX}:settings:${pageKey}`;
}

export function readNotes(pageKey: string): InspectorNote[] {
  // oxlint-ignore-next-line stop-slop/no-raw-try-catch -- localStorage may be unavailable
  try {
    const raw = localStorage.getItem(notesKey(pageKey));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeNotes(pageKey: string, notes: InspectorNote[]): void {
  // oxlint-ignore-next-line stop-slop/no-raw-try-catch -- localStorage may be unavailable
  try {
    localStorage.setItem(notesKey(pageKey), JSON.stringify(notes));
  } catch {
    // Storage full or unavailable
  }
}

export function readSettings(pageKey: string): InspectorSettings {
  // oxlint-ignore-next-line stop-slop/no-raw-try-catch -- localStorage may be unavailable
  try {
    const raw = localStorage.getItem(settingsKey(pageKey));
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function writeSettings(pageKey: string, settings: InspectorSettings): void {
  // oxlint-ignore-next-line stop-slop/no-raw-try-catch -- localStorage may be unavailable
  try {
    localStorage.setItem(settingsKey(pageKey), JSON.stringify(settings));
  } catch {
    // Storage full or unavailable
  }
}

export function clearPageStorage(pageKey: string): void {
  // oxlint-ignore-next-line stop-slop/no-raw-try-catch -- localStorage may be unavailable
  try {
    localStorage.removeItem(notesKey(pageKey));
    localStorage.removeItem(settingsKey(pageKey));
  } catch {
    // Ignore
  }
}
