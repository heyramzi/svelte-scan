import { describe, it, expect, vi, beforeEach } from "vitest";

describe("compat", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("reports current Svelte 5 as supported", async () => {
    const { isSupportedSvelteVersion } = await import("./compat");
    expect(isSupportedSvelteVersion()).toBe(true);
  });

  it("rejects Svelte 4.x", async () => {
    vi.doMock("svelte/package.json", () => ({ default: { version: "4.2.0" } }));
    const { isSupportedSvelteVersion } = await import("./compat");
    expect(isSupportedSvelteVersion()).toBe(false);
  });

  it("rejects Svelte 5 above ceiling", async () => {
    vi.doMock("svelte/package.json", () => ({ default: { version: "5.100.0" } }));
    const { isSupportedSvelteVersion } = await import("./compat");
    expect(isSupportedSvelteVersion()).toBe(false);
  });

  it("exports SVELTE_VERSION_CEILING as 99", async () => {
    const { SVELTE_VERSION_CEILING } = await import("./compat");
    expect(SVELTE_VERSION_CEILING).toBe(99);
  });
});
