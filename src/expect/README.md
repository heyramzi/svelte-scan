# svibe/expect

Browser testing for SvelteKit dev mode. Reads git diffs, generates AI-driven test plans, runs them via Playwright, and reports results.

Inspired by [million/expect](https://github.com/millionco/expect).

## Architecture

```
expect/
├── types.ts       # All shared types (TestPlan, StepResult, TestReport, etc.)
├── constants.ts   # Timeouts, limits, file extensions, default config
├── diff.ts        # Parses unified git diff output into ChangedFile objects
├── planner.ts     # Builds AI prompts from diffs, parses JSON responses into TestPlan
├── providers.ts   # AI provider abstraction (Anthropic, OpenAI, Gemini)
├── runner.ts      # Executes test steps against a Playwright page
├── recorder.ts    # Injects rrweb for session recording during test runs
└── reporter.ts    # Aggregates step results into TestReport, formats as markdown/toolbar
```

## Flow

1. `diff.parseDiff(rawGitDiff)` turns `git diff` output into `ChangedFile[]`
2. `planner.buildPlanPrompt(files, baseUrl)` creates an AI prompt from the changes
3. AI responds with JSON, parsed by `planner.parsePlanResponse(response)` into a `TestPlan`
4. `runner.executePlan(page, plan, config)` runs each step against a Playwright page
5. `reporter.createReport(plan, results)` aggregates into a `TestReport`

## Module Reference

### types

All type definitions and the core data model.

```typescript
import type {
  TestPlan,
  TestStep,
  StepResult,
  TestReport,
  ChangedFile,
  ExpectConfig,
  ExpectEvent,
} from "./types";
```

### constants

```typescript
import { DEFAULT_EXPECT_CONFIG, STEP_TIMEOUT_MS, MAX_DIFF_SIZE_BYTES } from "./constants";
```

### diff

Parses unified diff format, filters to relevant file extensions (.svelte, .ts, .js, .css, .html), and truncates oversized diffs.

```typescript
import { parseDiff, buildDiffSummary } from "./diff";

const files = parseDiff(gitDiffOutput);
const summary = buildDiffSummary(files);
```

### planner

Generates AI prompts from changed files and parses JSON test plan responses. Handles markdown code blocks, missing fields, and ID generation.

```typescript
import { buildPlanPrompt, parsePlanResponse, generatePlanId } from "./planner";

const prompt = buildPlanPrompt(files, "http://localhost:3000");
// Send prompt to AI, get response
const plan = parsePlanResponse(aiResponse);
```

### runner

Executes test plans step-by-step against a Playwright `Page`. Supports navigate, click, fill, assert, wait, screenshot, hover, and select actions. Navigation failures abort remaining steps; assertion failures continue.

```typescript
import { executePlan, executeStep, checkPlaywrightAvailable } from "./runner";

const results = await executePlan(page, plan, config, (stepResult) => {
  console.log(stepResult.stepId, stepResult.status);
});
```

### recorder

Optional rrweb session recording. Injects the recorder script into the page and collects events after the run.

```typescript
import { injectRecorder, collectEvents, formatRecording } from "./recorder";

await injectRecorder(page);
// ... run tests ...
const events = await collectEvents(page);
const ndjson = formatRecording(events);
```

### providers

Abstraction layer for AI providers. Supports Anthropic (SDK + curl fallback), OpenAI, and Gemini.

```typescript
import { resolveProvider } from "./providers";

const provider = resolveProvider("anthropic"); // or "openai" | "gemini"
const response = await provider.generate(prompt);
```

### reporter

Aggregates step results into a report with pass/fail/skip counts, duration, and summary. Formats as markdown or toolbar badge.

```typescript
import { createReport, formatReportMarkdown, formatReportForToolbar } from "./reporter";

const report = createReport(plan, results);
const markdown = formatReportMarkdown(report);
const badge = formatReportForToolbar(report); // { label: "3/3 passed", color: "green" }
```
