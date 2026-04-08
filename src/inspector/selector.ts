import { tryCatch } from "../result";

// Generate a unique CSS selector for a DOM element
export function generateSelector(element: Element): string {
  // Document or non-element nodes
  if (!element || element === document.documentElement) return "html";
  if (element === document.body) return "body";

  const selector = buildSelector(element);

  // Verify uniqueness: if querySelector returns our element, we're good
  const result = tryCatch(() => document.querySelector(selector));
  if (result.ok && result.value === element) return selector;

  // Fallback: build a full path from root
  return buildFullPath(element);
}

function buildSelector(element: Element): string {
  // 1. ID (if unique in document)
  const id = element.id;
  if (id && isValidCssIdentifier(id)) {
    const matches = document.querySelectorAll(`#${escapeCss(id)}`);
    if (matches.length === 1) return `#${escapeCss(id)}`;
  }

  // 2. data-testid
  const testId = element.getAttribute("data-testid");
  if (testId) {
    const sel = `[data-testid="${escapeCssAttrValue(testId)}"]`;
    if (isUnique(sel, element)) return sel;
  }

  // 3. data-svelte-* attributes
  for (const attr of element.attributes) {
    if (attr.name.startsWith("data-svelte-")) {
      const sel = `[${attr.name}="${escapeCssAttrValue(attr.value)}"]`;
      if (isUnique(sel, element)) return sel;
    }
  }

  const tag = element.tagName.toLowerCase();

  // 4. Tag + classes (if unique among siblings)
  if (element.classList.length > 0) {
    const classSelector = Array.from(element.classList)
      .filter(isValidCssIdentifier)
      .map((c) => `.${escapeCss(c)}`)
      .join("");

    if (classSelector) {
      const tagClassSel = `${tag}${classSelector}`;
      if (isUnique(tagClassSel, element)) return tagClassSel;

      // Try unique among siblings
      const parent = element.parentElement;
      if (parent) {
        const siblings = parent.querySelectorAll(`:scope > ${tagClassSel}`);
        if (siblings.length === 1 && siblings[0] === element) {
          const parentSel = buildSelector(parent);
          const chained = `${parentSel} > ${tagClassSel}`;
          if (isUnique(chained, element)) return chained;
        }
      }
    }
  }

  // 5. nth-child fallback
  const nthSel = buildNthChild(element);
  const parent = element.parentElement;
  if (parent) {
    const parentSel = buildSelector(parent);
    const chained = `${parentSel} > ${nthSel}`;
    if (isUnique(chained, element)) return chained;
  }

  return nthSel;
}

function buildNthChild(element: Element): string {
  const parent = element.parentElement;
  if (!parent) return element.tagName.toLowerCase();

  const tag = element.tagName.toLowerCase();
  const children = Array.from(parent.children);
  const index = children.indexOf(element) + 1;
  return `${tag}:nth-child(${index})`;
}

function buildFullPath(element: Element): string {
  const parts: string[] = [];
  let current: Element | null = element;

  while (current && current !== document.documentElement) {
    if (current === document.body) {
      parts.unshift("body");
      break;
    }

    // Use id shortcut if available and unique
    const id = current.id;
    if (id && isValidCssIdentifier(id)) {
      const matches = document.querySelectorAll(`#${escapeCss(id)}`);
      if (matches.length === 1) {
        parts.unshift(`#${escapeCss(id)}`);
        break;
      }
    }

    parts.unshift(buildNthChild(current));
    current = current.parentElement;
  }

  if (parts.length === 0) return "html";
  return parts.join(" > ");
}

function isUnique(selector: string, element: Element): boolean {
  const result = tryCatch(() => document.querySelectorAll(selector));
  if (!result.ok) return false;
  return result.value.length === 1 && result.value[0] === element;
}

function isValidCssIdentifier(value: string): boolean {
  // CSS identifiers cannot start with a digit and must not be empty
  if (!value || /^\d/.test(value)) return false;
  // Reject strings with characters that would need complex escaping
  if (/[\s"'\\#.>+~[\]:(){}|^$*=!]/.test(value)) return false;
  return true;
}

function escapeCss(value: string): string {
  // Use CSS.escape if available (modern browsers)
  if (typeof CSS !== "undefined" && CSS.escape) return CSS.escape(value);
  // Simple fallback: escape special chars
  return value.replace(/([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, "\\$1");
}

function escapeCssAttrValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
