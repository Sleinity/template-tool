import { serializeFontRequirementKey } from "./fontMatching";
import { createManagedFontRecord, normalizeManagedFontRecord } from "./managedFontRecord";
import {
  type FontRequirementKey,
  type ManagedFontMapping,
  type ManagedFontRecord,
  type ManagedFontRegistrationInput,
  type ManagedFontRegistry,
} from "./fontRegistryTypes";

async function hashBytes(source: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", source);
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

export class InMemoryManagedFontRegistry implements ManagedFontRegistry {
  private fonts = new Map<string, ManagedFontRecord>();
  private mappings = new Map<string, ManagedFontMapping>();
  private blobs = new Map<string, Blob>();

  async listManagedFonts(): Promise<ManagedFontRecord[]> {
    return Array.from(this.fonts.values()).map((font) =>
      structuredClone(normalizeManagedFontRecord(font)),
    );
  }

  async getManagedFont(id: string): Promise<ManagedFontRecord | null> {
    const font = this.fonts.get(id);
    return font ? structuredClone(normalizeManagedFontRecord(font)) : null;
  }

  async registerUploadedFont(
    input: ManagedFontRegistrationInput,
  ): Promise<ManagedFontRecord> {
    const hash = await hashBytes(input.bytes);
    const id = `managed-font:${hash.slice(0, 12)}:${input.faceIndex ?? 0}`;
    const existing = this.fonts.get(id);
    const now = new Date().toISOString();
    const record: ManagedFontRecord = existing
      ? { ...normalizeManagedFontRecord(existing), updatedAt: now, lastUsedAt: now }
      : createManagedFontRecord(id, hash, input, now);
    this.fonts.set(id, record);
    this.blobs.set(hash, new Blob([input.bytes], { type: input.mimeType }));
    return structuredClone(record);
  }

  async getMapping(
    key: FontRequirementKey,
  ): Promise<ManagedFontMapping | null> {
    const mapping = this.mappings.get(serializeFontRequirementKey(key));
    return mapping ? structuredClone(mapping) : null;
  }

  async linkRequirementToManagedFont(
    key: FontRequirementKey,
    managedFontId: string,
    details?: Omit<ManagedFontMapping, "id" | "managedFontId" | "createdAt" | "updatedAt">,
  ): Promise<void> {
    const id = serializeFontRequirementKey(key);
    const now = new Date().toISOString();
    this.mappings.set(id, {
      id,
      managedFontId,
      ...details,
      createdAt: this.mappings.get(id)?.createdAt ?? now,
      updatedAt: now,
    });
  }

  async unlinkRequirement(key: FontRequirementKey): Promise<void> {
    this.mappings.delete(serializeFontRequirementKey(key));
  }

  async deleteManagedFont(id: string): Promise<void> {
    this.fonts.delete(id);
    for (const [key, mapping] of this.mappings) {
      if (mapping.managedFontId === id) this.mappings.delete(key);
    }
  }

  async getFontBlob(assetHash: string): Promise<Blob | null> {
    return this.blobs.get(assetHash) ?? null;
  }

  getBlobCountForTests(): number {
    return this.blobs.size;
  }
}
