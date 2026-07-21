#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const starts = [join(root, "AGENTS.md"), join(root, "docs")];
const files = [];
function collect(path) {
  if (!existsSync(path)) return;
  const entries = readdirSync(path, { withFileTypes: true });
  for (const entry of entries) {
    const child = join(path, entry.name);
    if (entry.isDirectory()) collect(child);
    else if (entry.name.endsWith(".md")) files.push(child);
  }
}
files.push(starts[0]);
collect(starts[1]);
let links = 0;
const missing = [];
for (const file of files) {
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    let target = match[1].trim().replace(/^<|>$/g, "").split("#")[0];
    if (!target || /^(?:https?:|mailto:|data:)/.test(target)) continue;
    links += 1;
    try { target = decodeURIComponent(target); } catch { /* retain literal path */ }
    const resolved = resolve(dirname(file), target);
    if (!existsSync(resolved)) missing.push(`${file.slice(root.length + 1)} -> ${target}`);
  }
}
if (missing.length) throw new Error(`Missing documentation links:\n${missing.join("\n")}`);
console.log(`Documentation links passed: ${files.length} Markdown files, ${links} local links.`);
