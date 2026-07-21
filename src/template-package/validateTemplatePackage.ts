import Ajv2020, { type ErrorObject } from "ajv/dist/2020";
import schema from "./schema/template-package-v1.schema.json";
import { inspectPackageAssetSafety } from "./packageAssetSafety";
import { resolvePackageAssetReference } from "./assets/packageAssetResolution";
import { resolvePackageMaskRelationships } from "./masks/packageMaskRelationships";
import {
  diagnostic,
  type PackageDiagnostic,
  type TemplatePackageValidationResult,
} from "./packageDiagnostics";
import type {
  PackageAxisSizing,
  PackageMotionLinkingDiagnostics,
  PackagePaint,
  TemplateNode,
  TemplatePackageDiagnostic,
  TemplatePackageV1,
} from "./types";

const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true });
const validateSchema = ajv.compile(schema);

const allowedFieldProperties: Record<TemplateNode["type"], RegExp[]> = {
  FRAME: [
    /^image\.assetId$/,
    /^appearance\.fills\.\d+\.color$/,
    /^appearance\.opacity$/,
    /^visible$/,
  ],
  GROUP: [/^image\.assetId$/, /^appearance\.opacity$/, /^visible$/],
  RECTANGLE: [
    /^image\.assetId$/,
    /^appearance\.fills\.\d+\.color$/,
    /^appearance\.opacity$/,
    /^visible$/,
  ],
  TEXT: [
    /^text\.content$/,
    /^text\.characters$/,
    /^appearance\.fills\.\d+\.color$/,
    /^appearance\.opacity$/,
    /^visible$/,
  ],
  IMAGE: [/^image\.assetId$/, /^appearance\.opacity$/, /^visible$/],
  VECTOR: [
    /^vector\.assetId$/,
    /^appearance\.fills\.\d+\.color$/,
    /^appearance\.opacity$/,
    /^visible$/,
  ],
  BOOLEAN_OPERATION: [
    /^vector\.assetId$/,
    /^appearance\.opacity$/,
    /^visible$/,
  ],
  ELLIPSE: [
    /^appearance\.fills\.\d+\.color$/,
    /^appearance\.opacity$/,
    /^visible$/,
  ],
  LINE: [
    /^appearance\.fills\.\d+\.color$/,
    /^appearance\.opacity$/,
    /^visible$/,
  ],
  POLYGON: [
    /^appearance\.fills\.\d+\.color$/,
    /^appearance\.opacity$/,
    /^visible$/,
  ],
  STAR: [
    /^appearance\.fills\.\d+\.color$/,
    /^appearance\.opacity$/,
    /^visible$/,
  ],
  COMPONENT: [
    /^image\.assetId$/,
    /^appearance\.fills\.\d+\.color$/,
    /^appearance\.opacity$/,
    /^visible$/,
  ],
  INSTANCE: [
    /^image\.assetId$/,
    /^appearance\.fills\.\d+\.color$/,
    /^appearance\.opacity$/,
    /^visible$/,
  ],
};

