import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { comparePng, writeDifferenceImage } from "./image.mjs";
import { artifactDirectory, stableStringify } from "./core.mjs";
import { mergeStructuralReport } from "./model.mjs";
import { exactFontForRequirement } from "./fonts.mjs";

const remotionChromium = join(process.cwd(), "node_modules", ".remotion", "chrome-headless-shell", "mac-arm64", "chrome-headless-shell-mac-arm64", "chrome-headless-shell");

export async function launchBrowser(headed) {
  if (headed) return process.env.FIDELITY_BROWSER_CHANNEL
    ? chromium.launch({ headless: false, channel: process.env.FIDELITY_BROWSER_CHANNEL })
    : chromium.launch({ headless: false });
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || (existsSync(remotionChromium) ? remotionChromium : undefined);
  return chromium.launch({ headless: true, executablePath });
}

export async function waitForCurrentReadiness(page, canvasSelector) {
  await page.locator(canvasSelector).waitFor({ state: "visible" });
  await page.waitForFunction((selector) => {
    const canvas = document.querySelector(selector);
    return canvas &&
      canvas.getAttribute("data-resolved-render-tree") &&
      canvas.getAttribute("data-resolved-render-tree") !== "package-fallback" &&
      canvas.getAttribute("data-package-product-render-identity");
  }, canvasSelector);
  const started = performance.now();
  const report = await page.evaluate(async (selector) => {
    await document.fonts?.ready;
    const canvas = document.querySelector(selector);
    if (!canvas) throw new Error(`Renderer canvas not found: ${selector}`);
    const images = [...canvas.querySelectorAll("img")];
    await Promise.all(images.map(async (image) => {
      if (image.complete && image.naturalWidth > 0) return;
      try { await image.decode(); } catch { /* surfaced in readiness report */ }
    }));
    const backgrounds = [...canvas.querySelectorAll("*")].flatMap((element) => {
      const match = getComputedStyle(element).backgroundImage.match(/url\(["']?([^"')]+)["']?\)/);
      return match?.[1] ? [match[1]] : [];
    });
    const backgroundResults = await Promise.all(backgrounds.map(async (url) => {
      try { const response = await fetch(url); return { url, ready: response.ok }; } catch { return { url, ready: false }; }
    }));
    const sample = () => [...canvas.querySelectorAll("[data-package-node-id]")].map((element) => {
      const rect = element.getBoundingClientRect();
      return `${element.getAttribute("data-package-node-id")}:${rect.x.toFixed(3)}:${rect.y.toFixed(3)}:${rect.width.toFixed(3)}:${rect.height.toFixed(3)}`;
    }).join("|");
    let previous = "";
    let stableFrames = 0;
    let frames = 0;
    while (stableFrames < 3 && frames < 120) {
      await new Promise((resolve) => requestAnimationFrame(() => resolve()));
      const current = sample();
      stableFrames = current === previous ? stableFrames + 1 : 0;
      previous = current;
      frames += 1;
    }
    const fonts = document.fonts ? [...document.fonts].map((font) => ({ family: font.family, style: font.style, weight: font.weight, stretch: font.stretch, status: font.status })) : [];
    return {
      stable: stableFrames >= 3,
      framesObserved: frames,
      fontReadiness: { status: document.fonts?.status ?? "unsupported", fonts },
      assetReadiness: {
        images: images.map((image) => ({ src: image.currentSrc || image.src, complete: image.complete, width: image.naturalWidth, height: image.naturalHeight, ready: image.complete && image.naturalWidth > 0 })),
        backgrounds: backgroundResults,
      },
    };
  }, canvasSelector);
  report.durationMs = performance.now() - started;
  if (!report.stable) throw new Error(`Renderer geometry did not stabilize within ${report.framesObserved} animation frames.`);
  return report;
}

