export { default as Svibe } from "./src/Svibe.svelte";
export { svibe } from "./src/api";
export type { SvibeAPI } from "./src/api";
export type { SvibeConfig } from "./src/core/types";
export { registerPlugin, unregisterPlugin, getPlugins, getPluginActions } from "./src/core/plugins";
export type { SvibePlugin, PluginAction } from "./src/core/plugins";
