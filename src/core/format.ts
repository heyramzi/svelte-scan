/**
 * Shared argument stringification for console patching.
 * Used by both the browser-side console observer and the server-side Vite plugin.
 */
export function stringifyArg(arg: unknown): string {
  try {
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
}

export function argsToString(args: unknown[]): string {
  return args
    .map((arg) => {
      if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
      if (typeof arg === "string") return arg;
      return stringifyArg(arg);
    })
    .join(" ");
}
