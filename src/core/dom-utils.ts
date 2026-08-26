/* oxlint-ignore no-unsafe-type-assertion -- Svelte meta access requires unsafe narrowing */
import { IGNORE_ATTR } from "./types";

const TOOLBAR_ATTR = "data-svelte-scan-toolbar";

/**
 * Walk up the DOM checking for an attribute on any ancestor.
 * Handles both Element and non-Element nodes (TextNode etc.).
 */
function hasAncestorWithAttribute(node: Node, attr: string): boolean {
  let el: Element | null =
    node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  while (el) {
    if (el.hasAttribute(attr)) return true;
    el = el.parentElement;
  }
  return false;
}

export function isIgnored(node: Node): boolean {
  return hasAncestorWithAttribute(node, IGNORE_ATTR);
}

export function isInsideToolbar(node: Node): boolean {
  return hasAncestorWithAttribute(node, TOOLBAR_ATTR);
}

/**
 * Check if a node belongs to svelte-scan's own UI (toolbar, canvas overlay, etc.).
 * Matches any element with a `data-svelte-scan-*` attribute.
 */
export function isSvibeOwned(node: Node): boolean {
  let el: Element | null =
    node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  while (el) {
    for (const attr of el.attributes) {
      if (attr.name.startsWith("data-svelte-scan-")) return true;
    }
    el = el.parentElement;
  }
  return false;
}

/**
 * Resolve the Svelte component name from an element by walking up
 * the DOM and checking for __svelte_meta.
 * Falls back to `tag.firstClass` for non-Svelte elements.
 */
export function resolveComponentName(element: Element): string {
  let node: Element | null = element;
  while (node) {
    const meta = (node as unknown as Record<string, unknown>).__svelte_meta;
    if (meta && typeof meta === "object" && "loc" in meta) {
      const loc = (meta as { loc?: { file?: string } }).loc;
      if (loc?.file) {
        const name = loc.file.split("/").pop()?.replace(".svelte", "") ?? "Unknown";
        return `${name}.svelte`;
      }
    }
    node = node.parentElement;
  }
  const tag = element.tagName.toLowerCase();
  const cls = element.className ? `.${element.className.toString().split(" ")[0]}` : "";
  return `${tag}${cls}`;
}
