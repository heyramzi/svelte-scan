---
paths:
  - "**/*.{ts,tsx,js,jsx,mjs,svelte}"
---
<!-- vibekit:rule -->
<!-- Generated from vibe-kit/ai-doc/rules/. Edit there, then run: node vibe-kit/ai-doc/scripts/sync-agents-core.cjs -->

# Imports

**In a `vibe-kit/packages/` package that ships `src`, a `#src` import ends in `.js` and `imports` maps `"#src/*.js": "./src/*.ts"`.** Apps compile the source: a bare path fails TypeScript, and a `.js` mapped to `./src/*.js` fails Vite, which never swaps the extension. `utils` 1.3.2 and `marketing` 1.0.2 broke every Vite app that way on 28 Sep 2026. An app that aliases its own `#src` in `kit.alias` needs upsys's `packageImportsOverKitAlias` in its Vite and Vitest configs both.
