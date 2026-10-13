/** Test-only before/after React integration evidence; never part of SDK bundles. */
import assert from "node:assert/strict";
import { readFile, mkdir, writeFile, access } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { chromium } from "playwright";
import { strFromU8, unzipSync } from "fflate";
import { createCompactLifecycleFixture } from "../compact-lifecycle-fixture.mjs";

const args = process.argv.slice(2), option = name => args[args.indexOf(name) + 1];
const runId = args.includes("--run-id") ? option("--run-id") : null;
if (!runId || !/^[A-Za-z0-9_-]+$/.test(runId)) throw new Error("Provide a fresh --run-id.");
const root = fileURLToPath(new URL("../../", import.meta.url));
const output = path.join(root, "fidelity/evidence/session-snapshot-bridge", runId);
if (await access(output).then(() => true, () => false)) throw new Error("Evidence run exists.");
const before = args.includes("--before-source") ? await readFile(option("--before-source"), "utf8") : null;
const fixture = await createCompactLifecycleFixture();
const raw = JSON.parse(strFromU8(unzipSync(fixture.bytes)["template.json"]));
raw.editableFields.forEach(field => { field.id = `${field.type}:${field.id.replace(/^.*:/, "")}`; });
const sha = value => createHash("sha256").update(value).digest("hex");
const authorityNames = ["parseTemplatePackageV2", "validateTemplatePackageV2", "mutateTemplateFieldContentV2", "materializeTemplateFieldContentV2", "materializeTemplateFieldFamilyVariantV2", "projectTemplatePackageV2ToRendererV1", "createResolvedRenderTree", "createSavedTemplateSessionV2Record", "createSavedTemplateFieldFamilyV3Record"];

async function run(label, baseline) {
  const server = await createServer({ root: path.join(root, "apps/studio"), logLevel: "error",
    server: { host: "127.0.0.1", port: 0 }, plugins: [{ name: "test-only-snapshot-bridge-baseline", enforce: "pre",
      transform(source, id) {
        if (baseline && id.split("?")[0].endsWith("/packages/template-react/src/fieldSessionV2.tsx")) source = baseline;
        if (/\/session\/(?:templateSessionV2|templateFieldFamilySessionV2)\.ts$/.test(id)) {
          for (const name of authorityNames) source = source.replace(new RegExp(`(?<!function )\\b${name}\\(`, "g"), `(globalThis.__bridgeAuthorityCounts["${name}"] += 1, ${name})(`);
        }
        return { code: source, map: null };
      },
    }] });
  await server.listen();
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage(), errors = [], checkpoints = {};
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(names => { globalThis.__bridgeAuthorityCounts = Object.fromEntries(names.map(name => [name, 0])); }, authorityNames);
    await page.goto(server.resolvedUrls.local[0]);
    await page.evaluate(async ({ entry, raw }) => {
      const module = await import(entry); window.lifecycle = module.startLifecycleProbe(raw);
    }, { entry: `/@fs/${path.join(root, "packages/template-react/test/sessionLifecycle.browser.tsx")}`, raw });
    const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const checkpoint = async label => {
      await settle();
      checkpoints[label] = await page.evaluate(() => ({ ...window.lifecycle.checkpoint(), authorityCalls: { ...globalThis.__bridgeAuthorityCounts } }));
    };
    await page.waitForFunction(() => window.lifecycle.state().canvasMounted && window.lifecycle.state().publications.some(p => p.session === "single" && p.accepted));
    await checkpoint("single");
    const initial = await page.evaluate(() => window.lifecycle.state());
    assert(initial.commits >= 2 && initial.cleanups >= 1, "StrictMode replay");
    assert.equal(initial.subscriptions.active, 3, "Snapshot, controllers and renderer each subscribe once.");
    assert.equal(await page.evaluate(() => window.lifecycle.edit().accepted), true);
    await page.waitForFunction(() => window.lifecycle.state().observed.includes("Snapshot bridge edit"));
    await checkpoint("edit");
    await page.evaluate(() => window.lifecycle.useProvider());
    await checkpoint("provider");
    await page.evaluate(() => window.lifecycle.remount());
    await page.waitForFunction(() => window.lifecycle.state().commits >= 4 && window.lifecycle.state().canvasMounted);
    await checkpoint("remount");
    assert.equal(await page.evaluate(() => window.lifecycle.rejectOldSingle(window.lifecycle.oldSingleEvidence)), false);
    await page.evaluate(() => window.lifecycle.replace());
    await page.waitForFunction(() => window.lifecycle.state().publications.some(p => p.session === "family" && p.accepted));
    await checkpoint("family");
    assert.equal(await page.evaluate(() => window.lifecycle.rejectOldFamily()), false);
    assert.equal(await page.evaluate(() => window.lifecycle.state().single.status), "ready", "Borrowed previous session survives replacement.");
    const mounted = await page.evaluate(() => window.lifecycle.state());
    await page.evaluate(() => window.lifecycle.unmount());
    await page.waitForFunction(() => window.lifecycle.state().ownedStatuses.every(s => s === "disposed"));
    const unmounted = await page.evaluate(() => window.lifecycle.state());
    assert.equal(unmounted.subscriptions.active, 0, "All renderer/hook subscriptions detach.");
    assert.equal(unmounted.single.status, "ready"); assert.equal(unmounted.family.status, "ready");
    assert.deepEqual(errors, []);
    await page.evaluate(() => window.lifecycle.dispose());
    return { label, checkpoints, mounted, unmounted, errors };
  } finally { await browser.close(); await server.close(); }
}

const baseline = before ? await run("native-before", before) : null;
const integrated = await run("reader-after", null);
if (baseline) {
  assert.deepEqual(integrated.checkpoints, baseline.checkpoints, "Complete snapshots, rendered DOM, fields and direct authority-call counts are unchanged.");
  assert.deepEqual(integrated.mounted.publications, baseline.mounted.publications, "Renderer publication payload acceptance is unchanged.");
  assert.deepEqual(integrated.unmounted.nativeNotifications, baseline.unmounted.nativeNotifications, "Native notification transcript is unchanged.");
}
await mkdir(output, { recursive: true });
if (before) await writeFile(path.join(output, "before-fieldSessionV2.tsx"), before);
await writeFile(path.join(output, "report.json"), JSON.stringify({ runId, passed: true,
  environment: { browser: "headless Chromium", node: process.version }, synthetic: true, manualSourceReview: false,
  fixtureSha256: sha(fixture.bytes), beforeSourceSha256: before ? sha(before) : null,
  instrumentation: "Direct Browser session calls only; no nested Core or paint count claim.",
  baseline, integrated,
}, null, 2));
console.log(`React snapshot bridge passed: ${output}/report.json`);
