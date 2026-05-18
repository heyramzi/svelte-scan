#!/usr/bin/env tsx


import { execSync } from "node:child_process";
import { createInterface } from "node:readline";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { parseDiff, buildDiffSummary } from "../src/expect/diff";
import { buildPlanPrompt, parsePlanResponse } from "../src/expect/planner";
import { executePlan, checkPlaywrightAvailable, extractCookies } from "../src/expect/runner";
import { createReport, formatReportMarkdown } from "../src/expect/reporter";
import { resolveProvider } from "../src/expect/providers";
import { DEFAULT_EXPECT_CONFIG, EXPECT_STATE_DIR } from "../src/expect/constants";
import type { ExpectConfig, TestPlan } from "../src/expect/types";

const HELP = `
svelte-scan: SvelteKit dev tool CLI

Usage:
  svelte-scan install [target]      Install svelte-scan into a SvelteKit project (default: .)
  svelte-scan health [options]      Get live health report from running app
  svelte-scan init [--ci]           Set up svelte-scan expect (--ci generates GitHub Actions workflow)
  svelte-scan expect [options]      Generate and run tests from git diff
  svelte-scan expect --plan-only    Generate test plan without running
  svelte-scan expect --run <file>   Run an existing test plan
  svelte-scan expect --list         List saved test plans
  svelte-scan help                  Show this help

Install options:
  target                      Path to SvelteKit project (default: current directory)
  --workspace-root <path>     Workspace root for file resolution (default: auto-detect)

Health options:
  --url <url>           Dev server URL (default: http://localhost:3000)
  --json                Output raw JSON instead of markdown

Expect options:
  --base-url <url>      Base URL (default: http://localhost:3000)
  --headless            Run browser in headless mode (default)
  --headed              Run browser with visible UI
  --timeout <ms>        Step timeout in ms (default: 10000)
  --model <model>       AI model for plan generation (default: claude-sonnet-4-20250514)
  --diff <ref>          Git diff ref (default: HEAD)
  --provider <name>     AI provider: anthropic, openai, gemini (default: anthropic)
  --ci                  CI mode: headless, auto-confirm, JSON output, exit 1 on failure
  --ci-timeout <ms>     CI mode timeout in ms (default: 300000)
  --cookies             Extract and inject cookies from base URL
  --message <text>      Additional natural language instructions for plan generation
  -m <text>             Alias for --message
  --yes / -y            Auto-confirm plan execution
`.trim();

type CliArgs = {
  command: string;
  installTarget: string;
  workspaceRoot: string;
  planOnly: boolean;
  runFile: string | null;
  list: boolean;
  baseUrl: string;
  headless: boolean;
  timeout: number;
  model: string;
  diffRef: string;
  provider: string;
  ci: boolean;
  ciTimeout: number;
  cookies: boolean;
  message: string | undefined;
  yes: boolean;
  healthUrl: string;
  healthJson: boolean;
  initCi: boolean;
};