export async function browserStructure(page, canvasSelector) {
  return page.evaluate((selector) => {
    const canvas = document.querySelector(selector);
    if (!canvas) throw new Error(`Renderer canvas not found: ${selector}`);
    const canvasRect = canvas.getBoundingClientRect();
    const logicalWidth = Number.parseFloat(getComputedStyle(canvas).width) || canvasRect.width;
    const logicalHeight = Number.parseFloat(getComputedStyle(canvas).height) || canvasRect.height;
    const scaleX = canvasRect.width / logicalWidth || 1;
    const scaleY = canvasRect.height / logicalHeight || 1;
    const nodes = [...canvas.querySelectorAll("[data-package-node-id]")].map((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const text = element.textContent ?? "";
      const dataAttributes = Object.fromEntries([...element.attributes].filter((attribute) => attribute.name.startsWith("data-package-")).map((attribute) => [attribute.name, attribute.value]));
      const pair = (name) => {
        const values = element.getAttribute(name)?.split(",").map(Number);
        return values?.length === 2 && values.every(Number.isFinite)
          ? { width: values[0], height: values[1] }
          : null;
      };
      const trimAuthoritative = element.getAttribute("data-package-text-trim-authority") === "authoritative";
      const fontMetrics = JSON.parse(element.getAttribute("data-package-text-font-metrics") || "null");
      const glyphOrigin = JSON.parse(element.getAttribute("data-package-text-glyph-origin") || "null");
      const jsonAttribute = (name) => {
        try { return JSON.parse(element.getAttribute(name) || "null"); } catch { return null; }
      };
      const relativeBox = (target) => {
        if (!target) return null;
        const targetRect = target.getBoundingClientRect();
        return {
          x: (targetRect.left - rect.left) / scaleX,
          y: (targetRect.top - rect.top) / scaleY,
          width: targetRect.width / scaleX,
          height: targetRect.height / scaleY,
        };
      };
      const paintBox = relativeBox(element.querySelector("[data-package-text-paint-box]"));
      const paintElement = element.querySelector("[data-package-text-paint-box]");
      const paintRange = paintElement ? document.createRange() : null;
      if (paintRange && paintElement) paintRange.selectNodeContents(paintElement);
      const paintRangeWidths = paintRange
        ? [...paintRange.getClientRects()].map((item) => item.width / scaleX)
        : [];
      paintRange?.detach();
      const semanticContentBox = relativeBox(element.querySelector("[data-package-text-semantic-content-box]"));
      const firstLineCapTop = Number(fontMetrics?.firstLineCapTop);
      const finalLineBaseline = Number(fontMetrics?.finalLineBaseline);
      const actualFirstCapTopY = paintBox && Number.isFinite(firstLineCapTop)
        ? paintBox.y + firstLineCapTop
        : null;
      const actualFinalBaselineY = paintBox && Number.isFinite(firstLineCapTop) && Number.isFinite(finalLineBaseline)
        ? paintBox.y + firstLineCapTop + finalLineBaseline
        : null;
      const intrinsicParts = (element.getAttribute("data-package-image-intrinsic-size") || "").split("x").map(Number);
      const imageIntrinsic = intrinsicParts.length === 2 && intrinsicParts.every((value) => Number.isFinite(value) && value > 0)
        ? { width: intrinsicParts[0], height: intrinsicParts[1] }
        : null;
      const slot = { width: rect.width / scaleX, height: rect.height / scaleY };
      const scaleMode = element.getAttribute("data-package-image-scale-mode");
      const objectPosition = (element.getAttribute("data-package-image-object-position") || "50% 50%").split(/\s+/).map((value) => Number.parseFloat(value) / 100);
      const focal = { x: Number.isFinite(objectPosition[0]) ? objectPosition[0] : 0.5, y: Number.isFinite(objectPosition[1]) ? objectPosition[1] : 0.5 };
      let measuredImageGeometry = null;
      if (imageIntrinsic && slot.width > 0 && slot.height > 0) {
        const sourceFromRect = (sourceRect) => ({
          normalized: sourceRect,
          pixels: {
            x: sourceRect.x * imageIntrinsic.width,
            y: sourceRect.y * imageIntrinsic.height,
            width: sourceRect.width * imageIntrinsic.width,
            height: sourceRect.height * imageIntrinsic.height,
          },
        });
        const transformApplicability = element.getAttribute("data-package-image-transform-applicability");
        const compatibilityZoom = Number(element.getAttribute("data-package-image-compatibility-crop-zoom") || 1);
        const compatibilityAxis = element.getAttribute("data-package-image-compatibility-crop-axis");
        if (transformApplicability === "compatibility-legacy-fill-transform" && compatibilityZoom > 1 && compatibilityAxis) {
          const width = compatibilityAxis === "width" ? slot.width * compatibilityZoom : slot.height * compatibilityZoom * imageIntrinsic.width / imageIntrinsic.height;
          const height = compatibilityAxis === "height" ? slot.height * compatibilityZoom : slot.width * compatibilityZoom * imageIntrinsic.height / imageIntrinsic.width;
          const x = (slot.width - width) * focal.x;
          const y = (slot.height - height) * focal.y;
          const scaleX = width / imageIntrinsic.width;
          const scaleY = height / imageIntrinsic.height;
          const sourceRect = { x: Math.max(0, -x) / scaleX / imageIntrinsic.width, y: Math.max(0, -y) / scaleY / imageIntrinsic.height, width: Math.min(slot.width, width) / scaleX / imageIntrinsic.width, height: Math.min(slot.height, height) / scaleY / imageIntrinsic.height };
          measuredImageGeometry = { strategy: "compatibility-legacy-fill-transform", destinationBounds: { x, y, width, height }, visibleSourceRect: sourceFromRect(sourceRect), scale: { x: scaleX, y: scaleY }, preservesAspectRatio: Math.abs(scaleX - scaleY) <= Math.max(scaleX, scaleY) * 1e-4 };
        } else if (scaleMode === "FILL" || !["FIT", "STRETCH", "CROP", "TILE"].includes(scaleMode)) {
          const imageScale = Math.max(slot.width / imageIntrinsic.width, slot.height / imageIntrinsic.height);
          const width = imageIntrinsic.width * imageScale;
          const height = imageIntrinsic.height * imageScale;
          const x = (slot.width - width) * focal.x;
          const y = (slot.height - height) * focal.y;
          const sourceRect = {
            x: Math.max(0, -x) / imageScale / imageIntrinsic.width,
            y: Math.max(0, -y) / imageScale / imageIntrinsic.height,
            width: Math.min(slot.width, width) / imageScale / imageIntrinsic.width,
            height: Math.min(slot.height, height) / imageScale / imageIntrinsic.height,
          };
          measuredImageGeometry = { strategy: scaleMode === "FILL" ? "cover" : "fallback-cover", destinationBounds: { x, y, width, height }, visibleSourceRect: sourceFromRect(sourceRect), scale: { x: imageScale, y: imageScale }, preservesAspectRatio: true };
        } else if (scaleMode === "FIT") {
          const imageScale = Math.min(slot.width / imageIntrinsic.width, slot.height / imageIntrinsic.height);
          const width = imageIntrinsic.width * imageScale;
          const height = imageIntrinsic.height * imageScale;
          measuredImageGeometry = { strategy: "contain", destinationBounds: { x: (slot.width - width) * focal.x, y: (slot.height - height) * focal.y, width, height }, visibleSourceRect: sourceFromRect({ x: 0, y: 0, width: 1, height: 1 }), scale: { x: imageScale, y: imageScale }, preservesAspectRatio: true };
        } else if (scaleMode === "STRETCH") {
          measuredImageGeometry = { strategy: "stretch", destinationBounds: { x: 0, y: 0, width: slot.width, height: slot.height }, visibleSourceRect: sourceFromRect({ x: 0, y: 0, width: 1, height: 1 }), scale: { x: slot.width / imageIntrinsic.width, y: slot.height / imageIntrinsic.height }, preservesAspectRatio: Math.abs(slot.width / imageIntrinsic.width - slot.height / imageIntrinsic.height) < 1e-8 };
        } else {
          const child = element.querySelector("[data-package-image-css-transform]");
          measuredImageGeometry = {
            strategy: element.getAttribute("data-package-image-placement-strategy"),
            destinationBounds: relativeBox(child) ?? jsonAttribute("data-package-image-destination-bounds"),
            visibleSourceRect: jsonAttribute("data-package-image-visible-source-rect"),
            scale: null,
            preservesAspectRatio: element.getAttribute("data-package-image-preserves-aspect-ratio") === "true",
          };
        }
      }
      const measuredSourceRect = measuredImageGeometry?.visibleSourceRect?.normalized;
      const measuredCropPercent = measuredSourceRect ? {
        top: measuredSourceRect.y * 100,
        right: (1 - measuredSourceRect.x - measuredSourceRect.width) * 100,
        bottom: (1 - measuredSourceRect.y - measuredSourceRect.height) * 100,
        left: measuredSourceRect.x * 100,
      } : null;
      const rectangularSourcePolygon = measuredSourceRect ? [
        { x: measuredSourceRect.x, y: measuredSourceRect.y },
        { x: measuredSourceRect.x + measuredSourceRect.width, y: measuredSourceRect.y },
        { x: measuredSourceRect.x + measuredSourceRect.width, y: measuredSourceRect.y + measuredSourceRect.height },
        { x: measuredSourceRect.x, y: measuredSourceRect.y + measuredSourceRect.height },
      ] : null;
      const measuredSourcePolygon = scaleMode === "CROP"
        ? jsonAttribute("data-package-image-visible-source-polygon")
        : rectangularSourcePolygon;
      return {
        id: element.getAttribute("data-package-node-id"),
        bounds: { x: (rect.left - canvasRect.left) / scaleX, y: (rect.top - canvasRect.top) / scaleY, width: rect.width / scaleX, height: rect.height / scaleY },
        transform: style.transform === "none" ? null : style.transform,
        textMeasurement: text.trim() ? { width: rect.width / scaleX, height: rect.height / scaleY, scrollWidth: element.scrollWidth, scrollHeight: element.scrollHeight } : null,
        textGeometry: trimAuthoritative ? {
          verticalTrim: element.getAttribute("data-package-text-trim-mode"),
          authority: element.getAttribute("data-package-text-trim-authority"),
          fontState: element.getAttribute("data-package-text-font-state"),
          metricSource: element.getAttribute("data-package-text-metric-source"),
          layoutBox: pair("data-package-text-layout-box"),
          browserLineBox: pair("data-package-text-browser-line-box"),
          trimmedTextBox: pair("data-package-text-trimmed-box"),
          glyphPaintBounds: element.getAttribute("data-package-text-glyph-paint-bounds"),
          clippingBox: pair("data-package-text-clipping-box"),
          clippingActive: element.getAttribute("data-package-text-clipping-active") === "true",
          fontMetrics,
          glyphOrigin,
          paintBox,
          semanticContentBox,
          actualFirstCapTopY,
          actualFinalBaselineY,
          paintOffsetY: Number(element.getAttribute("data-package-text-paint-offset-y") || 0),
          verticalAlignmentMode: element.getAttribute("data-package-text-vertical-alignment-mode"),
          justifyContent: style.justifyContent,
        } : null,
        fontIdentity: text.trim() ? {
          requestedFamily: element.getAttribute("data-package-text-requested-font-family"),
          runtimeFamily: element.getAttribute("data-package-text-runtime-font-family"),
          computedFamily: style.fontFamily,
          binaryHash: element.getAttribute("data-package-text-font-binary-hash"),
          faceIndex: Number(element.getAttribute("data-package-text-font-face-index") || 0),
          classification: element.getAttribute("data-package-text-font-classification"),
          fontState: element.getAttribute("data-package-text-font-state"),
          weight: Number(style.fontWeight),
          style: style.fontStyle,
          paintRuns: [...element.querySelectorAll("[data-package-text-paint-box] span")].map((run) => {
            const runStyle = getComputedStyle(run);
            return {
              characterCount: run.textContent?.length ?? 0,
              family: runStyle.fontFamily,
              weight: runStyle.fontWeight,
              style: runStyle.fontStyle,
            };
          }),
          paintRangeWidths,
        } : null,
        fontReady: text.trim() && document.fonts ? document.fonts.check(`${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`, text.slice(0, 128)) : null,
        imagePlacement: measuredImageGeometry ? {
          ...measuredImageGeometry,
          schemaVersion: element.getAttribute("data-package-image-placement-schema"),
          scaleMode,
          activePlacementState: element.getAttribute("data-package-image-active-state"),
          placementRevision: Number(element.getAttribute("data-package-image-placement-revision") || 0),
          renderMode: element.getAttribute("data-package-image-render-mode"),
          cropMode: element.getAttribute("data-package-image-crop-mode"),
          focalPoint: focal,
          coordinateSpace: element.getAttribute("data-package-image-coordinate-space"),
          transformApplicability: element.getAttribute("data-package-image-transform-applicability"),
          sourceTransform: jsonAttribute("data-package-image-source-transform"),
          transformOrigin: element.getAttribute("data-package-image-transform-origin"),
          sampling: element.getAttribute("data-package-image-sampling"),
          fallbackReason: element.getAttribute("data-package-image-placement-fallback"),
          cropPercent: measuredCropPercent ?? jsonAttribute("data-package-image-crop-percent"),
          visibleSourcePolygon: measuredSourcePolygon ?? jsonAttribute("data-package-image-visible-source-polygon"),
        } : null,
        maskPlacement: element.getAttribute("data-package-mask-relationship") ? {
          relationshipId: element.getAttribute("data-package-mask-relationship"),
          maskRevision: element.getAttribute("data-package-mask-revision"),
          maskSourceId: element.getAttribute("data-package-mask-source-id"),
          maskType: element.getAttribute("data-package-mask-type"),
          capability: element.getAttribute("data-package-mask-capability"),
          renderStrategy: element.getAttribute("data-package-mask-render-strategy"),
          clipInsets: jsonAttribute("data-package-mask-clip-insets"),
          computedClipPath: style.clipPath,
          fallback: element.getAttribute("data-package-mask-fallback"),
        } : null,
        primitiveAppearance: element.getAttribute("data-package-primitive-schema") ? {
          schemaVersion: element.getAttribute("data-package-primitive-schema"),
          ownership: element.getAttribute("data-package-primitive-ownership"),
          backend: element.getAttribute("data-package-primitive-backend"),
          sourceRevision: element.getAttribute("data-package-primitive-source-revision"),
          geometryRevision: element.getAttribute("data-package-primitive-geometry-revision"),
          sourceBounds: jsonAttribute("data-package-primitive-source-bounds"),
          settledBounds: jsonAttribute("data-package-primitive-settled-bounds"),
          clippingBounds: jsonAttribute("data-package-primitive-clipping-bounds"),
          paintRevisions: (element.getAttribute("data-package-primitive-paint-revisions") || "").split(",").filter(Boolean),
          strokeRevisions: (element.getAttribute("data-package-primitive-stroke-revisions") || "").split(",").filter(Boolean),
          kind: element.getAttribute("data-package-primitive-kind"),
          axisAligned: element.getAttribute("data-package-primitive-axis-aligned") === "true",
          requestedCorners: jsonAttribute("data-package-primitive-corner-requested"),
          effectiveCorners: jsonAttribute("data-package-primitive-corner-effective"),
          cornerClamped: element.getAttribute("data-package-primitive-corner-clamped") === "true",
          cornerNormalizationScale: Number(element.getAttribute("data-package-primitive-corner-normalization-scale") || 1),
          cornerNormalizationScales: jsonAttribute("data-package-primitive-corner-normalization-scales"),
          cornerClampReason: element.getAttribute("data-package-primitive-corner-clamp-reason"),
          ancestorClipChain: jsonAttribute("data-package-primitive-ancestor-clip-chain") ?? [],
          paintOrder: element.getAttribute("data-package-primitive-paint-order"),
          paintStrategy: element.getAttribute("data-package-primitive-paint-strategy"),
          orderedSolidStack: jsonAttribute("data-package-ordered-solid-stack"),
          orderedNormalPaintStack: jsonAttribute("data-package-ordered-normal-paint-stack"),
          strokeOrder: element.getAttribute("data-package-primitive-stroke-order"),
          strokeStrategy: element.getAttribute("data-package-primitive-stroke-strategy"),
          strokeGeometry: jsonAttribute("data-package-primitive-stroke-geometry"),
          linearGradient: jsonAttribute("data-package-linear-gradient"),
          fallbacks: (element.getAttribute("data-package-primitive-fallbacks") || "").split(",").filter(Boolean),
          computed: {
            backgroundColor: style.backgroundColor,
            borderRadius: style.borderRadius,
            border: style.border,
            boxShadow: style.boxShadow,
            opacity: style.opacity,
            svgStrategy: element.querySelector(":scope > svg[data-package-primitive-svg]")?.getAttribute("data-package-primitive-svg") ?? null,
            svgFillPath: element.querySelector(":scope > svg [data-package-primitive-svg-fill]")?.getAttribute("d") ?? null,
            svgStrokePath: element.querySelector(":scope > svg [data-package-primitive-svg-stroke]")?.getAttribute("d") ?? null,
            svgGradientDefinition: element.querySelector(":scope > svg [data-package-linear-gradient-definition]")?.getAttribute("data-package-linear-gradient-definition") ?? null,
            svgGradientTransform: element.querySelector(":scope > svg linearGradient")?.getAttribute("gradientTransform") ?? null,
            svgGradientStopCount: element.querySelectorAll(":scope > svg linearGradient stop").length,
            svgOrderedSolidStack: element.querySelector(":scope > svg [data-package-ordered-solid-stack]")?.getAttribute("data-package-ordered-solid-stack") ?? null,
            svgOrderedSolidClip: element.querySelector(":scope > svg [data-package-ordered-solid-clip]")?.getAttribute("data-package-ordered-solid-clip") ?? null,
            svgOrderedSolidGeometryPath: element.querySelector(":scope > svg [data-package-ordered-solid-geometry-path]")?.getAttribute("d") ?? null,
            svgOrderedSolidLayerCount: element.querySelectorAll(":scope > svg [data-package-ordered-solid-layer]").length,
            svgOrderedNormalPaintStack: element.querySelector(":scope > svg [data-package-ordered-normal-paint-stack]")?.getAttribute("data-package-ordered-normal-paint-stack") ?? null,
            svgOrderedNormalPaintClip: element.querySelector(":scope > svg [data-package-ordered-normal-paint-clip]")?.getAttribute("data-package-ordered-normal-paint-clip") ?? null,
            svgOrderedNormalPaintGeometryPath: element.querySelector(":scope > svg [data-package-ordered-normal-paint-geometry-path]")?.getAttribute("d") ?? null,
            svgOrderedNormalPaintLayerCount: element.querySelectorAll(":scope > svg [data-package-ordered-normal-paint-layer]").length,
          },
        } : null,
        clipOrMaskStrategy: element.getAttribute("data-package-mask-fallback") || element.getAttribute("data-package-clip-source") || (style.overflow === "hidden" ? "css-overflow-hidden" : null),
        dataAttributes,
      };
    });
    const developerTelemetry = canvas.__packageRuntimeTelemetry ?? null;
    return {
      canvas: { width: logicalWidth, height: logicalHeight, displayedWidth: canvasRect.width, displayedHeight: canvasRect.height, scaleX, scaleY },
      runtimeRouting: {
        mode: canvas.getAttribute("data-package-runtime-routing"),
        settlementId: canvas.getAttribute("data-package-settlement-id"),
        revision: canvas.getAttribute("data-package-settlement-revision"),
        readiness: canvas.getAttribute("data-package-settlement-readiness"),
        routedNodeCount: Number(canvas.getAttribute("data-package-routed-node-count") || 0),
        compatibilityNodeCount: Number(canvas.getAttribute("data-package-compatibility-node-count") || 0),
        iterationCount: Number(canvas.getAttribute("data-package-settlement-iterations") || 0),
        measurementCount: Number(canvas.getAttribute("data-package-settlement-measurements") || 0),
        recomputedNodeIds: (canvas.getAttribute("data-package-settlement-recomputed") || "").split(",").filter(Boolean),
        fallbacks: canvas.getAttribute("data-package-settlement-fallbacks"),
        settlementMs: developerTelemetry?.settlementMs ?? null,
      },
      backendRouting: {
        decisionRevision: developerTelemetry?.backendDecisionRevision ?? null,
        availability: developerTelemetry?.backendAvailability ?? null,
        decisions: developerTelemetry?.backendDecisions ?? [],
      },
      productRenderIdentity: developerTelemetry?.productRenderIdentity ?? null,
      nodes,
    };
  }, canvasSelector);
}

