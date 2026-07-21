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
const runId = String(args["run-id"] || "milestone-7-1-primitives-final");
const outputRoot = resolve(
  args.output || join(repoRoot, "fidelity/evidence/milestone-7-1-primitives"),
);
const manifest = loadManifest();
const specifications = [
  {
    fixtureId: "bb-cover-thing-primitives",
    strokeNodeId: "421:27",
    ordinarySolidNodeId: "421:21",
    previousRunId: "milestone-7-1-bb-before",
  },
  {
    fixtureId: "main-visual-section-primitives",
    strokeNodeId: "2453:1436",
    ordinarySolidNodeId: "2453:1441",
    previousRunId: "milestone-7-1-main-before",
  },
];
const surfaces = ["validate", "fields", "editor", "png-export"];

function plainComparison(comparison) {
  const result = { ...comparison };
  delete result.differenceImage;
  return result;
}

function crop(bytes, bounds) {
  const source = PNG.sync.read(bytes);
  const normalized = {
    x: Math.max(0, Math.round(bounds.x)),
    y: Math.max(0, Math.round(bounds.y)),
    width: Math.min(source.width - Math.max(0, Math.round(bounds.x)), Math.round(bounds.width)),
    height: Math.min(source.height - Math.max(0, Math.round(bounds.y)), Math.round(bounds.height)),
  };
  if (normalized.width <= 0 || normalized.height <= 0) {
    throw new Error(`Invalid crop ${JSON.stringify(normalized)} for ${source.width}x${source.height}.`);
  }
  const output = new PNG({ width: normalized.width, height: normalized.height });
  PNG.bitblt(source, output, normalized.x, normalized.y, normalized.width, normalized.height, 0, 0);
  return PNG.sync.write(output);
}

function roundedPerimeter(bytes, radius, band = 6) {
  const source = PNG.sync.read(bytes);
  const output = new PNG({ width: source.width, height: source.height });
  const insideRounded = (x, y, offset, width, height, cornerRadius) => {
    const localX = x - offset;
    const localY = y - offset;
    if (localX < 0 || localY < 0 || localX >= width || localY >= height) return false;
    const r = Math.max(0, Math.min(cornerRadius, width / 2, height / 2));
    const nearestX = Math.max(r, Math.min(width - r, localX));
    const nearestY = Math.max(r, Math.min(height - r, localY));
    const dx = localX - nearestX;
    const dy = localY - nearestY;
    return dx * dx + dy * dy <= r * r;
  };
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const outer = insideRounded(x + 0.5, y + 0.5, 0, source.width, source.height, radius);
      const inner = insideRounded(
        x + 0.5,
        y + 0.5,
        band,
        source.width - band * 2,
        source.height - band * 2,
        Math.max(0, radius - band),
      );
      if (!outer || inner) continue;
      const offset = (y * source.width + x) * 4;
      output.data.set(source.data.subarray(offset, offset + 4), offset);
    }
  }
  return PNG.sync.write(output);
}

function templateBounds(template, nodeId) {
  let node = template.nodes[nodeId];
  if (!node) throw new Error(`Missing source node ${nodeId}.`);
  let x = node.bounds.relative.x;
  let y = node.bounds.relative.y;
  const width = node.bounds.relative.width;
  const height = node.bounds.relative.height;
  while (node.parentId) {
    node = template.nodes[node.parentId];
    if (!node) throw new Error(`Broken source parent chain for ${nodeId}.`);
    if (node.id !== template.rootNodeId) {
      x += node.bounds.relative.x;
      y += node.bounds.relative.y;
    }
  }
  return { x, y, width, height };
}

