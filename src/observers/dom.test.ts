// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createDomObserver } from "./dom";
import { createCollector } from "../core/collector";
import { IGNORE_ATTR } from "../core/types";

describe("createDomObserver", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it("emits dom events when elements change", async () => {
    const collector = createCollector();
    const handler = vi.fn();
    collector.subscribe("dom", handler);

    const observer = createDomObserver(collector);
    observer.start();

    const child = document.createElement("span");
    child.textContent = "hello";
    container.appendChild(child);

    await new Promise((r) => setTimeout(r, 50));

    expect(handler).toHaveBeenCalled();
    const event = handler.mock.calls[0][0];
    expect(event.type).toBe("dom");
    expect(event.rect).toBeDefined();

    observer.destroy();
  });

  it("ignores mutations inside data-svibe-ignore", async () => {
    const collector = createCollector();
    const handler = vi.fn();
    collector.subscribe("dom", handler);

    const ignored = document.createElement("div");
    ignored.setAttribute(IGNORE_ATTR, "");
    container.appendChild(ignored);

    const observer = createDomObserver(collector);
    observer.start();

    await new Promise((r) => setTimeout(r, 50));
    handler.mockClear();

    const child = document.createElement("span");
    ignored.appendChild(child);

    await new Promise((r) => setTimeout(r, 50));

    expect(handler).not.toHaveBeenCalled();

    observer.destroy();
  });

  it("stops observing after stop()", async () => {
    const collector = createCollector();
    const handler = vi.fn();
    collector.subscribe("dom", handler);

    const observer = createDomObserver(collector);
    observer.start();
    observer.stop();

    container.appendChild(document.createElement("span"));
    await new Promise((r) => setTimeout(r, 50));

    expect(handler).not.toHaveBeenCalled();

    observer.destroy();
  });
});
