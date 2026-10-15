import {
  OPTIONAL_BUNDLE_FILES,
  REQUIRED_BUNDLE_FILES,
  TEMPLATE_PACKAGE_BUNDLE_CONTRACT,
  type TemplatePackageBundle,
  type TemplatePackageBundleDiagnostic,
  type TemplatePackageBundleFile,
  type TemplatePackageBundleFileIndex,
  type TemplatePackageBundleFileRole,
  type TemplatePackageBundleLoadOptions,
  type ZipCentralDirectoryEntry,
} from "./types";
import { readZipCentralDirectory } from "./zipReader";

const DEFAULT_MAX_ENTRIES = 500;
const DEFAULT_MAX_UNCOMPRESSED_BYTES = 100 * 1024 * 1024;

function diagnostic(
  code: string,
  severity: TemplatePackageBundleDiagnostic["severity"],
  category: TemplatePackageBundleDiagnostic["category"],
  message: string,
  path?: string,
): TemplatePackageBundleDiagnostic {
  return { code, severity, category, message, path };
}

function normalizeZipPath(path: string): string | null {
  if (!path || path.includes("\0") || path.includes("\\")) return null;
  if (path.startsWith("/") || /^[a-z]:/i.test(path)) return null;
  const parts = path.split("/");
  if (parts.some((part) => part === "..")) return null;
  return parts.filter((part) => part !== "." && part.length > 0).join("/");
}

function fileRole(path: string): TemplatePackageBundleFileRole {
  if (path === "template.json") return "template";
  if (path === "assets.json") return "asset-manifest";
  if (path === "motion.json") return "motion";
  if (path === "mcp.json") return "mcp";
  if (path === "preview.png") return "preview";
  if (path.startsWith("assets/")) return "asset";
  return "unknown";
}

function createEmptyIndex(): TemplatePackageBundleFileIndex {
  return {
    files: {},
    orderedFiles: [],
    required: {
      "template.json": null,
      "assets.json": null,
    },
    optional: {
      "motion.json": null,
      "mcp.json": null,
      "preview.png": null,
    },
    assets: [],
  };
}

function toBundleFile(
  entry: ZipCentralDirectoryEntry,
  normalizedPath: string,
): TemplatePackageBundleFile {
  return {
    path: entry.path,
    normalizedPath,
    role: fileRole(normalizedPath),
    compressedSize: entry.compressedSize,
    uncompressedSize: entry.uncompressedSize,
    compressionMethod: entry.compressionMethod,
    localHeaderOffset: entry.localHeaderOffset,
    encrypted: (entry.generalPurposeBitFlag & 0x1) === 0x1,
    directory: entry.directory,
  };
}

export function indexTemplatePackageBundleFiles(
  entries: ZipCentralDirectoryEntry[],
  options: TemplatePackageBundleLoadOptions = {},
): {
  index: TemplatePackageBundleFileIndex;
  diagnostics: TemplatePackageBundleDiagnostic[];
} {
  const diagnostics: TemplatePackageBundleDiagnostic[] = [];
  const index = createEmptyIndex();
  const maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES;
  const maxUncompressedBytes =
    options.maxUncompressedBytes ?? DEFAULT_MAX_UNCOMPRESSED_BYTES;

  if (entries.length > maxEntries) {
    diagnostics.push(
      diagnostic(
        "bundle.too-many-files",
        "error",
        "zip",
        `The ZIP contains ${entries.length} entries; the maximum is ${maxEntries}.`,
      ),
    );
  }

  let totalUncompressedBytes = 0;
  for (const entry of entries) {
    const normalizedPath = normalizeZipPath(entry.path);
    if (!normalizedPath) {
      diagnostics.push(
        diagnostic(
          "bundle.path-unsafe",
          "error",
          "zip",
          `Unsafe ZIP entry path was rejected: ${entry.path}`,
          entry.path,
        ),
      );
      continue;
    }
    if (entry.directory) continue;

    totalUncompressedBytes += entry.uncompressedSize;
    const file = toBundleFile(entry, normalizedPath);
    if (index.files[normalizedPath]) {
      diagnostics.push(
        diagnostic(
          "bundle.duplicate-file",
          "error",
          "zip",
          `Duplicate ZIP entry path: ${normalizedPath}`,
          normalizedPath,
        ),
      );
      continue;
    }

    index.files[normalizedPath] = file;
    index.orderedFiles.push(file);
    if (file.role === "asset") index.assets.push(file);
    if (file.normalizedPath === "template.json") {
      index.required["template.json"] = file;
    } else if (file.normalizedPath === "assets.json") {
      index.required["assets.json"] = file;
    } else if (file.normalizedPath === "motion.json") {
      index.optional["motion.json"] = file;
    } else if (file.normalizedPath === "mcp.json") {
      index.optional["mcp.json"] = file;
    } else if (file.normalizedPath === "preview.png") {
      index.optional["preview.png"] = file;
    } else if (file.role === "unknown") {
      diagnostics.push(
        diagnostic(
          "bundle.unknown-file",
          "info",
          "manifest",
          `ZIP entry is not part of the current bundle contract: ${normalizedPath}`,
          normalizedPath,
        ),
      );
    }
  }

  if (totalUncompressedBytes > maxUncompressedBytes) {
    diagnostics.push(
      diagnostic(
        "bundle.too-large",
        "error",
        "zip",
        `The ZIP expands to ${totalUncompressedBytes} bytes; the maximum is ${maxUncompressedBytes}.`,
      ),
    );
  }

  for (const requiredFile of REQUIRED_BUNDLE_FILES) {
    if (!index.required[requiredFile]) {
      diagnostics.push(
        diagnostic(
          "bundle.required-file-missing",
          "error",
          "manifest",
          `Required bundle file is missing: ${requiredFile}`,
          requiredFile,
        ),
      );
    }
  }

  if (index.assets.length === 0) {
    diagnostics.push(
      diagnostic(
        "bundle.no-external-assets",
        "info",
        "asset",
        "No external files were found under assets/.",
        "assets/",
      ),
    );
  }

  if (!index.optional["preview.png"]) {
    diagnostics.push(
      diagnostic(
        "bundle.preview-missing",
        "info",
        "manifest",
        "Optional preview.png is not included.",
        "preview.png",
      ),
    );
  }

  return { index, diagnostics };
}

export function loadTemplatePackageZipBundle(
  source: ArrayBuffer | Uint8Array,
  options: TemplatePackageBundleLoadOptions = {},
): TemplatePackageBundle {
  const zip = readZipCentralDirectory(source);
  const indexed = indexTemplatePackageBundleFiles(zip.entries, options);
  const diagnostics = [...zip.diagnostics, ...indexed.diagnostics];
  return {
    contract: TEMPLATE_PACKAGE_BUNDLE_CONTRACT,
    sourceType: "package-zip",
    sourceName: options.sourceName,
    index: indexed.index,
    diagnostics,
    valid: !diagnostics.some((item) => item.severity === "error"),
  };
}
