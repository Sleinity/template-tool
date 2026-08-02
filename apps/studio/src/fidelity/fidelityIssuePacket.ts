import { strToU8, zipSync } from "fflate";
import {
  createCanonicalSceneGraph,
  type ResolvedRenderTreeV1,
  type TemplatePackageV1,
} from "@sleinity/template-core";
import type { ResolvedProductRenderIdentityV1 } from "@sleinity/template-react";
import type { PackageQualityIssue } from "@sleinity/template-react/inspection";

export interface FidelityIssuePacketInput {
  packageValue: TemplatePackageV1;
  resolvedTree: ResolvedRenderTreeV1;
  issue: PackageQualityIssue;
  productRenderIdentity: ResolvedProductRenderIdentityV1 | null;
  operatorDescription: string;
  currentScreenshot?: string | null;
  sourceReference?: string | null;
  regionalDiff?: string | null;
}

export interface FidelityIssuePacketResult {
  packetId: string;
  filename: string;
  bytes: Uint8Array;
  paths: string[];
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") {
    if (typeof value === "string" && /^(data:|blob:|https?:\/\/)/i.test(value)) return "[external-reference-omitted]";
    return value;
  }
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .filter(([key]) => !/(objecturl|bloburl|timestamp|createdat|updatedat|bytes|binary)/i.test(key))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => [key, stableValue(entry)]));
}

function stableStringify(value: unknown): string {
  return JSON.stringify(stableValue(value), null, 2);
}

function stableHash(value: unknown): string {
  const input = stableStringify(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function json(value: unknown): Uint8Array {
  return strToU8(`${stableStringify(value)}\n`);
}

function dataUrlBytes(value: string | null | undefined): Uint8Array | null {
  if (!value?.startsWith("data:")) return null;
  const comma = value.indexOf(",");
  if (comma < 0) return null;
  const meta = value.slice(0, comma);
  const body = value.slice(comma + 1);
  try {
    if (meta.includes(";base64")) {
      const binary = atob(body);
      return Uint8Array.from(binary, (character) => character.charCodeAt(0));
    }
    return new TextEncoder().encode(decodeURIComponent(body));
  } catch {
    return null;
  }
}

export function createFidelityIssuePacket(input: FidelityIssuePacketInput): FidelityIssuePacketResult {
  const { packageValue, resolvedTree, issue, productRenderIdentity } = input;
  const canonical = createCanonicalSceneGraph(packageValue).graph;
  const nodeId = issue.nodeId ?? issue.sourceNodeId ?? null;
  const normalizedEvidence = {
    packageId: packageValue.packageId,
    packageSchemaVersion: packageValue.schemaVersion,
    rootNodeId: packageValue.rootNodeId,
    issue: stableValue(issue),
    operatorDescription: input.operatorDescription.trim(),
    productRenderIdentity,
    canonicalNode: nodeId ? canonical.nodes[nodeId] ?? null : null,
    resolvedNode: nodeId ? resolvedTree.nodes[nodeId] ?? null : null,
  };
  const packetId = `fidelity-issue-${stableHash(normalizedEvidence)}`;
  const files: Record<string, Uint8Array> = {};
  const add = (path: string, bytes: Uint8Array) => { files[path] = bytes; };

  add("manifest.json", json({
    schemaVersion: "fidelity-issue-packet-v1",
    packetId,
    packageId: packageValue.packageId,
    issueId: issue.id,
    rootCauseId: issue.rootCauseId ?? issue.code,
    includesPixels: Boolean(input.currentScreenshot || input.sourceReference || input.regionalDiff),
    privacy: "No raw package ZIP or asset bytes are included.",
  }));
  add("issue.json", json({ ...issue, operatorDescription: input.operatorDescription.trim() }));
  add("evidence/source-fragment.json", json({
    rootNodeId: packageValue.rootNodeId,
    nodeId,
    sourceNode: nodeId ? packageValue.nodes[nodeId] ?? null : null,
    fieldBindings: packageValue.editableFields.filter((field) => field.nodeId === nodeId),
    assetMetadata: Object.values(packageValue.assets).filter((asset) =>
      nodeId ? JSON.stringify(packageValue.nodes[nodeId] ?? {}).includes(asset.id) : false,
    ).map((asset) => ({ id: asset.id, type: asset.type, source: asset.source, mimeType: asset.mimeType, hash: asset.hash, sizeBytes: asset.sizeBytes })),
  }));
  add("evidence/canonical-fragment.json", json({ nodeId, node: nodeId ? canonical.nodes[nodeId] ?? null : null }));
  add("evidence/resolved-fragment.json", json({
    nodeId,
    node: nodeId ? resolvedTree.nodes[nodeId] ?? null : null,
    backendDiagnostic: resolvedTree.backendDiagnostics.diagnostics.filter((diagnostic) => diagnostic.nodeId === nodeId),
  }));
  add("evidence/product-render-identity.json", json(productRenderIdentity));
  add("evidence/environment.json", json({
    userAgent: typeof navigator === "undefined" ? "unavailable" : navigator.userAgent,
    language: typeof navigator === "undefined" ? "unavailable" : navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    devicePixelRatio: typeof window === "undefined" ? null : window.devicePixelRatio,
  }));
  add("HANDOFF.md", strToU8(`# Fidelity issue packet\n\n- Packet: ${packetId}\n- Package: ${packageValue.packageId}\n- Finding: ${issue.code}\n- Root cause: ${issue.rootCauseId ?? issue.code}\n- Region: ${issue.regionId ?? nodeId ?? "package"}\n- Owner: ${issue.backendOwner ?? "not resolved"}\n- Fallback: ${String(issue.details?.fallback ?? "none recorded")}\n- Affected surfaces: ${(issue.affectedSurfaces ?? []).join(", ") || "not recorded"}\n- Expected versus actual: ${input.operatorDescription.trim()}\n- Recommended bounded action: ${issue.recommendedAction ?? issue.suggestedFix ?? "Inspect the selected capability boundary."}\n\nThis packet is local evidence. It contains no raw package ZIP or asset bytes.\n`));

  ([
    ["evidence/current-screenshot.png", input.currentScreenshot],
    ["evidence/source-reference.png", input.sourceReference],
    ["evidence/regional-diff.png", input.regionalDiff],
  ] as const).forEach(([path, value]) => {
    const bytes = dataUrlBytes(value);
    if (bytes) add(path, bytes);
  });

  const paths = Object.keys(files).sort();
  const orderedFiles = Object.fromEntries(paths.map((path) => [path, files[path]]));
  return {
    packetId,
    filename: `${packetId}.zip`,
    bytes: zipSync(orderedFiles, { level: 6 }),
    paths,
  };
}

export function downloadFidelityIssuePacket(packet: FidelityIssuePacketResult): void {
  const blob = new Blob([packet.bytes as BlobPart], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = packet.filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
