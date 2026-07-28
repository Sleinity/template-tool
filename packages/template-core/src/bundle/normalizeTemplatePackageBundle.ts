import type { TemplatePackageBundleDiagnostic } from "./types";
import { parseFigmaUrl, type ParsedFigmaUrl } from "../enrichment/parseFigmaUrl";

type JsonRecord = Record<string, unknown>;

export interface BundleTemplateCompatibilityData {
  renderHints?: unknown;
  tokens?: unknown;
  sourceExtras?: JsonRecord;
  figmaSource?: BundledFigmaSource;
}

export interface BundledFigmaSource {
  valid: boolean;
  origin: "bundle:mcp.json";
  url?: string;
  fileKey?: string;
  nodeId?: string | null;
  documentName?: string;
  rootMatch?: boolean;
  error?: string;
  raw?: unknown;
}

export interface BundleTemplateNormalizationResult {
  normalizedTemplateJson: unknown;
  compatibility: BundleTemplateCompatibilityData;
  diagnostics: TemplatePackageBundleDiagnostic[];
}

const allowedAssetKeys = new Set([
  "id",
  "type",
  "mimeType",
  "source",
  "width",
  "height",
  "hash",
  "data",
  "dataUrl",
  "url",
  "storageKey",
  "stableUrl",
  "sizeBytes",
  "sizeKb",
  "usedBy",
  "nodeId",
  "deferred",
  "scaleMode",
  "imageTransform",
  "svgString",
  "viewBox",
  "extensions",
]);

const allowedSourceKeys = new Set([
  "type",
  "packageContract",
  "pluginVersion",
  "fileKey",
  "url",
  "figmaMcp",
  "application",
  "documentId",
  "documentName",
  "pageId",
  "rootNodeId",
  "exportedAt",
]);

function diagnostic(
  code: string,
  severity: TemplatePackageBundleDiagnostic["severity"],
  message: string,
  details?: Record<string, unknown>,
): TemplatePackageBundleDiagnostic {
  const path = typeof details?.path === "string" ? details.path : undefined;
  const nodeId = typeof details?.nodeId === "string" ? details.nodeId : undefined;
  const { path: _path, nodeId: _nodeId, ...remainingDetails } = details ?? {};
  return {
    code,
    severity,
    category: "package",
    message,
    path,
    nodeId,
    details: Object.keys(remainingDetails).length > 0 ? remainingDetails : undefined,
  };
}

