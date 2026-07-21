#!/usr/bin/env node
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "vite";
import { loadManifest, parseArguments, repoRoot, stableStringify, verifyFixture } from "../fidelity/core.mjs";

const args = parseArguments(process.argv.slice(2));
const output = resolve(args.output || join(repoRoot, "fidelity/evidence/milestone-7-1-primitives/performance.json"));
const outDir = join(tmpdir(), `primitive-performance-${process.pid}`);
const defaultFixtureIds = ["bb-cover-thing-primitives", "main-visual-section-primitives", "stroke-test-primitives"];
const fixtureIds = args.fixture ? String(args.fixture).split(",") : defaultFixtureIds;
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
      ...(await module.benchmarkPrimitiveResolution(
        new Uint8Array(verified.bytes),
        fixture.filename,
        Number(args.iterations || 250),
      )),
    });
  }
  mkdirSync(resolve(output, ".."), { recursive: true });
  writeFileSync(output, stableStringify({
    schemaVersion: "primitive-performance-evidence-v1",
    environment: {
      node: process.version,
      platform: process.platform,
      architecture: process.arch,
    },
    fixtures,
    interpretation: "Combined pure geometry/corner/paint/stroke/backend selection microbenchmark; local evidence only, not a performance budget.",
  }));
  for (const fixture of fixtures) {
    console.log(`[primitive-performance] fixture=${fixture.fixtureId} tree=${fixture.averagePerTreeMs.toFixed(4)}ms node=${fixture.averagePerNodeMs.toFixed(5)}ms resolvedTree=${fixture.resolvedTreeAverageMs.toFixed(3)}ms`);
  }
  console.log(`[primitive-performance] output=${output}`);
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