function parseArgs(argv: string[]): CliArgs {
  const args = argv.slice(2);
  const result: CliArgs = {
    command: args[0] ?? "help",
    installTarget: ".",
    workspaceRoot: "",
    planOnly: false,
    runFile: null,
    list: false,
    baseUrl: DEFAULT_EXPECT_CONFIG.baseUrl,
    headless: DEFAULT_EXPECT_CONFIG.headless,
    timeout: DEFAULT_EXPECT_CONFIG.timeout,
    model: "claude-sonnet-4-20250514",
    diffRef: "HEAD",
    provider: DEFAULT_EXPECT_CONFIG.provider,
    ci: false,
    ciTimeout: DEFAULT_EXPECT_CONFIG.ciTimeout,
    cookies: false,
    message: undefined,
    yes: false,
    healthUrl: "http://localhost:3000",
    healthJson: false,
    initCi: false,
  };

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--plan-only":
        result.planOnly = true;
        break;
      case "--run":
        result.runFile = args[++i] ?? null;
        break;
      case "--list":
        result.list = true;
        break;
      case "--base-url":
        result.baseUrl = args[++i] ?? result.baseUrl;
        break;
      case "--headless":
        result.headless = true;
        break;
      case "--headed":
        result.headless = false;
        break;
      case "--timeout":
        result.timeout = parseInt(args[++i] ?? "10000", 10);
        break;
      case "--model":
        result.model = args[++i] ?? result.model;
        break;
      case "--diff":
        result.diffRef = args[++i] ?? result.diffRef;
        break;
      case "--provider":
        result.provider = args[++i] ?? result.provider;
        break;
      case "--ci":
        result.ci = true;
        break;
      case "--ci-timeout":
        result.ciTimeout = parseInt(args[++i] ?? "300000", 10);
        break;
      case "--cookies":
        result.cookies = true;
        break;
      case "--message":
      case "-m":
        result.message = args[++i] ?? undefined;
        break;
      case "--yes":
      case "-y":
        result.yes = true;
        break;
      case "--url":
        result.healthUrl = args[++i] ?? result.healthUrl;
        break;
      case "--json":
        result.healthJson = true;
        break;
      case "--workspace-root":
        result.workspaceRoot = args[++i] ?? "";
        break;
    }
  }

  // --ci on init command means generate GitHub Actions workflow
  if (result.command === "init" && result.ci) {
    result.initCi = true;
  }

  // install command: second positional arg is target path
  if (result.command === "install") {
    const positional = args[1];
    if (positional && !positional.startsWith("-")) {
      result.installTarget = positional;
    }
  }

  // CI mode forces headless and auto-confirm
  if (result.ci) {
    result.headless = true;
    result.yes = true;
  }

  return result;
}

function getGitDiff(ref: string): string {
  try {
    return execSync(`git diff ${ref}`, { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 });
  } catch {
    console.error("Failed to get git diff. Are you in a git repository?");
    process.exit(1);
  }
}

async function callAI(prompt: string, _model: string, providerName: string): Promise<string> {
  const provider = resolveProvider(providerName);
  return provider.generate(prompt);
}

function savePlan(plan: TestPlan): string {
  const dir = resolve(process.cwd(), EXPECT_STATE_DIR);
  mkdirSync(dir, { recursive: true });
  const filename = `${plan.id}.json`;
  const filepath = join(dir, filename);
  writeFileSync(filepath, JSON.stringify(plan, null, 2));
  return filepath;
}

function loadPlan(filepath: string): TestPlan {
  const content = readFileSync(filepath, "utf-8");
  // eslint-disable-next-line no-unsafe-type-assertion -- trusted local JSON file
  return JSON.parse(content) as TestPlan;
}

function listPlans(): void {
  const dir = resolve(process.cwd(), EXPECT_STATE_DIR);
  if (!existsSync(dir)) {
    console.log("No saved plans. Run `svelte-scan expect` first.");
    return;
  }
  const { readdirSync } = require("node:fs");
  // eslint-disable-next-line no-unsafe-type-assertion -- readdirSync returns string[]
  const files = (readdirSync(dir) as string[]).filter((f: string) => f.endsWith(".json"));
  if (files.length === 0) {
    console.log("No saved plans.");
    return;
  }
  console.log("Saved test plans:\n");
  for (const file of files) {
    const plan = loadPlan(join(dir, file));
    console.log(`  ${file}  "${plan.title}" (${plan.steps.length} steps)`);
  }
}

function confirm(question: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((done) => {
    rl.question(`${question} (y/n) `, (input) => {
      rl.close();
      done(input.trim().toLowerCase() === "y");
    });
  });
}

