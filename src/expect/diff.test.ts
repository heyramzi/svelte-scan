import { describe, expect, it } from "vite-plus/test";
import { buildDiffSummary, parseDiff } from "./diff";
import { MAX_DIFF_SIZE_BYTES } from "./constants";

const MODIFIED_DIFF = `diff --git a/src/routes/+page.svelte b/src/routes/+page.svelte
index abc1234..def5678 100644
--- a/src/routes/+page.svelte
+++ b/src/routes/+page.svelte
@@ -1,5 +1,6 @@
 <script>
-  let count = 0
+  let count = $state(0)
+  let doubled = $derived(count * 2)
 </script>

 <button on:click={() => count++}>{count}</button>
`;

const ADDED_DIFF = `diff --git a/src/lib/utils.ts b/src/lib/utils.ts
new file mode 100644
index 0000000..abc1234
--- /dev/null
+++ b/src/lib/utils.ts
@@ -0,0 +1,3 @@
+export function clamp(val: number, min: number, max: number) {
+  return Math.min(Math.max(val, min), max)
+}
`;

const DELETED_DIFF = `diff --git a/src/old-helper.ts b/src/old-helper.ts
deleted file mode 100644
index abc1234..0000000
--- a/src/old-helper.ts
+++ /dev/null
@@ -1,2 +0,0 @@
-export function oldHelper() {}
-export function anotherOldHelper() {}
`;

const RENAMED_DIFF = `diff --git a/src/foo.svelte b/src/bar.svelte
similarity index 90%
rename from src/foo.svelte
rename to src/bar.svelte
index abc1234..def5678 100644
--- a/src/foo.svelte
+++ b/src/bar.svelte
@@ -1,3 +1,3 @@
-<h1>Foo</h1>
+<h1>Bar</h1>
`;

const MIXED_DIFF = [MODIFIED_DIFF, ADDED_DIFF, DELETED_DIFF, RENAMED_DIFF].join("");

const IRRELEVANT_DIFF = `diff --git a/assets/logo.png b/assets/logo.png
new file mode 100644
index 0000000..abc1234
Binary files /dev/null and b/assets/logo.png differ
diff --git a/pnpm-lock.yaml b/pnpm-lock.yaml
index abc1234..def5678 100644
--- a/pnpm-lock.yaml
+++ b/pnpm-lock.yaml
@@ -1,3 +1,4 @@
 lockfileVersion: 9
+  something: new
`;

describe("parseDiff", () => {
  it("parses a simple file modification", () => {
    const files = parseDiff(MODIFIED_DIFF);

    expect(files).toHaveLength(1);
    expect(files[0].path).toBe("src/routes/+page.svelte");
    expect(files[0].status).toBe("modified");
  });

  it("parses added files", () => {
    const files = parseDiff(ADDED_DIFF);

    expect(files).toHaveLength(1);
    expect(files[0].path).toBe("src/lib/utils.ts");
    expect(files[0].status).toBe("added");
  });

  it("parses deleted files", () => {
    const files = parseDiff(DELETED_DIFF);

    expect(files).toHaveLength(1);
    expect(files[0].path).toBe("src/old-helper.ts");
    expect(files[0].status).toBe("deleted");
  });

  it("parses renamed files", () => {
    const files = parseDiff(RENAMED_DIFF);

    expect(files).toHaveLength(1);
    expect(files[0].path).toBe("src/bar.svelte");
    expect(files[0].status).toBe("renamed");
  });

  it("filters non-relevant file types", () => {
    const files = parseDiff(IRRELEVANT_DIFF);

    expect(files).toHaveLength(0);
  });

  it("counts additions and deletions correctly", () => {
    const files = parseDiff(MODIFIED_DIFF);

    expect(files[0].additions).toBe(2);
    expect(files[0].deletions).toBe(1);
  });

  it("handles empty diff", () => {
    expect(parseDiff("")).toEqual([]);
    expect(parseDiff("  \n  ")).toEqual([]);
  });

  it("parses mixed diff with multiple files", () => {
    const files = parseDiff(MIXED_DIFF);

    expect(files).toHaveLength(4);
    expect(files.map((f) => f.status)).toEqual(["modified", "added", "deleted", "renamed"]);
  });

  it("truncates oversized diffs", () => {
    const hugeLine = "+" + "x".repeat(200) + "\n";
    const lineCount = Math.ceil(MAX_DIFF_SIZE_BYTES / hugeLine.length) + 10;
    const hugeHunk = "@@ -0,0 +1,1 @@\n" + hugeLine.repeat(lineCount);
    const hugeDiff = `diff --git a/src/big.ts b/src/big.ts
index abc1234..def5678 100644
--- a/src/big.ts
+++ b/src/big.ts
${hugeHunk}`;

    const files = parseDiff(hugeDiff);

    expect(files).toHaveLength(1);
    expect(files[0].diff).toContain("... [truncated]");
  });
});

describe("buildDiffSummary", () => {
  it("generates readable output", () => {
    const files = parseDiff(MIXED_DIFF);
    const summary = buildDiffSummary(files);

    expect(summary).toContain("4 file(s) changed:");
    expect(summary).toContain("modified src/routes/+page.svelte (+2 -1)");
    expect(summary).toContain("added src/lib/utils.ts (+3 -0)");
    expect(summary).toContain("deleted src/old-helper.ts (+0 -2)");
    expect(summary).toContain("renamed src/bar.svelte (+1 -1)");
  });

  it("handles empty file list", () => {
    expect(buildDiffSummary([])).toBe("No relevant file changes detected.");
  });
});
