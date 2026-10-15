import type {
  PackageMaskRelationship,
  PackageRect,
  TemplateNode,
  TemplatePackageV1,
} from "../types";

export type PackageMaskCapability =
  | "exact-opaque-rectangular-alpha"
  | "unsupported-mask-type"
  | "unsupported-source-geometry"
  | "unsupported-source-paint"
  | "unsupported-source-transform"
  | "invalid-relationship";

export interface PackageMaskRelationshipIssue {
  code: string;
  message: string;
  path: string;
  nodeId?: string;
  severity: "error" | "warning";
}

export interface PackageMaskAffectedNode {
  nodeId: string;
  clipInsets: { top: number; right: number; bottom: number; left: number } | null;
}

export interface ResolvedPackageMaskRelationship {
  relationshipIndex: number;
  relationshipId: string;
  maskRevision: string;
  source: PackageMaskRelationship;
  maskSourceId: string;
  parentId: string;
  maskType: string;
  affected: PackageMaskAffectedNode[];
  status: "valid" | "invalid";
  capability: PackageMaskCapability;
  renderStrategy: "css-clip-path" | "compatibility-unmasked";
  paintRole: "mask-input";
  maskBounds: PackageRect | null;
  issues: PackageMaskRelationshipIssue[];
}

export interface PackageMaskResolution {
  relationships: ResolvedPackageMaskRelationship[];
  issues: PackageMaskRelationshipIssue[];
}

