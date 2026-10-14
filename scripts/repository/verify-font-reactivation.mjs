/** Real-browser font lifecycle through public package entry points only. */
import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { strFromU8, unzipSync } from "fflate";
import { createCompactLifecycleFixture } from "../compact-lifecycle-fixture.mjs";
import { createStudioViteServer } from "./studio-vite-server.mjs";
const fixture = await createCompactLifecycleFixture();
const raw = JSON.parse(strFromU8(unzipSync(fixture.bytes)["template.json"]));
const bytes = [...await readFile("apps/studio/src/assets/fonts/rethink-sans-600.ttf")];
const modules = Object.fromEntries(["core", "fonts", "importer"].map(name => [name, "/@fs/" + fileURLToPath(import.meta.resolve(name === "core" ? "@sleinity/template-core" : `@sleinity/template-browser/${name}`))]));
const server = await createStudioViteServer();
await server.listen();
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto(server.resolvedUrls.local[0]);
  const evidence = await page.evaluate(async ({ raw, bytes, modules }) => {
    const core = await import(modules.core);
    const fonts = await import(modules.fonts);
    const importer = await import(modules.importer);
    const registry = new fonts.InMemoryManagedFontRegistry();
    const font = await registry.registerUploadedFont({ bytes: new Uint8Array(bytes).buffer, family: "Rethink Sans", style: "normal", weight: 600, source: "uploaded", mimeType: "font/ttf", fileName: "rethink-sans-600.ttf" });
    raw.nodes.headline.text.characters = "Deal of the week";
    raw.editableFields[0].id = "text:headline";
    raw.editableFields[0].defaultValue = "Deal of the week";

    raw.fontRequirements = [{ id: "rethink-600", family: "Rethink Sans", postScriptName: "RethinkSans-SemiBold", style: "SemiBold", cssStyle: "normal", weight: 600, usedBy: Object.values(raw.nodes).filter(node => node.text).map(node => node.id), characters: "Deal of the week", editable: true, mixedStyle: false, source: "figma", availableInFigma: true }];
    let linked = raw;
    for (const requirement of raw.fontRequirements) linked = await fonts.linkRequirementToManagedFont(linked, requirement.id, font, { confirmed: true });
    const normalized = core.normalizeTemplatePackageV1ToV2(linked);
    if (!normalized.package) throw new Error(JSON.stringify(normalized));
    const base = normalized.package;
    const first = { id: "portrait", name: "Portrait", packageValue: base };
    const second = { id: "landscape", name: "Blue Landscape", packageValue: structuredClone(base) };
    const single = importer.appendTemplateSourcesV2(null, [], [first], "Font lifecycle");
    const family = importer.appendTemplateSourcesV2(single, [first], [second], "Font lifecycle");
    const evidence = [];
    const prepare = async (session, phase) => {
      const snapshot = session.getSnapshot();
      const result = await fonts.prepareTemplatePackageFonts(snapshot.rendererPackage, snapshot.resolvedTree, document.fonts, registry);
      evidence.push({ phase, requirement: snapshot.rendererPackage.fontRequirements, selectedVariantId: snapshot.selectedVariantId, revision: snapshot.revision, readiness: snapshot.readiness, exportReady: result.exportReady, faces: [...document.fonts].filter(face => face.family.includes(font.runtimeFamily)).map(face => ({ family: face.family, status: face.status })) });
      if (!result.exportReady) throw new Error(`Font preparation blocked at ${phase}`);
    };
    await prepare(single, "single activation");
    await prepare(family, "shared activation");
    const original = [...document.fonts].find(face => face.family.includes(font.runtimeFamily));
    if (!original) throw new Error("Exact private FontFace missing");
    document.fonts.delete(original);
    family.selectVariant("landscape");
    await prepare(family, "variant reactivation after external face removal");
    if (document.fonts.has(original)) throw new Error("Old face unexpectedly retained");
    single.dispose();
    await prepare(family, "surviving session");
    family.dispose();
    const reopened = importer.appendTemplateSourcesV2(null, [], [first], "Reopened");
    await prepare(reopened, "reactivation after disposal");
    reopened.dispose();
    return { binaryHash: font.assetHash, runtimeFamily: font.runtimeFamily, evidence };
  }, { raw, bytes, modules });
  assert.equal(evidence.evidence.length, 5);
  await mkdir("fidelity/evidence/prerelease-20260929", { recursive: true });
  await writeFile("fidelity/evidence/prerelease-20260929/font-reactivation.json", JSON.stringify(evidence, null, 2));
  console.log("Public V2 exact-font activation, external removal, variant switch, shared session survival and reopen passed.");
} finally { await browser.close(); await server.close(); }
