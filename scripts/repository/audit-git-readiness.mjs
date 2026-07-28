import { spawnSync } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const result = spawnSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { cwd: root, encoding: "utf8" },
);
if (result.status !== 0) {
  console.error("Git readiness audit requires an initialized repository.");
  process.exit(1);
}

const files = result.stdout.split("\0").filter(Boolean);
const issues = [];
const secretPatterns = [
  /FIGMA_ACCESS_TOKEN\s*=\s*(?!figma-personal-access-token\b|<|\$\{)[^\s#]{24,}/,
  /FIGMA_MCP_PROVIDER_TOKEN\s*=\s*(?!optional-bearer-token\b|<|\$\{)[^\s#]{24,}/,
  /figd_[A-Za-z0-9_-]{20,}/,
  /github_pat_[A-Za-z0-9_]+/,
  /ghp_[A-Za-z0-9]+/,
];

for (const file of files) {
  const absolute = path.join(root, file);
  const metadata = await stat(absolute).catch((error) => {
    if (error?.code === "ENOENT") return null;
    throw error;
  });
  if (!metadata) continue;
  if (metadata.size > 100 * 1024 * 1024) {
    issues.push(`${file} exceeds GitHub's 100 MB file limit.`);
  }
  if (/(^|\/)\.env(?:\.|$)/.test(file) && file !== ".env.example") {
    issues.push(`${file} is a tracked environment file.`);
  }
  if (metadata.size <= 5 * 1024 * 1024 && /\.(?:json|mjs|js|ts|tsx|md|ya?ml|txt|example)$/.test(file)) {
    const value = await readFile(absolute, "utf8");
    for (const pattern of secretPatterns) {
      if (pattern.test(value) && file !== ".env.example") {
        issues.push(`${file} contains a token-shaped secret.`);
      }
    }
  }
}

if (issues.length) {
  console.error(issues.map((issue) => `- ${issue}`).join("\n"));
  process.exit(1);
}
console.log(`Git readiness audit passed for ${files.length} repository files.`);