async function runInstall(args: CliArgs): Promise<void> {
  const target = resolve(process.cwd(), args.installTarget);
  const workspaceRoot = args.workspaceRoot || findWorkspaceRoot(target);

  if (!workspaceRoot) {
    console.error("Could not detect workspace root. Use --workspace-root <path>.");
    process.exit(1);
  }

  // Validate target is a SvelteKit project
  const layoutFile = findLayoutFile(target);
  const viteFile = resolve(target, "vite.config.ts");

  if (!existsSync(viteFile)) {
    console.error(`No vite.config.ts found in ${target}. Is this a SvelteKit project?`);
    process.exit(1);
  }

  console.log(`Installing svelte-scan into ${target}`);
  console.log(`Workspace root: ${workspaceRoot}\n`);

  // 1. Add submodule
  const svelteScanPath = resolve(target, "src/lib/svelte-scan");
  const relativeSvelteScanPath = svelteScanPath.replace(workspaceRoot + "/", "");
  if (!existsSync(svelteScanPath)) {
    console.log("Adding svelte-scan submodule...");
    execSync(`git submodule add https://github.com/heyramzi/svelte-scan.git ${relativeSvelteScanPath}`, {
      cwd: workspaceRoot,
      stdio: "inherit",
    });
  } else {
    console.log("svelte-scan submodule already exists, skipping.");
  }

  // 2. Install @lucide/svelte if missing
  const pkgJsonPath = resolve(target, "package.json");
  if (existsSync(pkgJsonPath)) {
    const pkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf-8"));
    const hasLucide = (pkgJson.dependencies?.["@lucide/svelte"]) || (pkgJson.devDependencies?.["@lucide/svelte"]);
    if (!hasLucide) {
      console.log("Installing @lucide/svelte...");
      execSync("pnpm add -D @lucide/svelte", { cwd: target, stdio: "inherit" });
    } else {
      console.log("@lucide/svelte already installed, skipping.");
    }
  }

  // 3. Patch vite.config.ts
  console.log("Patching vite.config.ts...");
  patchViteConfig(viteFile);

  // 4. Patch +layout.svelte
  if (layoutFile) {
    console.log(`Patching ${layoutFile}...`);
    patchLayout(layoutFile, workspaceRoot);
  } else {
    console.warn("Could not find +layout.svelte. Manual layout integration needed.");
  }

  console.log("\nsvelte-scan installed! Restart your dev server to see the toolbar.");
}

function findWorkspaceRoot(startDir: string): string {
  let dir = startDir;
  while (dir !== "/") {
    if (existsSync(resolve(dir, ".git"))) return dir;
    dir = resolve(dir, "..");
  }
  return "";
}

function findLayoutFile(target: string): string | null {
  const candidates = [
    resolve(target, "src/routes/+layout.svelte"),
    resolve(target, "src/routes/(app)/+layout.svelte"),
    resolve(target, "src/routes/(frontend)/+layout.svelte"),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

function patchViteConfig(viteFile: string): void {
  let content = readFileSync(viteFile, "utf-8");

  if (content.includes("svelteScanServerLogs") || content.includes("svibeServerLogs")) {
    console.log("  vite.config.ts already patched, skipping.");
    return;
  }

  // Add Plugin import
  if (!content.includes('import type { Plugin } from "vite"')) {
    content = content.replace(
      /import \{ defineConfig \} from "vite";/,
      'import type { Plugin } from "vite";\nimport { defineConfig } from "vite";',
    );
  }

  // Add loader function before defineConfig
  const loaderCode = `
async function loadSvelteScanPlugins(): Promise<Plugin[]> {
  try {
    const { svelteScanServerLogs } = await import("./src/lib/svelte-scan/vite-plugin");
    return svelteScanServerLogs();
  } catch {
    return [];
  }
}

`;
  if (!content.includes("loadSvelteScanPlugins")) {
    content = content.replace("export default defineConfig", loaderCode + "export default defineConfig");
  }

  // Switch to async config and add svelte-scan plugins
  content = content.replace(
    /export default defineConfig\(\{/,
    "export default defineConfig(async () => ({",
  );

  // Add svelte-scan plugins to plugins array
  content = content.replace(
    /plugins:\s*\[/,
    "plugins: [...(await loadSvelteScanPlugins()), ",
  );

  // Close async config
  content = content.replace(
    /\}\);(\s*)$/,
    "}));$1",
  );

  writeFileSync(viteFile, content);
}

function patchLayout(layoutFile: string, workspaceRoot: string): void {
  let content = readFileSync(layoutFile, "utf-8");

  if (content.includes("SvelteScan") || content.includes("svelte-scan")) {
    console.log("  +layout.svelte already patched, skipping.");
    return;
  }

  // Add browser/dev imports
  if (!content.includes('import { browser, dev }')) {
    const importLine = 'import { browser, dev } from "$app/environment";\n';
    // Find first import after the css import and add after it
    content = content.replace(
      /(import\s+.*?app\.css.*?;\n)/,
      `$1${importLine}`,
    );
  }

  // Add Component type import
  if (!content.includes('import type { Component }')) {
    if (content.includes("import type { Snippet }")) {
      content = content.replace(
        "import type { Snippet }",
        "import type { Snippet, Component }",
      );
    } else if (content.includes("import type {")) {
      content = content.replace(
        /(import type \{[^}]*?)\}/,
        "$1, Component }",
      );
    } else {
      content = content.replace(
        /(import\s+.*?from\s+.*?;\n)/,
        `$1import type { Component } from "svelte";\n`,
      );
    }
  }

  // Add SvelteScan state
  const scanState = "\nlet SvelteScan: Component<{ workspaceRoot?: string }> | null = $state(null);\n";
  const propsMatch = content.match(/let\s+\{[^}]*\}\s*[:=]\s*\$props\([^)]*\);?/);
  if (propsMatch) {
    content = content.replace(
      propsMatch[0],
      propsMatch[0] + scanState,
    );
  }

  // Add $effect for lazy loading
  const scanEffect = `
$effect(() => {
\tif (browser && dev) {
\t\timport(/* @vite-ignore */ "$lib/svelte-scan/index").then((m) => (SvelteScan = m.SvelteScan)).catch(() => {});
\t}
});
`;
  // Insert before </script>
  content = content.replace(
    /<\/script>/,
    scanEffect + "</script>",
  );

  // Add SvelteScan component in markup
  const scanMarkup = `
{#if browser && dev && SvelteScan}
\t<SvelteScan workspaceRoot="${workspaceRoot}" />
{/if}
`;
  content = content.trimEnd() + "\n" + scanMarkup;

  writeFileSync(layoutFile, content);
}

