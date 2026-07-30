import type { TemplatePackageV1 } from "../types";

export const TEMPLATE_PACKAGE_DIGEST_SCHEMA_VERSION =
  "template-package-digest-v1" as const;

export interface TemplatePackageDigestV1 {
  schemaVersion: typeof TEMPLATE_PACKAGE_DIGEST_SCHEMA_VERSION;
  algorithm: "sha-256";
  value: string;
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, stableValue(entry)]),
  );
}

export function serializeTemplatePackageForIntegrity(
  packageValue: TemplatePackageV1,
): string {
  return JSON.stringify(stableValue(packageValue));
}

export function createTemplatePackageFingerprint(
  packageValue: TemplatePackageV1,
): string {
  const value = serializeTemplatePackageForIntegrity(packageValue);
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export async function createTemplatePackageDigest(
  packageValue: TemplatePackageV1,
): Promise<TemplatePackageDigestV1> {
  if (!globalThis.crypto?.subtle) {
    throw new Error(
      "SHA-256 package integrity requires the Web Crypto SubtleCrypto API.",
    );
  }
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(serializeTemplatePackageForIntegrity(packageValue)),
  );
  return {
    schemaVersion: TEMPLATE_PACKAGE_DIGEST_SCHEMA_VERSION,
    algorithm: "sha-256",
    value: Array.from(new Uint8Array(digest))
      .map((entry) => entry.toString(16).padStart(2, "0"))
      .join(""),
  };
}
