import { defineConfig } from "vite-plus";

// Oxlint's own rules and ignores live in .oxlintrc.json: a `lint` key here makes vp
// pass its own `-c`, which collides with the script's `-c .oxlintrc.json`.
export default defineConfig({
  // Prose and workflows are written for a reader, not a compiler.
  fmt: { ignorePatterns: ["**/*.md", "**/*.yml", "**/*.yaml", ".claude/**", "dist/**"] },
  staged: { "*.{js,ts,svelte,mjs,css}": "vp fmt" },
});
