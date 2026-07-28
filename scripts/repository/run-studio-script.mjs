import { spawnSync } from "node:child_process";
import path from "node:path";

const [command, ...rawArguments] = process.argv.slice(2);
if (!new Set(["dev", "preview"]).has(command)) {
  throw new Error(`Unsupported Studio command: ${command ?? "missing"}.`);
}

const argumentsToForward = rawArguments[0] === "--"
  ? rawArguments.slice(1)
  : rawArguments;
const pnpmEntry = process.env.npm_execpath;
if (!pnpmEntry) {
  throw new Error("Studio command delegation requires pnpm's npm_execpath.");
}

const result = spawnSync(
  process.execPath,
  [pnpmEntry, "--dir", path.join("apps", "studio"), command, ...argumentsToForward],
  { stdio: "inherit" },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