async function runInit(): Promise<void> {
  console.log("Setting up svelte-scan expect...\n");

  // Check Playwright
  const hasPlaywright = await checkPlaywrightAvailable();
  if (!hasPlaywright) {
    console.log("Installing Playwright...");
    try {
      execSync("npx playwright install chromium", { stdio: "inherit" });
    } catch {
      console.error("Failed to install Playwright. Install manually: npx playwright install");
    }
  } else {
    console.log("Playwright: installed");
  }

  // Create state directory
  const dir = resolve(process.cwd(), EXPECT_STATE_DIR);
  mkdirSync(dir, { recursive: true });
  console.log(`State directory: ${dir}`);

  // Add to .gitignore
  const gitignore = resolve(process.cwd(), ".gitignore");
  if (existsSync(gitignore)) {
    const content = readFileSync(gitignore, "utf-8");
    if (!content.includes(EXPECT_STATE_DIR)) {
      writeFileSync(gitignore, content.trimEnd() + `\n${EXPECT_STATE_DIR}/\n`);
      console.log("Added .svibe-expect/ to .gitignore");
    }
  }

  console.log("\nReady. Run `svelte-scan expect` to generate tests from your git diff.");
}

const GITHUB_ACTIONS_WORKFLOW = `name: svelte-scan expect

on:
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 10

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - run: pnpm build

      - name: Start dev server
        run: pnpm preview &
        env:
          PORT: 3000

      - name: Wait for server
        run: npx wait-on http://localhost:3000 --timeout 30000

      - name: Run svelte-scan expect
        run: npx @heyramzi/svelte-scan expect --ci --base-url http://localhost:3000
        env:
          ANTHROPIC_API_KEY: \${{ secrets.ANTHROPIC_API_KEY }}

      - name: Upload test artifacts
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: svelte-scan-expect-results
          path: .svelte-scan-expect/
`;

function generateCiWorkflow(): void {
  const dir = resolve(process.cwd(), ".github/workflows");
  mkdirSync(dir, { recursive: true });
  const filepath = join(dir, "svelte-scan-expect.yml");
  if (existsSync(filepath)) {
    console.log(`Workflow already exists: ${filepath}`);
    return;
  }
  writeFileSync(filepath, GITHUB_ACTIONS_WORKFLOW);
  console.log(`Created GitHub Actions workflow: ${filepath}`);
  console.log("Add ANTHROPIC_API_KEY to your repository secrets.");
}

