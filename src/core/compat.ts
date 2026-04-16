import sveltePkg from "svelte/package.json";

export const SVELTE_VERSION_CEILING = 99;

export function isSupportedSvelteVersion(): boolean {
  const [major, minor] = sveltePkg.version.split(".").map(Number);
  return major === 5 && minor <= SVELTE_VERSION_CEILING;
}
