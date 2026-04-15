import { MAX_CANVAS_RECTS, FLASH_DURATION_MS } from "../core/types";
import type { Collector } from "../core/types";

type CanvasRect = {
  rect: DOMRect;
  intensity: number;
  startTime: number;
};

export type CanvasOverlay = {
  mount(container: HTMLElement): void;
  destroy(): void;
};

// Color thresholds (mutations/sec): 1-8 purple, 8-30 yellow, 30+ red
function intensityColor(frequency: number): string {
  if (frequency > 30) return "oklch(0.60 0.22 25)";
  if (frequency > 8) return "oklch(0.80 0.15 85)";
  return "oklch(0.55 0.20 290)";
}

export function createCanvasOverlay(collector: Collector): CanvasOverlay {
  let canvas: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  let rafId: number | null = null;
  const rects: CanvasRect[] = [];
  let head = 0;
  let count = 0;

  const frequencyMap = new Map<Element, number[]>();
  let unsubscribe: (() => void) | null = null;

  function addRect(rect: DOMRect, intensity: number): void {
    const entry: CanvasRect = { rect, intensity, startTime: performance.now() };
    if (count < MAX_CANVAS_RECTS) {
      rects[head + count] = entry;
      count++;
    } else {
      // Ring buffer: overwrite oldest
      rects[head] = entry;
      head = (head + 1) % MAX_CANVAS_RECTS;
    }
    // Start RAF if not running
    if (rafId === null) {
      rafId = requestAnimationFrame(draw);
    }
  }

  function draw(): void {
    if (!canvas || !ctx) {
      rafId = null;
      return;
    }

    const now = performance.now();
    const w = window.innerWidth;
    const h = window.innerHeight;

    if (canvas.width !== w * devicePixelRatio || canvas.height !== h * devicePixelRatio) {
      canvas.width = w * devicePixelRatio;
      canvas.height = h * devicePixelRatio;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.scale(devicePixelRatio, devicePixelRatio);
    }

    ctx.clearRect(0, 0, w, h);

    let hasActive = false;
    for (let i = 0; i < count; i++) {
      const idx = (head + i) % MAX_CANVAS_RECTS;
      const entry = rects[idx];
      const elapsed = now - entry.startTime;
      if (elapsed >= FLASH_DURATION_MS) continue;

      hasActive = true;
      const alpha = 1 - elapsed / FLASH_DURATION_MS;
      ctx.globalAlpha = alpha * 0.4;
      ctx.fillStyle = intensityColor(entry.intensity);
      ctx.fillRect(entry.rect.left, entry.rect.top, entry.rect.width, entry.rect.height);

      ctx.globalAlpha = alpha * 0.8;
      ctx.strokeStyle = intensityColor(entry.intensity);
      ctx.lineWidth = 2;
      ctx.strokeRect(entry.rect.left, entry.rect.top, entry.rect.width, entry.rect.height);
    }

    ctx.globalAlpha = 1;

    if (hasActive) {
      rafId = requestAnimationFrame(draw);
    } else {
      rafId = null;
      // Clear expired entries
      head = 0;
      count = 0;
    }
  }

  function onDomEvent(event: { target: Element; rect: DOMRect }): void {
    const { rect, target } = event;
    if (rect.width === 0 && rect.height === 0) return;

    // Skip viewport-sized elements (body, html, full-screen layouts)
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (rect.width >= vw * 0.85 && rect.height >= vh * 0.85) return;

    const times = frequencyMap.get(target) ?? [];
    const now = Date.now();
    times.push(now);
    const recent = times.filter((t) => now - t < 1000);
    if (recent.length > 0) {
      frequencyMap.set(target, recent);
    } else {
      frequencyMap.delete(target);
    }

    addRect(rect, recent.length);
  }

  return {
    mount(container: HTMLElement) {
      if (canvas) return;
      canvas = document.createElement("canvas");
      canvas.setAttribute("data-svelte-scan-canvas-overlay", "");
      canvas.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:99998;";
      container.appendChild(canvas);
      ctx = canvas.getContext("2d");

      unsubscribe = collector.subscribe("dom", onDomEvent);
    },

    destroy() {
      unsubscribe?.();
      unsubscribe = null;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      canvas?.remove();
      canvas = null;
      ctx = null;
      head = 0;
      count = 0;
      frequencyMap.clear();
    },
  };
}
