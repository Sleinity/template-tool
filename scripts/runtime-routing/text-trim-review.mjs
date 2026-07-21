#!/usr/bin/env node
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { strFromU8, unzipSync } from "fflate";
import { PNG } from "pngjs";
import { comparePng, writeDifferenceImage } from "../fidelity/image.mjs";
import { loadManifest, repoRoot, stableStringify, verifyFixture } from "../fidelity/core.mjs";

const manifest = loadManifest();
const fixture = manifest.fixtures.find((item) => item.id === "now-hiring-post");
if (!fixture) throw new Error("Text-trim review requires now-hiring-post.");
const verified = verifyFixture(manifest, fixture);
const output = join(repoRoot, "fidelity", "artifacts", "milestone-5-2-source-review", fixture.id, "png-export");
mkdirSync(output, { recursive: true });

const archive = unzipSync(new Uint8Array(verified.bytes));
const source = archive["preview.png"];
if (!source) throw new Error("The exact ZIP has no embedded preview.png source reference.");
const sourcePath = join(output, "source-reference.png");
writeFileSync(sourcePath, source);

const exactRun = join(repoRoot, "fidelity", "runtime-routing", "font-evidence", "milestone-5-2-fonts-final-headless");
const candidatePath = join(output, "exact-font-candidate.png");
copyFileSync(join(exactRun, "exact-initial", "png-export", "exported.png"), candidatePath);
const approvedPath = join(output, "approved-renderer-reference.png");
copyFileSync(join(repoRoot, "fidelity", "references", "approved", fixture.id, "png-export", "reference.png"), approvedPath);
const priorCandidateSource = join(repoRoot, "fidelity", "candidates", "milestone-5-final-compare", fixture.id, "png-export", "capture-1.png");
const priorCandidatePath = join(output, "prior-milestone-5-candidate.png");
copyFileSync(priorCandidateSource, priorCandidatePath);
const milestone51CandidatePath = join(output, "milestone-5-1-candidate.png");
copyFileSync(join(repoRoot, "fidelity", "runtime-routing", "font-evidence", "milestone-5-1-fonts-final-headless", "exact-initial", "png-export", "exported.png"), milestone51CandidatePath);

const comparisons = [
  ["source", sourcePath],
  ["approved", approvedPath],
  ["prior-milestone-5", priorCandidatePath],
  ["milestone-5-1", milestone51CandidatePath],
].map(([id, expected]) => {
  const result = comparePng(expected, candidatePath, { threshold: 0.1, allowedChangedPixelPercentage: 0 });
  writeDifferenceImage(result, join(output, `difference-${id}.png`));
  const { differenceImage: _differenceImage, ...report } = result;
  return { id, expected, candidate: candidatePath, ...report };
});
writeFileSync(join(output, "comparison.json"), stableStringify({ schemaVersion: "vertical-text-trim-review-v2", fixture: { id: fixture.id, zipSha256: fixture.zipSha256, embeddedPreviewSha256: fixture.embeddedPreview.sha256 }, comparisons }));

const exactEvidence = JSON.parse(readFileSync(join(exactRun, "exact-initial", "png-export", "evidence-1.json"), "utf8"));
const exactRunReport = JSON.parse(readFileSync(join(exactRun, "run.json"), "utf8"));
writeFileSync(join(output, "text-measurement-and-trim-boxes.json"), stableStringify({ sourceTrimHeights: exactRunReport.sourceTrimHeights, textNodes: exactEvidence.textNodes }));
writeFileSync(join(output, "settlement-geometry.json"), stableStringify({ runtimeRouting: exactEvidence.runtimeRouting, canvas: exactEvidence.canvas, textNodes: exactEvidence.textNodes.map((node) => ({ id: node.id, bounds: node.bounds, textGeometry: node.textGeometry })) }));
writeFileSync(join(output, "font-identity.json"), stableStringify({ manifest: exactEvidence.fontManifest, injected: exactEvidence.exact.injected, documentStatus: exactEvidence.exact.documentStatus }));
const sourceTemplate = JSON.parse(strFromU8(archive["template.json"]));
const sourceTextNodes = Object.values(sourceTemplate.nodes).filter((node) => node.type === "TEXT" && node.text?.leadingTrim === "CAP_HEIGHT").map((node) => ({
  id: node.id,
  parentId: node.parentId,
  bounds: node.bounds?.relative ?? null,
  leadingTrim: node.text.leadingTrim,
  textAlignVertical: node.text.textAlignVertical,
  textAutoResize: node.text.textAutoResize,
  fontFamily: node.text.fontFamily,
  fontWeight: node.text.fontWeight,
  fontStyle: node.text.fontStyle,
  fontSize: node.text.fontSize,
  lineHeightPx: node.text.lineHeightPx,
  parentPadding: sourceTemplate.nodes[node.parentId]?.layout?.padding ?? null,
}));
writeFileSync(join(output, "source-structural-evidence.json"), stableStringify({ packageId: sourceTemplate.packageId, canvas: sourceTemplate.canvas, rootNodeId: sourceTemplate.rootNodeId, textNodes: sourceTextNodes }));

const overlay = PNG.sync.read(readFileSync(candidatePath));
const setPixel = (x, y, color) => {
  if (x < 0 || y < 0 || x >= overlay.width || y >= overlay.height) return;
  const offset = (Math.round(y) * overlay.width + Math.round(x)) * 4;
  overlay.data[offset] = color[0]; overlay.data[offset + 1] = color[1]; overlay.data[offset + 2] = color[2]; overlay.data[offset + 3] = 255;
};
const line = (x1, x2, y, color) => { for (let x = Math.max(0, Math.round(x1)); x <= Math.min(overlay.width - 1, Math.round(x2)); x += 1) for (let thickness = -1; thickness <= 1; thickness += 1) setPixel(x, Math.round(y) + thickness, color); };
for (const node of exactEvidence.textNodes.filter((item) => item.textGeometry)) {
  const geometry = node.textGeometry;
  const left = node.bounds.x;
  const right = left + node.bounds.width;
  const semanticTop = node.bounds.y + geometry.semanticContentBox.y;
  const semanticBottom = semanticTop + geometry.semanticContentBox.height;
  const paintTop = node.bounds.y + geometry.paintBox.y;
  const paintBottom = paintTop + geometry.paintBox.height;
  line(left, right, semanticTop, [0, 255, 255]);
  line(left, right, semanticBottom, [255, 0, 255]);
  line(left, right, paintTop, [255, 204, 0]);
  line(left, right, paintBottom, [255, 204, 0]);
}
writeFileSync(join(output, "text-geometry-overlay.png"), PNG.sync.write(overlay));
writeFileSync(join(output, "reference-status.json"), stableStringify({ approvedReferencesModified: false, promotionRequested: false, reviewRequired: true, classifications: { sourceReference: "primary-source-design-reference", structuralAuthority: "zip-node-bounds-and-figma-metadata", approvedRendererReference: "historical-regression-reference", milestone5Candidate: "surface-convergence-candidate", milestone51Candidate: "trim-height-candidate-with-invalid-paint-origin", currentCandidate: "source-grounded-trim-height-and-glyph-origin-candidate" }, note: "A source-fidelity correction may replace a historically incorrect renderer baseline only after explicit review. Remaining full-image differences include independently classified media placement outside Milestone 5.2." }));
console.log(`[runtime-routing] text-trim-review=written output=${output}`);
