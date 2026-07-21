import { inflateSync } from "fflate";
import {
  loadTemplatePackageZipBundle,
} from "./loadTemplatePackageBundle";
import type {
  TemplatePackageBundle,
  TemplatePackageBundleDiagnostic,
  TemplatePackageBundleFile,
  TemplatePackageBundleLoadOptions,
} from "./types";

const LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50;
const DEFAULT_MAX_ARCHIVE_BYTES = 150 * 1024 * 1024;
const DEFAULT_MAX_ENTRY_COMPRESSED_BYTES = 50 * 1024 * 1024;
const DEFAULT_MAX_ENTRY_UNCOMPRESSED_BYTES = 100 * 1024 * 1024;
const GLOBAL_BLOCKING_DIAGNOSTIC_CODES = new Set([
  "zip.multi-disk-unsupported",
  "zip.central-directory-out-of-range",
  "zip.central-directory-truncated",
  "zip.central-directory-entry-invalid",
  "zip.file-name-truncated",
]);
const PATH_BLOCKING_DIAGNOSTIC_CODES = new Set([
  "bundle.duplicate-file",
  "bundle.path-unsafe",
  "zip.entry-encrypted",
  "zip.compression-unsupported",
  "zip.local-header-out-of-range",
]);

export interface ZipBundleReaderOptions extends TemplatePackageBundleLoadOptions {
  maxArchiveBytes?: number;
  maxEntryCompressedBytes?: number;
  maxEntryUncompressedBytes?: number;
}

export interface ZipBundleReadResult<T> {
  ok: boolean;
  value?: T;
  diagnostics: TemplatePackageBundleDiagnostic[];
}

function diagnostic(
  code: string,
  severity: TemplatePackageBundleDiagnostic["severity"],
  message: string,
  path?: string,
): TemplatePackageBundleDiagnostic {
  return { code, severity, category: "zip", message, path };
}

function bytesFromSource(source: ArrayBuffer | Uint8Array): Uint8Array {
  if (source instanceof Uint8Array) {
    return source;
  }
  return new Uint8Array(source);
}

function toExactArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function readUint16(view: DataView, offset: number): number {
  return view.getUint16(offset, true);
}

function readUint32(view: DataView, offset: number): number {
  return view.getUint32(offset, true);
}

function normalizeZipPath(path: string): string | null {
  if (!path || path.includes("\0") || path.includes("\\")) return null;
  if (path.startsWith("/") || /^[a-z]:/i.test(path)) return null;
  const parts = path.split("/");
  if (parts.some((part) => part === "..")) return null;
  return parts.filter((part) => part !== "." && part.length > 0).join("/");
}

export class ZipBundleReader {
  readonly bundle: TemplatePackageBundle;

  private readonly bytes: Uint8Array;
  private readonly view: DataView;
  private readonly options: Required<
    Pick<
      ZipBundleReaderOptions,
      | "maxArchiveBytes"
      | "maxEntryCompressedBytes"
      | "maxEntryUncompressedBytes"
    >
  >;

  constructor(
    source: ArrayBuffer | Uint8Array,
    options: ZipBundleReaderOptions = {},
  ) {
    this.bytes = bytesFromSource(source);
    this.view = new DataView(
      this.bytes.buffer,
      this.bytes.byteOffset,
      this.bytes.byteLength,
    );
    this.options = {
      maxArchiveBytes: options.maxArchiveBytes ?? DEFAULT_MAX_ARCHIVE_BYTES,
      maxEntryCompressedBytes:
        options.maxEntryCompressedBytes ?? DEFAULT_MAX_ENTRY_COMPRESSED_BYTES,
      maxEntryUncompressedBytes:
        options.maxEntryUncompressedBytes ?? DEFAULT_MAX_ENTRY_UNCOMPRESSED_BYTES,
    };
    this.bundle = loadTemplatePackageZipBundle(source, options);
  }

