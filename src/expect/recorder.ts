/* eslint-disable @typescript-eslint/no-explicit-any -- page is typed as any to avoid hard Playwright dependency */
import { tryCatchAsync } from "../result";

const RRWEB_CDN = "https://cdn.jsdelivr.net/npm/rrweb@2/dist/rrweb.min.js";

const RECORDER_INIT_SCRIPT = `
  if (typeof rrweb !== 'undefined' && !window.__svibe_stop) {
    window.__svibe_events = window.__svibe_events || [];
    window.__svibe_stop = rrweb.record({
      emit: function(event) { window.__svibe_events.push(event); }
    });
  }
`;

export async function injectRecorder(page: any): Promise<void> {
  await tryCatchAsync(async () =>
    page.evaluate(`
      (function() {
        if (typeof rrweb !== 'undefined') return;
        var s = document.createElement('script');
        s.src = '${RRWEB_CDN}';
        s.onload = function() { ${RECORDER_INIT_SCRIPT} };
        document.head.appendChild(s);
      })();
    `),
  );
}

export async function collectEvents(page: any): Promise<unknown[]> {
  const result = await tryCatchAsync(async () =>
    page.evaluate("Array.from(window.__svibe_events || [])"),
  );
  if (!result.ok) return [];
  return Array.isArray(result.value) ? result.value : [];
}

export function formatRecording(events: unknown[]): string {
  return events.map((event) => JSON.stringify(event)).join("\n");
}
