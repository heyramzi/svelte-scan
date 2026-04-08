import type { SourceInfo } from "./types";

type SvelteMeta = {
  loc: { file: string; line: number; column: number };
};

// Resolve a DOM element to its Svelte source file using dev-mode metadata
export function resolveSource(element: Element): SourceInfo | null {
  let current: Element | null = element;

  while (current) {
    // oxlint-ignore-next-line no-unsafe-type-assertion -- accessing Svelte dev-mode metadata on DOM elements
    const meta = (current as unknown as { __svelte_meta?: SvelteMeta }).__svelte_meta;

    if (meta?.loc) {
      return {
        file: meta.loc.file,
        line: meta.loc.line,
        column: meta.loc.column,
        component: extractComponentName(meta.loc.file),
      };
    }

    current = current.parentElement;
  }

  return null;
}

function extractComponentName(filePath: string): string {
  const segments = filePath.split("/");
  return segments[segments.length - 1] || filePath;
}

// Open source file in the user's editor via Vite's built-in endpoint
export function openInEditor(source: SourceInfo): void {
  const params = new URLSearchParams({
    file: source.file,
    line: String(source.line),
    column: String(source.column),
  });

  fetch(`/__open-in-editor?${params.toString()}`).catch(() => {
    // Silently fail if Vite endpoint is unavailable
  });
}
