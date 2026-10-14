import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { digest, extractCandidateExamples, validateCandidateManifest, verifyCandidateFiles } from "./local-sdk-candidate.mjs";

const packages = [{ name: "@sleinity/template-core" }, { name: "@sleinity/template-browser" }, { name: "@sleinity/template-react" }];
function fixture() {
  return { schemaVersion: "local-sdk-candidate-v1", published: false, version: "0.8.0", certification: "not-yet-verified",
    candidateId: `unpublished-0.8.0-${"a".repeat(64)}`, source: { filesSha256: "a".repeat(64) },
    archives: packages.map(({ name }) => ({ name, version: "0.8.0", file: `${name.split("/").at(-1)}.tgz`, bytes: 1, sha256: digest("x") })),
    documents: [{ file: "SDK-V2-INTEGRATION.md", bytes: 1, sha256: digest("d") }] };
}
test("packing does not certify or publish; source hash distinguishes same-version candidates", () => {
  assert.equal(validateCandidateManifest(fixture(), packages, "0.8.0").published, false);
  for (const change of [value => value.published = true, value => value.certification = "passed", value => value.version = "0.9.0", value => value.source.filesSha256 = "b".repeat(64)]) {
    const value = fixture(); change(value); assert.throws(() => validateCandidateManifest(value, packages, "0.8.0"));
  }
});
test("missing, duplicate, unexpected and escaping archives fail", () => {
  for (const change of [value => value.archives.pop(), value => value.archives[1] = value.archives[0], value => value.archives[0].name = "unknown", value => value.archives[0].file = "../outside.tgz"]) {
    const value = fixture(); change(value); assert.throws(() => validateCandidateManifest(value, packages, "0.8.0"));
  }
});
test("consumer evidence is bound to exact archive and guide bytes", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "sdk-candidate-test-"));
  try {
    const value = fixture();
    for (const archive of value.archives) await writeFile(path.join(directory, archive.file), "x");
    await writeFile(path.join(directory, "SDK-V2-INTEGRATION.md"), "d");
    await verifyCandidateFiles(directory, value, packages, "0.8.0");
    await writeFile(path.join(directory, value.archives[0].file), "y");
    await assert.rejects(verifyCandidateFiles(directory, value, packages, "0.8.0"), /bytes differ/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
test("guide contracts require three examples and reject restricted dependencies", () => {
  const block = source => `\n\`\`\`ts\n// sdk-candidate-example\n${source}\n\`\`\`\n`;
  assert.equal(extractCandidateExamples(block("export const x = 1;").repeat(3)).length, 3);
  assert.throws(() => extractCandidateExamples(block("export const x = 1;")));
  assert.throws(() => extractCandidateExamples(block('import x from "@sleinity/template-browser/session-internal";').repeat(3)), /unsupported/);
});
