import { prepareHostInstallation, verifyHostInstallation } from "../release-publication/host-installation.mjs";
/** Isolated public host, optionally installed from the exact SDK archives. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, mkdtemp, cp, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { build, preview } from "vite";
import { strFromU8, unzipSync } from "fflate";
import { createCompactLifecycleFixture } from "../compact-lifecycle-fixture.mjs";
import { createStudioViteServer } from "./studio-vite-server.mjs";

const args = process.argv.slice(2), baseline = args.includes("--baseline");
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const archives = option("--archives", null);
const manager = process.env.TEMPLATE_CONSUMER_PACKAGE_MANAGER ?? "pnpm";
assert(["npm","pnpm"].includes(manager));
const equalFamily = args.includes("--equal-family");
const compatibility = args.includes("--compat-family");
const output = option("--output", "fidelity/evidence/host-font-authority/current");
const root = process.cwd();
const fixture = await createCompactLifecycleFixture();
const raw = JSON.parse(strFromU8(unzipSync(fixture.bytes)["template.json"]));
const font = await readFile("apps/studio/src/assets/fonts/rethink-sans-600.ttf");
const fontManifest = JSON.parse(await readFile("fidelity/fonts.json", "utf8"));
const fontIdentity = fontManifest.fonts.find(item => item.id === "rethink-sans-600-normal");
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
assert.equal(sha(font), fontIdentity.sha256);
const rows = [], failures = [], archiveIdentities = [];
let commitInstrumented = false;
let server, browser, temporary, chromiumVersion;
// A controlled barrier is inserted only in the temporary test build, never SDK source.
const rasterPlugin = { name: "test-font-raster-checkpoint", transform(code) {
  const renderer = /function TemplateFieldSessionRendererV2[\s\S]*?const session = resolvedSession\(sessionOverride\);/;
  if (renderer.test(code)) {
    commitInstrumented = true;
    code = code.replace(renderer, match => match + "\nglobalThis.__hostFontCommitHook(() => { globalThis.__hostFontCommitCount = (globalThis.__hostFontCommitCount || 0) + 1; });");
    const marker = "const pngDataUrl = await rasterize(node, captureOptions);";
    return code.includes(marker) ? code.replace(marker, "if (globalThis.__hostFontRasterGate) await globalThis.__hostFontRasterGate();\n" + marker) : code;
  }
  const marker = "const pngDataUrl = await rasterize(node, captureOptions);";
  if (!code.includes(marker)) return null;
  return code.replace(marker, "if (globalThis.__hostFontRasterGate) await globalThis.__hostFontRasterGate();\n" + marker);
} };
try {
  let entry, url;
  if (archives) {
    temporary = await mkdtemp(path.join(os.tmpdir(), "host-font-authority-"));
    await mkdir(path.join(temporary, "src")); await mkdir(path.join(temporary, "vendor"));
    const dependencies = {};
    for (const name of ["template-core", "template-browser", "template-react"]) {
      const version = JSON.parse(await readFile(`packages/${name}/package.json`, "utf8")).version;
      const file = `sleinity-${name}-${version}.tgz`;
      const bytes = await readFile(path.join(archives, file));
      archiveIdentities.push({ name, file, sha256: sha(bytes) });
      await cp(path.join(archives, file), path.join(temporary, "vendor", file));
      dependencies[`@sleinity/${name}`] = `file:vendor/${file}`;
    }
    const installed = async name => JSON.parse(await readFile(`node_modules/${name}/package.json`, "utf8")).version;
    await writeFile(path.join(temporary, "package.json"), JSON.stringify({ private: true, type: "module", ...(manager === "npm" ? {overrides: dependencies} : {}), dependencies: {
      ...dependencies, react: await installed("react"), "react-dom": await installed("react-dom"),
      "@types/react": await installed("@types/react"), "@types/react-dom": await installed("@types/react-dom"), typescript: await installed("typescript"),
    } }));
    await writeFile(path.join(temporary, "pnpm-workspace.yaml"), `packages:\n  - .\noverrides:\n${Object.entries(dependencies).map(([name, file]) => `  "${name}": "${file}"`).join("\n")}\n`);
    await writeFile(path.join(temporary, ".npmrc"), "");
    await cp("packages/template-react/test/hostFontAuthority.browser.tsx", path.join(temporary, "src", "host.tsx"));
    await writeFile(path.join(temporary, "src", "main.ts"), 'export { startHostFontProbe } from "./host";');
    if (!baseline) await writeFile(path.join(temporary, "src", "contracts.ts"), `
import type { TemplateFieldSessionRendererV2Handle, TemplateFieldSessionRendererV2Props } from "@sleinity/template-react/editor";
import type { PackagePngExportRequest, PackageImageExportRequest } from "@sleinity/template-browser";
import { captureTemplatePackagePreview } from "@sleinity/template-browser/capture";
import { createTemplatePackageFontEmbedCss, type ManagedFontRegistry } from "@sleinity/template-browser/fonts";
declare const handle: TemplateFieldSessionRendererV2Handle;
declare const registry: ManagedFontRegistry;
declare const png: PackagePngExportRequest;
declare const readiness: PackageImageExportRequest;
declare const props: TemplateFieldSessionRendererV2Props;
png.fontRegistry = registry; readiness.fontRegistry = null; props.fontRegistry = undefined;
createTemplatePackageFontEmbedCss(png.packageValue, registry);
captureTemplatePackagePreview(png.node, png.packageValue, { fontRegistry: null });
// @ts-expect-error Renderer handles own their registry; callers cannot override it.
handle.exportPng({ fontRegistry: null });
`);
    await writeFile(path.join(temporary, "tsconfig.json"), JSON.stringify({ compilerOptions: { target: "ES2022", lib: ["ES2022", "DOM", "DOM.Iterable"], module: "ESNext", moduleResolution: "Bundler", jsx: "react-jsx", strict: true, skipLibCheck: false, noEmit: true }, include: ["src"] }));
    await writeFile(path.join(temporary, "index.html"), '<!doctype html><html><body><script type="module" src="/src/main.ts"></script></body></html>');
    let env = { ...process.env, CI: "true", NPM_CONFIG_USERCONFIG: path.join(temporary, ".npmrc") };
    for (const key of ["NODE_AUTH_TOKEN", "NPM_TOKEN", "GH_TOKEN", "GITHUB_TOKEN"]) delete env[key];
    env = await prepareHostInstallation(temporary, archives, manager, env);
    const install = spawnSync(manager, ["install", "--prefer-offline"], { cwd: temporary, env, encoding: "utf8" });
    assert.equal(install.status, 0, install.stderr || install.stdout);
    const lock = await readFile(path.join(temporary, manager === "pnpm" ? "pnpm-lock.yaml" : "package-lock.json"), "utf8");
    await verifyHostInstallation(temporary, archives, manager);
    if (!baseline) {
      const check = spawnSync(process.execPath, [path.join(temporary, "node_modules/typescript/bin/tsc"), "--noEmit"], { cwd: temporary, env, encoding: "utf8" });
      assert.equal(check.status, 0, check.stdout + check.stderr);
    }
    await build({ root: temporary, configFile: false, logLevel: "error", plugins: [rasterPlugin], build: { minify: false,
      rollupOptions: { input: path.join(temporary, "src/main.ts"), preserveEntrySignatures: "strict", output: { entryFileNames: "host.js" } } } });
    server = await preview({ root: temporary, configFile: false, logLevel: "error", preview: { host: "127.0.0.1", port: 0 } });
    url = server.resolvedUrls.local[0]; entry = "/host.js";
  } else {
    server = await createStudioViteServer({ plugins: [rasterPlugin] }); await server.listen();
    url = server.resolvedUrls.local[0]; entry = "/@fs/" + fileURLToPath(new URL("../../packages/template-react/test/hostFontAuthority.browser.tsx", import.meta.url));
  }
  browser = await chromium.launch({ headless: true });
  chromiumVersion = browser.version();
  for (const kind of option("--kinds", "single,family").split(",")) for (const mode of option("--modes", baseline ? "custom,default,embedded" : "custom,default,embedded,missing,missing-binary,corrupt,mismatch,face-mismatch,rejection,null-managed").split(",")) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
    const page = await context.newPage(), errors = [], downloads = [];
    page.on("pageerror", error => errors.push(error.message)); page.on("download", download => downloads.push(download.suggestedFilename()));
    await page.addInitScript(() => {
      window.__fontCounts = { urls: 0, revoked: 0, activations: 0 };
      const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL), add = document.fonts.add.bind(document.fonts);
      URL.createObjectURL = blob => { window.__fontCounts.urls++; return create(blob); };
      URL.revokeObjectURL = url => { window.__fontCounts.revoked++; revoke(url); };
      document.fonts.add = face => { if (face.family.includes("__template_font")) window.__fontCounts.activations++; return add(face); };
    });
    try {
      await page.goto(url);
      await page.evaluate(async ({ entry, raw, bytes, kind, mode, equalFamily, compatibility }) => { window.h = await (await import(entry)).startHostFontProbe(raw, bytes, kind, mode, equalFamily, compatibility); }, { entry, raw, bytes: [...font], kind, mode, equalFamily, compatibility });
      if (mode === "corrupt" || mode === "default-corrupt") {
        const preparation = await page.evaluate(() => window.h.preparation());
        assert.equal(preparation.exportReady, false);
        assert.equal((await page.evaluate(() => window.h.beginExport())).ok, false);
        rows.push({ kind, mode, blocked: true, nativeState: await page.evaluate(() => window.h.state()), preparation, downloads: downloads.length });
        continue;
      }
      await page.waitForFunction(() => ["ready", "blocked"].includes(window.h.state().readiness.fonts));
      if (baseline && mode === "custom") {
        assert.equal(await page.evaluate(() => window.h.state().readiness.fonts), "blocked");
        const before = await page.evaluate(() => ({ state: window.h.state(), counts: { ...window.__fontCounts } }));
        const outcome = await page.evaluate(() => window.h.beginExport());
        assert.equal(outcome.ok, false);
        assert.equal(await page.evaluate(async () => (await window.h.preparation()).exportReady), true);
        assert.equal(await page.evaluate(() => window.h.embedding()), "");
        rows.push({ kind, mode, reproduced: "explicit preparation ready; ordinary renderer blocked; PNG embedding empty", before, outcome,
          after: await page.evaluate(() => ({ state: window.h.state(), counts: { ...window.__fontCounts } })), downloads: downloads.length });
        continue;
      }
      if (["missing", "missing-binary", "corrupt", "mismatch", "face-mismatch", "rejection", "null-managed"].includes(mode)) {
        assert.equal(await page.evaluate(() => window.h.state().readiness.fonts), "blocked");
        const result = await page.evaluate(() => window.h.beginExport());
        assert.equal(result.ok, false); assert.equal(downloads.length, 0);
        rows.push({ kind, mode, state: await page.evaluate(() => window.h.state()), blocked: true, downloads: 0 });
        assert.deepEqual(errors, []);
        continue;
      }
      let checkpoint = "initial readiness";
      const ready = async () => { try { await page.waitForFunction(() => window.h.state().readiness.exportReady); } catch (error) { throw new Error(`${checkpoint}: ${error.message}`); } };
      await ready();
      const before = await page.evaluate(() => ({ state: window.h.state(), counts: { ...window.__fontCounts, commits: window.__hostFontCommitCount } }));
      const durations = [];
      for (let i = 0; i < 20; i++) {
        const measured = await page.evaluate(index => { const start = performance.now(); const accepted = window.h.edit(`Font edit ${index}`).accepted; return { ms: performance.now() - start, accepted }; }, i);
        assert(measured.accepted); durations.push(measured.ms); await ready();
      }
      const afterTyping = await page.evaluate(() => ({ state: window.h.state(), counts: { ...window.__fontCounts, commits: window.__hostFontCommitCount } }));
      assert.equal(afterTyping.state.contentRevision - before.state.contentRevision, 20);
      assert.equal(afterTyping.counts.activations, before.counts.activations, "Typing must reuse the existing face.");
      assert.equal(afterTyping.counts.urls, before.counts.urls, "Typing must not allocate font URLs.");
      assert((await page.evaluate(() => window.h.reset())).accepted); await ready();
      if (kind === "family") { checkpoint = "Family selection"; await page.evaluate(() => window.h.select()); await ready(); }
      const exportStart = Date.now();
      const exported = await page.evaluate(() => window.h.export(false, true));
      const canvas = await page.evaluate(() => window.h.state().canvas);
      assert(exported.width === canvas.width && exported.height === canvas.height);
      const pngHash = sha(Buffer.from(exported.pngDataUrl.split(",")[1], "base64"));
      const exportMs = Date.now() - exportStart;
      const id = await page.evaluate(() => window.h.save());
      checkpoint = "save/reopen";
      await page.evaluate(({ id, inPlace }) => inPlace ? window.h.reopenInPlace(id) : window.h.reopen(id), { id, inPlace: args.includes("--reuse-mounted-session") });
      await ready();
      if (mode === "custom") { await page.evaluate(() => window.h.recreatedRegistry()); await ready(); }
      await page.evaluate(() => window.h.export(false));
      assert.equal(await page.evaluate(() => window.h.corruptUpload()), true);
      const typingAfter = await page.evaluate(() => ({ state: window.h.state(), counts: { ...window.__fontCounts } }));
      const downloadEvent = page.waitForEvent("download");
      assert.equal((await page.evaluate(() => window.h.beginExport(true))).ok, true);
      const positiveDownload = (await downloadEvent).suggestedFilename();
      assert.equal(downloads.length, 1);
      downloads.splice(0);
      if (!baseline && mode === "custom") {
        await page.evaluate(async ({ entry, raw, bytes, kind }) => {
          window.otherHost = await (await import(entry)).startHostFontProbe(raw, bytes, kind, "missing");
        }, { entry, raw, bytes: [...font], kind });
        await page.waitForFunction(() => window.otherHost.state().readiness.fonts === "blocked");
        assert.equal((await page.evaluate(() => window.otherHost.beginExport())).ok, false);
        assert.equal((await page.evaluate(() => window.h.state())).readiness.exportReady, true);
        await page.evaluate(() => window.otherHost.dispose());
        const missingEmbedding = await page.evaluate(async () => { try { await window.h.embedding("missing"); return false; } catch { return true; } });
        assert(missingEmbedding, "A loaded face cannot authorize missing embedding bytes.");
        const beforeReplacementGeneration = await page.evaluate(() => window.h.state().publicationGeneration);
        await page.evaluate(() => { window.h.holdRead("record"); window.h.setRegistry(1); });
        await page.waitForFunction(() => window.h.state().held > 0);
        await page.evaluate(() => window.h.setRegistry(0)); await ready();
        const current = await page.evaluate(() => window.h.state());
        assert(current.publicationGeneration > beforeReplacementGeneration, "Registry replacement must request a fresh renderer publication, not relabel its old line observation.");
        await page.evaluate(() => window.h.release());
        await page.waitForFunction(previous => window.h.state().stats.readsCompleted > previous, current.stats.readsCompleted);
        const afterLateRead = await page.evaluate(() => window.h.state());
        assert.equal(afterLateRead.identity.identityId, current.identity.identityId);
        assert.equal(afterLateRead.revision, current.revision, "The abandoned registry read must not publish a notification.");
        await page.evaluate(() => { window.h.holdRead("blob"); window.pendingExport = window.h.beginExport(); });
        await page.waitForFunction(() => window.h.state().held > 0);
        await page.evaluate(() => window.h.setRegistry(1)); await ready();
        await page.evaluate(() => window.h.release());
        assert.equal((await page.evaluate(() => window.pendingExport)).ok, false);
        assert.equal(downloads.length, 0);
        assert.deepEqual(await page.evaluate(() => window.h.borrowedOwnership()), { fonts: 1, bytes: font.length });
        for (const replacement of ["registry", "session", "remount"]) {
          await page.evaluate(() => {
            let release; const held = new Promise(resolve => { release = resolve; });
            window.rasterEntered = false;
            window.__hostFontRasterGate = () => { window.rasterEntered = true; return held; };
            window.releaseRaster = () => { window.__hostFontRasterGate = null; release(); };
            window.pendingExport = window.h.beginExport();
          });
          await page.waitForFunction(() => window.rasterEntered);
          await page.evaluate(replacement => {
            if (replacement === "registry") window.h.setRegistry(0);
            else if (replacement === "session") window.h.replaceSession();
            else window.h.remount();
          }, replacement); await ready();
          await page.evaluate(() => window.releaseRaster());
          assert.equal((await page.evaluate(() => window.pendingExport)).ok, false);
          assert.equal(downloads.length, 0);
        }
        assert.equal(await page.evaluate(() => window.h.replaceSession()), "ready", "Borrowed sessions remain caller-owned."); await ready();
        await page.evaluate(() => { window.h.holdRead("blob"); window.pendingExport = window.h.beginExport(); });
        await page.waitForFunction(() => window.h.state().held > 0);
        await page.evaluate(() => window.h.replaceSession()); await ready();
        await page.evaluate(() => window.h.release());
        assert.equal((await page.evaluate(() => window.pendingExport)).ok, false);
        assert.equal(downloads.length, 0);
        await page.evaluate(() => window.h.setRegistry(2));
        await page.waitForFunction(() => window.h.state().readiness.fonts === "blocked");
        await page.evaluate(() => window.h.setRegistry(0)); await ready();
        const transport = await page.evaluate(() => window.h.transport());
        const cold = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        try {
          const next = await cold.newPage(); await next.goto(url);
          await next.evaluate(async ({ entry, raw, bytes, kind, transport }) => {
            window.h = await (await import(entry)).startHostFontProbe(raw, bytes, kind, "custom", false, false, true);
            if ([...document.fonts].some(face => face.family.includes("__template_font"))) throw new Error("Cold restore must not start with a managed face.");
            await window.h.restoreTransport(transport);
          }, { entry, raw, bytes: [...font], kind, transport });
          await next.waitForFunction(() => window.h.state().readiness.exportReady);
          assert.equal((await next.evaluate(() => window.h.beginExport(false))).ok, true);
          await next.evaluate(() => window.h.dispose());
        } finally { await cold.close(); }
        await page.evaluate(() => { window.h.holdRead("blob"); window.pendingExport = window.h.beginExport(); });
        await page.waitForFunction(() => window.h.state().held > 0);
        await page.evaluate(() => window.h.unmount());
        await page.evaluate(() => window.h.release());
        assert.equal((await page.evaluate(() => window.pendingExport)).ok, false);
        assert.equal(downloads.length, 0);
        assert.deepEqual(await page.evaluate(() => window.h.borrowedOwnership()), { fonts: 1, bytes: font.length });
      }
      durations.sort((a, b) => a - b);
      rows.push({ kind, mode, before, afterTyping, typingAfter, after: await page.evaluate(() => ({ state: window.h.state(), counts: { ...window.__fontCounts } })), pngHash, exportMs, positiveDownload,
        medianEditMs: durations[10], p95EditMs: durations[18], downloads: downloads.length, errors });
      assert.deepEqual(errors, []);
    } catch (error) { failures.push({ kind, mode, message: error.message, errors, state: await page.evaluate(() => window.h?.state()).catch(() => null) }); }
    finally { await page.evaluate(() => window.h?.dispose()).catch(() => {}); await context.close(); }
  }
} finally {
  await browser?.close(); await server?.close(); if (temporary) await rm(temporary, { recursive: true, force: true });
}
await mkdir(output, { recursive: true });
assert(commitInstrumented, "The test-only renderer commit probe must be present.");
await writeFile(path.join(output, "verification.json"), JSON.stringify({ baseline, equalFamily, compatibility, synthetic: true, sourceCertification: false, manualReview: false,
  instrumentation: "Test-only commit counter and deferred raster barrier; no production source modification.",
  environment: { node: process.version, platform: process.platform, arch: process.arch, chromium: chromiumVersion, chromiumExecutable: chromium.executablePath(), viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, build: archives ? "production" : "development" },
  node: process.version, manager, font: fontIdentity, archives: archiveIdentities, rows, failures }, null, 2) + "\n");
console.log(JSON.stringify({ baseline, rows: rows.map(({ kind, mode, pngHash }) => ({ kind, mode, pngHash })), failures }, null, 2));
assert.equal(failures.length, 0, "Host font authority scenarios failed.");
