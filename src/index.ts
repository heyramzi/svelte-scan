export { default as Svibe } from "./Svibe.svelte";
export { svibe } from "./api";
export type { SvibeAPI } from "./api";
export type { SvibeConfig } from "./core/types";
export { registerPlugin, unregisterPlugin, getPlugins, getPluginActions } from "./core/plugins";
export type { SvibePlugin, PluginAction } from "./core/plugins";