async function captureRenderer({ page, fixture, model, surface, route, mode, selector, runId, candidateRoot, repeat = 2, consoleMessages, timings }) {
  const directory = artifactDirectory(candidateRoot, runId, fixture.id, surface);
  mkdirSync(directory, { recursive: true });
  const captures = [];
  let previousPng = null;
  for (let index = 1; index <= repeat; index += 1) {
    const readiness = await waitForCurrentReadiness(page, selector);
    const browser = await browserStructure(page, selector);
    browser.fontReadiness = readiness.fontReadiness;
    browser.assetReadiness = readiness.assetReadiness;
    const captureStarted = performance.now();
    const pngPath = join(directory, `capture-${index}.png`);
    await page.locator(selector).screenshot({ path: pngPath, animations: "disabled", caret: "hide", scale: "css" });
    const captureDurationMs = performance.now() - captureStarted;
    const structure = mergeStructuralReport({ fixture, fixtureHash: fixture.zipSha256, surface, route, mode, model, browser, runId, timings: { ...timings, readinessMs: readiness.durationMs, captureMs: captureDurationMs } });
    const structurePath = join(directory, `structure-${index}.json`);
    writeFileSync(structurePath, stableStringify(structure));
    const currentPng = readFileSync(pngPath);
    const pixelRepeat = previousPng ? comparePng(previousPng, currentPng, { threshold: 0.1, allowedChangedPixelPercentage: 0 }) : null;
    if (pixelRepeat) delete pixelRepeat.differenceImage;
    captures.push({ pngPath, structurePath, structure, fontReadiness: readiness.fontReadiness, timings: structure.timings, pixelRepeat });
    previousPng = currentPng;
  }
  await page.screenshot({ path: join(directory, "complete-surface.png"), fullPage: true, animations: "disabled" });
  writeFileSync(join(directory, "browser-console.json"), stableStringify(consoleMessages));
  return captures;
}

