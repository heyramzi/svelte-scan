// @vitest-environment jsdom
/* oxlint-disable no-unsafe-type-assertion -- test mocks assign __svelte_meta to DOM elements */
import { describe, it, expect, beforeEach, vi } from "vite-plus/test";
import { resolveSource, openInEditor } from "./source";

describe("resolveSource", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("returns source info from __svelte_meta", () => {
    const el = document.createElement("div");
    (el as unknown as Record<string, unknown>).__svelte_meta = {
      loc: {
        file: "src/components/features/projects/ProjectCard.svelte",
        line: 42,
        column: 3,
      },
    };
    document.body.appendChild(el);

    const source = resolveSource(el);

    expect(source).toEqual({
      file: "src/components/features/projects/ProjectCard.svelte",
      line: 42,
      column: 3,
      component: "ProjectCard.svelte",
    });
  });

  it("returns null when no __svelte_meta exists", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);

    expect(resolveSource(el)).toBeNull();
  });

  it("walks up the DOM to find __svelte_meta on parent", () => {
    const parent = document.createElement("div");
    (parent as unknown as Record<string, unknown>).__svelte_meta = {
      loc: {
        file: "src/routes/dashboard/+page.svelte",
        line: 10,
        column: 1,
      },
    };
    const child = document.createElement("span");
    parent.appendChild(child);
    document.body.appendChild(parent);

    const source = resolveSource(child);

    expect(source).not.toBeNull();
    expect(source!.component).toBe("+page.svelte");
    expect(source!.line).toBe(10);
  });

  it("extracts component name from file path correctly", () => {
    const el = document.createElement("div");
    (el as unknown as Record<string, unknown>).__svelte_meta = {
      loc: {
        file: "src/lib/components/Button.svelte",
        line: 1,
        column: 0,
      },
    };
    document.body.appendChild(el);

    const source = resolveSource(el);
    expect(source!.component).toBe("Button.svelte");
  });

  it("handles file paths with no slashes", () => {
    const el = document.createElement("div");
    (el as unknown as Record<string, unknown>).__svelte_meta = {
      loc: { file: "App.svelte", line: 1, column: 0 },
    };
    document.body.appendChild(el);

    const source = resolveSource(el);
    expect(source!.component).toBe("App.svelte");
  });
});

describe("openInEditor", () => {
  it("sends request to Vite's __open-in-editor endpoint", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response());

    openInEditor({
      file: "src/lib/Button.svelte",
      line: 15,
      column: 2,
      component: "Button.svelte",
    });

    expect(fetchSpy).toHaveBeenCalledOnce();
    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toContain("/__open-in-editor");
    expect(url).toContain("file=src%2Flib%2FButton.svelte");
    expect(url).toContain("line=15");
    expect(url).toContain("column=2");

    fetchSpy.mockRestore();
  });
});
