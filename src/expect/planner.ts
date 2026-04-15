import { tryCatch } from "../result";
import type { ChangedFile, TestPlan, TestStep } from "./types";

export function generatePlanId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `plan-${timestamp}-${random}`;
}


export function buildPlanPrompt(files: ChangedFile[], baseUrl: string, message?: string): string {
  const fileDescriptions = files
    .map((file) => {
      const statusLabel = file.status.toUpperCase();
      const stats = `+${file.additions} -${file.deletions}`;
      return `### ${file.path} [${statusLabel}] (${stats})\n\`\`\`diff\n${file.diff}\n\`\`\``;
    })
    .join("\n\n");

  return `You are a QA engineer reviewing code changes. Your job is to generate a browser test plan that tries to break the feature, not just verify it renders.

## Changed Files

${fileDescriptions}

## Instructions

1. Analyze the changes above and identify what user-facing behavior was added or modified.
2. Think like a user trying to break the feature: edge cases, invalid input, race conditions, missing states.
3. Generate a test plan as JSON matching this schema:

\`\`\`json
{
  "id": "string",
  "title": "string - short description of what's being tested",
  "description": "string - what the changes do and why we're testing them",
  "steps": [
    {
      "id": "string",
      "description": "string - what this step does",
      "action": "navigate" | "click" | "fill" | "assert" | "wait" | "screenshot" | "hover" | "select",
      "target": "string - CSS selector or URL",
      "value": "string - input value or expected text",
      "timeout": "number - ms, optional"
    }
  ],
  "baseUrl": "${baseUrl}",
  "createdAt": ${Date.now()}
}
\`\`\`

Respond with ONLY the JSON object, no other text.${message ? `\n\n## Additional Instructions\n\n${message}` : ""}`;
}


export function parsePlanResponse(response: string): TestPlan {
  const jsonString = extractJson(response);
  const parseResult = tryCatch(() => JSON.parse(jsonString) as unknown);
  if (!parseResult.ok) {
    throw new Error(`Failed to parse test plan JSON: ${jsonString.slice(0, 100)}...`);
  }
  const parsed: unknown = parseResult.value;

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Test plan response is not an object");
  }

  // oxlint-ignore-next-line no-unsafe-type-assertion -- narrowing validated object from JSON.parse
  const plan = parsed as Record<string, unknown>;

  if (!plan.title || typeof plan.title !== "string") {
    throw new Error('Test plan missing required field: "title"');
  }

  if (!plan.description || typeof plan.description !== "string") {
    throw new Error('Test plan missing required field: "description"');
  }

  if (!Array.isArray(plan.steps)) {
    throw new Error('Test plan missing required field: "steps"');
  }

  if (!plan.baseUrl || typeof plan.baseUrl !== "string") {
    throw new Error('Test plan missing required field: "baseUrl"');
  }

  // oxlint-ignore-next-line no-unsafe-type-assertion -- parsing untyped AI JSON response
  const steps: TestStep[] = (plan.steps as Record<string, unknown>[]).map(
    (step: Record<string, unknown>, index: number) => ({
      id: typeof step.id === "string" && step.id ? step.id : `step-${index + 1}`,
      description: typeof step.description === "string" ? step.description : `Step ${index + 1}`,
      // oxlint-ignore-next-line no-unsafe-type-assertion -- validated string narrowed to action union
      action: (typeof step.action === "string" ? step.action : "assert") as TestStep["action"],
      target: step.target != null && typeof step.target === "string" ? step.target : undefined,
      value: step.value != null && typeof step.value === "string" ? step.value : undefined,
      timeout: typeof step.timeout === "number" ? step.timeout : undefined,
    }),
  );

  return {
    id: typeof plan.id === "string" && plan.id ? plan.id : generatePlanId(),
    title: plan.title,
    description: plan.description,
    steps,
    baseUrl: plan.baseUrl,
    createdAt: typeof plan.createdAt === "number" ? plan.createdAt : Date.now(),
  };
}

function extractJson(text: string): string {
  // Try to extract from markdown code block
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // Try raw JSON (find first { to last })
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }

  return text.trim();
}
