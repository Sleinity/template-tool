import type {
  TemplatePackageBundleDiagnostic,
  ZipCentralDirectoryEntry,
} from "./types";

export interface ZipReadResult {
  entries: ZipCentralDirectoryEntry[];
  diagnostics: TemplatePackageBundleDiagnostic[];
}

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
const MAX_EOCD_COMMENT_BYTES = 0xffff;
const SUPPORTED_COMPRESSION_METHODS = new Set([0, 8]);

function diagnostic(
  code: string,
  severity: TemplatePackageBundleDiagnostic["severity"],
  message: string,
  path?: string,
): TemplatePackageBundleDiagnostic {
  return { code, severity, category: "zip", message, path };
}

function viewFromSource(source: ArrayBuffer | Uint8Array): DataView {
  if (source instanceof Uint8Array) {
    return new DataView(
      source.buffer,
      source.byteOffset,
      source.byteLength,
    );
  }
  return new DataView(source);
}

function bytesFromSource(source: ArrayBuffer | Uint8Array): Uint8Array {
  return source instanceof Uint8Array
    ? source
    : new Uint8Array(source);
}

function readUint16(view: DataView, offset: number): number {
  return view.getUint16(offset, true);
}

function readUint32(view: DataView, offset: number): number {
  return view.getUint32(offset, true);
}

function findEndOfCentralDirectory(view: DataView): number {
  const minimumOffset = Math.max(
    0,
    view.byteLength - (MAX_EOCD_COMMENT_BYTES + 22),
  );
  for (let offset = view.byteLength - 22; offset >= minimumOffset; offset -= 1) {
    if (readUint32(view, offset) === EOCD_SIGNATURE) return offset;
  }
  return -1;
}

function decodePath(bytes: Uint8Array): string {
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

export function readZipCentralDirectory(
  source: ArrayBuffer | Uint8Array,
): ZipReadResult {
  const view = viewFromSource(source);
  const bytes = bytesFromSource(source);
  const diagnostics: TemplatePackageBundleDiagnostic[] = [];
  const entries: ZipCentralDirectoryEntry[] = [];
  const eocdOffset = findEndOfCentralDirectory(view);

  if (eocdOffset < 0) {
    return {
      entries,
      diagnostics: [
        diagnostic(
          "zip.eocd-missing",
          "error",
          "The ZIP end-of-central-directory record was not found.",
        ),
      ],
    };
  }

  const diskNumber = readUint16(view, eocdOffset + 4);
  const centralDirectoryDisk = readUint16(view, eocdOffset + 6);
  const entriesOnDisk = readUint16(view, eocdOffset + 8);
  const totalEntries = readUint16(view, eocdOffset + 10);
  const centralDirectorySize = readUint32(view, eocdOffset + 12);
  const centralDirectoryOffset = readUint32(view, eocdOffset + 16);

  if (diskNumber !== 0 || centralDirectoryDisk !== 0 || entriesOnDisk !== totalEntries) {
    diagnostics.push(
      diagnostic(
        "zip.multi-disk-unsupported",
        "error",
        "Multi-disk ZIP archives are not supported.",
      ),
    );
  }

  if (
    centralDirectoryOffset < 0 ||
    centralDirectorySize < 0 ||
    centralDirectoryOffset + centralDirectorySize > view.byteLength
  ) {
    diagnostics.push(
      diagnostic(
        "zip.central-directory-out-of-range",
        "error",
        "The ZIP central directory points outside the archive.",
      ),
    );
    return { entries, diagnostics };
  }

  let offset = centralDirectoryOffset;
  for (let index = 0; index < totalEntries; index += 1) {
    if (offset + 46 > view.byteLength) {
      diagnostics.push(
        diagnostic(
          "zip.central-directory-truncated",
          "error",
          "The ZIP central directory ended unexpectedly.",
        ),
      );
      break;
    }
    if (readUint32(view, offset) !== CENTRAL_DIRECTORY_SIGNATURE) {
      diagnostics.push(
        diagnostic(
          "zip.central-directory-entry-invalid",
          "error",
          "A ZIP central directory entry has an invalid signature.",
        ),
      );
      break;
    }

    const generalPurposeBitFlag = readUint16(view, offset + 8);
    const compressionMethod = readUint16(view, offset + 10);
    const compressedSize = readUint32(view, offset + 20);
    const uncompressedSize = readUint32(view, offset + 24);
    const fileNameLength = readUint16(view, offset + 28);
    const extraFieldLength = readUint16(view, offset + 30);
    const commentLength = readUint16(view, offset + 32);
    const localHeaderOffset = readUint32(view, offset + 42);
    const nameStart = offset + 46;
    const nameEnd = nameStart + fileNameLength;

    if (nameEnd > view.byteLength) {
      diagnostics.push(
        diagnostic(
          "zip.file-name-truncated",
          "error",
          "A ZIP file name ended outside the archive.",
        ),
      );
      break;
    }

    const path = decodePath(bytes.subarray(nameStart, nameEnd));
    const directory = path.endsWith("/");
    entries.push({
      path,
      compressedSize,
      uncompressedSize,
      compressionMethod,
      generalPurposeBitFlag,
      localHeaderOffset,
      directory,
    });

    if ((generalPurposeBitFlag & 0x1) === 0x1) {
      diagnostics.push(
        diagnostic(
          "zip.entry-encrypted",
          "error",
          `Encrypted ZIP entries are not supported: ${path}`,
          path,
        ),
      );
    }
    if (!directory && !SUPPORTED_COMPRESSION_METHODS.has(compressionMethod)) {
      diagnostics.push(
        diagnostic(
          "zip.compression-unsupported",
          "error",
          `ZIP entry uses unsupported compression method ${compressionMethod}: ${path}`,
          path,
        ),
      );
    }
    if (localHeaderOffset >= view.byteLength) {
      diagnostics.push(
        diagnostic(
          "zip.local-header-out-of-range",
          "error",
          `ZIP entry local header is outside the archive: ${path}`,
          path,
        ),
      );
    }

    offset = nameEnd + extraFieldLength + commentLength;
  }

  return { entries, diagnostics };
}
