import type {
  TemplatePackageBundleDiagnostic,
  TemplatePackageBundleFile,
} from "./types";
import type { ZipBundleReader } from "./zipBundleReader";

export interface PackagePreviewReference {
  exists: true;
  path: string;
  normalizedPath: string;
  mimeType: "image/png";
  byteSize: number;
  file: TemplatePackageBundleFile;
  width?: number;
  height?: number;
  dimensionsAvailable: boolean;
}

function diagnostic(
  code: string,
  severity: TemplatePackageBundleDiagnostic["severity"],
  message: string,
  path?: string,
): TemplatePackageBundleDiagnostic {
  return { code, severity, category: "preview", message, path };
}

const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];

export function readPngDimensions(buffer: ArrayBuffer): {
  width: number;
  height: number;
} | null {
  if (buffer.byteLength < 24) return null;
  const bytes = new Uint8Array(buffer, 0, 24);
  if (!pngSignature.every((value, index) => bytes[index] === value)) return null;
  const chunkType = String.fromCharCode(
    bytes[12],
    bytes[13],
    bytes[14],
    bytes[15],
  );
  if (chunkType !== "IHDR") return null;
  const view = new DataView(buffer);
  const width = view.getUint32(16, false);
  const height = view.getUint32(20, false);
  if (width <= 0 || height <= 0) return null;
  return { width, height };
}

export function createPackagePreviewReference(reader: ZipBundleReader): {
  preview: PackagePreviewReference | null;
  diagnostics: TemplatePackageBundleDiagnostic[];
} {
  const file = reader.bundle.index.optional["preview.png"];
  if (!file) return { preview: null, diagnostics: [] };

  const read = reader.readArrayBuffer(file.normalizedPath);
  if (!read.ok || read.value === undefined) {
    return {
      preview: null,
      diagnostics: [
        diagnostic(
          "PREVIEW_FILE_UNREADABLE",
          "warning",
          "preview.png is present but could not be read from the ZIP bundle.",
          file.normalizedPath,
        ),
        ...read.diagnostics,
      ],
    };
  }

  const dimensions = readPngDimensions(read.value);
  const diagnostics = [...read.diagnostics];
  if (!dimensions) {
    diagnostics.push(
      diagnostic(
        "PREVIEW_DIMENSIONS_UNAVAILABLE",
        "warning",
        "preview.png is present but its dimensions could not be read from the PNG header.",
        file.normalizedPath,
      ),
    );
  }

  return {
    preview: {
      exists: true,
      path: file.path,
      normalizedPath: file.normalizedPath,
      mimeType: "image/png",
      byteSize: file.uncompressedSize,
      file,
      width: dimensions?.width,
      height: dimensions?.height,
      dimensionsAvailable: Boolean(dimensions),
    },
    diagnostics,
  };
}
