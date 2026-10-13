import assert from "node:assert/strict";
import fixture from "../../../src/template-package/fixtures/figma-plugin-v0.4.1.json";
import type { TemplatePackageV1 } from "@sleinity/template-core";
import { InMemoryManagedFontRegistry, createTemplatePackageFontEmbedCss, getManagedFontRegistry, setManagedFontRegistryForTests } from "../src/fonts";

export async function runHostFontEmbeddingTests() {
  // Synthetic byte payload tests embedding/authority lookup, not source font fidelity.
  const registry = new InMemoryManagedFontRegistry();
  const font = await registry.registerUploadedFont({ bytes: new Uint8Array([1, 2, 3]).buffer,
    family: "Host Sans", style: "normal", weight: 400, source: "uploaded", mimeType: "font/ttf", fileName: "host.ttf", runtimeFamily: "__template_font_host" });
  const packageValue = structuredClone(fixture) as unknown as TemplatePackageV1;
  packageValue.fontRequirements = [{ id: "host-font", family: "Host Sans", style: "Regular", cssStyle: "normal", weight: 400,
    usedBy: [], characters: "A", editable: false, mixedStyle: false, source: "figma", availableInFigma: true,
    assetId: font.assetId, resolution: { managedFontId: font.id, binaryHash: font.assetHash, runtimeFamily: font.runtimeFamily,
      classification: "exact", match: "exact", confirmed: true } }];
  packageValue.assets = { [font.assetId]: { id: font.assetId, type: "font", source: "stored", hash: font.assetHash,
    mimeType: "font/ttf", usedBy: [] } };
  const original = getManagedFontRegistry();
  try {
    setManagedFontRegistryForTests(registry);
    assert.match(await createTemplatePackageFontEmbedCss(packageValue), /AQID/);
    assert.match(await createTemplatePackageFontEmbedCss(packageValue, registry), /__template_font_host/);
    await assert.rejects(createTemplatePackageFontEmbedCss(packageValue, null), /no available binary/);
    await assert.rejects(createTemplatePackageFontEmbedCss(packageValue, new InMemoryManagedFontRegistry()), /no available binary/);
    const missing = new Proxy(registry, { get(target, key) { if (key === "getFontBlob") return async () => null; const value = Reflect.get(target, key); return typeof value === "function" ? value.bind(target) : value; } });
    await assert.rejects(createTemplatePackageFontEmbedCss(packageValue, missing), /no available binary/);
    const mismatch = new Proxy(registry, { get(target, key) { if (key === "getManagedFont") return async () => ({ ...font, assetHash: "different-binary" }); const value = Reflect.get(target, key); return typeof value === "function" ? value.bind(target) : value; } });
    await assert.rejects(createTemplatePackageFontEmbedCss(packageValue, mismatch), /no available binary/);
    const failure = new Error("Host registry read rejected");
    const rejecting = new Proxy(registry, { get(target, key) { if (key === "getFontBlob") return async () => { throw failure; }; const value = Reflect.get(target, key); return typeof value === "function" ? value.bind(target) : value; } });
    await assert.rejects(createTemplatePackageFontEmbedCss(packageValue, rejecting), error => error === failure);
    const embedded = structuredClone(packageValue);
    embedded.assets[font.assetId].dataUrl = "data:font/ttf;base64,AQID";
    assert.match(await createTemplatePackageFontEmbedCss(embedded, null), /AQID/);
  } finally { setManagedFontRegistryForTests(original); }
  console.log("Host font embedding preserves explicit/default/null authority and fails closed on missing exact bytes.");
}
