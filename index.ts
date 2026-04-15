export { default as SvelteScan, default as Svibe } from "./src/SvelteScan.svelte";
export { svibe as svelteScan, svibe } from "./src/api";
export type { SvelteScanAPI, SvelteScanAPI as SvibeAPI } from "./src/api";
export type { SvelteScanConfig, SvelteScanConfig as SvibeConfig } from "./src/core/types";
export { registerPlugin, unregisterPlugin, getPlugins, getPluginActions } from "./src/core/plugins";
export type { SvelteScanPlugin, SvelteScanPlugin as SvibePlugin, PluginAction } from "./src/core/plugins";
