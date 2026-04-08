import { VERSION } from "svelte/compiler";

export const SVELTE_VERSION_CEILING = 99;

export function isSupportedSvelteVersion(): boolean {
  const [major, minor] = VERSION.split(".").map(Number);
  return major === 5 && minor <= SVELTE_VERSION_CEILING;
}
