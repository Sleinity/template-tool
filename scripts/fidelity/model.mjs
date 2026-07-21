import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "vite";
import { repoRoot, sha256 } from "./core.mjs";

let modelPromise = null;

async function compileModel() {
  const outDir = join(tmpdir(), `renderer-fidelity-model-${process.pid}`);
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  await build({
    root: repoRoot,
    configFile: false,
    logLevel: "silent",
    ssr: { noExternal: true },
    build: {
      ssr: join(repoRoot, "scripts", "fidelity", "model-entry.mjs"),
      outDir,
      emptyOutDir: true,
      minify: false,
      rollupOptions: { output: { entryFileNames: "model.mjs" } },
    },
  });
  return { module: await import(`${pathToFileURL(join(outDir, "model.mjs")).href}?${Date.now()}`), outDir };
}

export async function resolveModel(verifiedFixture) {
  modelPromise ??= compileModel();
  const compiled = await modelPromise;
  const model = await compiled.module.resolveFixtureModel(new Uint8Array(verifiedFixture.bytes), verifiedFixture.fixture.filename);
  return { ...model, modelHash: sha256(JSON.stringify(model)) };
}

export function mergeStructuralReport({ fixture, fixtureHash, surface, route, mode, model, browser, runId, timings }) {
  const browserNodes = new Map((browser.nodes ?? []).map((node) => [node.id, node]));
  const nodes = model.tree.nodeOrder.map((id, order) => {
    const resolved = model.tree.nodes[id];
    const measured = browserNodes.get(id) ?? {};
    return {
      id,
      order,
      name: resolved.name,
      type: resolved.type,
      parentId: resolved.parentId,
      bounds: measured.bounds ?? resolved.bounds.relative,
      resolvedBounds: resolved.bounds,
      exportedBounds: resolved.exportedBounds,
      layoutMode: resolved.layout.mode,
      sizingRoles: resolved.layout.roles,
      positioningRole: resolved.renderPositioning,
      transform: measured.transform ?? resolved.transform.linearMatrix,
      textContentHash: resolved.text ? sha256(resolved.text.characters) : null,
      textMeasurement: resolved.text ? (measured.textMeasurement ?? null) : null,
      textGeometry: resolved.text ? (measured.textGeometry ?? null) : null,
      font: resolved.text ? {
        family: resolved.text.fontFamily,
        cssFamily: measured.fontIdentity?.binaryHash ? measured.fontIdentity.computedFamily : resolved.text.cssFontFamily,
        weight: measured.fontIdentity?.binaryHash ? measured.fontIdentity.weight : resolved.text.fontWeight,
        style: measured.fontIdentity?.binaryHash ? measured.fontIdentity.style : resolved.text.fontStyle,
        status: measured.fontIdentity?.binaryHash && measured.fontIdentity.fontState === "exact" ? "loaded" : resolved.text.fontStatus,
        fallbackFamily: resolved.text.fallbackFamily,
        ready: measured.fontReady ?? null,
        ...(measured.fontIdentity?.binaryHash ? {
          requestedFamily: measured.fontIdentity.requestedFamily,
          runtimeFamily: measured.fontIdentity.runtimeFamily,
          binaryHash: measured.fontIdentity.binaryHash,
          faceIndex: measured.fontIdentity.faceIndex,
          classification: measured.fontIdentity.classification,
          fontState: measured.fontIdentity.fontState,
          paintRuns: measured.fontIdentity.paintRuns,
          paintRangeWidths: measured.fontIdentity.paintRangeWidths,
        } : {}),
      } : null,
      imageAssetId: resolved.image?.assetId ?? null,
      imageIntrinsicDimensions: resolved.image?.assetWidth && resolved.image?.assetHeight ? { width: resolved.image.assetWidth, height: resolved.image.assetHeight } : null,
      imageSlot: resolved.image ? (measured.bounds ?? resolved.bounds.relative) : null,
      imagePlacement: resolved.image ? measured.imagePlacement ?? {
        schemaVersion: resolved.image.placement?.schemaVersion ?? null,
        fit: resolved.image.objectFit,
        scaleMode: resolved.image.scaleMode,
        activePlacementState: resolved.image.activePlacementState,
        placementRevision: resolved.image.placementRevision,
        renderMode: resolved.image.renderMode,
        cropMode: resolved.image.cropMode,
        focalPoint: resolved.image.focalPoint,
        zoom: resolved.image.cropZoom,
        objectPosition: resolved.image.objectPosition,
        transform: resolved.image.transformMatrix,
        transformApplicability: resolved.image.placement?.transformApplicability ?? null,
        coordinateSpace: resolved.image.placement?.coordinateSpace ?? null,
        sampling: resolved.image.placement?.sampling?.backend ?? null,
      } : null,
      maskPlacement: measured.maskPlacement ?? null,
      primitiveAppearance: measured.primitiveAppearance ?? {
        schemaVersion: resolved.primitiveAppearance.schemaVersion,
        ownership: resolved.primitiveAppearance.ownership,
        backend: resolved.primitiveAppearance.backend,
        sourceRevision: resolved.primitiveAppearance.sourceRevision,
        geometryRevision: resolved.primitiveAppearance.geometryRevision,
        kind: resolved.primitiveAppearance.geometry.kind,
        requestedCorners: resolved.primitiveAppearance.geometry.corner.requested,
        effectiveCorners: resolved.primitiveAppearance.geometry.corner.effective,
        cornerNormalizationScale: resolved.primitiveAppearance.geometry.corner.normalizationScale,
        cornerNormalizationScales: resolved.primitiveAppearance.geometry.corner.normalizationScales,
        cornerClampReason: resolved.primitiveAppearance.geometry.corner.clampReason,
        ancestorClipChain: resolved.primitiveAppearance.geometry.ancestorClipChain,
        paintOrder: resolved.primitiveAppearance.paints.layers.map((layer) => `${layer.sourceIndex}:${layer.type}:${layer.role}`).join(","),
        strokeOrder: resolved.primitiveAppearance.strokes.layers.map((layer) => `${layer.sourceIndex}:${layer.type}:${layer.alignment ?? "UNKNOWN"}`).join(","),
        strokeStrategy: resolved.primitiveAppearance.strokes.renderStrategy,
        strokeGeometry: resolved.primitiveAppearance.strokes.routedLayerIndex === null
          ? null
          : resolved.primitiveAppearance.strokes.layers.find(
              (layer) => layer.sourceIndex === resolved.primitiveAppearance.strokes.routedLayerIndex,
          ) ?? null,
        linearGradient: resolved.primitiveAppearance.paints.routedLayerIndex === null
          ? null
          : resolved.primitiveAppearance.paints.layers.find(
              (layer) => layer.sourceIndex === resolved.primitiveAppearance.paints.routedLayerIndex,
            )?.linearGradient ?? null,
        orderedSolidStack: resolved.primitiveAppearance.paints.orderedSolidStack ?? null,
        orderedNormalPaintStack: resolved.primitiveAppearance.paints.orderedNormalPaintStack ?? null,
        fallbacks: resolved.primitiveAppearance.fallbackReasons,
      },
      clipOrMaskStrategy: measured.clipOrMaskStrategy ?? (resolved.appearance.clipContent ? "clip-content" : null),
      renderStrategy: measured.dataAttributes?.["data-package-render-strategy"] ?? resolved.renderStrategy,
      fallbackReason: measured.dataAttributes?.["data-package-render-strategy"] === "asset"
        ? null
        : resolved.fallbackReason,
      diagnostics: resolved.fidelityDiagnostics,
      dataAttributes: measured.dataAttributes ?? {},
    };
  });
  return {
    schemaVersion: 1,
    fixtureId: fixture.id,
    fixtureHashes: { zipSha256: fixtureHash, embeddedPreviewSha256: fixture.embeddedPreview?.sha256 ?? null, modelSha256: model.modelHash },
    surface,
    route,
    rendererMode: mode,
    runId,
    captureTimestamp: new Date().toISOString(),
    rootDimensions: model.tree.canvas,
    packageVersion: model.package.schemaVersion,
    resolvedTreeVersion: model.tree.schemaVersion,
    rootNodeId: model.tree.rootNodeId,
    nodeCount: nodes.length,
    orderedNodeIds: model.tree.nodeOrder,
    nodes,
    rendererFallbacks: nodes.filter((node) => node.renderStrategy === "fallback" || node.fallbackReason).map((node) => ({ id: node.id, reason: node.fallbackReason })),
    diagnostics: model.tree.fidelityDiagnostics,
    warnings: model.tree.warnings,
    runtimeRouting: browser.runtimeRouting ?? null,
    backendRouting: browser.backendRouting ?? null,
    productRenderIdentity: browser.productRenderIdentity ?? null,
    fontReadiness: browser.fontReadiness,
    assetReadiness: browser.assetReadiness,
    timings,
  };
}
