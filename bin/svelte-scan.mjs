#!/usr/bin/env node

// This file is the npm bin entry point.
// For development, use `tsx bi./svelte-scan.ts` directly.
// For publishing, run `pnpm build:cli` to bundle the CLI.

await import("./svelte-scan.ts");
