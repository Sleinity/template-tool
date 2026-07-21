#!/usr/bin/env node
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "vite";
import { loadManifest, parseArguments, repoRoot, stableStringify, verifyFixture } from "../fidelity/core.mjs";

const args = parseArguments(process.argv.slice(2));
const output = resolve(args.output || join(repoRoot, "fidelity/evidence/milestone-7-3a-gradients/performance.json"));
const outDir = join(tmpdir(), `gradient-performance-${process.pid}`);
const fixtureIds = ["gradient-test-linear", "gradient-test-paint-opacity"];

try {
  await build({
    root: repoRoot,
    configFile: false,
    logLevel: "silent",
    ssr: { noExternal: true },
    build: {
      ssr: join(repoRoot, "scripts/primitives/performance-entry.mjs"),
      outDir,
      emptyOutDir: true,
      minify: false,
      rollupOptions: { output: { entryFileNames: "performance.mjs" } },
    },
  });
  const module = await import(`${pathToFileURL(join(outDir, "performance.mjs")).href}?${Date.now()}`);
  const manifest = loadManifest();
  const fixtures = [];
  for (const fixtureId of fixtureIds) {
    const fixture = manifest.fixtures.find((entry) => entry.id === fixtureId);
    if (!fixture) throw new Error(`Missing ${fixtureId}.`);
    const verified = verifyFixture(manifest, fixture);
    fixtures.push({
      fixtureId,
      zipSha256: fixture.zipSha256,
      ...(await module.benchmarkPrimitiveResolution(new Uint8Array(verified.bytes), fixture.filename, Number(args.iterations || 500))),
    });
  }
  mkdirSync(resolve(output, ".."), { recursive: true });
  writeFileSync(output, stableStringify({
    schemaVersion: "linear-gradient-performance-evidence-v1",
    environment: { node: process.version, platform: process.platform, architecture: process.arch },
    fixtures,
    interpretation: "Pure canonical-to-resolved primitive/gradient microbenchmark after a real ZIP import. This is current-run evidence, not a performance budget.",
  }));
  for (const fixture of fixtures) {
    console.log(`[gradient-performance] fixture=${fixture.fixtureId} gradients=${fixture.gradientNodeCount} gradientNode=${fixture.averagePerGradientNodeMs.toFixed(5)}ms resolvedTree=${fixture.resolvedTreeAverageMs.toFixed(3)}ms heapDelta=${fixture.heapDeltaBytes}`);
  }
  console.log(`[gradient-performance] output=${output}`);
} finally {
  rmSync(outDir, { recursive: true, force: true });
}

