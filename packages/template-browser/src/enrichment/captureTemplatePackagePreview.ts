import { toPng } from "html-to-image";
import {
  createResolvedRenderTree,
  type FontReadinessReport,
  type TemplatePackageV1,
} from "@sleinity/template-core";
import {
  createTemplatePackageFontEmbedCss,
  prepareTemplatePackageFonts,
} from "../fonts";

export interface TemplatePackagePreviewCapture {
  pngDataUrl: string;
  fontReadiness: FontReadinessReport;
}

export interface TemplatePackagePngCaptureTelemetry {
  schemaVersion: "template-package-png-capture-telemetry-v1";
  revision: string;
  mediaNodeCount: number;
  mediaReadiness: Array<{
    nodeId: string;
    assetId: string | null;
    activePlacementState: string | null;
    placementRevision: string | null;
    renderMode: string | null;
    source: string | null;
    complete: boolean;
    naturalWidth: number;
    naturalHeight: number;
    decode: "complete" | "failed" | "unavailable";
  }>;
  browserPaintReadiness: "not-required" | "revision-current-raster-warmup" | "revision-already-primed";
  rasterWarmupApplied: boolean;
  mediaReadinessMs: number;
  rasterWarmupMs: number;
  finalRasterMs: number;
}

type CaptureElement = HTMLElement & {
  __packagePngCaptureTelemetry?: TemplatePackagePngCaptureTelemetry;
};

type Rasterize = typeof toPng;

export function createPngRasterReadinessTracker() {
  const readyRevisionByNode = new WeakMap<object, string>();
  return {
    needsWarmup(node: object, revision: string, required: boolean): boolean {
      return required && readyRevisionByNode.get(node) !== revision;
    },
    markReady(node: object, revision: string): void {
      readyRevisionByNode.set(node, revision);
    },
  };
}

const rasterReadiness = createPngRasterReadinessTracker();

function captureRenderer(node: HTMLElement): HTMLElement | null {
  return node.matches("[data-template-package-canvas]")
    ? node
    : node.querySelector<HTMLElement>("[data-template-package-canvas]");
}

