import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { getProvider, resolveProvider } from "./providers";

describe("getProvider", () => {
	it("returns anthropic provider", () => {
		const provider = getProvider("anthropic");
		expect(provider.name).toBe("anthropic");
		expect(typeof provider.generate).toBe("function");
	});

	it("returns google provider", () => {
		const provider = getProvider("google");
		expect(provider.name).toBe("google");
		expect(typeof provider.generate).toBe("function");
	});

	it("returns xai provider", () => {
		const provider = getProvider("xai");
		expect(provider.name).toBe("xai");
		expect(typeof provider.generate).toBe("function");
	});

	it("throws on unknown provider", () => {
		expect(() => getProvider("unknown")).toThrow('Unknown AI provider: "unknown"');
	});

	it("includes available providers in error message", () => {
		expect(() => getProvider("bad")).toThrow("Available: anthropic, google, xai");
	});
});

describe("resolveProvider", () => {
	const originalEnv = process.env;

	afterEach(() => {
		process.env = originalEnv;
		vi.restoreAllMocks();
	});

	it("uses explicit name when provided", () => {
		const provider = resolveProvider("google");
		expect(provider.name).toBe("google");
	});

	it("falls back to SVIBE_AI_PROVIDER env var", () => {
		process.env = { ...originalEnv, SVIBE_AI_PROVIDER: "xai" };
		const provider = resolveProvider();
		expect(provider.name).toBe("xai");
	});

	it("defaults to anthropic when no name or env var", () => {
		process.env = { ...originalEnv };
		delete process.env.SVIBE_AI_PROVIDER;
		const provider = resolveProvider();
		expect(provider.name).toBe("anthropic");
	});

	it("explicit name takes precedence over env var", () => {
		process.env = { ...originalEnv, SVIBE_AI_PROVIDER: "xai" };
		const provider = resolveProvider("google");
		expect(provider.name).toBe("google");
	});
});
