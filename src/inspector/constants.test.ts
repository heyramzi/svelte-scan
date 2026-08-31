import { describe, it, expect } from "vite-plus/test";
import { MARKER_COLOR, DEFAULT_SETTINGS, STORAGE_PREFIX } from "./constants";

describe("constants", () => {
  it("has a valid hex marker color", () => {
    expect(MARKER_COLOR).toMatch(/^#/);
  });

  it("default settings have valid output mode", () => {
    expect(["compact", "standard", "detailed", "forensic"]).toContain(DEFAULT_SETTINGS.outputMode);
  });

  it("storage prefix is namespaced", () => {
    expect(STORAGE_PREFIX).toMatch(/^svibe/);
  });
});
