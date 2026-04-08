import { describe, it, expect, beforeEach } from "vitest";
import { buildDomPath, resolveDomPath } from "./dom-path";

describe("dom-path", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    container.innerHTML = '<section><p id="target">Hello</p></section>';
    document.body.appendChild(container);
    return () => container.remove();
  });

  it("builds path from element to body", () => {
    // #target has a unique ID, so the path uses the ID shortcut
    const target = container.querySelector("#target")!;
    const path = buildDomPath(target);
    expect(path).not.toBeNull();
    // Should use the ID shortcut since the ID is unique
    expect(path).toContain("#target");
  });

  it("builds nth-child path for element without unique id", () => {
    // container has no ID, so it should use nth-child notation
    const path = buildDomPath(container);
    expect(path).not.toBeNull();
    expect(path).toContain(">");
    expect(path).toContain(":nth-child(");
  });

  it("resolves path back to element", () => {
    const target = container.querySelector("#target")!;
    const path = buildDomPath(target);
    expect(path).not.toBeNull();
    const resolved = resolveDomPath(path!);
    expect(resolved).toBe(target);
  });

  it("returns null for detached element", () => {
    const detached = document.createElement("span");
    expect(buildDomPath(detached)).toBeNull();
  });

  it("returns null for invalid path", () => {
    expect(resolveDomPath("NONEXISTENT > FAKE")).toBeNull();
  });
});
