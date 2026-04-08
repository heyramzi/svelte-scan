import { afterEach, describe, expect, it, vi } from "vitest";
import { getProvider, resolveProvider } from "./providers";

describe("getProvider", () => {
  it("returns anthropic provider", () => {
    const provider = getProvider("anthropic");
    expect(provider.name).toBe("anthropic");
    expect(typeof provider.generate).toBe("function");
  });

  it("returns openai provider", () => {
    const provider = getProvider("openai");
    expect(provider.name).toBe("openai");
    expect(typeof provider.generate).toBe("function");
  });

  it("returns gemini provider", () => {
    const provider = getProvider("gemini");
    expect(provider.name).toBe("gemini");
    expect(typeof provider.generate).toBe("function");
  });

  it("throws on unknown provider", () => {
    expect(() => getProvider("unknown")).toThrow('Unknown AI provider: "unknown"');
  });

  it("includes available providers in error message", () => {
    expect(() => getProvider("bad")).toThrow("Available: anthropic, openai, gemini");
  });
});

describe("resolveProvider", () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("uses explicit name when provided", () => {
    const provider = resolveProvider("openai");
    expect(provider.name).toBe("openai");
  });

  it("falls back to SVIBE_AI_PROVIDER env var", () => {
    process.env = { ...originalEnv, SVIBE_AI_PROVIDER: "gemini" };
    const provider = resolveProvider();
    expect(provider.name).toBe("gemini");
  });

  it("defaults to anthropic when no name or env var", () => {
    process.env = { ...originalEnv };
    delete process.env.SVIBE_AI_PROVIDER;
    const provider = resolveProvider();
    expect(provider.name).toBe("anthropic");
  });

  it("explicit name takes precedence over env var", () => {
    process.env = { ...originalEnv, SVIBE_AI_PROVIDER: "gemini" };
    const provider = resolveProvider("openai");
    expect(provider.name).toBe("openai");
  });
});
