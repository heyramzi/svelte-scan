---
paths:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs,svelte,swift,py,go,rs,sh,css,sql}"
---
<!-- vibekit:rule -->
<!-- Generated from vibe-kit/ai-doc/rules/. Edit there, then run: node vibe-kit/ai-doc/scripts/sync-agents-core.cjs -->

# Verify before you say done

Turn the task into a check you can run, then loop until it passes: bad input rejected end to end, a bug reproduced before it's fixed, the E2E suite green before and after a refactor. Read the real state back (the page, the row, the log) before you call anything done. Never assert it.

A build and a typecheck prove it compiles, nothing more. Done means you ran it where it lives: a Chrome extension loaded in Chrome with a real signed-in session, a page in the browser, an app on the simulator. 27 Sep 2026: a sidebar reported shipped still asked a connected user to connect.
