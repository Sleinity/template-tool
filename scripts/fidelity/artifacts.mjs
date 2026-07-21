import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { artifactDirectory, stableStringify } from "./core.mjs";
import { writeDifferenceImage } from "./image.mjs";

export function retainFailureArtifacts({ fixture, surface, runId, candidate, approved, pixel, geometry, environment, result, artifactsRoot }) {
  const directory = artifactDirectory(resolve(artifactsRoot), runId, fixture.id, surface);
  mkdirSync(directory, { recursive: true });
  if (existsSync(approved.png)) cpSync(approved.png, join(directory, "approved-reference.png"));
  cpSync(candidate.png, join(directory, "current-candidate.png"));
  cpSync(candidate.structure, join(directory, "structural-report.json"));
  const structure = JSON.parse(readFileSync(candidate.structure, "utf8"));
  if (pixel?.differenceImage) writeDifferenceImage(pixel, join(directory, "difference.png"));
  const pixelReport = pixel ? { ...pixel, differenceImage: undefined } : null;
  writeFileSync(join(directory, "comparison.json"), stableStringify({ pixel: pixelReport, geometry }));
  writeFileSync(join(directory, "environment.json"), stableStringify(environment));
  writeFileSync(join(directory, "fixture-identity.json"), stableStringify(fixture));
  writeFileSync(join(directory, "route-and-timing.json"), stableStringify({ route: result?.route ?? null, fullDurationMs: result?.fullDurationMs ?? null, timings: result?.surfaces?.[surface]?.[0]?.timings ?? null }));
  writeFileSync(join(directory, "font-readiness.json"), stableStringify(result?.surfaces?.[surface]?.[0]?.fontReadiness ?? null));
  writeFileSync(join(directory, "asset-readiness.json"), stableStringify(structure.assetReadiness ?? null));
  writeFileSync(join(directory, "renderer-diagnostics.json"), stableStringify({ diagnostics: structure.diagnostics ?? [], warnings: structure.warnings ?? [], fallbacks: structure.rendererFallbacks ?? [] }));
  const consolePath = join(candidate.directory, "browser-console.json");
  if (existsSync(consolePath)) cpSync(consolePath, join(directory, "browser-console.json"));
  const completeSurfacePath = join(candidate.directory, "complete-surface.png");
  if (existsSync(completeSurfacePath)) cpSync(completeSurfacePath, join(directory, "complete-surface.png"));
  return directory;
}
