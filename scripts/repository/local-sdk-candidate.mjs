import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";

export const candidateManifestName = "LOCAL-CANDIDATE-MANIFEST.json";
export const digest = value => createHash("sha256").update(value).digest("hex");

export async function fileIdentity(root, file) {
  const bytes = await readFile(path.join(root, file));
  return { file, bytes: bytes.length, sha256: digest(bytes) };
}

export async function sourceIdentity(root) {
  const paths = [...new Set(execFileSync("git", ["ls-files", "-c", "-o", "--exclude-standard", "-z"], { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean))].sort();
  const files = [];
  for (const file of paths) {
    // Deleted paths are represented by git status; only existing regular files have bytes.
    const info = await stat(path.join(root, file)).catch(error => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    if (info?.isFile()) files.push(await fileIdentity(root, file));
  }
  return {
    commit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
    status: execFileSync("git", ["status", "--short"], { cwd: root, encoding: "utf8" }),
    trackedDiffSha256: digest(execFileSync("git", ["diff", "--binary"], { cwd: root, maxBuffer: 32 * 1024 * 1024 })),
    files,
    filesSha256: digest(JSON.stringify(files)),
  };
}

export function validateCandidateManifest(manifest, packages, version) {
  if (manifest?.schemaVersion !== "local-sdk-candidate-v1" || manifest.published !== false || manifest.version !== version ||
      !/^[a-f0-9]{64}$/.test(manifest.source?.filesSha256 ?? "") ||
      manifest.candidateId !== `unpublished-${version}-${manifest.source.filesSha256}`) {
    throw new Error("Invalid unpublished candidate identity or version.");
  }
  const expected = new Set(packages.map(item => item.name));
  const seen = new Set();
  for (const item of manifest.archives ?? []) {
    if (!expected.has(item.name) || seen.has(item.name) || item.version !== version ||
        path.basename(item.file) !== item.file || !/^[a-f0-9]{64}$/.test(item.sha256 ?? "") ||
        !Number.isInteger(item.bytes) || item.bytes <= 0) throw new Error("Invalid, duplicate or unexpected candidate archive.");
    seen.add(item.name);
  }
  if (seen.size !== expected.size) throw new Error("Incomplete candidate archive set.");
  if (!manifest.documents?.some(item => item.file === "SDK-V2-INTEGRATION.md")) throw new Error("Candidate V2 integration guide is missing.");
  if (manifest.certification !== "not-yet-verified") throw new Error("Packing alone cannot certify a candidate.");
  return manifest;
}

export async function verifyCandidateFiles(directory, manifest, packages, version) {
  validateCandidateManifest(manifest, packages, version);
  for (const item of [...manifest.archives, ...manifest.documents]) {
    if (path.basename(item.file) !== item.file) throw new Error("Candidate file must be local to the artifact directory.");
    const actual = await fileIdentity(directory, item.file);
    if (actual.bytes !== item.bytes || actual.sha256 !== item.sha256) throw new Error(`Candidate bytes differ: ${item.file}`);
  }
  return manifest;
}

export function extractCandidateExamples(markdown) {
  const examples = [...markdown.matchAll(/```(?:ts|tsx)\n([\s\S]*?)\n```/g)]
    .map(match => match[1]).filter(source => source.startsWith("// sdk-candidate-example"));
  if (examples.length < 3) throw new Error("V2 guide needs import, Family and recovery contract examples.");
  for (const source of examples) {
    if (/from\s+["'][^"']*(?:session-internal|renderer-internal|\/src\/|apps\/studio)/.test(source)) throw new Error("Guide imports an unsupported entry.");
  }
  return examples;
}
