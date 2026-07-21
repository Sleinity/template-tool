import { runTemplatePackageImportPipeline } from "../../src/template-package/import/runTemplatePackageImportPipeline";
import { resolvePrimitiveAppearance } from "../../src/template-package/primitives";
import { createResolvedRenderTree } from "../../src/template-package/resolved";

export async function benchmarkPrimitiveResolution(bytes, sourceName, iterations = 250) {
  const array = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const buffer = array.buffer.slice(array.byteOffset, array.byteOffset + array.byteLength);
  const result = await runTemplatePackageImportPipeline({
    format: "zip",
    buffer,
    sourceName,
    assetStorage: {
      async put(hash) {
        return { storageKey: `primitive-performance:${hash}`, stableUrl: `blob:primitive-performance/${hash}` };
      },
    },
  });
  if (!result.package || !result.validation?.valid) throw new Error(`Cannot benchmark invalid fixture ${sourceName}.`);
  const packageValue = result.package;
  const nodes = Object.values(packageValue.nodes);
  const resolveAll = () => nodes.map((node) => resolvePrimitiveAppearance(node, {
    packageId: packageValue.packageId,
    rootNodeId: packageValue.rootNodeId,
  }));
  const gradientNodes = nodes.filter((node) => node.appearance.fills.some((paint) => paint.type === "GRADIENT_LINEAR"));
  const orderedSolidNodes = nodes.filter((node) =>
    node.appearance.fills.length >= 2 && node.appearance.fills.every((paint) => paint.type === "SOLID")
  );
  const resolveGradients = () => gradientNodes.map((node) => resolvePrimitiveAppearance(node, {
    packageId: packageValue.packageId,
    rootNodeId: packageValue.rootNodeId,
  }));
  for (let index = 0; index < 10; index += 1) resolveAll();
  const heapBefore = process.memoryUsage().heapUsed;
  const started = performance.now();
  let final = [];
  for (let index = 0; index < iterations; index += 1) final = resolveAll();
  const durationMs = performance.now() - started;
  for (let index = 0; index < 10; index += 1) resolveGradients();
  const gradientStarted = performance.now();
  let finalGradients = [];
  for (let index = 0; index < iterations; index += 1) finalGradients = resolveGradients();
  const gradientDurationMs = performance.now() - gradientStarted;
  const treeIterations = 25;
  const treeStarted = performance.now();
  for (let index = 0; index < treeIterations; index += 1) createResolvedRenderTree(packageValue);
  const treeDurationMs = performance.now() - treeStarted;
  const heapAfter = process.memoryUsage().heapUsed;
  return {
    packageId: packageValue.packageId,
    nodeCount: nodes.length,
    iterations,
    totalNodeResolutions: nodes.length * iterations,
    combinedResolutionMs: durationMs,
    averagePerTreeMs: durationMs / iterations,
    averagePerNodeMs: durationMs / (nodes.length * iterations),
    gradientNodeCount: gradientNodes.length,
    gradientResolutionMs: gradientDurationMs,
    averagePerGradientNodeMs: gradientNodes.length ? gradientDurationMs / (gradientNodes.length * iterations) : 0,
    authoritativeGradientNodeCount: finalGradients.filter((entry) => entry.paints.layers.some((paint) => paint.capability === "source-certified-linear-gradient")).length,
    orderedSolidNodeCount: orderedSolidNodes.length,
    authoritativeOrderedSolidNodeCount: final.filter((entry) => entry.paints.orderedSolidStack?.runtimeOwner === "svg-ordered-solid-stack").length,
    resolvedTreeAverageMs: treeDurationMs / treeIterations,
    authoritativeNodeCount: final.filter((entry) => entry.ownership === "primitive-authoritative").length,
    compatibilityNodeCount: final.filter((entry) => entry.ownership === "compatibility-authoritative").length,
    paintEntryCount: final.reduce((sum, entry) => sum + entry.paints.layers.length, 0),
    strokeEntryCount: final.reduce((sum, entry) => sum + entry.strokes.layers.length, 0),
    heapDeltaBytes: heapAfter - heapBefore,
  };
}