function cloneValue<T>(value: T): T {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function inferredFontWeight(value: unknown, style: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const normalized = typeof style === "string"
    ? style.toLowerCase().replace(/[\s_-]/g, "")
    : "";
  if (normalized.includes("thin")) return 100;
  if (normalized.includes("extralight") || normalized.includes("ultralight")) return 200;
  if (normalized.includes("light")) return 300;
  if (normalized.includes("medium")) return 500;
  if (normalized.includes("semibold") || normalized.includes("demibold")) return 600;
  if (normalized.includes("extrabold") || normalized.includes("ultrabold")) return 800;
  if (normalized.includes("black") || normalized.includes("heavy")) return 900;
  if (normalized.includes("bold")) return 700;
  return 400;
}

function inferredCssFontStyle(value: unknown): "normal" | "italic" | "oblique" {
  const normalized = typeof value === "string" ? value.toLowerCase() : "";
  if (normalized.includes("italic")) return "italic";
  if (normalized.includes("oblique")) return "oblique";
  return "normal";
}

function fontRequirementId(
  family: string,
  weight: number,
  cssStyle: string,
): string {
  const slug = family
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "font";
  return `font:${slug}:${weight}:${cssStyle}`;
}

function uniqueCharacters(value: string): string {
  return Array.from(new Set(Array.from(value))).join("");
}

function inferMissingFontRequirements(
  input: JsonRecord,
): TemplatePackageBundleDiagnostic[] {
  if (Array.isArray(input.fontRequirements) && input.fontRequirements.length > 0) {
    return [];
  }
  if (!isRecord(input.nodes)) return [];

  const editableNodeIds = new Set(
    Array.isArray(input.editableFields)
      ? input.editableFields.flatMap((field) =>
          isRecord(field) &&
          typeof field.nodeId === "string" &&
          typeof field.property === "string" &&
          field.property.startsWith("text.")
            ? [field.nodeId]
            : [],
        )
      : [],
  );
  const requirements = new Map<string, JsonRecord>();

  const addFace = ({
    nodeId,
    family,
    style,
    weight,
    postScriptName,
    characters,
    mixedStyle,
  }: {
    nodeId: string;
    family: unknown;
    style: unknown;
    weight: unknown;
    postScriptName: unknown;
    characters: string;
    mixedStyle: boolean;
  }) => {
    const normalizedFamily = readString(family)?.trim();
    if (!normalizedFamily) return;
    const normalizedWeight = inferredFontWeight(weight, style);
    const cssStyle = inferredCssFontStyle(style);
    const key = `${normalizedFamily.toLowerCase()}:${normalizedWeight}:${cssStyle}`;
    const existing = requirements.get(key);
    if (existing) {
      const usedBy = Array.isArray(existing.usedBy) ? existing.usedBy : [];
      if (!usedBy.includes(nodeId)) existing.usedBy = [...usedBy, nodeId];
      existing.characters = uniqueCharacters(
        `${typeof existing.characters === "string" ? existing.characters : ""}${characters}`,
      );
      existing.editable = existing.editable === true || editableNodeIds.has(nodeId);
      existing.mixedStyle = existing.mixedStyle === true || mixedStyle;
      return;
    }
    requirements.set(key, {
      id: fontRequirementId(normalizedFamily, normalizedWeight, cssStyle),
      family: normalizedFamily,
      style: readString(style) ?? (cssStyle === "normal" ? "Regular" : cssStyle),
      cssStyle,
      weight: normalizedWeight,
      postScriptName: readString(postScriptName) ?? null,
      usedBy: [nodeId],
      characters: uniqueCharacters(characters),
      editable: editableNodeIds.has(nodeId),
      mixedStyle,
      source: "figma-inferred",
      availableInFigma: true,
    });
  };

  for (const [nodeId, nodeValue] of Object.entries(input.nodes)) {
    if (!isRecord(nodeValue) || nodeValue.type !== "TEXT" || !isRecord(nodeValue.text)) {
      continue;
    }
    const text = nodeValue.text;
    const legacyStyle = isRecord(text.style) ? text.style : null;
    const characters = readString(text.characters) ?? readString(text.content) ?? "";
    const ranges = Array.isArray(text.styleRanges)
      ? text.styleRanges.filter(isRecord)
      : [];

    if (ranges.length > 0) {
      const covered = new Set<number>();
      for (const range of ranges) {
        const start = typeof range.start === "number" ? Math.max(0, Math.floor(range.start)) : 0;
        const end = typeof range.end === "number"
          ? Math.min(characters.length, Math.max(start, Math.floor(range.end)))
          : start;
        for (let index = start; index < end; index += 1) covered.add(index);
        addFace({
          nodeId,
          family: range.family,
          style: range.style ?? range.cssStyle,
          weight: range.weight,
          postScriptName: range.postScriptName,
          characters: characters.slice(start, end),
          mixedStyle: true,
        });
      }
      let uncovered = "";
      for (let index = 0; index < characters.length; index += 1) {
        if (!covered.has(index)) uncovered += characters[index];
      }
      if (!uncovered) continue;
      addFace({
        nodeId,
        family: text.fontFamily ?? legacyStyle?.fontFamily,
        style: text.fontStyle ?? legacyStyle?.fontStyle,
        weight: text.fontWeight ?? legacyStyle?.fontWeight,
        postScriptName: text.fontPostScriptName,
        characters: uncovered,
        mixedStyle: true,
      });
      continue;
    }

    addFace({
      nodeId,
      family: text.fontFamily ?? legacyStyle?.fontFamily,
      style: text.fontStyle ?? legacyStyle?.fontStyle,
      weight: text.fontWeight ?? legacyStyle?.fontWeight,
      postScriptName: text.fontPostScriptName,
      characters,
      mixedStyle: false,
    });
  }

  if (requirements.size === 0) return [];
  input.fontRequirements = Array.from(requirements.values());
  return [
    diagnostic(
      "FONT_REQUIREMENTS_INFERRED",
      "info",
      "Font requirements were inferred from text nodes because the ZIP package did not declare them.",
      { count: requirements.size },
    ),
  ];
}

function documentName(reference: ParsedFigmaUrl): string | undefined {
  try {
    const parts = new URL(reference.url).pathname.split("/").filter(Boolean);
    const sourceName = parts[2];
    return sourceName
      ? decodeURIComponent(sourceName).replace(/-/g, " ")
      : undefined;
  } catch {
    return undefined;
  }
}

function extractBundledFigmaSource(
  mcpData: unknown,
  rootNodeId: unknown,
): BundledFigmaSource | undefined {
  if (!isRecord(mcpData)) return undefined;
  const url = readString(mcpData.url);
  if (!url) {
    return {
      valid: false,
      origin: "bundle:mcp.json",
      error: "mcp.json does not contain a Figma URL.",
      raw: cloneValue(mcpData),
    };
  }
  const parsed = parseFigmaUrl(url);
  if (!parsed.valid) {
    return {
      valid: false,
      origin: "bundle:mcp.json",
      url,
      error: parsed.error,
      raw: cloneValue(mcpData),
    };
  }
  const nodeId =
    parsed.value.nodeId ??
    readString(mcpData.nodeId)?.replace(/-/g, ":") ??
    null;
  return {
    valid: true,
    origin: "bundle:mcp.json",
    url: parsed.value.url,
    fileKey: parsed.value.fileKey,
    nodeId,
    documentName: documentName(parsed.value),
    rootMatch:
      typeof rootNodeId === "string" && nodeId !== null
        ? rootNodeId === nodeId
        : undefined,
    raw: cloneValue(mcpData),
  };
}

function attachBundledFigmaSource(
  input: JsonRecord,
  mcpData: unknown,
): { figmaSource?: BundledFigmaSource; diagnostics: TemplatePackageBundleDiagnostic[] } {
  const figmaSource = extractBundledFigmaSource(mcpData, input.rootNodeId);
  if (!figmaSource) return { diagnostics: [] };
  if (!figmaSource.valid) {
    return {
      figmaSource,
      diagnostics: [
        diagnostic(
          "MCP_FIGMA_URL_INVALID",
          "info",
          `${figmaSource.error} ZIP data will be used without live enrichment.`,
          { path: "mcp.json", validationStage: "normalization" },
        ),
      ],
    };
  }

  const source = isRecord(input.source) ? input.source : {};
  source.type = source.type ?? "figma";
  source.fileKey = figmaSource.fileKey;
  source.url = figmaSource.url;
  source.figmaMcp = {
    ...(isRecord(source.figmaMcp) ? source.figmaMcp : {}),
    nodeId: figmaSource.nodeId ?? input.rootNodeId,
    status: figmaSource.rootMatch === false ? "changed" : "matched",
  };
  input.source = source;
  return {
    figmaSource,
    diagnostics: [
      diagnostic(
        "MCP_FIGMA_SOURCE_DETECTED",
        "info",
        figmaSource.rootMatch === false
          ? "A bundled Figma source was detected, but its node differs from the package root."
          : "A bundled Figma source was detected and matched to the package root.",
        {
          path: "mcp.json",
          nodeId: figmaSource.nodeId,
          fileKey: figmaSource.fileKey,
          origin: figmaSource.origin,
          rootMatch: figmaSource.rootMatch,
          validationStage: "normalization",
        },
      ),
    ],
  };
}

function appendUnsupportedPaint(
  node: JsonRecord,
  entry: Record<string, unknown>,
): void {
  const extensions = isRecord(node.extensions) ? node.extensions : {};
  const figma = isRecord(extensions.figma) ? extensions.figma : {};
  const existing = Array.isArray(figma.unsupportedPaints)
    ? figma.unsupportedPaints
    : [];
  const key = JSON.stringify(entry);
  if (!existing.some((item) => JSON.stringify(item) === key)) {
    figma.unsupportedPaints = [...existing, cloneValue(entry)];
  }
  extensions.figma = figma;
  node.extensions = extensions;
}

const CANONICAL_PAINT_TYPES = new Set([
  "SOLID",
  "IMAGE",
  "GRADIENT_LINEAR",
  "GRADIENT_RADIAL",
  "GRADIENT_ANGULAR",
  "GRADIENT_DIAMOND",
]);

const SOLID_PAINT_ALIAS_TOLERANCE = 1e-6;

function unitNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

function affectedSolidPaintExporter(input: JsonRecord): boolean {
  if (!isRecord(input.source)) return false;
  return input.source.type === "figma" && input.source.pluginVersion === "0.6.0";
}

function normalizeSolidPaintOpacity(
  input: JsonRecord,
): TemplatePackageBundleDiagnostic[] {
  if (!isRecord(input.nodes) || !affectedSolidPaintExporter(input)) return [];
  const diagnostics: TemplatePackageBundleDiagnostic[] = [];

  for (const [nodeId, nodeValue] of Object.entries(input.nodes)) {
    if (!isRecord(nodeValue)) continue;
    const appearance = isRecord(nodeValue.appearance) ? nodeValue.appearance : null;
    if (!appearance || !Array.isArray(appearance.fills)) continue;
    const extensions = isRecord(nodeValue.extensions) ? nodeValue.extensions : null;
    const figma = extensions && isRecord(extensions.figma) ? extensions.figma : null;
    const rawFills = figma && Array.isArray(figma.rawFills) ? figma.rawFills : null;

    appearance.fills.forEach((paintValue, sourceIndex) => {
      if (!isRecord(paintValue) || paintValue.type !== "SOLID") return;
      if (isRecord(paintValue.solidPaintSource) &&
          paintValue.solidPaintSource.schemaVersion === "solid-paint-source-v1") return;
      const color = isRecord(paintValue.color) ? paintValue.color : null;
      const serializedColorAlpha = color?.a;
      const serializedPaintOpacity = paintValue.opacity ?? 1;
      if (!color || !unitNumber(serializedColorAlpha) || !unitNumber(serializedPaintOpacity)) return;

      const rawPaint = rawFills?.[sourceIndex];
      const rawPaintPresent = rawPaint !== undefined && rawPaint !== null;
      const rawSolid = isRecord(rawPaint) && rawPaint.type === "SOLID" ? rawPaint : null;
      const rawOpacity = rawSolid?.opacity ?? 1;
      const canonicalPath = `nodes.${nodeId}.appearance.fills.${sourceIndex}`;
      const rawFigmaPath = rawSolid
        ? `nodes.${nodeId}.extensions.figma.rawFills.${sourceIndex}`
        : null;

      if (rawSolid && unitNumber(rawOpacity)) {
        color.a = 1;
        paintValue.opacity = rawOpacity;
        paintValue.solidPaintSource = {
          schemaVersion: "solid-paint-source-v1",
          sourceIndex,
          pairing: "source-index",
          canonicalPath,
          rawFigmaPath,
          sourceContract: "figma-plugin-api-solid-paint-rgb-opacity",
          exporterCompatibility: "raw-figma-solid-paint",
          opacityDisposition: "raw-paint-opacity",
          serializedColorAlpha,
          serializedPaintOpacity,
          sourcePaintOpacity: rawOpacity,
          canonicalColorAlpha: 1,
          canonicalPaintOpacity: rawOpacity,
          effectiveOpacity: rawOpacity,
          effectiveOpacityRule: "paint-opacity-once",
          equalityTolerance: SOLID_PAINT_ALIAS_TOLERANCE,
          confidenceBasis: "raw-figma-solid-paint",
          normalizationRevision: "solid-paint-opacity-normalization-v1",
          conflicts: [],
        };
        diagnostics.push(diagnostic(
          "SOLID_PAINT_RAW_OPACITY_CANONICALIZED",
          "info",
          "SOLID color and opacity were normalized from preserved raw Figma paint evidence.",
          { nodeId, path: `/${canonicalPath.replace(/\./g, "/")}`, sourceIndex },
        ));
        return;
      }

      if (rawPaintPresent) {
        paintValue.solidPaintSource = {
          schemaVersion: "solid-paint-source-v1",
          sourceIndex,
          pairing: "source-index",
          canonicalPath,
          rawFigmaPath: `nodes.${nodeId}.extensions.figma.rawFills.${sourceIndex}`,
          sourceContract: "figma-plugin-api-solid-paint-rgb-opacity",
          exporterCompatibility: "raw-figma-solid-paint",
          opacityDisposition: "ambiguous-independent-values",
          serializedColorAlpha,
          serializedPaintOpacity,
          sourcePaintOpacity: null,
          canonicalColorAlpha: serializedColorAlpha,
          canonicalPaintOpacity: serializedPaintOpacity,
          effectiveOpacity: null,
          effectiveOpacityRule: "preserve-separate-values",
          equalityTolerance: SOLID_PAINT_ALIAS_TOLERANCE,
          confidenceBasis: "raw-figma-solid-paint-conflict",
          normalizationRevision: "solid-paint-opacity-normalization-v1",
          conflicts: [rawSolid ? "raw-paint-opacity-invalid" : "raw-paint-type-mismatch"],
        };
        diagnostics.push(diagnostic(
          "SOLID_PAINT_RAW_SOURCE_CONFLICT",
          "warning",
          "Preserved raw paint evidence cannot authorize SOLID opacity normalization; serialized fields remain unchanged and ambiguous.",
          { nodeId, path: `/${canonicalPath.replace(/\./g, "/")}`, sourceIndex },
        ));
        return;
      }

      const mirrored = Math.abs(serializedColorAlpha - serializedPaintOpacity) <=
        SOLID_PAINT_ALIAS_TOLERANCE;
      if (mirrored) {
        color.a = 1;
        paintValue.opacity = serializedPaintOpacity;
      }
      paintValue.solidPaintSource = {
        schemaVersion: "solid-paint-source-v1",
        sourceIndex,
        pairing: "source-index",
        canonicalPath,
        rawFigmaPath: null,
        sourceContract: "figma-plugin-api-solid-paint-rgb-opacity",
        exporterCompatibility: "plugin-0.6.0-mirrored-color-alpha",
        opacityDisposition: mirrored
          ? "mirrored-compatibility-alias"
          : "ambiguous-independent-values",
        serializedColorAlpha,
        serializedPaintOpacity,
        sourcePaintOpacity: mirrored ? serializedPaintOpacity : null,
        canonicalColorAlpha: mirrored ? 1 : serializedColorAlpha,
        canonicalPaintOpacity: serializedPaintOpacity,
        effectiveOpacity: mirrored ? serializedPaintOpacity : null,
        effectiveOpacityRule: mirrored
          ? "paint-opacity-once"
          : "preserve-separate-values",
        equalityTolerance: SOLID_PAINT_ALIAS_TOLERANCE,
        confidenceBasis: mirrored
          ? "figma-contract-plus-affected-exporter-equal-values"
          : "affected-exporter-differing-values",
        normalizationRevision: "solid-paint-opacity-normalization-v1",
        conflicts: mirrored ? [] : ["serialized-alpha-opacity-differ"],
      };
      diagnostics.push(diagnostic(
        mirrored
          ? "SOLID_PAINT_OPACITY_ALIAS_NORMALIZED"
          : "SOLID_PAINT_OPACITY_AMBIGUOUS",
        mirrored ? "info" : "warning",
        mirrored
          ? "Exporter 0.6.0 mirrored one Figma SOLID opacity into color alpha and paint opacity; canonical opacity now applies that source value once while preserving both serialized values as provenance."
          : "Exporter 0.6.0 SOLID color alpha and paint opacity differ; both values remain preserved and no alias rule was inferred.",
        {
          nodeId,
          path: `/${canonicalPath.replace(/\./g, "/")}`,
          sourceIndex,
          serializedColorAlpha,
          serializedPaintOpacity,
          equalityTolerance: SOLID_PAINT_ALIAS_TOLERANCE,
          normalizationRevision: "solid-paint-opacity-normalization-v1",
        },
      ));
    });
  }
  return diagnostics;
}

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function canonicalGradientStops(value: unknown): unknown[] | undefined {
  return Array.isArray(value) ? value.map((entry) => {
    if (!isRecord(entry) || !isRecord(entry.color)) return cloneValue(entry);
    return {
      position: entry.position,
      color: {
        r: entry.color.r,
        g: entry.color.g,
        b: entry.color.b,
        a: entry.color.a,
      },
    };
  }) : undefined;
}

function normalizeLinearGradientPaints(
  input: JsonRecord,
): TemplatePackageBundleDiagnostic[] {
  if (!isRecord(input.nodes)) return [];
  const diagnostics: TemplatePackageBundleDiagnostic[] = [];
  for (const [nodeId, nodeValue] of Object.entries(input.nodes)) {
    if (!isRecord(nodeValue)) continue;
    const appearance = isRecord(nodeValue.appearance) ? nodeValue.appearance : null;
    const extensions = isRecord(nodeValue.extensions) ? nodeValue.extensions : null;
    const figma = extensions && isRecord(extensions.figma) ? extensions.figma : null;
    const fills = appearance && Array.isArray(appearance.fills) ? appearance.fills : null;
    const rawFills = figma && Array.isArray(figma.rawFills) ? figma.rawFills : null;
    if (!fills || !rawFills) continue;
    fills.forEach((paintValue, sourceIndex) => {
      if (!isRecord(paintValue) || paintValue.type !== "GRADIENT_LINEAR") return;
      const rawPaint = rawFills[sourceIndex];
      if (!isRecord(rawPaint) || rawPaint.type !== "GRADIENT_LINEAR") return;
      const conflicts: string[] = [];
      if (paintValue.gradientStops !== undefined && paintValue.stops !== undefined &&
          !sameValue(paintValue.gradientStops, paintValue.stops)) {
        conflicts.push("canonical-stop-alias-conflict");
      }
      if (paintValue.gradientTransform !== undefined && paintValue.transform !== undefined &&
          !sameValue(paintValue.gradientTransform, paintValue.transform)) {
        conflicts.push("canonical-transform-alias-conflict");
      }
      const existingStops = canonicalGradientStops(paintValue.gradientStops) ??
        canonicalGradientStops(paintValue.stops);
      const rawStops = canonicalGradientStops(rawPaint.gradientStops) ??
        canonicalGradientStops(rawPaint.stops);
      const existingTransform = Array.isArray(paintValue.gradientTransform)
        ? cloneValue(paintValue.gradientTransform)
        : Array.isArray(paintValue.transform)
          ? cloneValue(paintValue.transform)
          : undefined;
      const rawTransform = Array.isArray(rawPaint.gradientTransform)
        ? cloneValue(rawPaint.gradientTransform)
        : Array.isArray(rawPaint.transform)
          ? cloneValue(rawPaint.transform)
          : undefined;
      if (existingStops && rawStops && !sameValue(existingStops, rawStops)) {
        conflicts.push("canonical-raw-stop-conflict");
      }
      if (existingTransform && rawTransform && !sameValue(existingTransform, rawTransform)) {
        conflicts.push("canonical-raw-transform-conflict");
      }
      if (!existingStops && rawStops) paintValue.gradientStops = rawStops;
      if (!existingTransform && rawTransform) paintValue.gradientTransform = rawTransform;
      paintValue.linearGradientSource = {
        schemaVersion: "linear-gradient-source-v1",
        sourceIndex,
        pairing: "source-index",
        canonicalPath: `nodes.${nodeId}.appearance.fills.${sourceIndex}`,
        rawFigmaPath: `nodes.${nodeId}.extensions.figma.rawFills.${sourceIndex}`,
        stopsSource: Array.isArray(paintValue.gradientStops) && existingStops
          ? "canonical-gradientStops"
          : Array.isArray(paintValue.stops) && existingStops
            ? "canonical-stops"
            : Array.isArray(rawPaint.gradientStops)
              ? "figma-raw-gradientStops"
              : Array.isArray(rawPaint.stops)
                ? "figma-raw-stops"
                : "missing",
        transformSource: Array.isArray(paintValue.gradientTransform) && existingTransform
          ? "canonical-gradientTransform"
          : Array.isArray(paintValue.transform) && existingTransform
            ? "canonical-transform"
            : Array.isArray(rawPaint.gradientTransform)
              ? "figma-raw-gradientTransform"
              : Array.isArray(rawPaint.transform)
                ? "figma-raw-transform"
                : "missing",
        normalizationRevision: "linear-gradient-normalization-v1",
        conflicts,
      };
      diagnostics.push(diagnostic(
        conflicts.length === 0
          ? "LINEAR_GRADIENT_CANONICALIZED"
          : "LINEAR_GRADIENT_SOURCE_CONFLICT",
        conflicts.length === 0 ? "info" : "warning",
        conflicts.length === 0
          ? "Linear-gradient stops and transform were paired with preserved Figma source data by paint index."
          : "Linear-gradient canonical and preserved Figma source data conflict; runtime compatibility ownership is required.",
        {
          nodeId,
          path: `/nodes/${nodeId}/appearance/fills/${sourceIndex}`,
          sourceIndex,
          conflicts,
          normalizationRevision: "linear-gradient-normalization-v1",
        },
      ));
    });
  }
  return diagnostics;
}

function normalizeUnsupportedPaints(
  input: JsonRecord,
): TemplatePackageBundleDiagnostic[] {
  if (!isRecord(input.nodes)) return [];
  const diagnostics: TemplatePackageBundleDiagnostic[] = [];
  for (const [nodeId, rawNode] of Object.entries(input.nodes)) {
    if (!isRecord(rawNode)) continue;
    const appearance = isRecord(rawNode.appearance) ? rawNode.appearance : null;
    if (!appearance || !Array.isArray(appearance.fills)) continue;
    const originalFills = appearance.fills;
    const imageFallback = originalFills.some(
      (paint) => isRecord(paint) && paint.type === "IMAGE",
    ) || (isRecord(rawNode.image) && readString(rawNode.image.assetId) !== undefined);
    const unsupportedEntries = originalFills.flatMap((paint, index) =>
      isRecord(paint) &&
      typeof paint.type === "string" &&
      !CANONICAL_PAINT_TYPES.has(paint.type)
        ? [{ slot: "fills", index, paint: cloneValue(paint) }]
        : [],
    );
    if (unsupportedEntries.length === 0) continue;
    unsupportedEntries.forEach((entry) => appendUnsupportedPaint(rawNode, entry));
    appearance.fills = originalFills.filter(
      (paint) =>
        !(
          isRecord(paint) &&
          typeof paint.type === "string" &&
          !CANONICAL_PAINT_TYPES.has(paint.type)
        ),
    );
    const unsupportedTypes = unsupportedEntries.map((entry) =>
      String((entry.paint as JsonRecord).type),
    );
    const videoOnly = unsupportedTypes.every((type) => type === "VIDEO");
    diagnostics.push(
      diagnostic(
        videoOnly && imageFallback
          ? "VIDEO_PAINT_STATIC_FALLBACK_NORMALIZED"
          : videoOnly
            ? "VIDEO_PAINT_REMOVED_WITHOUT_FALLBACK"
            : "UNSUPPORTED_PAINT_PRESERVED",
        videoOnly && imageFallback ? "info" : "warning",
        videoOnly && imageFallback
          ? "Unsupported video paint was preserved as Figma metadata; static rendering uses the image fallback."
          : videoOnly
            ? "Unsupported video paint was preserved as Figma metadata, but no static image fallback is available."
            : `Unsupported source paint types (${unsupportedTypes.join(", ")}) were preserved as Figma metadata and excluded from the strict canonical paint array.`,
        {
          path: `/nodes/${nodeId}/appearance/fills`,
          nodeId,
          repairApplied: true,
          visualImpact:
            videoOnly && imageFallback ? "none" : "unsupported-paint-missing",
          validationStage: "normalization",
          removedPaintCount: unsupportedEntries.length,
          unsupportedPaintTypes: unsupportedTypes,
        },
      ),
    );
  }
  return diagnostics;
}

function normalizeMotion(
  input: JsonRecord,
  motionData: unknown,
): TemplatePackageBundleDiagnostic[] {
  if (!isRecord(input.motion)) return [];
  const motion = input.motion;
  const linking = isRecord(motion.linking) ? motion.linking : null;
  const source = isRecord(input.source) ? input.source : null;
  const explicitlyStatic =
    linking?.status === "none" &&
    (motion.file === null || motion.file === undefined) &&
    motionData === undefined &&
    source?.hasMotion !== true;
  if (explicitlyStatic) {
    delete input.motion;
    return [
      diagnostic(
        "STATIC_MOTION_STATE_NORMALIZED",
        "info",
        "The package explicitly declares no motion and was normalized as a static template.",
        {
          path: "/motion",
          originalStatus: "none",
          canonicalRepresentation: "motion omitted",
          validationStage: "normalization",
        },
      ),
    ];
  }

  const file = readString(motion.file);
  if (!("raw" in motion)) motion.raw = motionData ?? {};
  if (!("format" in motion)) motion.format = "figma-motion-v1";
  if (file && !motion.sourceName) motion.sourceName = file;
  if (linking?.status === "matched") {
    linking.status = "pass";
    delete motion.file;
    return [
      diagnostic(
        "BUNDLE_NORMALIZATION_WARNING",
        "info",
        "ZIP motion linking status \"matched\" was normalized to TemplatePackageV1 status \"pass\".",
        { path: "/motion/linking/status", validationStage: "normalization" },
      ),
    ];
  }
  delete motion.file;
  return [];
}

function moveUnknownAssetFields(asset: JsonRecord): JsonRecord {
  const known: JsonRecord = {};
  const bundleSource: JsonRecord = {};

  for (const [key, value] of Object.entries(asset)) {
    if (allowedAssetKeys.has(key)) known[key] = value;
    else bundleSource[key] = value;
  }

  for (const key of ["path", "src", "aliases", "renderedWidth", "renderedHeight", "byteSize"]) {
    if (key in asset) bundleSource[key] = asset[key];
  }

  if (Object.keys(bundleSource).length > 0) {
    const extensions = isRecord(known.extensions) ? known.extensions : {};
    known.extensions = {
      ...extensions,
      bundleSource: {
        ...(isRecord(extensions.bundleSource) ? extensions.bundleSource : {}),
        ...bundleSource,
      },
    };
  }

  return known;
}

function normalizeExternalAssets(input: JsonRecord): TemplatePackageBundleDiagnostic[] {
  const diagnostics: TemplatePackageBundleDiagnostic[] = [];
  if (!isRecord(input.assets)) return diagnostics;

  for (const [assetId, value] of Object.entries(input.assets)) {
    if (!isRecord(value)) continue;
    const rawSource = value.source;
    const normalized = moveUnknownAssetFields(value);

    if (rawSource === "external") {
      const path = readString(value.path);
      const src = readString(value.src);
      normalized.source = "stored";
      normalized.storageKey = path ?? src ?? assetId;
      if (typeof value.byteSize === "number") normalized.sizeBytes = value.byteSize;
      diagnostics.push(
        diagnostic(
          "EXTERNAL_ASSET_COMPAT_NORMALIZED",
          "info",
          `External ZIP asset "${assetId}" was normalized to a stored package asset placeholder for validation.`,
          { assetId, path, src },
        ),
      );
    } else if (rawSource === "stored" && !normalized.storageKey && !normalized.stableUrl) {
      const path = readString(value.path);
      const src = readString(value.src);
      if (path || src) normalized.storageKey = path ?? src;
    }

    input.assets[assetId] = normalized;
  }

  return diagnostics;
}

function normalizeSource(input: JsonRecord): {
  extras?: JsonRecord;
  diagnostics: TemplatePackageBundleDiagnostic[];
} {
  const diagnostics: TemplatePackageBundleDiagnostic[] = [];
  if (!isRecord(input.source)) return { diagnostics };

  const source = input.source;
  const normalized: JsonRecord = {};
  const extras: JsonRecord = {};
  for (const [key, value] of Object.entries(source)) {
    if (allowedSourceKeys.has(key)) normalized[key] = value;
    else extras[key] = value;
  }

  if (Object.keys(extras).length > 0) {
    input.source = normalized;
    diagnostics.push(
      diagnostic(
        "BUNDLE_SOURCE_METADATA_ATTACHED",
        "info",
        "ZIP source metadata outside the TemplatePackageV1 source shape was attached to the loaded source result.",
        { keys: Object.keys(extras) },
      ),
    );
    return { extras, diagnostics };
  }

  return { diagnostics };
}

function normalizeRenderHints(input: JsonRecord): {
  renderHints?: unknown;
  diagnostics: TemplatePackageBundleDiagnostic[];
} {
  if (!("renderHints" in input)) return { diagnostics: [] };
  const renderHints = input.renderHints;
  delete input.renderHints;
  return {
    renderHints,
    diagnostics: [
      diagnostic(
        "RENDER_HINTS_COMPAT_NORMALIZED",
        "info",
        "ZIP renderHints were attached to the loaded source result; rendererHints remains the runtime package field.",
      ),
    ],
  };
}

function normalizeTokens(input: JsonRecord): {
  tokens?: unknown;
  diagnostics: TemplatePackageBundleDiagnostic[];
} {
  if (!("tokens" in input)) return { diagnostics: [] };
  const tokens = input.tokens;
  delete input.tokens;
  return {
    tokens,
    diagnostics: [
      diagnostic(
        "TOKENS_ATTACHED",
        "info",
        "ZIP tokens were attached to the loaded source result for later phases.",
      ),
    ],
  };
}

export function normalizeTemplatePackageBundleTemplate(
  rawTemplateJson: unknown,
  options: { motionData?: unknown; mcpData?: unknown } = {},
): BundleTemplateNormalizationResult {
  const normalizedTemplateJson = cloneValue(rawTemplateJson);
  const diagnostics: TemplatePackageBundleDiagnostic[] = [];
  const compatibility: BundleTemplateCompatibilityData = {};

  if (!isRecord(normalizedTemplateJson)) {
    return {
      normalizedTemplateJson,
      compatibility,
      diagnostics,
    };
  }

  diagnostics.push(...normalizeExternalAssets(normalizedTemplateJson));
  diagnostics.push(...normalizeUnsupportedPaints(normalizedTemplateJson));
  diagnostics.push(...normalizeSolidPaintOpacity(normalizedTemplateJson));
  diagnostics.push(...normalizeLinearGradientPaints(normalizedTemplateJson));
  diagnostics.push(...inferMissingFontRequirements(normalizedTemplateJson));

  const bundledFigma = attachBundledFigmaSource(
    normalizedTemplateJson,
    options.mcpData,
  );
  compatibility.figmaSource = bundledFigma.figmaSource;
  diagnostics.push(...bundledFigma.diagnostics);

  diagnostics.push(...normalizeMotion(normalizedTemplateJson, options.motionData));

  const source = normalizeSource(normalizedTemplateJson);
  compatibility.sourceExtras = source.extras;
  diagnostics.push(...source.diagnostics);

  const renderHints = normalizeRenderHints(normalizedTemplateJson);
  compatibility.renderHints = renderHints.renderHints;
  diagnostics.push(...renderHints.diagnostics);

  const tokens = normalizeTokens(normalizedTemplateJson);
  compatibility.tokens = tokens.tokens;
  diagnostics.push(...tokens.diagnostics);

  return {
    normalizedTemplateJson,
    compatibility,
    diagnostics,
  };
}