async function exportPng(page, directory, index) {
  mkdirSync(directory, { recursive: true });
  const started = performance.now();
  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId("package-export-png-button").click();
  const download = await downloadPromise;
  const path = join(directory, `capture-${index}.png`);
  await download.saveAs(path);
  return { path, durationMs: performance.now() - started, suggestedFilename: download.suggestedFilename() };
}

async function pngExportEvidence(page) {
  return page.evaluate(() => {
    const target = document.querySelector('[data-testid="package-png-export-target"] > div');
    const canvas = target?.querySelector("[data-template-package-canvas]");
    const media = [...(canvas?.querySelectorAll("[data-package-image-asset]") ?? [])].map((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const image = element.querySelector("img[src]");
      return {
        nodeId: element.getAttribute("data-package-node-id"),
        assetId: element.getAttribute("data-package-image-asset"),
        activePlacementState: element.getAttribute("data-package-image-active-state"),
        placementRevision: element.getAttribute("data-package-image-placement-revision"),
        renderMode: element.getAttribute("data-package-image-render-mode"),
        scaleMode: element.getAttribute("data-package-image-scale-mode"),
        placementStrategy: element.getAttribute("data-package-image-placement-strategy"),
        destinationBounds: element.getAttribute("data-package-image-destination-bounds"),
        visibleSourceRect: element.getAttribute("data-package-image-visible-source-rect"),
        backgroundImage: style.backgroundImage,
        backgroundSize: style.backgroundSize,
        backgroundPosition: style.backgroundPosition,
        objectFit: image ? getComputedStyle(image).objectFit : null,
        objectPosition: image ? getComputedStyle(image).objectPosition : null,
        imageSrc: image?.currentSrc || image?.src || null,
        imageComplete: image?.complete ?? null,
        naturalWidth: image?.naturalWidth ?? null,
        naturalHeight: image?.naturalHeight ?? null,
        bounds: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        transform: style.transform,
        opacity: style.opacity,
        visibility: style.visibility,
        display: style.display,
      };
    });
    return {
      timestamp: performance.now(),
      hiddenTarget: target ? {
        connected: target.isConnected,
        bounds: (() => {
          const rect = target.getBoundingClientRect();
          return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
        })(),
        display: getComputedStyle(target).display,
        visibility: getComputedStyle(target).visibility,
        opacity: getComputedStyle(target).opacity,
      } : null,
      settlement: canvas ? {
        id: canvas.getAttribute("data-package-settlement-id"),
        revision: canvas.getAttribute("data-package-settlement-revision"),
        readiness: canvas.getAttribute("data-package-settlement-readiness"),
      } : null,
      backendDecisionRevision: canvas?.__packageRuntimeTelemetry?.backendDecisionRevision ?? null,
      captureTelemetry: target?.__packagePngCaptureTelemetry ?? null,
      media,
      lifecycle: window.__packagePngDeterminismLifecycle ?? null,
    };
  });
}