  readText(path: string): ZipBundleReadResult<string> {
    const arrayBuffer = this.readArrayBuffer(path);
    if (!arrayBuffer.ok || !arrayBuffer.value) {
      return {
        ok: false,
        diagnostics: arrayBuffer.diagnostics,
      };
    }

    try {
      const value = new TextDecoder("utf-8", { fatal: true }).decode(
        arrayBuffer.value,
      );
      return { ok: true, value, diagnostics: arrayBuffer.diagnostics };
    } catch {
      return {
        ok: false,
        diagnostics: [
          ...arrayBuffer.diagnostics,
          diagnostic(
            "zip.text-decode-failed",
            "error",
            `ZIP entry could not be decoded as UTF-8 text: ${path}`,
            path,
          ),
        ],
      };
    }
  }

  readBlob(path: string, mimeType = "application/octet-stream"): ZipBundleReadResult<Blob> {
    const arrayBuffer = this.readArrayBuffer(path);
    if (!arrayBuffer.ok || !arrayBuffer.value) {
      return {
        ok: false,
        diagnostics: arrayBuffer.diagnostics,
      };
    }
    return {
      ok: true,
      value: new Blob([arrayBuffer.value], { type: mimeType }),
      diagnostics: arrayBuffer.diagnostics,
    };
  }

  readArrayBuffer(path: string): ZipBundleReadResult<ArrayBuffer> {
    const resolved = this.resolveEntry(path);
    if (!resolved.ok || !resolved.entry) {
      return {
        ok: false,
        diagnostics: resolved.diagnostics,
      };
    }

    const compressed = this.readCompressedEntryBytes(resolved.entry);
    if (!compressed.ok || !compressed.value) {
      return {
        ok: false,
        diagnostics: [...resolved.diagnostics, ...compressed.diagnostics],
      };
    }

    try {
      const decompressed =
        resolved.entry.compressionMethod === 0
          ? compressed.value
          : inflateSync(compressed.value);
      if (decompressed.byteLength !== resolved.entry.uncompressedSize) {
        return {
          ok: false,
          diagnostics: [
            ...resolved.diagnostics,
            diagnostic(
              "zip.entry-size-mismatch",
              "error",
              `ZIP entry decompressed to ${decompressed.byteLength} bytes, expected ${resolved.entry.uncompressedSize}.`,
              resolved.entry.normalizedPath,
            ),
          ],
        };
      }
      return {
        ok: true,
        value: toExactArrayBuffer(decompressed),
        diagnostics: resolved.diagnostics,
      };
    } catch {
      return {
        ok: false,
        diagnostics: [
          ...resolved.diagnostics,
          diagnostic(
            "zip.entry-read-failed",
            "error",
            `ZIP entry could not be decompressed: ${resolved.entry.normalizedPath}`,
            resolved.entry.normalizedPath,
          ),
        ],
      };
    }
  }

