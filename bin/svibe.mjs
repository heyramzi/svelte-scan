#!/usr/bin/env node

// This file is the npm bin entry point.
// For development, use `tsx bin/svibe.ts` directly.
// For publishing, run `pnpm build:cli` to bundle the CLI.

await import("./svibe.ts");
