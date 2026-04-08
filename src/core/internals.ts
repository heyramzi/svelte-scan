import { tryCatchAsync } from "../result";

/**
 * Load svelte/internal/client at runtime.
 * Extracted to a .ts file because .svelte files forbid static imports of svelte/internal/*.
 * The dynamic import uses a variable to bypass Vite's static analysis when needed.
 */
export async function getSvelteInternals(): Promise<Record<string, unknown> | null> {
  const mod = "svelte/internal/client";
  const result = await tryCatchAsync(async () => import(/* @vite-ignore */ mod));
  return result.ok ? result.value : null;
}