type HealthReport = {
  mutationsPerSec: number;
  hotSpots: { component: string; mutations: number }[];
  effectOffenders: { id: string; component: string; count: number; severity: string }[];
  leaks: { component: string; leakType: string; details: string }[];
  consoleErrors: { level: string; message: string; source: string }[];
  serverLogs: { level: string; message: string; timestamp: number }[];
  interactions: {
    eventType: string;
    component: string;
    duration: number;
    classification: string;
  }[];
  reactivity: { signals: number; deriveds: number; effects: number; maxDepth: number };
  timestamp: number;
};

function formatHealthMarkdown(report: HealthReport): string {
  const lines: string[] = [];
  lines.push("## svelte-scan health report");
  lines.push("");
  lines.push(`Mutations/sec: ${report.mutationsPerSec}`);
  lines.push(
    `Signals: ${report.reactivity.signals} | Deriveds: ${report.reactivity.deriveds} | Effects: ${report.reactivity.effects}`,
  );

  if (report.hotSpots.length > 0) {
    lines.push("");
    lines.push("### Hot Spots");
    for (const spot of report.hotSpots) {
      lines.push(`- ${spot.component}: ${spot.mutations} mutations (${spot.mutations}/sec)`);
    }
  }

  if (report.effectOffenders.length > 0) {
    lines.push("");
    lines.push("### Runaway Effects");
    for (const eff of report.effectOffenders) {
      lines.push(
        `- [${eff.severity.toUpperCase()}] ${eff.component}: ${eff.count} executions (${eff.id})`,
      );
    }
  }

  if (report.leaks.length > 0) {
    lines.push("");
    lines.push("### Memory Leaks");
    for (const leak of report.leaks) {
      lines.push(`- ${leak.component}: ${leak.leakType} (${leak.details})`);
    }
  }

  if (report.consoleErrors.length > 0) {
    lines.push("");
    lines.push("### Console Errors & Warnings");
    for (const entry of report.consoleErrors) {
      lines.push(`- [${entry.level.toUpperCase()}] ${entry.message}`);
      lines.push(`  Source: ${entry.source}`);
    }
  }

  if (report.serverLogs.length > 0) {
    lines.push("");
    lines.push("### Server Logs");
    for (const entry of report.serverLogs) {
      lines.push(`- [${entry.level.toUpperCase()}] ${entry.message}`);
    }
  }

  if (report.interactions.length > 0) {
    const slow = report.interactions.filter((i) => i.classification !== "good");
    if (slow.length > 0) {
      lines.push("");
      lines.push("### Slow Interactions");
      for (const i of slow) {
        lines.push(
          `- [${i.classification.toUpperCase()}] ${i.component}: ${i.eventType} ${i.duration}ms`,
        );
      }
    }
  }

  if (
    report.hotSpots.length === 0 &&
    report.effectOffenders.length === 0 &&
    report.leaks.length === 0 &&
    report.consoleErrors.length === 0
  ) {
    lines.push("");
    lines.push("No issues detected.");
  }

  return lines.join("\n");
}