function schemaDiagnostics(errors: ErrorObject[] | null | undefined): PackageDiagnostic[] {
  return (errors ?? []).map((error) =>
    diagnostic(
      `schema.${error.keyword}`,
      "error",
      "schema",
      error.message ? `Schema validation failed: ${error.message}.` : "Schema validation failed.",
      { path: error.instancePath || "/" },
    ),
  );
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function validateAxisSizing(
  axis: PackageAxisSizing,
  path: string,
  nodeId: string,
  diagnostics: PackageDiagnostic[],
): void {
  if (!["FIXED", "HUG", "FILL"].includes(axis.mode)) {
    diagnostics.push(
      diagnostic("layout.invalid-sizing-mode", "error", "layout", `Invalid sizing mode at ${path}.`, {
        path,
        nodeId,
      }),
    );
  }

  for (const key of ["value", "min", "max"] as const) {
    const value = axis[key];
    if (value !== undefined && value !== null && (!isFiniteNumber(value) || value < 0)) {
      diagnostics.push(
        diagnostic(
          "layout.invalid-sizing-value",
          "error",
          "layout",
          `${key} must be a finite, non-negative number.`,
          { path: `${path}.${key}`, nodeId },
        ),
      );
    }
  }

  if (axis.mode === "FIXED" && !isFiniteNumber(axis.value)) {
    diagnostics.push(
      diagnostic(
        "layout.fixed-value-required",
        "error",
        "layout",
        "FIXED sizing requires a finite value.",
        { path: `${path}.value`, nodeId },
      ),
    );
  }

  if (isFiniteNumber(axis.min) && isFiniteNumber(axis.max) && axis.min > axis.max) {
    diagnostics.push(
      diagnostic("layout.invalid-min-max", "error", "layout", "Sizing min cannot exceed max.", {
        path,
        nodeId,
      }),
    );
  }

  if (
    isFiniteNumber(axis.value) &&
    ((isFiniteNumber(axis.min) && axis.value < axis.min) ||
      (isFiniteNumber(axis.max) && axis.value > axis.max))
  ) {
    diagnostics.push(
      diagnostic(
        "layout.value-outside-constraints",
        "error",
        "layout",
        "Sizing value must fall within its min and max constraints.",
        { path, nodeId },
      ),
    );
  }
}

function collectPaintAssetIds(paint: PackagePaint): string[] {
  return paint.type === "IMAGE" && paint.assetId ? [paint.assetId] : [];
}

function collectNodeAssetIds(node: TemplateNode): string[] {
  const ids = node.appearance.fills.flatMap(collectPaintAssetIds);
  node.appearance.strokes.forEach((stroke) => {
    ids.push(
      ...collectPaintAssetIds("paint" in stroke ? stroke.paint : stroke),
    );
  });
  if (node.image?.assetId) ids.push(node.image.assetId);
  if (node.vector?.assetId) ids.push(node.vector.assetId);
  return ids;
}

function getPositioningMode(node: TemplateNode): "ROOT" | "FLOW" | "ABSOLUTE" {
  return typeof node.positioning === "string"
    ? node.positioning
    : node.positioning.mode;
}

function extractPluginDiagnostics(input: unknown): TemplatePackageDiagnostic[] {
  if (input === null || typeof input !== "object" || Array.isArray(input)) return [];
  const value = (input as { diagnostics?: unknown }).diagnostics;
  if (!Array.isArray(value)) return [];

  return value.filter((item): item is TemplatePackageDiagnostic => {
    if (item === null || typeof item !== "object" || Array.isArray(item)) return false;
    const candidate = item as Partial<TemplatePackageDiagnostic>;
    return (
      ["info", "warning", "error"].includes(candidate.severity ?? "") &&
      typeof candidate.code === "string" &&
      typeof candidate.message === "string"
    );
  });
}

function extractMotionNodeIds(raw: unknown): string[] {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return [];
  const nodes = (raw as { nodes?: unknown }).nodes;
  if (!Array.isArray(nodes)) return [];
  return Array.from(
    new Set(
      nodes.flatMap((entry) => {
        if (entry === null || typeof entry !== "object" || Array.isArray(entry)) return [];
        const nodeId = (entry as { node?: unknown }).node;
        return typeof nodeId === "string" ? [nodeId] : [];
      }),
    ),
  );
}

function compareStringSets(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value) => right.includes(value));
}

