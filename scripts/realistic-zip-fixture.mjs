import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

export const DEFAULT_REALISTIC_ZIP_PATH =
  "/Users/niels/Documents/Templates/template-package-deal-of-the-week-post.zip";

function zipSignature(bytes, offset) {
  return (
    bytes[offset] |
    (bytes[offset + 1] << 8) |
    (bytes[offset + 2] << 16) |
    (bytes[offset + 3] << 24)
  ) >>> 0;
}

export function validateZipIdentity(bytes, sourcePath) {
  if (bytes.byteLength < 22) {
    throw new Error(
      `Realistic ZIP fixture is too small to be a ZIP archive: ${sourcePath} (${bytes.byteLength} bytes).`,
    );
  }

  const firstSignature = zipSignature(bytes, 0);
  if (firstSignature !== 0x04034b50 && firstSignature !== 0x06054b50) {
    throw new Error(
      `Realistic ZIP fixture does not start with a valid ZIP signature: ${sourcePath}.`,
    );
  }

  const earliestEocd = Math.max(0, bytes.byteLength - 65_557);
  let hasEndOfCentralDirectory = false;
  for (let offset = bytes.byteLength - 22; offset >= earliestEocd; offset -= 1) {
    if (zipSignature(bytes, offset) === 0x06054b50) {
      hasEndOfCentralDirectory = true;
      break;
    }
  }
  if (!hasEndOfCentralDirectory) {
    throw new Error(
      `Realistic ZIP fixture has no readable end-of-central-directory record: ${sourcePath}. The file may be truncated or is not a ZIP archive.`,
    );
  }
}

export function strictRealisticZipRequested(argv = process.argv.slice(2)) {
  return argv.includes("--realistic-zip-strict");
}

export function portableTestsRequested(argv = process.argv.slice(2)) {
  return argv.includes("--portable");
}

export async function selectLifecycleZipFixture({
  strict = false,
  forceCompactFallback = false,
  env = process.env,
  defaultPath = DEFAULT_REALISTIC_ZIP_PATH,
} = {}) {
  const configuredPath = env.TEMPLATE_PACKAGE_LIFECYCLE_ZIP;
  const sourcePath = configuredPath ?? defaultPath;

  if (forceCompactFallback) {
    if (strict) {
      throw new Error(
        "Portable lifecycle mode cannot be combined with strict realistic-ZIP mode.",
      );
    }
    return {
      kind: "fallback",
      strict: false,
      attemptedPath: "not-read-in-portable-mode",
      reason:
        "Portable test mode uses only the repository-contained compact lifecycle fixture.",
    };
  }

  try {
    if (!path.isAbsolute(sourcePath)) {
      throw new Error(
        `TEMPLATE_PACKAGE_LIFECYCLE_ZIP must be an absolute path, received: ${sourcePath}.`,
      );
    }
    if (path.extname(sourcePath).toLowerCase() !== ".zip") {
      throw new Error(
        `Realistic lifecycle fixture must use a .zip filename: ${sourcePath}.`,
      );
    }

    let fileStats;
    try {
      fileStats = await stat(sourcePath);
    } catch (error) {
      throw new Error(
        `Realistic ZIP fixture was not found or cannot be inspected: ${sourcePath}. ${error instanceof Error ? error.message : ""}`.trim(),
      );
    }
    if (!fileStats.isFile()) {
      throw new Error(
        `Realistic ZIP fixture path is not a file: ${sourcePath}.`,
      );
    }

    let bytes;
    try {
      bytes = new Uint8Array(await readFile(sourcePath));
    } catch (error) {
      throw new Error(
        `Realistic ZIP fixture cannot be read: ${sourcePath}. ${error instanceof Error ? error.message : ""}`.trim(),
      );
    }
    validateZipIdentity(bytes, sourcePath);

    return {
      kind: "realistic",
      strict,
      bytes,
      sourcePath,
      sourceName: path.basename(sourcePath),
      sizeBytes: bytes.byteLength,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    if (strict) {
      throw new Error(
        `${reason}\nStrict realistic-ZIP mode does not permit the compact fallback. Set TEMPLATE_PACKAGE_LIFECYCLE_ZIP=/absolute/path/package.zip and retry.`,
      );
    }
    return {
      kind: "fallback",
      strict: false,
      attemptedPath: sourcePath,
      reason,
    };
  }
}

export function formatLifecycleFixtureReport(selection) {
  if (selection.kind === "fallback") {
    return `[lifecycle] fixture=compact-fallback strict=false attempted=${selection.attemptedPath} reason=${selection.reason}`;
  }
  return `[lifecycle] fixture=realistic strict=${String(selection.strict)} file=${selection.sourceName} size=${selection.sizeBytes} sha256=${selection.sha256}`;
}
