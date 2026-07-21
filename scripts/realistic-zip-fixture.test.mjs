import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { strToU8, zipSync } from "fflate";
import {
  formatLifecycleFixtureReport,
  selectLifecycleZipFixture,
  strictRealisticZipRequested,
} from "./realistic-zip-fixture.mjs";

const directory = await mkdtemp(path.join(tmpdir(), "realistic-zip-selector-"));
try {
  const validPath = path.join(directory, "representative.zip");
  const validBytes = zipSync({
    "template.json": strToU8('{"schemaVersion":"1.0"}'),
  });
  await writeFile(validPath, validBytes);

  const portableRealistic = await selectLifecycleZipFixture({
    env: { TEMPLATE_PACKAGE_LIFECYCLE_ZIP: validPath },
    defaultPath: "/unused/default.zip",
  });
  assert.equal(portableRealistic.kind, "realistic");
  assert.equal(portableRealistic.strict, false);
  assert.equal(portableRealistic.sourceName, "representative.zip");
  assert.equal(portableRealistic.sizeBytes, validBytes.byteLength);
  assert.equal(
    portableRealistic.sha256,
    createHash("sha256").update(validBytes).digest("hex"),
  );
  assert.match(formatLifecycleFixtureReport(portableRealistic), /sha256=/);

  const portableFallback = await selectLifecycleZipFixture({
    env: {},
    defaultPath: path.join(directory, "missing.zip"),
  });
  assert.equal(portableFallback.kind, "fallback");
  assert.match(formatLifecycleFixtureReport(portableFallback), /compact-fallback/);

  await assert.rejects(
    selectLifecycleZipFixture({
      strict: true,
      env: { TEMPLATE_PACKAGE_LIFECYCLE_ZIP: path.join(directory, "missing.zip") },
    }),
    /does not permit the compact fallback/,
  );
  await assert.rejects(
    selectLifecycleZipFixture({
      strict: true,
      env: { TEMPLATE_PACKAGE_LIFECYCLE_ZIP: "relative/package.zip" },
    }),
    /must be an absolute path/,
  );

  const nonZipPath = path.join(directory, "not-a-package.zip");
  await writeFile(nonZipPath, "not a zip archive");
  await assert.rejects(
    selectLifecycleZipFixture({
      strict: true,
      env: { TEMPLATE_PACKAGE_LIFECYCLE_ZIP: nonZipPath },
    }),
    /too small|valid ZIP signature|end-of-central-directory/,
  );

  assert.equal(strictRealisticZipRequested(["--realistic-zip-strict"]), true);
  assert.equal(strictRealisticZipRequested([]), false);
} finally {
  await rm(directory, { recursive: true, force: true });
}
