import type { SvelteScanAPI } from "../api";

export type PluginAction = {
  label: string;
  shortcut?: string;
  onClick(): void;
};

export type SvelteScanPlugin = {
  name: string;
  setup(api: SvelteScanAPI): void | (() => void);
  actions?: PluginAction[];
};

/** @deprecated Use SvelteScanPlugin instead */
export type SvibePlugin = SvelteScanPlugin;

type RegisteredPlugin = {
  name: string;
  cleanup: (() => void) | undefined;
  actions: PluginAction[];
};

const plugins = new Map<string, RegisteredPlugin>();

export function registerPlugin(plugin: SvelteScanPlugin, api: SvelteScanAPI): void {
  if (plugins.has(plugin.name)) {
    unregisterPlugin(plugin.name);
  }

  const result = plugin.setup(api);
  plugins.set(plugin.name, {
    name: plugin.name,
    cleanup: result ?? undefined,
    actions: plugin.actions ?? [],
  });
}

export function unregisterPlugin(name: string): void {
  const registered = plugins.get(name);
  if (!registered) return;
  registered.cleanup?.();
  plugins.delete(name);
}

export function getPlugins(): string[] {
  return [...plugins.keys()];
}

export function getPluginActions(): PluginAction[] {
  const all: PluginAction[] = [];
  for (const p of plugins.values()) {
    all.push(...p.actions);
  }
  return all;
}

export function destroyAllPlugins(): void {
  const names = Array.from(plugins.keys());
  for (const name of names) {
    unregisterPlugin(name);
  }
}
