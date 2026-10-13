import fixture from "../../../src/template-package/fixtures/figma-plugin-v0.4.1.json";
import { createResolvedRenderTree, type TemplatePackageV1 } from "@sleinity/template-core";
import { prepareTemplatePackageFonts } from "../src/fonts/managedFontAssets";
import { retainSessionAssetUrls, sessionAssetUrlLeases } from "../src/session/sessionAssetUrlLeases";

function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }

{
  let released = 0;
  sessionAssetUrlLeases.set("blob:resource-contract", { count: 1, revoke: () => { released += 1; } });
  const releaseFirst = retainSessionAssetUrls(["blob:resource-contract", "blob:resource-contract"]);
  const releaseSecond = retainSessionAssetUrls(["blob:resource-contract"]);
  sessionAssetUrlLeases.get("blob:resource-contract")!.count -= 1;
  releaseFirst(); releaseFirst();
  assert(released === 0, "A shared URL survives until its last owner releases it; release is idempotent.");
  releaseSecond();
  assert(Number(released) === 1 && !sessionAssetUrlLeases.has("blob:resource-contract"), "Final release revokes once and removes the lease.");
}

{
  const previous = Object.getOwnPropertyDescriptor(globalThis, "FontFace");
  let activations = 0;
  class TestFace {
    status = "loaded";
    constructor(..._args: unknown[]) { activations += 1; }
    async load() { return this; }
  }
  Object.defineProperty(globalThis, "FontFace", { configurable: true, value: TestFace });
  try {
    const value = structuredClone(fixture) as unknown as TemplatePackageV1;
    const ids = Object.values(value.nodes).filter(node => node.text).map(node => node.id);
    for (const id of ids) Object.assign(value.nodes[id].text!, { fontFamily: "Owned Face", fontWeight: 400, fontStyle: "normal", characters: "ABC" });
    value.assets["owned-font"] = { id: "owned-font", type: "font", source: "embedded", mimeType: "font/ttf", dataUrl: "data:font/ttf;base64,AA==" };
    value.fontRequirements = [{ id: "owned-face", family: "Owned Face", style: "Regular", cssStyle: "normal", weight: 400, assetId: "owned-font", usedBy: ids, characters: "ABC", editable: true, mixedStyle: false, source: "figma", availableInFigma: true }];
    const faces = new Set<FontFace>();
    const checked: string[] = [];
    const fontSet = {
      add(face: FontFace) { faces.add(face); return this as unknown as FontFaceSet; },
      has: (face: FontFace) => faces.has(face),
      check(_font: string, sample = "") { checked.push(sample); return !sample.includes("Ω"); },
      load: async () => [...faces],
    };
    const prepare = () => prepareTemplatePackageFonts(value, createResolvedRenderTree(value), fontSet, null);
    await Promise.all([prepare(), prepare()]);
    const firstCount = activations;
    assert(firstCount === 1, "Concurrent preparation activates one binary face.");
    for (const id of ids) value.nodes[id].text!.characters = "ABCΩ";
    value.fontRequirements[0].characters = "ABCΩ";
    const changed = await prepare();
    assert(activations === firstCount && checked.some(sample => sample.includes("Ω")), "Text edits recheck current glyph coverage without registering another face.");
    assert(changed.missing.length > 0, "A cached binary activation cannot hide missing current glyphs.");
    faces.clear(); await prepare();
    assert(activations === firstCount + 1, "Removing a registered face invalidates activation evidence.");
  } finally {
    if (previous) Object.defineProperty(globalThis, "FontFace", previous);
    else delete (globalThis as { FontFace?: unknown }).FontFace;
  }
}

{
  const { createIndexedDbAssetStore } = await import("../src/assets/indexedDbAssetStore");
  const previousDb = Object.getOwnPropertyDescriptor(globalThis, "indexedDB");
  const previousCreate = URL.createObjectURL;
  const previousRevoke = URL.revokeObjectURL;
  let created = 0; const revoked: string[] = [];
  Object.defineProperty(globalThis, "indexedDB", { configurable: true, value: {
    open() {
      const request: any = { result: {
        close() {},
        transaction() {
          const transaction: any = { objectStore: () => ({ put() { queueMicrotask(() => transaction.oncomplete()); } }) };
          return transaction;
        },
      } };
      queueMicrotask(() => request.onsuccess());
      return request;
    },
  } });
  URL.createObjectURL = () => `blob:import-owner-${++created}`;
  URL.revokeObjectURL = url => revoked.push(url);
  try {
    const a = createIndexedDbAssetStore()!;
    const b = createIndexedDbAssetStore()!;
    const [first, second] = await Promise.all([a.put("shared", new Uint8Array([1]), "image/png"), b.put("shared", new Uint8Array([1]), "image/png")]);
    assert(first.stableUrl === second.stableUrl && created === 1, "Independent import owners share the same stored binary URL.");
    const releaseSession = retainSessionAssetUrls([first.stableUrl]);
    a.dispose!(); b.dispose!();
    assert(revoked.length === 0, "Transfer to a live session keeps imported URLs available after import cleanup.");
    releaseSession();
    assert(Number(revoked.length) === 1, "Final session release revokes the shared imported resource.");
    const cancelled = createIndexedDbAssetStore()!;
    const pending = cancelled.put("cancel", new Uint8Array([2]), "image/png").then(() => false, () => true);
    cancelled.dispose!();
    assert(await pending && created === 1, "Cancellation during storage cannot publish or leak a new URL.");
  } finally {
    URL.createObjectURL = previousCreate; URL.revokeObjectURL = previousRevoke;
    if (previousDb) Object.defineProperty(globalThis, "indexedDB", previousDb);
    else delete (globalThis as { indexedDB?: unknown }).indexedDB;
  }
}
