/**
 * FPS meter using requestAnimationFrame.
 * Counts frames per second, updated every second.
 * Starts stopped; call start() to begin the rAF loop.
 */
export function createFpsMeter(): {
  getFps(): number;
  start(): void;
  stop(): void;
  destroy(): void;
} {
  let fps = 60;
  let frameCount = 0;
  let lastTime = 0;
  let rafId: number | null = null;

  function tick() {
    frameCount++;
    const now = performance.now();
    if (now - lastTime >= 1000) {
      fps = frameCount;
      frameCount = 0;
      lastTime = now;
    }
    rafId = requestAnimationFrame(tick);
  }

  return {
    getFps: () => fps,
    start() {
      if (rafId !== null) return;
      lastTime = performance.now();
      frameCount = 0;
      rafId = requestAnimationFrame(tick);
    },
    stop() {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    },
    destroy() {
      this.stop();
    },
  };
}
