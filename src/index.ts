export { default as SvelteScan } from "#src/SvelteScan.svelte";
export { svibe } from "#src/api";
export type { SvelteScanAPI } from "#src/api";
export type { SvelteScanConfig } from "#src/core/types";
export { registerPlugin, unregisterPlugin, getPlugins, getPluginActions } from "#src/core/plugins";
export type { SvelteScanPlugin, PluginAction } from "#src/core/plugins";
