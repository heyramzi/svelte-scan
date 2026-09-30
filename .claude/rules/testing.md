---
paths:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs,svelte,swift,py,go,rs,sh,css,sql}"
---
<!-- vibekit:rule -->
<!-- Generated from vibe-kit/ai-doc/rules/. Edit there, then run: node vibe-kit/ai-doc/scripts/sync-agents-core.cjs -->

# Testing

**Tests are E2E first, and never written after the code.** 25 Sep 2026, after every website's unit suite was cut back: a test written after the code restates it, always passes, catches almost nothing, and breaks on every refactor.

- **Never write unit tests after you've written the code.**
- **E2E is the default and usually the only mechanism**: Playwright on the web, XCUITest on Apple. Each run ends with something anyone can check and rerun: a trace, a screenshot, a report file.
- **If something truly needs an isolated test, write down every way it could fail first, then write the code.**
- **Run a suite through `vp test run`, never `npx vitest`.** vibe-kit aliases `vitest` to `@voidzero-dev/vite-plus-test`, so the bare binary skips Vite+'s setup and every suite dies on `Cannot read properties of undefined (reading 'config')`.
