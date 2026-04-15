export { default as SvelteScan, default as Svibe } from "./src/Svibe.svelte";
export { svibe as svelteScan, svibe } from "./src/api";
export type { SvibeAPI as SvelteScanAPI, SvibeAPI } from "./src/api";
export type { SvibeConfig as SvelteScanConfig, SvibeConfig } from "./src/core/types";
export { registerPlugin, unregisterPlugin, getPlugins, getPluginActions } from "./src/core/plugins";
export type { SvibePlugin as SvelteScanPlugin, SvibePlugin, PluginAction } from "./src/core/plugins";
