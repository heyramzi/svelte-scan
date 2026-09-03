import { execSync } from "node:child_process";

export type AIProvider = {
	name: string;
	generate(prompt: string): Promise<string>;
};

function getGatewayConfig() {
	const accountId = process.env.CF_AIG_ACCOUNT_ID;
	const gatewayId = process.env.CF_AIG_GATEWAY_ID;
	const token = process.env.CF_AIG_TOKEN;
	if (!accountId || !gatewayId || !token) {
		throw new Error(
			"CF_AIG_ACCOUNT_ID, CF_AIG_GATEWAY_ID, and CF_AIG_TOKEN environment variables are required",
		);
	}
	return {
		baseUrl: `https://gateway.ai.cloudflare.com/v1/${accountId}/${gatewayId}/openai`,
		token,
	};
}

function createGatewayProvider(name: string, model: string): AIProvider {
	return {
		name,
		generate(prompt: string): Promise<string> {
			const { baseUrl, token } = getGatewayConfig();
			const body = JSON.stringify({
				model,
				messages: [{ role: "user", content: prompt }],
			});
			const result = execSync(
				`curl -s "${baseUrl}/chat/completions" -H "Authorization: Bearer ${token}" -H "content-type: application/json" -d '${body.replace(/'/g, "'\\''")}'`,
				{ encoding: "utf-8" },
			);
			const parsed = JSON.parse(result);
			return Promise.resolve(parsed.choices?.[0]?.message?.content ?? "");
		},
	};
}

const PROVIDERS: Record<string, () => AIProvider> = {
	anthropic: () => createGatewayProvider("anthropic", "anthropic/claude-sonnet-4-6"),
	google: () => createGatewayProvider("google", "google-ai-studio/gemini-3.8-flash"),
	xai: () => createGatewayProvider("xai", "grok/grok-4-fast"),
};

export function getProvider(name: string): AIProvider {
	const factory = PROVIDERS[name];
	if (!factory) {
		throw new Error(
			`Unknown AI provider: "${name}". Available: ${Object.keys(PROVIDERS).join(", ")}`,
		);
	}
	return factory();
}

export function resolveProvider(nameOrEnv?: string): AIProvider {
	const name = nameOrEnv ?? process.env.SVIBE_AI_PROVIDER ?? "anthropic";
	return getProvider(name);
}
