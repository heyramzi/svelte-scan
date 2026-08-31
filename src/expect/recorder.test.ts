import { describe, expect, it, vi } from "vite-plus/test";
import { collectEvents, formatRecording, injectRecorder } from "./recorder";

function createMockPage() {
  return {
    evaluate: vi.fn().mockResolvedValue(undefined),
  };
}

describe("injectRecorder", () => {
  it("calls page.evaluate to inject rrweb script", async () => {
    const page = createMockPage();
    await injectRecorder(page);

    expect(page.evaluate).toHaveBeenCalledTimes(1);
    expect(page.evaluate.mock.calls[0][0]).toContain("rrweb");
  });

  it("does not throw if page.evaluate fails", async () => {
    const page = createMockPage();
    page.evaluate.mockRejectedValue(new Error("Context destroyed"));

    await expect(injectRecorder(page)).resolves.toBeUndefined();
  });
});

describe("collectEvents", () => {
  it("returns events array from page", async () => {
    const page = createMockPage();
    const mockEvents = [
      { type: 1, data: {} },
      { type: 2, data: {} },
    ];
    page.evaluate.mockResolvedValue(mockEvents);

    const events = await collectEvents(page);

    expect(events).toEqual(mockEvents);
  });

  it("returns empty array when no events", async () => {
    const page = createMockPage();
    page.evaluate.mockResolvedValue([]);

    const events = await collectEvents(page);

    expect(events).toEqual([]);
  });

  it("returns empty array on error", async () => {
    const page = createMockPage();
    page.evaluate.mockRejectedValue(new Error("Page closed"));

    const events = await collectEvents(page);

    expect(events).toEqual([]);
  });
});

describe("formatRecording", () => {
  it("serializes to NDJSON", () => {
    const events = [
      { type: 1, data: { href: "http://localhost" } },
      { type: 2, data: { node: {} } },
    ];

    const result = formatRecording(events);
    const lines = result.split("\n");

    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0])).toEqual(events[0]);
    expect(JSON.parse(lines[1])).toEqual(events[1]);
  });

  it("handles empty events", () => {
    const result = formatRecording([]);
    expect(result).toBe("");
  });
});