async function selectValidatePreview(page, selector) {
  const previewFilter = page.getByRole("button", { name: /^Preview(?:\s|$)/ });
  if (await previewFilter.count()) await previewFilter.first().click();
  if (await page.locator(selector).waitFor({ state: "attached", timeout: 1_500 }).then(
    () => true,
    () => false,
  )) return;
  const groups = page.getByTestId("quality-issue-group");
  const count = await groups.count();
  for (let index = 0; index < count; index += 1) {
    await groups.nth(index).locator("button").first().click();
    if (await page.locator(selector).count()) return;
  }
  throw new Error("Validate contains diagnostics, but none of the filtered issues exposes a live renderer preview.");
}

async function prepareSourceAuthoritativeFonts(page, manifest, fixtureResult) {
  const rows = page.locator("[data-font-requirement-id]");
  const count = await rows.count();
  for (let index = 0; index < count; index += 1) {
    const row = rows.nth(index);
    const requirementId = await row.getAttribute("data-font-requirement-id");
    const family = await row.getAttribute("data-font-family");
    const weight = await row.getAttribute("data-font-weight");
    const style = await row.getAttribute("data-font-style");
    const font = exactFontForRequirement(manifest, family ?? "", weight ?? "", style ?? "normal");
    if (!font) {
      throw new Error(`No verified exact font binary is registered for ${family} ${weight} ${style}.`);
    }
    const uploadStarted = performance.now();
    await row.getByRole("button", { name: "Upload font" }).click();
    await page.getByTestId("package-font-upload-input").setInputFiles(font.path);
    await page.waitForFunction(
      ({ id, hash }) => {
        const element = [...document.querySelectorAll("[data-font-requirement-id]")]
          .find((candidate) => candidate.getAttribute("data-font-requirement-id") === id);
        return element?.getAttribute("data-font-resolution-classification") === "exact" &&
          element.getAttribute("data-font-linked-binary-hash") === hash &&
          element.getAttribute("data-font-ui-status") === "Ready";
      },
      { id: requirementId, hash: font.verifiedSha256 },
    );
    fixtureResult.fontDecisions.push({
      action: "Upload exact source-authoritative face",
      requirementId,
      requestedFamily: family,
      requestedWeight: Number(weight),
      requestedStyle: style,
      fontId: font.id,
      binaryHash: font.verifiedSha256,
      byteSize: font.verifiedByteSize,
      classification: "exact",
      source: font.source,
      uploadAndLinkMs: performance.now() - uploadStarted,
    });
  }
}

