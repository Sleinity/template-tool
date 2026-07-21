import { strFromU8, unzipSync } from "fflate";
import figmaPluginV041 from "../fixtures/figma-plugin-v0.4.1.json";
import { createResolvedRenderTree } from "../resolved";
import type { TemplatePackageV1 } from "../types";
import { createFidelityIssuePacket } from "./fidelityIssuePacket";
import type { PackageQualityIssue } from "./types";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

const packageValue = structuredClone(figmaPluginV041 as unknown as TemplatePackageV1);
const nodeId = Object.keys(packageValue.nodes).find((candidate) => candidate !== packageValue.rootNodeId)!;
const issue: PackageQualityIssue = {
  id: "issue:test",
  fingerprint: "unsupported|node",
  code: "backend.test-capability",
  severity: "warning",
  category: "renderer",
  origins: ["backend-decision"],
  message: "Compatibility rendering is active.",
  whyItMatters: "Review the region.",
  blocks: [],
  blocksImport: false,
  nodeId,
  regionId: `node:${nodeId}`,
  capabilityId: "TEST-CAPABILITY",
  backendOwner: "legacy-dom-css",
  rootCauseId: "test-capability",
  originBoundary: "resolved",
  affectedSurfaces: ["validate", "fields", "editor", "png-export"],
  recommendedAction: "Inspect the bounded capability.",
};
const input = {
  packageValue,
  resolvedTree: createResolvedRenderTree(packageValue),
  issue,
  productRenderIdentity: null,
  operatorDescription: "Expected the source appearance; compatibility output differs.",
};
const first = createFidelityIssuePacket(input);
const second = createFidelityIssuePacket(input);
assert(first.packetId === second.packetId, "Unchanged evidence must produce the same packet identity.");
assert(first.paths.join("|") === second.paths.join("|"), "Packet paths must be stable.");
assert(!first.paths.some((path) => /asset\.(png|jpg|svg)$/i.test(path)), "Issue packets must not include asset bytes by default.");
const contents = unzipSync(first.bytes);
assert(Boolean(contents["manifest.json"] && contents["HANDOFF.md"]), "Issue packet must include manifest and handoff files.");
assert(!strFromU8(contents["evidence/source-fragment.json"]).includes("data:image"), "Source fragments must omit embedded pixel data.");
const changed = createFidelityIssuePacket({ ...input, operatorDescription: `${input.operatorDescription} Extra evidence.` });
assert(first.packetId !== changed.packetId, "Operator evidence must participate in packet identity.");
