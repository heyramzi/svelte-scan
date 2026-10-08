---
paths:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs,svelte,swift,py,go,rs,sh,css,sql}"
---
<!-- vibekit:rule -->
<!-- Generated from vibe-kit/ai-doc/rules/. Edit there, then run: node vibe-kit/ai-doc/scripts/sync-agents-core.cjs -->

# Testing

**Tests are E2E first, and you don't write unit or integration tests on your own.** A test you write is your reading of the intent, same as the code, so it can't catch you misreading it. On 25 Sep 2026 we cut back the unit suite on every website for restating the code. Outside evals agree: on SWE-bench Verified (arXiv 2602.07900), cutting agent-written tests left success flat and cut input tokens by a third or more.

- E2E is the default and usually the only mechanism. That's Playwright on the web and XCUITest on Apple, and each run leaves a trace, screenshot or report anyone can rerun.
- A unit or integration test needs a source outside your head. That's test cases Ramzi wrote or named, or a bug that really happened, reproduced as a failing test before the fix (`diagnose` owns that). Anything else, prove with E2E or say what's unproven.
- **Run a suite through `vp test run`, never `npx vitest`.** vibe-kit aliases `vitest` to `@voidzero-dev/vite-plus-test`, so the bare binary skips Vite+'s setup and every suite dies on `Cannot read properties of undefined (reading 'config')`.