function validateMotion(
  packageValue: TemplatePackageV1,
  diagnostics: PackageDiagnostic[],
): PackageMotionLinkingDiagnostics | null {
  if (!packageValue.motion) return null;

  const packageNodeIds = Object.keys(packageValue.nodes);
  const motionNodeIds = extractMotionNodeIds(packageValue.motion.raw);
  const matchedNodeIds = motionNodeIds.filter((nodeId) => packageValue.nodes[nodeId] !== undefined);
  const missingNodeIds = motionNodeIds.filter((nodeId) => packageValue.nodes[nodeId] === undefined);
  const extraPackageNodeIds = packageNodeIds.filter((nodeId) => !motionNodeIds.includes(nodeId));
  const declared = packageValue.motion.linking;
  const status =
    motionNodeIds.length === 0 && declared.status === "unchecked"
      ? "unchecked"
      : motionNodeIds.length === 0
        ? "static-only"
        : missingNodeIds.length > 0
          ? "warning"
          : "pass";

  const linking: PackageMotionLinkingDiagnostics = {
    status,
    matchedNodeIds,
    missingNodeIds,
    extraPackageNodeIds,
  };

  if (motionNodeIds.length === 0 && declared.status !== "unchecked") {
    diagnostics.push(
      diagnostic(
        "motion.no-node-references",
        "warning",
        "motion",
        "Motion data contains no comparable node references.",
        { path: "/motion/raw" },
      ),
    );
  }

  for (const nodeId of missingNodeIds) {
    diagnostics.push(
      diagnostic(
        "motion.missing-package-node",
        "warning",
        "motion",
        `Motion references missing package node "${nodeId}".`,
        { path: "/motion/raw/nodes", nodeId },
      ),
    );
  }

  const declaredExtraNodeIds =
    declared.extraTemplateNodeIds ?? declared.extraPackageNodeIds ?? [];
  if (
    declared.status !== "unchecked" &&
    (declared.status !== linking.status ||
    !compareStringSets(declared.matchedNodeIds, linking.matchedNodeIds) ||
    !compareStringSets(declared.missingNodeIds, linking.missingNodeIds) ||
    !compareStringSets(declaredExtraNodeIds, linking.extraPackageNodeIds ?? []))
  ) {
    diagnostics.push(
      diagnostic(
        "motion.stale-linking-diagnostics",
        "warning",
        "motion",
        "Stored motion linking diagnostics do not match the package node dictionary.",
        { path: "/motion/linking" },
      ),
    );
  }

  return linking;
}

function validateSemanticPackage(
  packageValue: TemplatePackageV1,
): Pick<
  TemplatePackageValidationResult,
  "semanticValid" | "diagnostics" | "pluginDiagnostics" | "motionLinking"
