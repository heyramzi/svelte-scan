import { describe, expect, it } from "vitest";
import type { ChangedFile } from "./types";
import { buildPlanPrompt, generatePlanId, parsePlanResponse } from "./planner";

const sampleFiles: ChangedFile[] = [
  {
    path: "src/routes/dashboard/+page.svelte",
    status: "modified",
    additions: 10,
    deletions: 3,
    diff: "+ <Button>Save</Button>\n- <span>old</span>",
  },
  {
    path: "src/lib/utils.ts",
    status: "added",
    additions: 20,
    deletions: 0,
    diff: "+ export function format() { ... }",
  },
];

describe("buildPlanPrompt", () => {
  it("includes file paths and diff content", () => {
    const prompt = buildPlanPrompt(sampleFiles, "http://localhost:3000");

    expect(prompt).toContain("src/routes/dashboard/+page.svelte");
    expect(prompt).toContain("src/lib/utils.ts");
    expect(prompt).toContain("<Button>Save</Button>");
    expect(prompt).toContain("export function format()");
  });

  it("includes baseUrl", () => {
    const prompt = buildPlanPrompt(sampleFiles, "http://localhost:5173");

    expect(prompt).toContain("http://localhost:5173");
  });

  it("includes file status and stats", () => {
    const prompt = buildPlanPrompt(sampleFiles, "http://localhost:3000");

    expect(prompt).toContain("[MODIFIED]");
    expect(prompt).toContain("[ADDED]");
    expect(prompt).toContain("+10 -3");
    expect(prompt).toContain("+20 -0");
  });

  it("appends additional instructions when message is provided", () => {
    const prompt = buildPlanPrompt(sampleFiles, "http://localhost:3000", "Focus on error states");

    expect(prompt).toContain("## Additional Instructions");
    expect(prompt).toContain("Focus on error states");
  });

  it("does not include additional instructions when message is undefined", () => {
    const prompt = buildPlanPrompt(sampleFiles, "http://localhost:3000");

    expect(prompt).not.toContain("## Additional Instructions");
  });
});

describe("parsePlanResponse", () => {
  const validPlan = {
    id: "test-1",
    title: "Dashboard save button",
    description: "Tests the new save button on the dashboard",
    steps: [
      {
        id: "s1",
        description: "Go to dashboard",
        action: "navigate",
        target: "/dashboard",
      },
      {
        id: "s2",
        description: "Click save",
        action: "click",
        target: "button:has-text('Save')",
      },
    ],
    baseUrl: "http://localhost:3000",
    createdAt: 1700000000000,
  };

  it("extracts JSON from markdown code block", () => {
    const response = `Here is the plan:\n\`\`\`json\n${JSON.stringify(validPlan)}\n\`\`\`\nDone.`;
    const plan = parsePlanResponse(response);

    expect(plan.title).toBe("Dashboard save button");
    expect(plan.steps).toHaveLength(2);
  });

  it("parses raw JSON", () => {
    const response = JSON.stringify(validPlan);
    const plan = parsePlanResponse(response);

    expect(plan.title).toBe("Dashboard save button");
    expect(plan.baseUrl).toBe("http://localhost:3000");
  });

  it("generates step IDs when missing", () => {
    const planWithoutIds = {
      ...validPlan,
      steps: [
        { description: "Go to page", action: "navigate", target: "/" },
        {
          description: "Check heading",
          action: "assert",
          value: "Welcome",
        },
      ],
    };
    const plan = parsePlanResponse(JSON.stringify(planWithoutIds));

    expect(plan.steps[0].id).toBe("step-1");
    expect(plan.steps[1].id).toBe("step-2");
  });

  it("generates plan ID when missing", () => {
    const { id: _, ...planWithoutId } = validPlan;
    const plan = parsePlanResponse(JSON.stringify(planWithoutId));

    expect(plan.id).toMatch(/^plan-/);
  });

  it("throws on invalid JSON", () => {
    expect(() => parsePlanResponse("not json at all")).toThrow("Failed to parse test plan JSON");
  });

  it("throws on missing required fields", () => {
    expect(() => parsePlanResponse(JSON.stringify({ id: "x" }))).toThrow(
      'missing required field: "title"',
    );

    expect(() => parsePlanResponse(JSON.stringify({ title: "x" }))).toThrow(
      'missing required field: "description"',
    );

    expect(() => parsePlanResponse(JSON.stringify({ title: "x", description: "y" }))).toThrow(
      'missing required field: "steps"',
    );

    expect(() =>
      parsePlanResponse(
        JSON.stringify({
          title: "x",
          description: "y",
          steps: [],
        }),
      ),
    ).toThrow('missing required field: "baseUrl"');
  });
});

describe("generatePlanId", () => {
  it("returns unique IDs", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generatePlanId()));
    expect(ids.size).toBe(100);
  });

  it("starts with plan- prefix", () => {
    expect(generatePlanId()).toMatch(/^plan-/);
  });
});