async function runHealth(args: CliArgs): Promise<void> {
  const url = `${args.healthUrl.replace(/\/$/, "")}/__svelte-scan/report`;

  try {
    const response = await fetch(url);
    if (response.status === 503) {
      console.error("No health data available. Is the app running with <SvelteScan /> mounted?");
      process.exit(1);
    }
    if (!response.ok) {
      console.error(`Failed to fetch health report: ${response.status} ${response.statusText}`);
      process.exit(1);
    }

    // eslint-disable-next-line no-unsafe-type-assertion -- trusted local endpoint
    const report = (await response.json()) as HealthReport;

    if (args.healthJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(formatHealthMarkdown(report));
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Could not connect to dev server at ${args.healthUrl}`);
    console.error(`Is the dev server running? (${msg})`);
    process.exit(1);
  }
}

async function runExpect(args: CliArgs): Promise<void> {
  if (args.list) {
    listPlans();
    return;
  }

  const config: ExpectConfig = {
    baseUrl: args.baseUrl,
    timeout: args.timeout,
    headless: args.headless,
    cookies: args.cookies,
    recording: false,
    provider: args.provider as ExpectConfig["provider"],
    message: args.message,
    ci: args.ci,
    ciTimeout: args.ciTimeout,
  };

  let plan: TestPlan;

  if (args.runFile) {
    // Run existing plan
    console.log(`Loading plan from ${args.runFile}...`);
    plan = loadPlan(args.runFile);
  } else {
    // Generate from diff
    console.log(`Getting git diff (${args.diffRef})...`);
    const rawDiff = getGitDiff(args.diffRef);
    const files = parseDiff(rawDiff);

    if (files.length === 0) {
      console.log("No relevant file changes found.");
      return;
    }

    console.log(buildDiffSummary(files));
    console.log(`\nGenerating test plan (${args.model})...`);

    const prompt = buildPlanPrompt(files, config.baseUrl, config.message);
    const response = await callAI(prompt, args.model, args.provider);
    plan = parsePlanResponse(response);

    const savedPath = savePlan(plan);
    console.log(`Plan saved: ${savedPath}`);
  }

  console.log(`\nTest Plan: "${plan.title}"`);
  console.log(`Steps: ${plan.steps.length}\n`);

  if (args.planOnly) {
    for (const step of plan.steps) {
      console.log(`  ${step.id}: [${step.action}] ${step.description}`);
    }
    return;
  }

  // Confirmation step (skip if --yes or --ci)
  if (!args.yes) {
    const confirmed = await confirm("Run this plan?");
    if (!confirmed) {
      console.log("Aborted.");
      return;
    }
  }

  // Run with Playwright
  const hasPlaywright = await checkPlaywrightAvailable();
  if (!hasPlaywright) {
    console.error("Playwright not installed. Run `svelte-scan init` first.");
    process.exit(1);
  }

  // @ts-expect-error — optional peer dependency, dynamically imported
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: config.headless });
  const context = await browser.newContext();

  // Inject cookies if enabled
  if (config.cookies) {
    const cookies = await extractCookies(config.baseUrl);
    if (cookies.length > 0) {
      await context.addCookies(cookies);
      if (!args.ci) {
        console.log(`Injected ${cookies.length} cookie(s) from ${config.baseUrl}`);
      }
    }
  }

  const page = await context.newPage();

  if (!args.ci) {
    console.log("Running tests...\n");
  }

  // CI mode: wrap execution with a timeout
  const runTests = async () => {
    return executePlan(page, plan, config, (result) => {
      if (!args.ci) {
        const icon =
          result.status === "passed" ? "\u2713" : result.status === "failed" ? "\u2717" : "-";
        const duration =
          result.duration < 1000
            ? `${Math.round(result.duration)}ms`
            : `${(result.duration / 1000).toFixed(1)}s`;
        console.log(
          `  ${icon} ${result.stepId} (${duration})${result.error ? `: ${result.error}` : ""}`,
        );
      }
    });
  };

  let results;
  if (args.ci) {
    results = await Promise.race([
      runTests(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`CI timeout exceeded (${config.ciTimeout}ms)`)),
          config.ciTimeout,
        ),
      ),
    ]);
  } else {
    results = await runTests();
  }

  await browser.close();

  const report = createReport(plan, results);

  if (args.ci) {
    // CI mode: JSON report to stdout
    const jsonReport = {
      planId: report.planId,
      status: report.status,
      results: report.results,
      duration: report.duration,
      summary: report.summary,
      timestamp: report.timestamp,
    };
    console.log(JSON.stringify(jsonReport, null, 2));
  } else {
    console.log(`\n${formatReportMarkdown(report)}`);
  }

  // Save report
  const dir = resolve(process.cwd(), EXPECT_STATE_DIR);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `report-${plan.id}.md`), formatReportMarkdown(report));

  process.exit(report.status === "passed" ? 0 : 1);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);

  switch (args.command) {
    case "install":
      await runInstall(args);
      break;
    case "health":
      await runHealth(args);
      break;
    case "init":
      await runInit();
      if (args.initCi) {
        generateCiWorkflow();
      }
      break;
    case "expect":
      await runExpect(args);
      break;
    case "help":
    case "--help":
    case "-h":
      console.log(HELP);
      break;
    default:
      console.error(`Unknown command: ${args.command}`);
      console.log(HELP);
      process.exit(1);
  }
}

// eslint-disable-next-line no-restricted-syntax -- top-level catch for CLI entry point
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
