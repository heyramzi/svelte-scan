import { describe, it, expect, vi, beforeEach } from "vite-plus/test";
import {
  registerPlugin,
  unregisterPlugin,
  getPlugins,
  getPluginActions,
  destroyAllPlugins,
} from "./plugins";
import type { SvelteScanAPI } from "../api";
import type { SvelteScanPlugin } from "./plugins";

function createMockAPI(): SvelteScanAPI {
  return {
    on: vi.fn(() => vi.fn()),
    getReport: vi.fn(() => ({
      mutationsPerSec: 0,
      hotSpots: [],
      effectOffenders: [],
      leaks: [],
      consoleErrors: [],
      serverLogs: [],
      interactions: [],
      reactivity: { signals: 0, deriveds: 0, effects: 0, maxDepth: 0 },
    })),
    getCollector: vi.fn(() => null),
    start: vi.fn(),
    stop: vi.fn(),
    isRunning: vi.fn(() => false),
    destroy: vi.fn(),
  };
}

describe("plugin system", () => {
  let mockAPI: SvelteScanAPI;

  beforeEach(() => {
    destroyAllPlugins();
    mockAPI = createMockAPI();
  });

  it("registers a plugin and calls setup", () => {
    const setup = vi.fn();
    const plugin: SvelteScanPlugin = { name: "test-plugin", setup };

    registerPlugin(plugin, mockAPI);

    expect(setup).toHaveBeenCalledWith(mockAPI);
    expect(getPlugins()).toEqual(["test-plugin"]);
  });

  it("unregisters a plugin and calls cleanup", () => {
    const cleanup = vi.fn();
    const plugin: SvelteScanPlugin = {
      name: "test-plugin",
      setup: () => cleanup,
    };

    registerPlugin(plugin, mockAPI);
    unregisterPlugin("test-plugin");

    expect(cleanup).toHaveBeenCalledOnce();
    expect(getPlugins()).toEqual([]);
  });

  it("unregister is a no-op for unknown plugins", () => {
    expect(() => unregisterPlugin("nonexistent")).not.toThrow();
  });

  it("re-registering a plugin cleans up the old one", () => {
    const cleanup1 = vi.fn();
    const plugin1: SvelteScanPlugin = {
      name: "my-plugin",
      setup: () => cleanup1,
    };

    const cleanup2 = vi.fn();
    const plugin2: SvelteScanPlugin = {
      name: "my-plugin",
      setup: () => cleanup2,
    };

    registerPlugin(plugin1, mockAPI);
    registerPlugin(plugin2, mockAPI);

    expect(cleanup1).toHaveBeenCalledOnce();
    expect(getPlugins()).toEqual(["my-plugin"]);
  });

  it("registers plugin actions", () => {
    const onClick = vi.fn();
    const plugin: SvelteScanPlugin = {
      name: "action-plugin",
      setup: () => undefined,
      actions: [{ label: "Do Thing", shortcut: "Ctrl+D", onClick }],
    };

    registerPlugin(plugin, mockAPI);

    const actions = getPluginActions();
    expect(actions).toHaveLength(1);
    expect(actions[0].label).toBe("Do Thing");
    expect(actions[0].shortcut).toBe("Ctrl+D");

    actions[0].onClick();
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("destroyAllPlugins cleans up everything", () => {
    const cleanup1 = vi.fn();
    const cleanup2 = vi.fn();

    registerPlugin({ name: "a", setup: () => cleanup1 }, mockAPI);
    registerPlugin({ name: "b", setup: () => cleanup2 }, mockAPI);

    destroyAllPlugins();

    expect(cleanup1).toHaveBeenCalledOnce();
    expect(cleanup2).toHaveBeenCalledOnce();
    expect(getPlugins()).toEqual([]);
  });

  it("handles plugins with no cleanup function", () => {
    const plugin: SvelteScanPlugin = {
      name: "no-cleanup",
      setup: () => undefined,
    };

    registerPlugin(plugin, mockAPI);
    expect(() => unregisterPlugin("no-cleanup")).not.toThrow();
  });
});
