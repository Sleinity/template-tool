import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "vite";
import { repoRoot } from "../fidelity/core.mjs";

let compiledPromise = null;

async function compile() {
  const outDir = join(tmpdir(), `settlement-model-${process.pid}`);
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  await build({ root: repoRoot, configFile: false, logLevel: "silent", ssr: { noExternal: true }, build: { ssr: join(repoRoot, "scripts", "settlement", "model-entry.mjs"), outDir, emptyOutDir: true, minify: false, rollupOptions: { output: { entryFileNames: "model.mjs" } } } });
  return import(`${pathToFileURL(join(outDir, "model.mjs")).href}?${Date.now()}`);
}

export async function resolveSettlementModel(verifiedFixture, observation, scenario = null) {
  compiledPromise ??= compile();
  const compiled = await compiledPromise;
  return compiled.resolveFixtureSettlement(new Uint8Array(verifiedFixture.bytes), verifiedFixture.fixture.filename, { id: verifiedFixture.fixture.id, zipSha256: verifiedFixture.fixture.zipSha256 }, observation, scenario);
}
