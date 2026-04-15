export { default as SvelteScan } from "./SvelteScan.svelte";
export { svibe } from "./api";
export type { SvelteScanAPI } from "./api";
export type { SvelteScanConfig } from "./core/types";
export { registerPlugin, unregisterPlugin, getPlugins, getPluginActions } from "./core/plugins";
export type { SvelteScanPlugin, PluginAction } from "./core/plugins";
