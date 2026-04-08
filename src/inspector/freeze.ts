import { tryCatch } from "../result";

// Freeze/unfreeze page state while inspecting
export function createPageFreezer() {
  let frozen = false;
  let styleEl: HTMLStyleElement | null = null;
  let pausedAnimations: Animation[] = [];
  let originalSetInterval: typeof globalThis.setInterval | null = null;
  let originalSetTimeout: typeof globalThis.setTimeout | null = null;

  function freeze() {
    if (frozen) return;
    frozen = true;

    // CSS: pause animations and kill transitions
    styleEl = document.createElement("style");
    styleEl.setAttribute("data-svibe-freeze", "");
    styleEl.textContent = `
*, *::before, *::after {
  animation-play-state: paused !important;
  transition-duration: 0s !important;
  transition-delay: 0s !important;
}`;
    document.head.appendChild(styleEl);

    // Web Animations API: pause running animations
    if (typeof document.getAnimations === "function") {
      pausedAnimations = document.getAnimations().filter((a) => a.playState === "running");
      for (const anim of pausedAnimations) {
        anim.pause();
      }
    }

    // Prevent new intervals/timeouts (don't clear existing ones)
    originalSetInterval = globalThis.setInterval;
    originalSetTimeout = globalThis.setTimeout;

    // oxlint-ignore-next-line no-unsafe-type-assertion -- intentional stub to block new timers during inspect
    globalThis.setInterval = (() => -1) as unknown as typeof globalThis.setInterval;
    // oxlint-ignore-next-line no-unsafe-type-assertion -- intentional stub to block new timers during inspect
    globalThis.setTimeout = (() => -1) as unknown as typeof globalThis.setTimeout;
  }

  function unfreeze() {
    if (!frozen) return;
    frozen = false;

    // Remove freeze stylesheet
    if (styleEl?.parentNode) {
      styleEl.parentNode.removeChild(styleEl);
      styleEl = null;
    }

    // Resume paused Web Animations
    for (const anim of pausedAnimations) {
      tryCatch(() => anim.play());
    }
    pausedAnimations = [];

    // Restore interval/timeout
    if (originalSetInterval) {
      globalThis.setInterval = originalSetInterval;
      originalSetInterval = null;
    }
    if (originalSetTimeout) {
      globalThis.setTimeout = originalSetTimeout;
      originalSetTimeout = null;
    }
  }

  function destroy() {
    if (frozen) unfreeze();
  }

  return {
    freeze,
    unfreeze,
    isFrozen: () => frozen,
    destroy,
  };
}
