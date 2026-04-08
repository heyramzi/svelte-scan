/* oxlint-disable unbound-method -- test captures prototype refs to verify freeze/unfreeze behavior */
import { describe, it, expect, afterEach } from "vitest";
import { createPageFreezer } from "./freeze";

describe("createPageFreezer", () => {
  let freezer: ReturnType<typeof createPageFreezer>;

  afterEach(() => {
    freezer?.destroy();
  });

  it("starts unfrozen", () => {
    freezer = createPageFreezer();
    expect(freezer.isFrozen()).toBe(false);
  });

  it("injects style element on freeze", () => {
    freezer = createPageFreezer();
    freezer.freeze();

    const styleEl = document.querySelector("style[data-svibe-freeze]");
    expect(styleEl).not.toBeNull();
    expect(styleEl!.textContent).toContain("animation-play-state: paused");
    expect(styleEl!.textContent).toContain("transition-duration: 0s");
  });

  it("sets frozen state to true after freeze", () => {
    freezer = createPageFreezer();
    freezer.freeze();
    expect(freezer.isFrozen()).toBe(true);
  });

  it("removes style element on unfreeze", () => {
    freezer = createPageFreezer();
    freezer.freeze();
    freezer.unfreeze();

    const styleEl = document.querySelector("style[data-svibe-freeze]");
    expect(styleEl).toBeNull();
    expect(freezer.isFrozen()).toBe(false);
  });

  it("does not double-freeze", () => {
    freezer = createPageFreezer();
    freezer.freeze();
    freezer.freeze();

    const styles = document.querySelectorAll("style[data-svibe-freeze]");
    expect(styles.length).toBe(1);
  });

  it("does not error on double-unfreeze", () => {
    freezer = createPageFreezer();
    freezer.freeze();
    freezer.unfreeze();
    expect(() => freezer.unfreeze()).not.toThrow();
  });

  it("destroy calls unfreeze if frozen", () => {
    freezer = createPageFreezer();
    freezer.freeze();
    expect(freezer.isFrozen()).toBe(true);

    freezer.destroy();
    expect(freezer.isFrozen()).toBe(false);

    const styleEl = document.querySelector("style[data-svibe-freeze]");
    expect(styleEl).toBeNull();
  });

  it("replaces setInterval/setTimeout with no-ops while frozen", () => {
    freezer = createPageFreezer();
    const origSetInterval = globalThis.setInterval;

    freezer.freeze();
    expect(globalThis.setInterval).not.toBe(origSetInterval);

    const id = globalThis.setInterval(() => {}, 100);
    expect(id).toBe(-1);

    freezer.unfreeze();
    expect(globalThis.setInterval).toBe(origSetInterval);
  });
});
