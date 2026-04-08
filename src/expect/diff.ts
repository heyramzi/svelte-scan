import type { ChangedFile } from "./types";
import { MAX_DIFF_SIZE_BYTES, RELEVANT_EXTENSIONS } from "./constants";

// Parses unified diff output into structured ChangedFile objects
export function parseDiff(rawDiff: string): ChangedFile[] {
  if (!rawDiff.trim()) return [];

  const files: ChangedFile[] = [];
  const fileSections = rawDiff.split(/^diff --git /m).filter(Boolean);

  for (const section of fileSections) {
    const parsed = parseFileSection(section);
    if (!parsed) continue;
    if (!hasRelevantExtension(parsed.path)) continue;
    files.push(parsed);
  }

  return files;
}

// Builds a human-readable summary for AI consumption
export function buildDiffSummary(files: ChangedFile[]): string {
  if (files.length === 0) return "No relevant file changes detected.";

  const lines: string[] = [`${files.length} file(s) changed:\n`];

  for (const file of files) {
    const stats = `+${file.additions} -${file.deletions}`;
    lines.push(`  ${file.status} ${file.path} (${stats})`);
  }

  return lines.join("\n");
}

function parseFileSection(section: string): ChangedFile | null {
  const headerMatch = section.match(/^a\/(.+?) b\/(.+)/);
  if (!headerMatch) return null;

  const pathA = headerMatch[1];
  const pathB = headerMatch[2];
  const status = detectStatus(section, pathA, pathB);
  const path = status === "deleted" ? pathA : pathB;

  const diffBody = extractDiffBody(section);
  const { additions, deletions } = countChanges(diffBody);
  const truncatedDiff = truncateDiff(diffBody);

  return { path, status, additions, deletions, diff: truncatedDiff };
}

function detectStatus(section: string, pathA: string, pathB: string): ChangedFile["status"] {
  if (section.includes("new file mode")) return "added";
  if (section.includes("deleted file mode")) return "deleted";
  if (section.includes("rename from") || pathA !== pathB) return "renamed";
  return "modified";
}

function extractDiffBody(section: string): string {
  const idx = section.indexOf("@@");
  if (idx === -1) return "";
  return section.slice(idx);
}

function countChanges(diffBody: string): {
  additions: number;
  deletions: number;
} {
  let additions = 0;
  let deletions = 0;

  for (const line of diffBody.split("\n")) {
    if (line.startsWith("+") && !line.startsWith("+++")) additions++;
    if (line.startsWith("-") && !line.startsWith("---")) deletions++;
  }

  return { additions, deletions };
}

function truncateDiff(diffBody: string): string {
  const bytes = new TextEncoder().encode(diffBody).byteLength;
  if (bytes <= MAX_DIFF_SIZE_BYTES) return diffBody;

  const truncated = diffBody.slice(0, MAX_DIFF_SIZE_BYTES);
  return truncated + "\n... [truncated]";
}

function hasRelevantExtension(filePath: string): boolean {
  const dot = filePath.lastIndexOf(".");
  if (dot === -1) return false;
  return RELEVANT_EXTENSIONS.has(filePath.slice(dot));
}