export async function runBrowserFixtures({ baseUrl, fixtures, models, selectedSurfaces, runId, candidateRoot, headed = false, repeat = 2, fontProfile = "application-default", exactFontManifest = null }) {
  const browser = await launchBrowser(headed);
  const results = [];
  try {
    for (const fixture of fixtures) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1600 }, deviceScaleFactor: 1, locale: "en-US", timezoneId: "UTC", acceptDownloads: true, reducedMotion: "reduce" });
      await context.addInitScript(() => {
        const describeSource = (value) => {
          const source = String(value || "");
          if (!source.startsWith("data:")) return source;
          return `${source.slice(0, source.indexOf(",") + 1)}<${source.length} characters>`;
        };
        const records = {
          objectUrls: [],
          imageSources: [],
          decodes: [],
          imageEvents: [],
        };
        Object.defineProperty(window, "__packagePngDeterminismLifecycle", {
          configurable: true,
          value: records,
        });
        const createObjectURL = URL.createObjectURL.bind(URL);
        URL.createObjectURL = (value) => {
          const url = createObjectURL(value);
          records.objectUrls.push({ event: "create", url, type: value?.type ?? null, size: value?.size ?? null, at: performance.now() });
          return url;
        };
        const revokeObjectURL = URL.revokeObjectURL.bind(URL);
        URL.revokeObjectURL = (url) => {
          records.objectUrls.push({ event: "revoke", url, at: performance.now() });
          return revokeObjectURL(url);
        };
        const srcDescriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "src");
        if (srcDescriptor?.get && srcDescriptor.set) {
          Object.defineProperty(HTMLImageElement.prototype, "src", {
            configurable: srcDescriptor.configurable,
            enumerable: srcDescriptor.enumerable,
            get: srcDescriptor.get,
            set(value) {
              records.imageSources.push({ src: describeSource(value), at: performance.now() });
              srcDescriptor.set.call(this, value);
            },
          });
        }
        const originalDecode = HTMLImageElement.prototype.decode;
        if (originalDecode) {
          HTMLImageElement.prototype.decode = async function decode() {
            const entry = { src: describeSource(this.currentSrc || this.src), start: performance.now(), complete: this.complete, naturalWidth: this.naturalWidth, naturalHeight: this.naturalHeight, result: "pending", end: null };
            records.decodes.push(entry);
            try {
              await originalDecode.call(this);
              entry.result = "complete";
            } catch (error) {
              entry.result = "failed";
              entry.error = error instanceof Error ? error.message : String(error);
              throw error;
            } finally {
              entry.end = performance.now();
              entry.complete = this.complete;
              entry.naturalWidth = this.naturalWidth;
              entry.naturalHeight = this.naturalHeight;
            }
          };
        }
        for (const eventName of ["load", "error"]) {
          addEventListener(eventName, (event) => {
            if (!(event.target instanceof HTMLImageElement)) return;
            records.imageEvents.push({ event: eventName, src: describeSource(event.target.currentSrc || event.target.src), complete: event.target.complete, naturalWidth: event.target.naturalWidth, naturalHeight: event.target.naturalHeight, at: performance.now() });
          }, true);
        }
      });
      await context.route("**/api/template-package/enrich-figma", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json; charset=utf-8",
          body: JSON.stringify({
            ok: false,
            code: "provider-unavailable",
            message: "Optional Figma enrichment is intentionally unavailable in the deterministic fidelity environment.",
          }),
        });
      });
      const page = await context.newPage();
      const consoleMessages = [];
      const networkMessages = [];
      page.on("console", (message) => { if (["error", "warning"].includes(message.type())) consoleMessages.push({ type: message.type(), text: message.text(), location: message.location() }); });
      page.on("pageerror", (error) => consoleMessages.push({ type: "pageerror", text: error.message }));
      page.on("response", (response) => { if (response.status() >= 400) consoleMessages.push({ type: "http", status: response.status(), url: response.url() }); });
      page.on("request", (request) => networkMessages.push({ event: "request", method: request.method(), resourceType: request.resourceType(), url: request.url(), at: Date.now() }));
      page.on("response", (response) => networkMessages.push({ event: "response", status: response.status(), resourceType: response.request().resourceType(), url: response.url(), at: Date.now() }));
      const fullStarted = performance.now();
      const timings = {};
      const model = models.get(fixture.id);
      const fixtureResult = { fixtureId: fixture.id, surfaces: {}, fontDecisions: [], route: null };
      try {
        await page.goto(`${baseUrl}/templates/new`, { waitUntil: "domcontentloaded" });
        const importStarted = performance.now();
        await page.getByTestId("zip-package-input").setInputFiles(fixture.path);
        await page.getByRole("button", { name: "Import template" }).click();
        await page.getByTestId("package-step-prepare-fonts").waitFor();
        timings.importMs = performance.now() - importStarted;
        if (fontProfile === "source-authoritative") {
          if (!exactFontManifest) throw new Error("Source-authoritative font profile has no verified font manifest.");
          await prepareSourceAuthoritativeFonts(page, exactFontManifest, fixtureResult);
        } else {
          const replacementButtons = page.getByRole("button", { name: "Use replacement" });
          const replacementCount = await replacementButtons.count();
          for (let index = replacementCount - 1; index >= 0; index -= 1) {
            const row = replacementButtons.nth(index).locator("xpath=ancestor::*[contains(@class,'font-requirement-row')]");
            fixtureResult.fontDecisions.push({ action: "Use replacement", requirement: (await row.innerText()).replace(/\s+/g, " ").trim() });
            await replacementButtons.nth(index).click();
          }
        }
        await page.getByRole("button", { name: "Check template" }).click();
        await page.getByTestId("package-step-validate").waitFor();
        const validateSelector = '[data-testid="package-step-validate"] [data-template-package-canvas]';
        if (!(await page.locator(validateSelector).count())) await selectValidatePreview(page, validateSelector);
        if (selectedSurfaces.includes("validate")) fixtureResult.surfaces.validate = await captureRenderer({ page, fixture, model, surface: "validate", route: "/templates/new", mode: "static", selector: validateSelector, runId, candidateRoot, repeat, consoleMessages, timings });
        const continueFields = page.getByRole("button", { name: "Continue to fields" });
        if (await continueFields.isDisabled()) throw new Error(`Fixture ${fixture.id} is blocked at Validate; Fields/editor/export surfaces cannot be reached.`);
        await continueFields.click();
        await page.getByTestId("package-step-fields").waitFor();
        const fieldsSelector = '[data-testid="package-step-fields"] [data-template-package-canvas]';
        if (selectedSurfaces.includes("fields")) fixtureResult.surfaces.fields = await captureRenderer({ page, fixture, model, surface: "fields", route: "/templates/new", mode: "static", selector: fieldsSelector, runId, candidateRoot, repeat, consoleMessages, timings });
        await page.getByRole("button", { name: "Continue to template details" }).click();
        await page.getByTestId("package-step-create").waitFor();
        const name = `Fidelity ${fixture.id}`;
        const nameInput = page.getByLabel("Template name");
        await nameInput.fill(name);
        await page.getByRole("button", { name: "Add template", exact: true }).click();
        await page.getByRole("button", { name: `Open template ${name}` }).waitFor();
        const restoreStarted = performance.now();
        await page.getByRole("button", { name: `Open template ${name}` }).click();
        await page.getByTestId("package-editor-panel").waitFor();
        const closeDiagnostics = page.getByRole("button", {
          name: "Close diagnostics panel",
        });
        if (await closeDiagnostics.isVisible().catch(() => false)) {
          await closeDiagnostics.click();
        }
        timings.draftRestoreMs = performance.now() - restoreStarted;
        fixtureResult.route = new URL(page.url()).pathname;
        const editorSelector = '[data-testid="package-working-preview"] [data-template-package-canvas]';
        const appearanceStarted = performance.now();
        await page.locator(editorSelector).waitFor({ state: "visible" });
        timings.firstRendererAppearanceMs = performance.now() - appearanceStarted;
        if (selectedSurfaces.includes("editor")) fixtureResult.surfaces.editor = await captureRenderer({ page, fixture, model, surface: "editor", route: fixtureResult.route, mode: "editor", selector: editorSelector, runId, candidateRoot, repeat, consoleMessages, timings });
        if (selectedSurfaces.includes("png-export")) {
          const directory = artifactDirectory(candidateRoot, runId, fixture.id, "png-export");
          const captures = [];
          let previousPng = null;
          for (let index = 1; index <= repeat; index += 1) {
            const evidenceBefore = await pngExportEvidence(page);
            const exported = await exportPng(page, directory, index);
            const evidenceAfter = await pngExportEvidence(page);
            writeFileSync(join(directory, `capture-${index}-evidence.json`), stableStringify({ before: evidenceBefore, after: evidenceAfter }));
            const editorBrowser = await browserStructure(page, editorSelector);
            const readiness = await waitForCurrentReadiness(page, editorSelector);
            editorBrowser.fontReadiness = readiness.fontReadiness;
            editorBrowser.assetReadiness = readiness.assetReadiness;
            const structure = mergeStructuralReport({ fixture, fixtureHash: fixture.zipSha256, surface: "png-export", route: fixtureResult.route, mode: "editor", model, browser: editorBrowser, runId, timings: { ...timings, pngExportMs: exported.durationMs } });
            structure.export = { suggestedFilename: exported.suggestedFilename, source: "hidden editor-mode renderer", exactFixtureHash: fixture.zipSha256 };
            const structurePath = join(directory, `structure-${index}.json`);
            writeFileSync(structurePath, stableStringify(structure));
            const current = readFileSync(exported.path);
            const pixelRepeat = previousPng ? comparePng(previousPng, current, { threshold: 0.1, allowedChangedPixelPercentage: 0 }) : null;
            if (pixelRepeat) {
              writeDifferenceImage(pixelRepeat, join(directory, `repeat-diff-${index - 1}-${index}.png`));
              writeFileSync(join(directory, `repeat-comparison-${index - 1}-${index}.json`), stableStringify({ ...pixelRepeat, differenceImage: undefined }));
              delete pixelRepeat.differenceImage;
            }
            captures.push({ pngPath: exported.path, structurePath, structure, fontReadiness: readiness.fontReadiness, timings: structure.timings, pixelRepeat });
            previousPng = current;
          }
          writeFileSync(join(directory, "browser-console.json"), stableStringify(consoleMessages));
          writeFileSync(join(directory, "network.json"), stableStringify(networkMessages));
          fixtureResult.surfaces["png-export"] = captures;
        }
        fixtureResult.fullDurationMs = performance.now() - fullStarted;
        results.push(fixtureResult);
      } catch (error) {
        fixtureResult.error = error instanceof Error ? error.message : String(error);
        fixtureResult.fullDurationMs = performance.now() - fullStarted;
        const failureDir = artifactDirectory(candidateRoot, runId, fixture.id, "run-failure");
        mkdirSync(failureDir, { recursive: true });
        await page.screenshot({ path: join(failureDir, "complete-surface.png"), fullPage: true }).catch(() => undefined);
        writeFileSync(join(failureDir, "browser-console.json"), stableStringify(consoleMessages));
        writeFileSync(join(failureDir, "failure.json"), stableStringify(fixtureResult));
        results.push(fixtureResult);
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
  return { browser: { name: "Chromium", version: browser.version(), viewport: { width: 1440, height: 1600 }, devicePixelRatio: 1, locale: "en-US", timezone: "UTC", captureScale: 1, fontProfile }, results };
}