mkdirSync(outputRoot, { recursive: true });
const reports = [];
for (const specification of specifications) {
  const fixture = manifest.fixtures.find((entry) => entry.id === specification.fixtureId);
  if (!fixture) throw new Error(`Missing exact fixture ${specification.fixtureId}.`);
  const verified = verifyFixture(manifest, fixture);
  const entries = unzipSync(new Uint8Array(verified.bytes));
  const preview = entries[fixture.embeddedPreview.entry];
  const templateBytes = entries["template.json"];
  if (!preview || !templateBytes) throw new Error(`${fixture.id} lacks preview.png or template.json.`);
  if (sha256(templateBytes) !== fixture.templateJsonSha256) {
    throw new Error(`${fixture.id} template.json hash changed.`);
  }
  const template = JSON.parse(Buffer.from(templateBytes).toString("utf8"));
  const strokeNode = template.nodes[specification.strokeNodeId];
  const ordinarySolidNode = template.nodes[specification.ordinarySolidNodeId];
  const strokeBounds = templateBounds(template, specification.strokeNodeId);
  const fixtureOutput = join(outputRoot, fixture.id);
  mkdirSync(fixtureOutput, { recursive: true });
  const previewBytes = Buffer.from(preview);
  const candidatePath = join(
    repoRoot,
    "fidelity/candidates",
    runId,
    fixture.id,
    "png-export/capture-1.png",
  );
  if (!existsSync(candidatePath)) throw new Error(`Missing ${candidatePath}.`);
  const candidate = readFileSync(candidatePath);
  const sourceRegion = crop(previewBytes, strokeBounds);
  const candidateRegion = crop(candidate, strokeBounds);
  const sourcePerimeter = roundedPerimeter(
    sourceRegion,
    Math.min(Number(strokeNode.appearance.cornerRadius ?? 0), strokeBounds.width / 2, strokeBounds.height / 2),
  );
  const candidatePerimeter = roundedPerimeter(
    candidateRegion,
    Math.min(Number(strokeNode.appearance.cornerRadius ?? 0), strokeBounds.width / 2, strokeBounds.height / 2),
  );
  const regionComparison = comparePng(sourceRegion, candidateRegion, {
    threshold: 0.1,
    allowedChangedPixelPercentage: 100,
  });
  const perimeterComparison = comparePng(sourcePerimeter, candidatePerimeter, {
    threshold: 0.1,
    allowedChangedPixelPercentage: 100,
  });
  const fullComparison = comparePng(previewBytes, candidate, {
    threshold: 0.1,
    allowedChangedPixelPercentage: 100,
  });
  const previousCandidatePath = join(
    repoRoot,
    "fidelity/candidates",
    specification.previousRunId,
    fixture.id,
    "png-export/capture-1.png",
  );
  let previousPerimeterComparison = null;
  if (existsSync(previousCandidatePath)) {
    const previousRegion = crop(readFileSync(previousCandidatePath), strokeBounds);
    const previousPerimeter = roundedPerimeter(
      previousRegion,
      Math.min(Number(strokeNode.appearance.cornerRadius ?? 0), strokeBounds.width / 2, strokeBounds.height / 2),
    );
    previousPerimeterComparison = comparePng(sourcePerimeter, previousPerimeter, {
      threshold: 0.1,
      allowedChangedPixelPercentage: 100,
    });
    writeFileSync(join(fixtureOutput, "stroke-perimeter-previous.png"), previousPerimeter);
    if (previousPerimeterComparison.differenceImage) {
      writeFileSync(join(fixtureOutput, "stroke-perimeter-previous-diff.png"), previousPerimeterComparison.differenceImage);
    }
  }
  writeFileSync(join(fixtureOutput, "source-preview.png"), previewBytes);
  writeFileSync(join(fixtureOutput, "png-export-candidate.png"), candidate);
  writeFileSync(join(fixtureOutput, "stroke-region-source.png"), sourceRegion);
  writeFileSync(join(fixtureOutput, "stroke-region-candidate.png"), candidateRegion);
  writeFileSync(join(fixtureOutput, "stroke-perimeter-source.png"), sourcePerimeter);
  writeFileSync(join(fixtureOutput, "stroke-perimeter-candidate.png"), candidatePerimeter);
  if (regionComparison.differenceImage) {
    writeFileSync(join(fixtureOutput, "stroke-region-diff.png"), regionComparison.differenceImage);
  }
  if (perimeterComparison.differenceImage) {
    writeFileSync(join(fixtureOutput, "stroke-perimeter-diff.png"), perimeterComparison.differenceImage);
  }
  if (fullComparison.differenceImage) {
    writeFileSync(join(fixtureOutput, "full-canvas-diff.png"), fullComparison.differenceImage);
  }

  const telemetry = surfaces.map((surface) => {
    const firstPath = join(repoRoot, "fidelity/candidates", runId, fixture.id, surface, "structure-1.json");
    const secondPath = join(repoRoot, "fidelity/candidates", runId, fixture.id, surface, "structure-2.json");
    if (!existsSync(firstPath) || !existsSync(secondPath)) throw new Error(`${fixture.id}/${surface} lacks repeated structural evidence.`);
    const first = JSON.parse(readFileSync(firstPath, "utf8"));
    const second = JSON.parse(readFileSync(secondPath, "utf8"));
    const node = first.nodes.find((entry) => entry.id === specification.strokeNodeId);
    const repeated = second.nodes.find((entry) => entry.id === specification.strokeNodeId);
    if (!node?.primitiveAppearance || !repeated?.primitiveAppearance) {
      throw new Error(`${fixture.id}/${surface} lacks primitive telemetry.`);
    }
    return {
      surface,
      bounds: node.bounds,
      primitiveAppearance: node.primitiveAppearance,
      repeatedIdentity:
        node.primitiveAppearance.sourceRevision === repeated.primitiveAppearance.sourceRevision &&
        node.primitiveAppearance.geometryRevision === repeated.primitiveAppearance.geometryRevision &&
        stableStringify(node.primitiveAppearance.computed) === stableStringify(repeated.primitiveAppearance.computed),
    };
  });
  const identities = new Set(telemetry.map((entry) => stableStringify({
    sourceRevision: entry.primitiveAppearance.sourceRevision,
    geometryRevision: entry.primitiveAppearance.geometryRevision,
    ownership: entry.primitiveAppearance.ownership,
    corners: entry.primitiveAppearance.effectiveCorners,
    strokeStrategy: entry.primitiveAppearance.strokeStrategy,
  })));
  if (
    identities.size !== 1 ||
    telemetry.some((entry) =>
      !entry.repeatedIdentity ||
      entry.primitiveAppearance.ownership !== "primitive-authoritative" ||
      entry.primitiveAppearance.strokeStrategy !== "css-inset-shadow"
    )
  ) {
    throw new Error(`${fixture.id} does not have stable all-surface primitive identity.`);
  }
  const report = {
    schemaVersion: "source-certified-primitive-evidence-v1",
    runId,
    sourceIdentity: {
      fixtureId: fixture.id,
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
    sourceSubset: {
      strokeNodeId: specification.strokeNodeId,
      strokeBounds,
      stroke: strokeNode.appearance.strokes,
      strokeWeight: strokeNode.appearance.strokeWeight,
      strokeAlignment: strokeNode.appearance.strokeAlign,
      cornerRadius: strokeNode.appearance.cornerRadius,
      ordinarySolidNodeId: specification.ordinarySolidNodeId,
      ordinarySolidFills: ordinarySolidNode.appearance.fills,
    },
    telemetry,
    allSurfaceIdentity: identities.size === 1,
    comparisons: {
      sourceStrokeRegionToCandidate: plainComparison(regionComparison),
      sourceStrokePerimeterToCandidate: plainComparison(perimeterComparison),
      sourceStrokePerimeterToPrevious: previousPerimeterComparison
        ? plainComparison(previousPerimeterComparison)
        : null,
      fullCanvasSourceToCandidate: plainComparison(fullComparison),
      fullCanvasAuthority: "non-authoritative because each fixture contains unsupported appearance families",
    },
    references: {
      approvedUpdated: false,
      status: "candidate-only; no reference update command was run",
    },
  };
  writeFileSync(join(fixtureOutput, "report.json"), stableStringify(report));
  reports.push(report);
  console.log(`[primitive-evidence] fixture=${fixture.id} perimeterChanged=${perimeterComparison.changedPixelCount} perimeterPercent=${perimeterComparison.changedPixelPercentage} regionChanged=${regionComparison.changedPixelCount}`);
}

writeFileSync(join(outputRoot, "report.json"), stableStringify({
  schemaVersion: "source-certified-primitive-evidence-index-v1",
  runId,
  reports,
}));
console.log(`[primitive-evidence] output=${outputRoot}`);