> {
  const diagnostics: PackageDiagnostic[] = [];
  const nodes = packageValue.nodes;
  const entries = Object.entries(nodes);

  if (
    !isFiniteNumber(packageValue.canvas.width) ||
    !isFiniteNumber(packageValue.canvas.height) ||
    packageValue.canvas.width <= 0 ||
    packageValue.canvas.height <= 0
  ) {
    diagnostics.push(
      diagnostic(
        "layout.invalid-canvas",
        "error",
        "layout",
        "Canvas width and height must be positive finite numbers.",
        { path: "/canvas" },
      ),
    );
  }

  const rootNode = nodes[packageValue.rootNodeId];
  if (!rootNode) {
    diagnostics.push(
      diagnostic("graph.missing-root", "error", "graph", "rootNodeId does not exist in nodes.", {
        path: "/rootNodeId",
        nodeId: packageValue.rootNodeId,
      }),
    );
  } else if (rootNode.parentId !== null) {
    diagnostics.push(
      diagnostic("graph.root-has-parent", "error", "graph", "The root node must have parentId null.", {
        path: `/nodes/${packageValue.rootNodeId}/parentId`,
        nodeId: packageValue.rootNodeId,
      }),
    );
  } else if (!["ROOT", "FLOW"].includes(getPositioningMode(rootNode))) {
    diagnostics.push(
      diagnostic(
        "graph.invalid-root-positioning",
        "error",
        "graph",
        "The root node must use ROOT positioning. FLOW roots from older package documents remain accepted.",
        {
          path: `/nodes/${packageValue.rootNodeId}/positioning`,
          nodeId: packageValue.rootNodeId,
        },
      ),
    );
  }

  const nodeIdsByValue = new Map<string, string>();
  for (const [dictionaryId, node] of entries) {
    const previousKey = nodeIdsByValue.get(node.id);
    if (previousKey !== undefined) {
      diagnostics.push(
        diagnostic(
          "graph.duplicate-node-id",
          "error",
          "graph",
          `Node id "${node.id}" is used by dictionary entries "${previousKey}" and "${dictionaryId}".`,
          { path: `/nodes/${dictionaryId}/id`, nodeId: node.id },
        ),
      );
    } else {
      nodeIdsByValue.set(node.id, dictionaryId);
    }

    if (dictionaryId !== node.id) {
      diagnostics.push(
        diagnostic(
          "graph.dictionary-id-mismatch",
          "error",
          "graph",
          `Node dictionary key "${dictionaryId}" must match node.id "${node.id}".`,
          { path: `/nodes/${dictionaryId}/id`, nodeId: node.id },
        ),
      );
    }

    for (const boundsName of ["absolute", "relative"] as const) {
      const rect = node.bounds[boundsName];
      for (const property of ["x", "y", "width", "height"] as const) {
        if (!isFiniteNumber(rect[property]) || (["width", "height"].includes(property) && rect[property] < 0)) {
          diagnostics.push(
            diagnostic(
              "layout.invalid-bounds",
              "error",
              "layout",
              `Node bounds ${boundsName}.${property} must be a finite${
                property === "width" || property === "height" ? ", non-negative" : ""
              } number.`,
              {
                path: `/nodes/${dictionaryId}/bounds/${boundsName}/${property}`,
                nodeId: dictionaryId,
              },
            ),
          );
        }
      }
    }

    validateAxisSizing(
      node.sizing.horizontal,
      `/nodes/${dictionaryId}/sizing/horizontal`,
      dictionaryId,
      diagnostics,
    );
    validateAxisSizing(
      node.sizing.vertical,
      `/nodes/${dictionaryId}/sizing/vertical`,
      dictionaryId,
      diagnostics,
    );

    for (const childId of node.children) {
      const child = nodes[childId];
      if (!child) {
        diagnostics.push(
          diagnostic(
            "graph.missing-child",
            "error",
            "graph",
            `Child node "${childId}" does not exist.`,
            { path: `/nodes/${dictionaryId}/children`, nodeId: dictionaryId },
          ),
        );
      } else if (child.parentId !== dictionaryId) {
        diagnostics.push(
          diagnostic(
            "graph.child-parent-mismatch",
            "error",
            "graph",
            `Child "${childId}" does not point back to parent "${dictionaryId}".`,
            { path: `/nodes/${childId}/parentId`, nodeId: childId },
          ),
        );
      }
    }

    if (dictionaryId !== packageValue.rootNodeId) {
      if (getPositioningMode(node) === "ROOT") {
        diagnostics.push(
          diagnostic(
            "graph.non-root-positioning",
            "error",
            "graph",
            `Non-root node "${dictionaryId}" cannot use ROOT positioning.`,
            { path: `/nodes/${dictionaryId}/positioning`, nodeId: dictionaryId },
          ),
        );
      }

      if (!node.parentId || !nodes[node.parentId]) {
        diagnostics.push(
          diagnostic(
            "graph.invalid-parent",
            "error",
            "graph",
            `Non-root node "${dictionaryId}" must have a valid parent.`,
            { path: `/nodes/${dictionaryId}/parentId`, nodeId: dictionaryId },
          ),
        );
      } else if (!nodes[node.parentId].children.includes(dictionaryId)) {
        diagnostics.push(
          diagnostic(
            "graph.parent-child-mismatch",
            "error",
            "graph",
            `Parent "${node.parentId}" does not include child "${dictionaryId}".`,
            { path: `/nodes/${node.parentId}/children`, nodeId: dictionaryId },
          ),
        );
      }
    }

    for (const assetId of collectNodeAssetIds(node)) {
      if (!resolvePackageAssetReference(packageValue, assetId)) {
        diagnostics.push(
          diagnostic(
            "asset.missing-reference",
            "error",
            "asset",
            `Node "${dictionaryId}" references missing asset "${assetId}".`,
            { path: `/nodes/${dictionaryId}`, nodeId: dictionaryId },
          ),
        );
      }
    }

    const imageAsset = resolvePackageAssetReference(
      packageValue,
      node.image?.assetId,
    );
    if (node.image?.assetId && imageAsset && imageAsset.asset.type !== "image") {
      diagnostics.push(
        diagnostic(
          "asset.type-mismatch",
          "error",
          "asset",
          `Image payload on node "${dictionaryId}" must reference an image asset.`,
          { path: `/nodes/${dictionaryId}/image/assetId`, nodeId: dictionaryId },
        ),
      );
    }
    const vectorAsset = resolvePackageAssetReference(
      packageValue,
      node.vector?.assetId,
    );
    if (
      node.vector?.assetId &&
      vectorAsset &&
      !["svg", "vector"].includes(vectorAsset.asset.type)
    ) {
      diagnostics.push(
        diagnostic(
          "asset.type-mismatch",
          "error",
          "asset",
          `Vector payload on node "${dictionaryId}" must reference a vector asset.`,
          { path: `/nodes/${dictionaryId}/vector/assetId`, nodeId: dictionaryId },
        ),
      );
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (nodeId: string): void => {
    if (visiting.has(nodeId)) {
      diagnostics.push(
        diagnostic("graph.cycle", "error", "graph", `Node graph contains a cycle at "${nodeId}".`, {
          path: `/nodes/${nodeId}`,
          nodeId,
        }),
      );
      return;
    }
    if (visited.has(nodeId) || !nodes[nodeId]) return;
    visiting.add(nodeId);
    nodes[nodeId].children.forEach(visit);
    visiting.delete(nodeId);
    visited.add(nodeId);
  };
  entries.forEach(([nodeId]) => visit(nodeId));

  const fieldIds = new Set<string>();
  packageValue.editableFields.forEach((field, index) => {
    const path = `/editableFields/${index}`;
    if (fieldIds.has(field.id)) {
      diagnostics.push(
        diagnostic(
          "field.duplicate-id",
          "error",
          "field",
          `Editable field id "${field.id}" is duplicated.`,
          { path: `${path}/id`, nodeId: field.nodeId },
        ),
      );
    }
    fieldIds.add(field.id);

    const node = nodes[field.nodeId];
    if (!node) {
      diagnostics.push(
        diagnostic(
          "field.missing-node",
          "error",
          "field",
          `Editable field "${field.id}" references missing node "${field.nodeId}".`,
          { path: `${path}/nodeId`, nodeId: field.nodeId },
        ),
      );
      return;
    }

    if (!allowedFieldProperties[node.type].some((pattern) => pattern.test(field.property))) {
      diagnostics.push(
        diagnostic(
          "field.invalid-property",
          "error",
          "field",
          `Property "${field.property}" is not editable on ${node.type} nodes.`,
          { path: `${path}/property`, nodeId: field.nodeId },
        ),
      );
    }

    const expectedType = field.type === "boolean" ? "boolean" : field.type === "number" ? "number" : "string";
    if (field.defaultValue !== null && typeof field.defaultValue !== expectedType) {
      diagnostics.push(
        diagnostic(
          "field.invalid-default-value",
          "error",
          "field",
          `Default value for ${field.type} field "${field.id}" must be a ${expectedType}.`,
          { path: `${path}/defaultValue`, nodeId: field.nodeId },
        ),
      );
    }

    const imageFieldAssetReferences = field.type === "image"
      ? [field.defaultValue, field.typedRef, field.assetRef].filter(
          (reference): reference is string =>
            typeof reference === "string" && reference.length > 0,
        )
      : [];
    if (
      field.type === "image" &&
      imageFieldAssetReferences.length > 0 &&
      !imageFieldAssetReferences.some((reference) =>
        resolvePackageAssetReference(packageValue, reference),
      )
    ) {
      diagnostics.push(
        diagnostic(
          "field.missing-default-asset",
          "error",
          "field",
          `Image field "${field.id}" has no resolvable imported asset reference.`,
          { path: `${path}/defaultValue`, nodeId: field.nodeId },
        ),
      );
    }

    if (field.constraints) {
      const constraints = field.constraints as Record<string, unknown>;
      const textField = ["text", "textarea", "number", "date"].includes(
        field.type,
      );
      if (
        textField &&
        typeof constraints.minCharacters === "number" &&
        typeof constraints.maxCharacters === "number" &&
        constraints.minCharacters > constraints.maxCharacters
      ) {
        diagnostics.push(
          diagnostic(
            "field.invalid-character-range",
            "error",
            "field",
            `Editable field "${field.id}" has minCharacters greater than maxCharacters.`,
            { path: `${path}/constraints`, nodeId: field.nodeId },
          ),
        );
      }
      if (
        textField &&
        constraints.pattern === "custom" &&
        (typeof constraints.customPattern !== "string" ||
          constraints.customPattern.length === 0)
      ) {
        diagnostics.push(
          diagnostic(
            "field.custom-pattern-missing",
            "error",
            "field",
            `Editable field "${field.id}" uses a custom pattern without customPattern.`,
            { path: `${path}/constraints/customPattern`, nodeId: field.nodeId },
          ),
        );
      }
      if (
        field.type === "image" &&
        ["minCharacters", "maxCharacters", "maxWords", "maxLines"].some(
          (key) => constraints[key] !== undefined,
        )
      ) {
        diagnostics.push(
          diagnostic(
            "field.image-text-constraints",
            "warning",
            "field",
            `Image field "${field.id}" contains text-only constraints that will be ignored.`,
            { path: `${path}/constraints`, nodeId: field.nodeId },
          ),
        );
      }
      if (
        textField &&
        ["allowedMimeTypes", "maxFileSizeMb", "minWidth", "minHeight"].some(
          (key) => constraints[key] !== undefined,
        )
      ) {
        diagnostics.push(
          diagnostic(
            "field.text-image-constraints",
            "warning",
            "field",
            `Text field "${field.id}" contains image-only constraints that will be ignored.`,
            { path: `${path}/constraints`, nodeId: field.nodeId },
          ),
        );
      }
    }
  });

  Object.entries(packageValue.assets).forEach(([dictionaryId, asset]) => {
    if (dictionaryId !== asset.id) {
      diagnostics.push(
        diagnostic(
          "asset.dictionary-id-mismatch",
          "error",
          "asset",
          `Asset dictionary key "${dictionaryId}" must match asset.id "${asset.id}".`,
          { path: `/assets/${dictionaryId}/id` },
        ),
      );
    }
    if (
      (asset.width !== undefined && (!isFiniteNumber(asset.width) || asset.width <= 0)) ||
      (asset.height !== undefined && (!isFiniteNumber(asset.height) || asset.height <= 0))
    ) {
      diagnostics.push(
        diagnostic(
          "asset.invalid-dimensions",
          "error",
          "asset",
          `Asset "${dictionaryId}" dimensions must be positive finite numbers.`,
          { path: `/assets/${dictionaryId}` },
        ),
      );
    }
    if (
      asset.source === "embedded" &&
      asset.deferred !== true &&
      asset.type === "image" &&
      !asset.dataUrl &&
      !asset.data
    ) {
      diagnostics.push(
        diagnostic(
          "asset.missing-data",
          "error",
          "asset",
          `Embedded asset "${dictionaryId}" requires dataUrl or data.`,
          { path: `/assets/${dictionaryId}` },
        ),
      );
    }
    if (
      asset.source === "embedded" &&
      asset.deferred !== true &&
      asset.type === "font" &&
      !asset.dataUrl &&
      !asset.data
    ) {
      diagnostics.push(
        diagnostic(
          "asset.missing-font-data",
          "error",
          "asset",
          `Embedded font asset "${dictionaryId}" requires dataUrl or data.`,
          { path: `/assets/${dictionaryId}` },
        ),
      );
    }
    if (
      asset.source === "embedded" &&
      asset.deferred !== true &&
      ["svg", "vector"].includes(asset.type) &&
      !asset.svgString &&
      !asset.data
    ) {
      diagnostics.push(
        diagnostic(
          "asset.missing-vector-data",
          "error",
          "asset",
          `Embedded vector asset "${dictionaryId}" requires svgString or data.`,
          { path: `/assets/${dictionaryId}` },
        ),
      );
    }
    if (asset.source === "remote" && !asset.url) {
      diagnostics.push(
        diagnostic(
          "asset.missing-url",
          "error",
          "asset",
          `Remote asset "${dictionaryId}" requires a URL.`,
          { path: `/assets/${dictionaryId}/url` },
        ),
      );
    }
    inspectPackageAssetSafety(asset).forEach((issue) => {
      diagnostics.push(
        diagnostic(
          issue.code,
          issue.severity,
          "asset",
          issue.message,
          { path: `/assets/${dictionaryId}` },
        ),
      );
    });
  });

  const fontRequirementIds = new Set<string>();
  packageValue.fontRequirements?.forEach((font, index) => {
    const path = `/fontRequirements/${index}`;
    if (fontRequirementIds.has(font.id)) {
      diagnostics.push(
        diagnostic(
          "font.duplicate-requirement",
          "error",
          "font",
          `Font requirement "${font.id}" is duplicated.`,
          { path: `${path}/id` },
        ),
      );
    }
    fontRequirementIds.add(font.id);
    font.usedBy.forEach((nodeId) => {
      const node = nodes[nodeId];
      if (!node) {
        diagnostics.push(
          diagnostic(
            "font.missing-node",
            "error",
            "font",
            `Font requirement "${font.id}" references missing node "${nodeId}".`,
            { path: `${path}/usedBy`, nodeId },
          ),
        );
      } else if (node.type !== "TEXT") {
        diagnostics.push(
          diagnostic(
            "font.non-text-node",
            "error",
            "font",
            `Font requirement "${font.id}" references non-text node "${nodeId}".`,
            { path: `${path}/usedBy`, nodeId },
          ),
        );
      }
    });
    if (font.assetId && packageValue.assets[font.assetId]?.type !== "font") {
      diagnostics.push(
        diagnostic(
          "font.invalid-asset",
          "error",
          "font",
          `Font requirement "${font.id}" must reference a font asset.`,
          { path: `${path}/assetId` },
        ),
      );
    }
    if (!font.availableInFigma) {
      diagnostics.push(
        diagnostic(
          "font.unavailable-in-figma",
          "warning",
          "font",
          `Font face ${font.family} ${font.weight} ${font.cssStyle} was unavailable in Figma during export.`,
          { path, nodeId: font.usedBy[0] },
        ),
      );
    }
  });

  Object.values(nodes).forEach((node) => {
    if (node.type !== "TEXT" || !("characters" in node.text)) return;
    const text = node.text;
    text.styleRanges?.forEach((range, index) => {
      if (range.end < range.start || range.end > text.characters.length) {
        diagnostics.push(
          diagnostic(
            "font.invalid-style-range",
            "error",
            "font",
            `Text style range ${index} on node "${node.id}" is outside its character bounds.`,
            {
              path: `/nodes/${node.id}/text/styleRanges/${index}`,
              nodeId: node.id,
            },
          ),
        );
      }
    });
    if (node.textFallback) {
      const fallbackAsset = packageValue.assets[node.textFallback.assetId];
      if (!fallbackAsset || !["svg", "vector"].includes(fallbackAsset.type)) {
        diagnostics.push(
          diagnostic(
            "font.invalid-outline-fallback",
            "error",
            "font",
            `Outlined text fallback on node "${node.id}" must reference an SVG or vector asset.`,
            {
              path: `/nodes/${node.id}/textFallback/assetId`,
              nodeId: node.id,
            },
          ),
        );
      }
      if (
        packageValue.editableFields.some((field) => field.nodeId === node.id)
      ) {
        diagnostics.push(
          diagnostic(
            "font.editable-outline-fallback",
            "warning",
            "font",
            `Outlined fallback on editable text node "${node.id}" will not replace live editable text.`,
            {
              path: `/nodes/${node.id}/textFallback`,
              nodeId: node.id,
            },
          ),
        );
      }
    }
  });

  if (
    packageValue.referencePreview?.assetId &&
    !packageValue.assets[packageValue.referencePreview.assetId]
  ) {
    diagnostics.push(
      diagnostic(
        "asset.missing-reference-preview",
        "error",
        "asset",
        `Reference preview asset "${packageValue.referencePreview.assetId}" does not exist.`,
        { path: "/referencePreview/assetId" },
      ),
    );
  }

  const maskResolution = resolvePackageMaskRelationships(packageValue);
  for (const issue of maskResolution.issues) {
    diagnostics.push(
      diagnostic(
        issue.code,
        issue.severity,
        "graph",
        issue.message,
        { path: issue.path, nodeId: issue.nodeId },
      ),
    );
  }

  const motionLinking = validateMotion(packageValue, diagnostics);

  return {
    semanticValid: !diagnostics.some((item) => item.severity === "error"),
    diagnostics,
    pluginDiagnostics: packageValue.diagnostics ?? [],
    motionLinking,
  };
}

export function validateTemplatePackage(input: unknown): TemplatePackageValidationResult {
  const schemaValid = validateSchema(input);
  if (!schemaValid) {
    return {
      valid: false,
      schemaValid: false,
      semanticValid: false,
      diagnostics: schemaDiagnostics(validateSchema.errors),
      pluginDiagnostics: extractPluginDiagnostics(input),
      motionLinking: null,
    };
  }

  const semantic = validateSemanticPackage(input as unknown as TemplatePackageV1);
  return {
    valid: semantic.semanticValid,
    schemaValid: true,
    ...semantic,
  };
}
