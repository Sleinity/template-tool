import type {
  FigmaMcpMetadata,
  FigmaMcpNodeMetadata,
  ParsedFigmaUrl,
} from "../../../../src/template-package/enrichment";
import { FigmaProviderError } from "./provider";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function finiteNumber(value: unknown): number | undefined {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function metadataFromObject(
  value: Record<string, unknown>,
  reference: ParsedFigmaUrl,
): FigmaMcpMetadata | null {
  const candidate = isRecord(value.metadata) ? value.metadata : value;
  const nodes = candidate.nodes;
  if (!nodes || (!isRecord(nodes) && !Array.isArray(nodes))) return null;
  return {
    rootNodeId:
      typeof candidate.rootNodeId === "string"
        ? candidate.rootNodeId
        : reference.nodeId ?? undefined,
    rootName:
      typeof candidate.rootName === "string" ? candidate.rootName : undefined,
    canvas: isRecord(candidate.canvas)
      ? {
          width: finiteNumber(candidate.canvas.width) ?? 0,
          height: finiteNumber(candidate.canvas.height) ?? 0,
        }
      : undefined,
    nodes: nodes as FigmaMcpMetadata["nodes"],
  };
}

function parseAttributes(source: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  const pattern = /([\w:-]+)="([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source))) {
    attributes[match[1]] = match[2];
  }
  return attributes;
}

function metadataFromXml(
  source: string,
  reference: ParsedFigmaUrl,
): FigmaMcpMetadata | null {
  const tagPattern = /<\/?([A-Za-z][\w-]*)([^>]*)>/g;
  const nodes: Record<string, FigmaMcpNodeMetadata> = {};
  const stack: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(source))) {
    const fullTag = match[0];
    const closing = fullTag.startsWith("</");
    const selfClosing = fullTag.endsWith("/>");
    if (closing) {
      stack.pop();
      continue;
    }
    const attributes = parseAttributes(match[2]);
    const id = attributes.id ?? attributes["node-id"];
    if (!id) continue;
    const parentId = stack[stack.length - 1] ?? null;
    const width = finiteNumber(attributes.width);
    const height = finiteNumber(attributes.height);
    const x = finiteNumber(attributes.x);
    const y = finiteNumber(attributes.y);
    nodes[id] = {
      id,
      name: attributes.name ?? match[1],
      type: match[1].toUpperCase(),
      parentId,
      children: [],
      bounds:
        width !== undefined &&
        height !== undefined &&
        x !== undefined &&
        y !== undefined
          ? { x, y, width, height }
          : undefined,
      dataName: attributes["data-name"] ?? attributes.name,
    };
    if (parentId && nodes[parentId]) nodes[parentId].children?.push(id);
    if (!selfClosing) stack.push(id);
  }

  const ids = Object.keys(nodes);
  if (ids.length === 0) return null;
  const rootNodeId =
    (reference.nodeId && nodes[reference.nodeId] ? reference.nodeId : ids[0]) ??
    undefined;
  const root = rootNodeId ? nodes[rootNodeId] : undefined;
  return {
    rootNodeId,
    rootName: root?.name,
    canvas: root?.bounds
      ? { width: root.bounds.width, height: root.bounds.height }
      : undefined,
    nodes,
  };
}

export function normalizeProviderMetadata(
  value: unknown,
  reference: ParsedFigmaUrl,
): FigmaMcpMetadata {
  const objectMetadata = isRecord(value)
    ? metadataFromObject(value, reference)
    : null;
  const xmlMetadata =
    typeof value === "string" ? metadataFromXml(value, reference) : null;
  const metadata = objectMetadata ?? xmlMetadata;
  if (!metadata) {
    throw new FigmaProviderError(
      "The Figma provider returned metadata in an unsupported format.",
    );
  }
  if (
    reference.nodeId &&
    !Object.values(
      Array.isArray(metadata.nodes)
        ? Object.fromEntries(metadata.nodes.map((node) => [node.id, node]))
        : metadata.nodes,
    ).some((node) => node.id === reference.nodeId)
  ) {
    throw new FigmaProviderError(
      `Figma node ${reference.nodeId} was not found.`,
      "node-not-found",
    );
  }
  return metadata;
}
