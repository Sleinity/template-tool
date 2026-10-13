/** Reconstruct retained native preimages in a temporary mirror; never modify workspace sessions. */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../../../", import.meta.url));
const record = JSON.parse(readFileSync(join(root, "docs/architecture/evidence/field-render-evidence-20261009.json")));
const output = process.argv[2]; assert(output, "Provide a fresh output directory"); assert(!existsSync(output), "Output already exists");
const hash = value => createHash("sha256").update(value).digest("hex");
const patch = join(root, "docs/architecture/evidence/field-render-evidence-native-baseline.patch");
assert.equal(hash(readFileSync(patch)), record.baseline.restorationPatchSha256);
const mirror = mkdtempSync(join(tmpdir(), "field-evidence-native-mirror-"));
try {
  for (const file of Object.keys(record.baseline.sourceHashes)) {
    const bytes = readFileSync(join(root, file)); assert.equal(hash(bytes), record.implementationSha256[file], `Reconstruction requires recorded implementation: ${file}`);
    mkdirSync(dirname(join(mirror, file)), { recursive: true }); writeFileSync(join(mirror, file), bytes);
  }
  execFileSync("patch", ["-p1", "-i", patch], { cwd: mirror, stdio: "pipe" });
  const previous = JSON.parse(readFileSync(join(root, record.baseline.previousRecord)));
  for (const [file, expected] of Object.entries(previous.baseline.protectedArtifacts)) assert.equal(hash(readFileSync(join(root, file))), expected, file);
  mkdirSync(resolve(output), { recursive: true });
  for (const [file, expected] of Object.entries(record.baseline.sourceHashes)) {
    const bytes = readFileSync(join(mirror, file)); assert.equal(hash(bytes), expected, file); writeFileSync(join(output, file.split("/").at(-1)), bytes);
  }
  writeFileSync(join(output, "baseline.json"), JSON.stringify({ sourceHashes: record.baseline.sourceHashes, protectedArtifacts: previous.baseline.protectedArtifacts, priorGate: record.baseline.gate }, null, 2));
  console.log(`Hash-verified original sources reconstructed in ${resolve(output)}`);
} finally { rmSync(mirror, { recursive: true, force: true }); }
