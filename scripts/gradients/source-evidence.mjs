#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { unzipSync } from "fflate";
import { PNG } from "pngjs";
import {
  loadManifest,
  parseArguments,
  repoRoot,
  sha256,
  stableStringify,
  verifyFixture,
} from "../fidelity/core.mjs";
import { comparePng } from "../fidelity/image.mjs";

const args = parseArguments(process.argv.slice(2));
const runId = String(args["run-id"] || "milestone-7-3a-linear-gradient");
const fixtureIds = args.fixture
  ? [String(args.fixture)]
  : ["gradient-test-linear", "gradient-test-paint-opacity"];
const surfaces = ["validate", "fields", "editor", "png-export"];
const output = resolve(args.output || join(repoRoot, "fidelity/evidence/milestone-7-3a-gradients", runId));

function withoutImage(value) {
  const result = { ...value };
  delete result.differenceImage;
  return result;
}

function rootBounds(template, nodeId) {
  let node = template.nodes[nodeId];
  if (!node) throw new Error(`Missing gradient node ${nodeId}.`);
  let x = node.bounds.relative.x;
  let y = node.bounds.relative.y;
  const width = node.bounds.relative.width;
  const height = node.bounds.relative.height;
  while (node.parentId) {
    node = template.nodes[node.parentId];
    if (!node) throw new Error(`Broken parent chain for ${nodeId}.`);
    if (node.id !== template.rootNodeId) {
      x += node.bounds.relative.x;
      y += node.bounds.relative.y;
    }
  }
  return { x, y, width, height };
}

function crop(bytes, bounds, margin = 4) {
  const image = PNG.sync.read(bytes);
  const x = Math.max(0, Math.floor(bounds.x - margin));
  const y = Math.max(0, Math.floor(bounds.y - margin));
  const right = Math.min(image.width, Math.ceil(bounds.x + bounds.width + margin));
  const bottom = Math.min(image.height, Math.ceil(bounds.y + bounds.height + margin));
  const result = new PNG({ width: right - x, height: bottom - y });
  PNG.bitblt(image, result, x, y, result.width, result.height, 0, 0);
  return PNG.sync.write(result);
}

mkdirSync(output, { recursive: true });
const manifest = loadManifest();
const reports = [];