function imageSourceFromBackground(value: string): string | null {
  const match = value.match(/^url\(["']?(.*?)["']?\)$/);
  return match?.[1] ?? null;
}

function stableCaptureHash(value: unknown): string {
  const input = JSON.stringify(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

async function decodeImageSource(source: string): Promise<{
  complete: boolean;
  naturalWidth: number;
  naturalHeight: number;
  decode: "complete" | "failed" | "unavailable";
}> {
  if (typeof Image === "undefined") {
    return { complete: true, naturalWidth: 0, naturalHeight: 0, decode: "unavailable" };
  }
  const image = new Image();
  if (/^https?:\/\//i.test(source)) image.crossOrigin = "anonymous";
  image.src = source;
  let decode: "complete" | "failed" | "unavailable" = "unavailable";
  if (typeof image.decode === "function") {
    try {
      await image.decode();
      decode = "complete";
    } catch {
      decode = "failed";
    }
  } else if (!image.complete) {
    await new Promise<void>((resolve) => {
      image.onload = () => resolve();
      image.onerror = () => resolve();
    });
  }
  if (!image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0) {
    throw new Error("A renderer media source was not decoded before PNG capture.");
  }
  return {
    complete: image.complete,
    naturalWidth: image.naturalWidth,
    naturalHeight: image.naturalHeight,
    decode,
  };
}

async function waitForCurrentMediaReadiness(node: HTMLElement) {
  const renderer = captureRenderer(node);
  if (!renderer) return [];
  const targets = Array.from(
    renderer.querySelectorAll<HTMLElement>("[data-package-image-asset]"),
  );
  return Promise.all(targets.map(async (target) => {
    const style = getComputedStyle(target);
    const backgroundSource = imageSourceFromBackground(style.backgroundImage);
    const image = target.querySelector<HTMLImageElement>("img[src]");
    const source = backgroundSource ?? image?.currentSrc ?? image?.src ?? null;
    const decoded = source
      ? await decodeImageSource(source)
      : { complete: false, naturalWidth: 0, naturalHeight: 0, decode: "unavailable" as const };
    return {
      nodeId: target.dataset.packageNodeId ?? "unknown",
      assetId: target.dataset.packageImageAsset ?? null,
      activePlacementState: target.dataset.packageImageActiveState ?? null,
      placementRevision: target.dataset.packageImagePlacementRevision ?? null,
      renderMode: target.dataset.packageImageRenderMode ?? null,
      source,
      ...decoded,
    };
  }));
}

function createRasterReadinessRevision(
  node: HTMLElement,
  packageValue: TemplatePackageV1,
  mediaReadiness: TemplatePackagePngCaptureTelemetry["mediaReadiness"],
): string {
  const renderer = captureRenderer(node);
  const runtimeTelemetry = (renderer as (HTMLElement & {
    __packageRuntimeTelemetry?: {
      backendDecisionRevision?: string | null;
      productRenderIdentity?: { identityId?: string; resolvedRevision?: string } | null;
    };
  }) | null)?.__packageRuntimeTelemetry;
  const mediaGeometry = Array.from(
    renderer?.querySelectorAll<HTMLElement>("[data-package-image-asset]") ?? [],
  ).map((target) => {
    const rect = target.getBoundingClientRect();
    const style = getComputedStyle(target);
    return {
      nodeId: target.dataset.packageNodeId ?? null,
      assetId: target.dataset.packageImageAsset ?? null,
      activePlacementState: target.dataset.packageImageActiveState ?? null,
      placementRevision: target.dataset.packageImagePlacementRevision ?? null,
      renderMode: target.dataset.packageImageRenderMode ?? null,
      scaleMode: target.dataset.packageImageScaleMode ?? null,
      placementStrategy: target.dataset.packageImagePlacementStrategy ?? null,
      destinationBounds: target.dataset.packageImageDestinationBounds ?? null,
      visibleSourceRect: target.dataset.packageImageVisibleSourceRect ?? null,
      bounds: [rect.x, rect.y, rect.width, rect.height],
      backgroundSize: style.backgroundSize,
      backgroundPosition: style.backgroundPosition,
      transform: style.transform,
    };
  });
  return stableCaptureHash({
    packageId: packageValue.packageId,
    canvas: packageValue.canvas,
    settlementRevision: renderer?.dataset.packageSettlementRevision ?? null,
    settlementId: renderer?.dataset.packageSettlementId ?? null,
    primitiveTreeRevision: renderer?.dataset.packagePrimitiveTreeRevision ?? null,
    backendDecisionRevision: runtimeTelemetry?.backendDecisionRevision ?? null,
    productRenderIdentity: runtimeTelemetry?.productRenderIdentity?.identityId ?? null,
    productResolvedRevision: runtimeTelemetry?.productRenderIdentity?.resolvedRevision ?? null,
    media: mediaReadiness.map(({ source: _source, ...entry }) => entry),
    mediaGeometry,
  });
}

export function createTemplatePackageCaptureOptions(
  packageValue: Pick<TemplatePackageV1, "canvas">,
  fontEmbedCSS?: string,
) {
  return {
    width: packageValue.canvas.width,
    height: packageValue.canvas.height,
    canvasWidth: packageValue.canvas.width,
    canvasHeight: packageValue.canvas.height,
    pixelRatio: 1,
    // Managed assets use content-addressed blob URLs. Appending a cache-busting
    // query makes those object URLs invalid inside html-to-image.
    cacheBust: false,
    ...(fontEmbedCSS ? { fontEmbedCSS } : {}),
    skipAutoScale: true,
    style: {
      transform: "none",
      transformOrigin: "top left",
    },
  } as const;
}

export async function waitForCurrentRuntimeSettlement(node: HTMLElement): Promise<void> {
  const renderer = captureRenderer(node);
  if (!renderer || renderer.dataset.packageRuntimeRouting !== "authoritative") return;
  if (renderer.dataset.packageSettlementReadiness === "unsupported" || renderer.dataset.packageRoutedNodeCount === "0") return;
  let previousIdentity = "";
  let stableFrames = 0;
  for (let frame = 0; frame < 120; frame += 1) {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const readiness = renderer.dataset.packageSettlementReadiness;
    const identity = `${renderer.dataset.packageSettlementRevision ?? ""}|${renderer.dataset.packageSettlementId ?? ""}`;
    stableFrames = readiness === "ready" && identity && identity === previousIdentity ? stableFrames + 1 : 0;
    previousIdentity = identity;
    if (stableFrames >= 2) return;
  }
  throw new Error(`Renderer settlement is stale or unready (${renderer.dataset.packageSettlementReadiness ?? "missing"}).`);
}

export async function captureTemplatePackagePreview(
  node: HTMLElement,
  packageValue: TemplatePackageV1,
  dependencies: { rasterize?: Rasterize } = {},
): Promise<TemplatePackagePreviewCapture> {
  const rasterize = dependencies.rasterize ?? toPng;
  const resolvedTree = createResolvedRenderTree(packageValue);
  const fontReadiness = await prepareTemplatePackageFonts(
    packageValue,
    resolvedTree,
    document.fonts,
  );
  await document.fonts?.ready;
  await waitForCurrentRuntimeSettlement(node);
  const mediaReadinessStarted = performance.now();
  const mediaReadiness = await waitForCurrentMediaReadiness(node);
  const mediaReadinessMs = performance.now() - mediaReadinessStarted;
  const fontEmbedCSS = await createTemplatePackageFontEmbedCss(packageValue);
  const captureOptions = createTemplatePackageCaptureOptions(packageValue, fontEmbedCSS);
  const revision = createRasterReadinessRevision(node, packageValue, mediaReadiness);
  const requiresRasterWarmup = mediaReadiness.some(
    (entry) => entry.source && entry.renderMode !== "figma-image-transform",
  );
  const rasterWarmupRequired = rasterReadiness.needsWarmup(
    node,
    revision,
    requiresRasterWarmup,
  );
  let rasterWarmupMs = 0;
  if (rasterWarmupRequired) {
    const rasterWarmupStarted = performance.now();
    // Chromium's first foreignObject raster for a newly settled CSS-background
    // media revision can differ from later paints even after decode and geometry
    // readiness. Treat one completed, discarded raster as the browser-paint
    // readiness boundary; the next raster is the export candidate.
    await rasterize(node, captureOptions);
    rasterWarmupMs = performance.now() - rasterWarmupStarted;
  }
  const finalRasterStarted = performance.now();
  const pngDataUrl = await rasterize(node, captureOptions);
  const finalRasterMs = performance.now() - finalRasterStarted;
  rasterReadiness.markReady(node, revision);
  const telemetry: TemplatePackagePngCaptureTelemetry = {
    schemaVersion: "template-package-png-capture-telemetry-v1",
    revision,
    mediaNodeCount: mediaReadiness.length,
    mediaReadiness,
    browserPaintReadiness: requiresRasterWarmup
      ? rasterWarmupRequired
        ? "revision-current-raster-warmup"
        : "revision-already-primed"
      : "not-required",
    rasterWarmupApplied: rasterWarmupRequired,
    mediaReadinessMs,
    rasterWarmupMs,
    finalRasterMs,
  };
  Object.defineProperty(node as CaptureElement, "__packagePngCaptureTelemetry", {
    configurable: true,
    value: telemetry,
  });
  return { pngDataUrl, fontReadiness };
}