  private resolveEntry(path: string): {
    ok: boolean;
    entry?: TemplatePackageBundleFile;
    diagnostics: TemplatePackageBundleDiagnostic[];
  } {
    const normalizedPath = normalizeZipPath(path);
    const diagnostics: TemplatePackageBundleDiagnostic[] = [];

    if (!normalizedPath) {
      return {
        ok: false,
        diagnostics: [
          diagnostic(
            "zip.entry-read-blocked",
            "error",
            `Unsafe ZIP entry read was blocked: ${path}`,
            path,
          ),
        ],
      };
    }

    if (this.bytes.byteLength > this.options.maxArchiveBytes) {
      diagnostics.push(
        diagnostic(
          "zip.archive-size-exceeded",
          "error",
          `ZIP archive is ${this.bytes.byteLength} bytes; the maximum readable size is ${this.options.maxArchiveBytes}.`,
          normalizedPath,
        ),
      );
    }

    const entry = this.bundle.index.files[normalizedPath];
    if (!entry) {
      diagnostics.push(
        diagnostic(
          "zip.entry-missing",
          "error",
          `ZIP entry was not found: ${normalizedPath}`,
          normalizedPath,
        ),
      );
      return { ok: false, diagnostics };
    }

    for (const item of this.bundle.diagnostics) {
      const blocksPath =
        item.severity === "error" &&
        (GLOBAL_BLOCKING_DIAGNOSTIC_CODES.has(item.code) ||
          (item.path === normalizedPath &&
            PATH_BLOCKING_DIAGNOSTIC_CODES.has(item.code)));
      if (blocksPath) diagnostics.push(item);
    }

    if (entry.encrypted) {
      diagnostics.push(
        diagnostic(
          "zip.entry-read-blocked",
          "error",
          `Encrypted ZIP entries cannot be read: ${normalizedPath}`,
          normalizedPath,
        ),
      );
    }
    if (entry.compressedSize > this.options.maxEntryCompressedBytes) {
      diagnostics.push(
        diagnostic(
          "zip.compressed-size-exceeded",
          "error",
          `ZIP entry compressed size is ${entry.compressedSize} bytes; the maximum is ${this.options.maxEntryCompressedBytes}.`,
          normalizedPath,
        ),
      );
    }
    if (entry.uncompressedSize > this.options.maxEntryUncompressedBytes) {
      diagnostics.push(
        diagnostic(
          "zip.decompressed-size-exceeded",
          "error",
          `ZIP entry uncompressed size is ${entry.uncompressedSize} bytes; the maximum is ${this.options.maxEntryUncompressedBytes}.`,
          normalizedPath,
        ),
      );
    }
    if (![0, 8].includes(entry.compressionMethod)) {
      diagnostics.push(
        diagnostic(
          "zip.compression-read-unsupported",
          "error",
          `ZIP compression method ${entry.compressionMethod} is not readable by this importer: ${normalizedPath}`,
          normalizedPath,
        ),
      );
    }

    return {
      ok: !diagnostics.some((item) => item.severity === "error"),
      entry,
      diagnostics,
    };
  }

  private readCompressedEntryBytes(
    entry: TemplatePackageBundleFile,
  ): ZipBundleReadResult<Uint8Array> {
    const headerOffset = entry.localHeaderOffset;
    if (headerOffset + 30 > this.view.byteLength) {
      return {
        ok: false,
        diagnostics: [
          diagnostic(
            "zip.entry-read-failed",
            "error",
            `ZIP local header is outside the archive: ${entry.normalizedPath}`,
            entry.normalizedPath,
          ),
        ],
      };
    }

    if (readUint32(this.view, headerOffset) !== LOCAL_FILE_HEADER_SIGNATURE) {
      return {
        ok: false,
        diagnostics: [
          diagnostic(
            "zip.entry-read-failed",
            "error",
            `ZIP local header signature is invalid: ${entry.normalizedPath}`,
            entry.normalizedPath,
          ),
        ],
      };
    }

    const fileNameLength = readUint16(this.view, headerOffset + 26);
    const extraFieldLength = readUint16(this.view, headerOffset + 28);
    const dataStart = headerOffset + 30 + fileNameLength + extraFieldLength;
    const dataEnd = dataStart + entry.compressedSize;

    if (dataEnd > this.view.byteLength) {
      return {
        ok: false,
        diagnostics: [
          diagnostic(
            "zip.entry-read-failed",
            "error",
            `ZIP entry compressed bytes are outside the archive: ${entry.normalizedPath}`,
            entry.normalizedPath,
          ),
        ],
      };
    }

    return {
      ok: true,
      value: this.bytes.slice(dataStart, dataEnd),
      diagnostics: [],
    };
  }
}

export function createZipBundleReader(
  source: ArrayBuffer | Uint8Array,
  options: ZipBundleReaderOptions = {},
): ZipBundleReader {
  return new ZipBundleReader(source, options);
}