for (const fixtureId of fixtureIds) {
  const fixture = manifest.fixtures.find((entry) => entry.id === fixtureId);
  if (!fixture?.linearGradientEvidence) throw new Error(`Missing registered linear-gradient evidence for ${fixtureId}.`);
  const verified = verifyFixture(manifest, fixture);
  const entries = unzipSync(new Uint8Array(verified.bytes));
  const preview = entries[fixture.embeddedPreview.entry];
  const templateBytes = entries["template.json"];
  if (!preview || !templateBytes) throw new Error(`${fixtureId} lacks preview.png or template.json.`);
  if (sha256(templateBytes) !== fixture.templateJsonSha256) throw new Error(`${fixtureId} template.json hash mismatch.`);
  const template = JSON.parse(Buffer.from(templateBytes).toString("utf8"));
  const nodeIds = fixture.linearGradientEvidence.nodes
    ? Object.values(fixture.linearGradientEvidence.nodes)
    : [fixture.linearGradientEvidence.nodeId];
  const candidatePath = join(repoRoot, "fidelity/candidates", runId, fixtureId, "png-export/capture-1.png");
  if (!existsSync(candidatePath)) throw new Error(`Missing candidate ${candidatePath}.`);
  const previewBytes = Buffer.from(preview);
  const candidateBytes = readFileSync(candidatePath);
  const fixtureOutput = join(output, fixtureId);
  mkdirSync(fixtureOutput, { recursive: true });
  writeFileSync(join(fixtureOutput, "source-preview.png"), previewBytes);
  writeFileSync(join(fixtureOutput, "current-candidate.png"), candidateBytes);
  const fullCanvas = comparePng(previewBytes, candidateBytes, { threshold: 0.1, allowedChangedPixelPercentage: 100 });
  if (fullCanvas.differenceImage) writeFileSync(join(fixtureOutput, "source-current-diff.png"), fullCanvas.differenceImage);

  const regions = nodeIds.map((nodeId) => {
    const node = template.nodes[nodeId];
    const bounds = rootBounds(template, nodeId);
    const source = crop(previewBytes, bounds);
    const current = crop(candidateBytes, bounds);
    const comparison = comparePng(source, current, { threshold: 0.1, allowedChangedPixelPercentage: 100 });
    const regionOutput = join(fixtureOutput, String(nodeId).replace(":", "-"));
    mkdirSync(regionOutput, { recursive: true });
    writeFileSync(join(regionOutput, "source.png"), source);
    writeFileSync(join(regionOutput, "current.png"), current);
    if (comparison.differenceImage) writeFileSync(join(regionOutput, "diff.png"), comparison.differenceImage);
    const canonicalPaint = node.appearance.fills.find((paint) => paint.type === "GRADIENT_LINEAR");
    const rawPaint = node.extensions?.figma?.rawFills?.find((paint) => paint.type === "GRADIENT_LINEAR");
    return {
      nodeId,
      name: node.name,
      type: node.type,
      bounds,
      rotation: node.extensions?.figma?.rotation ?? 0,
      cornerRadius: node.appearance.cornerRadius ?? null,
      cornerRadii: node.appearance.cornerRadii ?? null,
      canonicalPaint,
      rawPaint,
      comparison: withoutImage(comparison),
    };
  });

  const surfaceEvidence = surfaces.map((surface) => {
    const firstPath = join(repoRoot, "fidelity/candidates", runId, fixtureId, surface, "structure-1.json");
    const secondPath = join(repoRoot, "fidelity/candidates", runId, fixtureId, surface, "structure-2.json");
    if (!existsSync(firstPath) || !existsSync(secondPath)) throw new Error(`${fixtureId}/${surface} lacks repeated structure.`);
    const first = JSON.parse(readFileSync(firstPath, "utf8"));
    const second = JSON.parse(readFileSync(secondPath, "utf8"));
    return {
      surface,
      nodes: nodeIds.map((nodeId) => {
        const firstNode = first.nodes.find((entry) => entry.id === nodeId);
        const secondNode = second.nodes.find((entry) => entry.id === nodeId);
        const firstGradient = firstNode?.primitiveAppearance?.linearGradient;
        const secondGradient = secondNode?.primitiveAppearance?.linearGradient;
        if (!firstGradient || !secondGradient) throw new Error(`${fixtureId}/${surface}/${nodeId} lacks routed gradient telemetry.`);
        if (firstNode.primitiveAppearance.ownership !== "primitive-authoritative") throw new Error(`${fixtureId}/${surface}/${nodeId} did not transfer primitive authority.`);
        if (firstGradient.inversionCount !== 1 || firstGradient.runtimeOwner !== "svg") throw new Error(`${fixtureId}/${surface}/${nodeId} violates inverse or owner contract.`);
        if (stableStringify(firstGradient) !== stableStringify(secondGradient)) throw new Error(`${fixtureId}/${surface}/${nodeId} gradient telemetry is nondeterministic.`);
        return { nodeId, bounds: firstNode.bounds, linearGradient: firstGradient };
      }),
    };
  });

  for (const nodeId of nodeIds) {
    const identities = surfaceEvidence.map((surface) => stableStringify(surface.nodes.find((node) => node.nodeId === nodeId)?.linearGradient));
    if (new Set(identities).size !== 1) throw new Error(`${fixtureId}/${nodeId} differs across live surfaces.`);
  }

  const report = {
    schemaVersion: "source-certified-linear-gradient-evidence-v1",
    runId,
    sourceIdentity: {
      fixtureId,
      path: verified.path,
      filename: fixture.filename,
      byteSize: fixture.byteSize,
      zipSha256: fixture.zipSha256,
      previewSha256: fixture.embeddedPreview.sha256,
      templateJsonSha256: fixture.templateJsonSha256,
      packageId: fixture.packageId,
      exporterVersion: fixture.exporterVersion,
      rootNodeId: fixture.rootNodeId,
    },
    fullCanvas: {
      sourceCurrent: withoutImage(fullCanvas),
      authority: "source-preview-evidence-not-approved-renderer-reference",
    },
    regions,
    surfaceEvidence,
  };
  writeFileSync(join(fixtureOutput, "report.json"), stableStringify(report));
  reports.push(report);
  console.log(`[gradient-source-evidence] fixture=${fixtureId} source-current=${fullCanvas.changedPixelPercentage.toFixed(4)}%`);
}

writeFileSync(join(output, "report.json"), stableStringify({
  schemaVersion: "source-certified-linear-gradient-evidence-index-v1",
  runId,
  reports,
}));
console.log(`[gradient-source-evidence] output=${output}`);

