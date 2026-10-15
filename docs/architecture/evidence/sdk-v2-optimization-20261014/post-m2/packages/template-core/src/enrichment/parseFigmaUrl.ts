export interface ParsedFigmaUrl {
  url: string;
  fileKey: string;
  nodeId: string | null;
}

export type FigmaUrlParseResult =
  | { valid: true; value: ParsedFigmaUrl }
  | { valid: false; error: string };

export function parseFigmaUrl(value: string): FigmaUrlParseResult {
  const trimmed = value.trim();
  if (!trimmed) {
    return { valid: false, error: "Enter a Figma design URL." };
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { valid: false, error: "The Figma URL is not valid." };
  }

  if (!/(^|\.)figma\.com$/i.test(url.hostname)) {
    return { valid: false, error: "The URL must point to figma.com." };
  }

  const pathParts = url.pathname.split("/").filter(Boolean);
  const designIndex = pathParts.findIndex((part) =>
    ["design", "file", "proto"].includes(part.toLowerCase()),
  );
  const fileKey = designIndex >= 0 ? pathParts[designIndex + 1] : undefined;
  if (!fileKey) {
    return {
      valid: false,
      error: "The Figma URL does not contain a design file key.",
    };
  }

  const rawNodeId = url.searchParams.get("node-id");
  const nodeId = rawNodeId
    ? decodeURIComponent(rawNodeId).replace(/-/g, ":")
    : null;

  return {
    valid: true,
    value: {
      url: trimmed,
      fileKey,
      nodeId,
    },
  };
}
