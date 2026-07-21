import { captureTemplatePackagePreview } from "../enrichment/captureTemplatePackagePreview";
import {
  createResolvedRenderTree,
  type FontFaceSetLike,
  type FontReadinessReport,
  type ResolvedRenderTreeV1,
} from "../resolved";
import type { TemplatePackageV1 } from "../types";
import {
  checkPackageJpgExportReadiness,
  type PackageExportReadinessResult,
} from "./packageExportReadiness";

export interface PackagePngExportDiagnostic {
  code: string;
  severity: "warning" | "error";
  message: string;
  target?: string;
}

export class PackagePngExportError extends Error {
  diagnostics: PackagePngExportDiagnostic[];

  constructor(message: string, diagnostics: PackagePngExportDiagnostic[] = []) {
    super(message);
    this.name = "PackagePngExportError";
    this.diagnostics = diagnostics;
  }
}

export interface PackagePngExportRequest {
  packageValue: TemplatePackageV1;
  node: HTMLElement;
  renderMode: "static" | "editor";
  templateName?: string;
  now?: Date;
  fontSet?: FontFaceSetLike | null;
  onProgress?: (message: string) => void;
}

export interface PackagePngExportResult {
  filename: string;
  pngDataUrl: string;
  width: number;
  height: number;
  readiness: PackageExportReadinessResult;
  fontReadiness: FontReadinessReport;
  diagnostics: PackagePngExportDiagnostic[];
}

interface PackagePngExportDependencies {
  checkReadiness?: typeof checkPackageJpgExportReadiness;
  waitForAssets?: typeof waitForTemplatePackageAssets;
  capture?: typeof captureTemplatePackagePreview;
  download?: typeof downloadPngDataUrl;
}

const INVALID_FILENAME_CHARACTERS = /[<>:"/\\|?*\u0000-\u001F]/g;

export function sanitizePngExportFilename(
  name: string | null | undefined,
  now = new Date(),
): string {
  const date = now.toISOString().slice(0, 10);
  const base = (name || "template-export")
    .trim()
    .toLowerCase()
    .replace(INVALID_FILENAME_CHARACTERS, " ")
    .replace(/[^a-z0-9._ -]+/g, " ")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "");
  return `${base || "template-export"}-${date}.png`;
}

function readinessIssuesToDiagnostics(
  readiness: PackageExportReadinessResult,
): PackagePngExportDiagnostic[] {
  return readiness.issues.map((issue) => ({
    code: issue.code,
    severity: issue.severity,
    message: issue.message,
    target: issue.assetId,
  }));
}

function collectRenderableAssetSources(
  tree: ResolvedRenderTreeV1,
): Array<{ source: string; target: string }> {
  const sources = new Map<string, string>();
  Object.values(tree.nodes).forEach((node) => {
    const imageSource = node.image?.source;
    const vectorSource = node.vector?.source;
    if (imageSource) sources.set(imageSource, node.image?.assetId ?? node.id);
    if (vectorSource) sources.set(vectorSource, node.vector?.assetId ?? node.id);
  });
  return Array.from(sources, ([source, target]) => ({ source, target }));
}

function shouldUseCrossOrigin(source: string): boolean {
  return /^https?:\/\//i.test(source);
}

async function waitForImageSource(
  source: string,
  target: string,
  timeoutMs = 15000,
): Promise<PackagePngExportDiagnostic | null> {
  if (typeof Image === "undefined") return null;
  return new Promise((resolve) => {
    const image = new Image();
    let settled = false;
    const complete = (diagnostic: PackagePngExportDiagnostic | null) => {
      if (settled) return;
      settled = true;
      globalThis.clearTimeout(timer);
      resolve(diagnostic);
    };
    const timer = globalThis.setTimeout(
      () =>
        complete({
          code: "export.asset-load-timeout",
          severity: "error",
          message: "An image or SVG asset did not finish loading before export.",
          target,
        }),
      timeoutMs,
    );
    image.onload = () => {
      if (typeof image.decode === "function") {
        void image.decode().then(
          () => complete(null),
          () => complete(null),
        );
        return;
      }
      complete(null);
    };
    image.onerror = () =>
      complete({
        code: "export.asset-load-failed",
        severity: "error",
        message: "An image or SVG asset failed to load before export.",
        target,
      });
    if (shouldUseCrossOrigin(source)) image.crossOrigin = "anonymous";
    image.src = source;
    if (image.complete && image.naturalWidth > 0) complete(null);
  });
}

export async function waitForTemplatePackageAssets(
  root: HTMLElement,
  packageValue: TemplatePackageV1,
  tree = createResolvedRenderTree(packageValue),
): Promise<PackagePngExportDiagnostic[]> {
  const sources = new Map<string, string>();
  collectRenderableAssetSources(tree).forEach(({ source, target }) => {
    sources.set(source, target);
  });
  root.querySelectorAll("img[src]").forEach((image) => {
    const source = image.getAttribute("src");
    if (source) sources.set(source, image.getAttribute("data-package-node-id") ?? "img");
  });
  const diagnostics = await Promise.all(
    Array.from(sources, ([source, target]) =>
      waitForImageSource(source, target),
    ),
  );
  return diagnostics.filter(
    (diagnostic): diagnostic is PackagePngExportDiagnostic =>
      Boolean(diagnostic),
  );
}

export function downloadPngDataUrl(filename: string, dataUrl: string): void {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export async function exportTemplatePackagePng(
  request: PackagePngExportRequest,
  dependencies: PackagePngExportDependencies = {},
): Promise<PackagePngExportResult> {
  const checkReadiness =
    dependencies.checkReadiness ?? checkPackageJpgExportReadiness;
  const waitForAssets =
    dependencies.waitForAssets ?? waitForTemplatePackageAssets;
  const capture = dependencies.capture ?? captureTemplatePackagePreview;
  const download = dependencies.download ?? downloadPngDataUrl;

  request.onProgress?.("Checking fonts and assets…");
  const readiness = await checkReadiness(
    {
      format: "png",
      packageValue: request.packageValue,
      renderMode: request.renderMode,
    },
    request.fontSet,
  );
  if (!readiness.ready) {
    throw new PackagePngExportError(
      "Export is blocked by package, font, or asset readiness issues.",
      readinessIssuesToDiagnostics(readiness).filter(
        (item) => item.severity === "error",
      ),
    );
  }

  request.onProgress?.("Loading images and SVGs…");
  const tree = createResolvedRenderTree(request.packageValue);
  const assetDiagnostics = await waitForAssets(
    request.node,
    request.packageValue,
    tree,
  );
  const assetErrors = assetDiagnostics.filter(
    (item) => item.severity === "error",
  );
  if (assetErrors.length) {
    throw new PackagePngExportError(
      "Export failed because one or more assets could not be loaded.",
      assetErrors,
    );
  }

  request.onProgress?.("Rendering full-resolution PNG…");
  const captureResult = await capture(request.node, request.packageValue);
  const filename = sanitizePngExportFilename(
    request.templateName ?? request.packageValue.name,
    request.now,
  );

  request.onProgress?.("Downloading PNG…");
  download(filename, captureResult.pngDataUrl);

  return {
    filename,
    pngDataUrl: captureResult.pngDataUrl,
    width: request.packageValue.canvas.width,
    height: request.packageValue.canvas.height,
    readiness,
    fontReadiness: captureResult.fontReadiness,
    diagnostics: [
      ...readinessIssuesToDiagnostics(readiness).filter(
        (item) => item.severity === "warning",
      ),
      ...assetDiagnostics,
    ],
  };
}
