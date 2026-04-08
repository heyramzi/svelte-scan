// Build a stable path from an element to the document body.
// Format: "BODY > DIV:nth-child(1) > SECTION:nth-child(1) > P:nth-child(1)"
// IDs are used as shortcuts when unique.
export function buildDomPath(element: Element): string | null {
  if (!element || !document.body.contains(element)) return null;

  const parts: string[] = [];
  let current: Element | null = element;

  while (current && current !== document.documentElement) {
    if (current === document.body) {
      parts.unshift("BODY");
      break;
    }

    if (current.id) {
      const escaped = current.id.replace(/([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, "\\$1");
      const matches = document.querySelectorAll(`#${escaped}`);
      if (matches.length === 1) {
        parts.unshift(`#${current.id}`);
        break;
      }
    }

    const parent: Element | null = current.parentElement;
    if (!parent) break;

    const siblings = Array.from(parent.children);
    const index = siblings.indexOf(current) + 1;
    parts.unshift(`${current.tagName}:nth-child(${index})`);
    current = parent;
  }

  return parts.length > 0 ? parts.join(" > ") : null;
}

export function resolveDomPath(path: string): Element | null {
  if (!path) return null;

  // oxlint-ignore-next-line stop-slop/no-raw-try-catch
  try {
    const parts = path.split(" > ");
    let current: Element | null = null;

    for (const part of parts) {
      if (part === "BODY") {
        current = document.body;
        continue;
      }
      if (part.startsWith("#")) {
        current = document.getElementById(part.slice(1));
        if (!current) return null;
        continue;
      }

      const match = part.match(/^(\w+):nth-child\((\d+)\)$/);
      if (!match) return null;

      const [, tagName, nStr] = match;
      const n = parseInt(nStr, 10);
      const parent: Element = current ?? document.body;
      const children: Element[] = Array.from(parent.children);

      if (n < 1 || n > children.length) return null;
      const child: Element = children[n - 1];
      if (child.tagName !== tagName) return null;
      current = child;
    }

    return current;
  } catch {
    return null;
  }
}
