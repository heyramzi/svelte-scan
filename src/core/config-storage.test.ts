import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { readConfig, writeConfig } from "./config-storage";
import type { SvelteScanConfig } from "./types";
import { DEFAULT_CONFIG } from "./types";

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

describe("config-storage", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", mockLocalStorage);
    mockLocalStorage.clear();
  });

  test("returns defaults when nothing stored", () => {
    const config = readConfig();
    expect(config.overlay).toBe(DEFAULT_CONFIG.overlay);
    expect(config.observers.dom).toBe(true);
    expect(config.observers.effects).toBe(true);
  });

  test("persists and restores overlay toggle", () => {
    const config = { ...DEFAULT_CONFIG, overlay: false };
    writeConfig(config);

    const restored = readConfig();
    expect(restored.overlay).toBe(false);
  });

  test("persists and restores observer toggles", () => {
    const config: SvelteScanConfig = {
      ...DEFAULT_CONFIG,
      observers: { ...DEFAULT_CONFIG.observers, dom: false, leaks: false },
    };
    writeConfig(config);

    const restored = readConfig();
    expect(restored.observers.dom).toBe(false);
    expect(restored.observers.leaks).toBe(false);
    expect(restored.observers.effects).toBe(true);
  });

  test("persists and restores position", () => {
    const config = { ...DEFAULT_CONFIG, position: "top-right" as const };
    writeConfig(config);

    const restored = readConfig();
    expect(restored.position).toBe("top-right");
  });

  test("merges with defaults when stored config is partial", () => {
    mockLocalStorage.setItem("svelte-scan:config", JSON.stringify({ overlay: false }));
    const restored = readConfig();
    expect(restored.overlay).toBe(false);
    expect(restored.observers.dom).toBe(true);
    expect(restored.position).toBe("bottom-left");
  });
});