export function stableMaskContractHash(value: unknown): string {
  const input = typeof value === "string" ? value : JSON.stringify(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function finiteRect(rect: PackageRect): boolean {
  return [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) &&
    rect.width >= 0 && rect.height >= 0;
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function identityTranslation(node: TemplateNode): boolean {
  const figma = record(node.extensions?.figma);
  const matrix = figma?.relativeTransform;
  if (matrix === undefined) return true;
  if (!Array.isArray(matrix) || matrix.length !== 2) return false;
  const row0 = matrix[0];
  const row1 = matrix[1];
  if (!Array.isArray(row0) || !Array.isArray(row1) || row0.length < 3 || row1.length < 3) return false;
  const values = [...row0.slice(0, 3), ...row1.slice(0, 3)];
  if (!values.every((value) => typeof value === "number" && Number.isFinite(value))) return false;
  const tolerance = 1e-6;
  return Math.abs(row0[0] - 1) <= tolerance &&
    Math.abs(row0[1]) <= tolerance &&
    Math.abs(row1[0]) <= tolerance &&
    Math.abs(row1[1] - 1) <= tolerance &&
    Math.abs(row0[2] - node.bounds.relative.x) <= tolerance &&
    Math.abs(row1[2] - node.bounds.relative.y) <= tolerance;
}

function zeroCornerRadius(node: TemplateNode): boolean {
  const values: unknown[] = [
    node.shape?.cornerRadius,
    node.appearance.cornerRadius,
    node.appearance.borderRadius,
    node.appearance.cornerRadii,
  ];
  return values.every((value) => {
    if (value === undefined || value === null) return true;
    if (typeof value === "number") return value === 0;
    if (Array.isArray(value)) return value.every((entry) => entry === 0);
    if (typeof value === "object") return Object.values(value).every((entry) => entry === 0);
    return false;
  });
}

function exactOpaqueSolidMask(node: TemplateNode): boolean {
  const visibleFills = node.appearance.fills.filter((paint) => paint.visible !== false);
  if (visibleFills.length !== 1) return false;
  const paint = visibleFills[0];
  return paint.type === "SOLID" &&
    (paint.opacity ?? 1) === 1 &&
    paint.color.a === 1 &&
    (!paint.blendMode || ["NORMAL", "PASS_THROUGH"].includes(paint.blendMode.toUpperCase())) &&
    node.appearance.opacity === 1 &&
    node.appearance.visible !== false &&
    (!node.appearance.blendMode || ["NORMAL", "PASS_THROUGH"].includes(node.appearance.blendMode.toUpperCase())) &&
    node.appearance.strokes.length === 0 &&
    node.appearance.effects.length === 0;
}

export function maskClipInsets(
  mask: PackageRect,
  affected: PackageRect,
): PackageMaskAffectedNode["clipInsets"] {
  if (!finiteRect(mask) || !finiteRect(affected)) return null;
  const leftEdge = Math.max(mask.x, affected.x);
  const topEdge = Math.max(mask.y, affected.y);
  const rightEdge = Math.min(mask.x + mask.width, affected.x + affected.width);
  const bottomEdge = Math.min(mask.y + mask.height, affected.y + affected.height);
  if (rightEdge <= leftEdge || bottomEdge <= topEdge) return null;
  return {
    top: Math.max(0, topEdge - affected.y),
    right: Math.max(0, affected.x + affected.width - rightEdge),
    bottom: Math.max(0, affected.y + affected.height - bottomEdge),
    left: Math.max(0, leftEdge - affected.x),
  };
}

function relationshipIdentity(
  packageValue: TemplatePackageV1,
  relationship: PackageMaskRelationship,
  index: number,
): string {
  return [
    packageValue.packageId,
    index,
    relationship.parentId,
    relationship.maskSourceId,
    relationship.affectedSiblingIds.join(","),
    relationship.scopeTerminationReason,
  ].join(":");
}

export function resolvePackageMaskRelationships(
  packageValue: TemplatePackageV1,
): PackageMaskResolution {
  const relationships: ResolvedPackageMaskRelationship[] = [];
  const issues: PackageMaskRelationshipIssue[] = [];
  const claimedAffected = new Set<string>();
  const claimedSources = new Set<string>();

  for (const [relationshipIndex, source] of (packageValue.maskRelationships ?? []).entries()) {
    const path = `/maskRelationships/${relationshipIndex}`;
    const localIssues: PackageMaskRelationshipIssue[] = [];
    const add = (
      code: string,
      message: string,
      suffix = "",
      nodeId?: string,
      severity: "error" | "warning" = "error",
    ): void => {
      localIssues.push({ code, message, path: `${path}${suffix}`, nodeId, severity });
    };
    const parent = packageValue.nodes[source.parentId];
    const maskNode = packageValue.nodes[source.maskSourceId];
    if (claimedSources.has(source.maskSourceId)) add("mask.duplicate-source-scope", "A mask source may declare only one active sibling scope.", "/maskSourceId", source.maskSourceId);
    claimedSources.add(source.maskSourceId);
    if (!parent) add("mask.missing-parent", `Mask parent "${source.parentId}" does not exist.`, "/parentId", source.parentId);
    if (!maskNode) add("mask.missing-source", `Mask source "${source.maskSourceId}" does not exist.`, "/maskSourceId", source.maskSourceId);
    if (maskNode && maskNode.mask?.isMask !== true) {
      add("mask.source-not-classified", "Only node.mask.isMask=true classifies an active mask source.", "/maskSourceId", maskNode.id);
    }
    if (maskNode && maskNode.parentId !== source.parentId) {
      add("mask.cross-parent-source", "Mask source and relationship must have the same parent.", "/parentId", maskNode.id);
    }
    if (parent && !parent.children.includes(source.maskSourceId)) {
      add("mask.source-not-child", "Mask source is not an ordered child of the declared parent.", "/maskSourceId", source.maskSourceId);
    }
    if (source.affectedSiblingIds.length === 0) {
      add("mask.empty-scope", "A mask relationship must affect at least one sibling.", "/affectedSiblingIds", source.maskSourceId);
    }
    const sourceIndex = parent?.children.indexOf(source.maskSourceId) ?? -1;
    let lastIndex = sourceIndex;
    const affected = source.affectedSiblingIds.map((nodeId, affectedIndex) => {
      const node = packageValue.nodes[nodeId];
      const childIndex = parent?.children.indexOf(nodeId) ?? -1;
      if (nodeId === source.maskSourceId) add("mask.self-mask", "A mask source cannot be inside its own affected sibling scope.", `/affectedSiblingIds/${affectedIndex}`, nodeId);
      if (!node) add("mask.missing-affected-node", `Affected node "${nodeId}" does not exist.`, `/affectedSiblingIds/${affectedIndex}`, nodeId);
      else if (node.parentId !== source.parentId) add("mask.cross-parent-affected", "Affected mask nodes must be siblings of the source.", `/affectedSiblingIds/${affectedIndex}`, nodeId);
      if (parent && childIndex < 0) add("mask.affected-not-child", "Affected node is not an ordered child of the declared parent.", `/affectedSiblingIds/${affectedIndex}`, nodeId);
      if (childIndex <= lastIndex) add("mask.invalid-sibling-order", "Affected sibling order must follow the mask source and remain monotonic.", `/affectedSiblingIds/${affectedIndex}`, nodeId);
      if (claimedAffected.has(`${source.parentId}:${nodeId}`)) add("mask.overlapping-scope", "An affected sibling may belong to only one active mask scope per parent.", `/affectedSiblingIds/${affectedIndex}`, nodeId);
      claimedAffected.add(`${source.parentId}:${nodeId}`);
      lastIndex = childIndex;
      return {
        nodeId,
        clipInsets: maskNode && node ? maskClipInsets(maskNode.bounds.relative, node.bounds.relative) : null,
      };
    });
    if (source.scopeTerminationReason !== "end_of_siblings") {
      add("mask.unsupported-termination", `Mask termination "${source.scopeTerminationReason}" is preserved but unsupported.`, "/scopeTerminationReason", source.maskSourceId, "warning");
    }

    let capability: PackageMaskCapability = "invalid-relationship";
    if (!localIssues.some((issue) => issue.severity === "error") && maskNode) {
      const maskType = (maskNode.mask?.maskType ?? "").toUpperCase();
      capability = maskType !== "ALPHA"
        ? "unsupported-mask-type"
        : maskNode.type !== "RECTANGLE" || !zeroCornerRadius(maskNode) || affected.some((entry) => !entry.clipInsets)
          ? "unsupported-source-geometry"
          : !identityTranslation(maskNode)
            ? "unsupported-source-transform"
            : !exactOpaqueSolidMask(maskNode)
              ? "unsupported-source-paint"
              : "exact-opaque-rectangular-alpha";
    }
    const valid = !localIssues.some((issue) => issue.severity === "error");
    const identity = relationshipIdentity(packageValue, source, relationshipIndex);
    const relationship: ResolvedPackageMaskRelationship = {
      relationshipIndex,
      relationshipId: `mask:${identity}`,
      maskRevision: `mask-v1:${stableMaskContractHash({
        identity,
        bounds: maskNode?.bounds.relative ?? null,
        mask: maskNode?.mask ?? null,
        appearance: maskNode?.appearance ?? null,
      })}`,
      source,
      maskSourceId: source.maskSourceId,
      parentId: source.parentId,
      maskType: (maskNode?.mask?.maskType ?? "UNKNOWN").toUpperCase(),
      affected,
      status: valid ? "valid" : "invalid",
      capability,
      renderStrategy: valid && capability === "exact-opaque-rectangular-alpha"
        ? "css-clip-path"
        : "compatibility-unmasked",
      paintRole: "mask-input",
      maskBounds: maskNode ? { ...maskNode.bounds.relative } : null,
      issues: localIssues,
    };
    relationships.push(relationship);
    issues.push(...localIssues);
  }
  for (const node of Object.values(packageValue.nodes)) {
    if (node.mask?.isMask === true && !claimedSources.has(node.id)) {
      issues.push({
        code: "mask.missing-relationship",
        message: "The active canonical mask source has no declared sibling relationship; it remains preserved with compatibility ownership.",
        path: `/nodes/${node.id}/mask`,
        nodeId: node.id,
        severity: "warning",
      });
    }
  }
  return { relationships, issues };
}

export function findMaskRelationshipForSource(
  relationships: ResolvedPackageMaskRelationship[],
  nodeId: string,
): ResolvedPackageMaskRelationship | null {
  return relationships.find((relationship) => relationship.maskSourceId === nodeId) ?? null;
}

export function findMaskRelationshipForAffected(
  relationships: ResolvedPackageMaskRelationship[],
  nodeId: string,
): { relationship: ResolvedPackageMaskRelationship; affected: PackageMaskAffectedNode } | null {
  for (const relationship of relationships) {
    const affected = relationship.affected.find((entry) => entry.nodeId === nodeId);
    if (affected) return { relationship, affected };
  }
  return null;
}
