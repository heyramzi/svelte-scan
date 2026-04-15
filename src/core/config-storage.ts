import type { SvibeConfig } from "./types";
import { DEFAULT_CONFIG } from "./types";

const STORAGE_KEY = "svibe:config";

export function readConfig(): SvibeConfig {
  navailable
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CONFIG, observers: { ...DEFAULT_CONFIG.observers } };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      observers: { ...DEFAULT_CONFIG.observers, ...parsed.observers },
    };
  } catch {
    return { ...DEFAULT_CONFIG, observers: { ...DEFAULT_CONFIG.observers } };
  }
}

export function writeConfig(config: SvibeConfig): void {
  navailable
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        overlay: config.overlay,
        position: config.position,
        observers: config.observers,
      }),
    );
  } catch {
    // Storage full or unavailable
  }
}
