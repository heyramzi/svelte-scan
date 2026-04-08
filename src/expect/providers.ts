import { execSync } from "node:child_process";

export type AIProvider = {
  name: string;
  generate(prompt: string): Promise<string>;
};

function createAnthropicProvider(): AIProvider {
  return {
    name: "anthropic",
    generate(prompt: string): Promise<string> {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error("ANTHROPIC_API_KEY environment variable is required");
      }
      const body = JSON.stringify({
        model: "claude-sonnet-4-20250514",
        // oxlint-ignore-next-line upsys/no-snake-case-props -- Anthropic API parameter
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      });
      const result = execSync(
        `curl -s https://api.anthropic.com/v1/messages -H "x-api-key: ${apiKey}" -H "anthropic-version: 2023-06-01" -H "content-type: application/json" -d '${body.replace(/'/g, "'\\''")}'`,
        { encoding: "utf-8" },
      );
      const parsed = JSON.parse(result);
      return Promise.resolve(parsed.content?.[0]?.text ?? "");
    },
  };
}

function createOpenAIProvider(): AIProvider {
  return {
    name: "openai",
    generate(prompt: string): Promise<string> {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error("OPENAI_API_KEY environment variable is required");
      }
      const body = JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
      });
      const result = execSync(
        `curl -s https://api.openai.com/v1/chat/completions -H "Authorization: Bearer ${apiKey}" -H "content-type: application/json" -d '${body.replace(/'/g, "'\\''")}'`,
        { encoding: "utf-8" },
      );
      const parsed = JSON.parse(result);
      return Promise.resolve(parsed.choices?.[0]?.message?.content ?? "");
    },
  };
}

function createGeminiProvider(): AIProvider {
  return {
    name: "gemini",
    generate(prompt: string): Promise<string> {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY environment variable is required");
      }
      const model = "gemini-2.5-flash";
      const body = JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      });
      const result = execSync(
        `curl -s "https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}" -H "content-type: application/json" -d '${body.replace(/'/g, "'\\''")}'`,
        { encoding: "utf-8" },
      );
      const parsed = JSON.parse(result);
      return Promise.resolve(parsed.candidates?.[0]?.content?.parts?.[0]?.text ?? "");
    },
  };
}

const PROVIDERS: Record<string, () => AIProvider> = {
  anthropic: createAnthropicProvider,
  openai: createOpenAIProvider,
  gemini: createGeminiProvider,
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
