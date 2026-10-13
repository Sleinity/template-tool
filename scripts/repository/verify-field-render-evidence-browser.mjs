/** Synthetic automated headless lifecycle coverage; no manual source-fidelity review. */
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { strFromU8, unzipSync } from "fflate";
import { createCompactLifecycleFixture } from "../compact-lifecycle-fixture.mjs";
import { createStudioViteServer } from "./studio-vite-server.mjs";
const raw = JSON.parse(strFromU8(unzipSync((await createCompactLifecycleFixture()).bytes)["template.json"]));
raw.editableFields.forEach(field => { field.id = `${field.type}:${field.id.replace(/^.*:/, "")}`; });
const entry = `/@fs/${fileURLToPath(new URL("../../packages/template-react/test/sessionLifecycle.browser.tsx", import.meta.url))}`;
const server = await createStudioViteServer(); await server.listen(); const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage(), errors = [], checkpoints = [];
  page.on("pageerror", error => errors.push(error.message)); await page.goto(server.resolvedUrls.local[0]);
  await page.evaluate(async ({ entry, raw }) => { window.evidenceProbe = (await import(entry)).startLifecycleProbe(raw, true); }, { entry, raw });
  const ready = name => page.waitForFunction(name => { const s = window.evidenceProbe.state(); return s.exportReady && s.linePublications.some(p => p.session === name && p.accepted); }, name);
  const reject = async () => {
    const result = await page.evaluate(() => window.evidenceProbe.rejectLateEvidenceAndExport());
    assert.equal(result.runtimeAccepted, false); assert.equal(result.lineAccepted, false); assert.equal(result.readiness.exportReady, false);
    assert.match(result.exportError, /PNG export requires current renderer-backed/); checkpoints.push(result);
  };
  await ready("single"); const mounted = await page.evaluate(() => window.evidenceProbe.state());
  assert(mounted.commits >= 2 && mounted.cleanups >= 1, "StrictMode replay"); await reject();
  await page.evaluate(() => window.evidenceProbe.remount()); await ready("single"); await reject();
  await page.evaluate(() => window.evidenceProbe.replace()); await ready("family");
  assert.equal(await page.evaluate(() => window.evidenceProbe.rejectOldFamily()), false); await reject();
  await page.evaluate(() => window.evidenceProbe.remount()); await ready("family");
  const replaced = await page.evaluate(() => window.evidenceProbe.state());
  assert.equal(replaced.single.status, "ready", "Borrowed replaced session remains active");
  await page.evaluate(() => window.evidenceProbe.unmount());
  await page.waitForFunction(() => window.evidenceProbe.state().ownedStatuses.every(s => s === "disposed"));
  const unmounted = await page.evaluate(() => window.evidenceProbe.state()); assert.equal(unmounted.subscriptions.active, 0); assert.deepEqual(errors, []);
  await page.evaluate(() => window.evidenceProbe.dispose());
  await mkdir("fidelity/evidence/field-render-evidence", { recursive: true });
  await writeFile("fidelity/evidence/field-render-evidence/browser.json", JSON.stringify({ environment: "headless Chromium", synthetic: true, sourceReview: false, mounted, checkpoints, replaced, unmounted, errors }, null, 2));
  console.log("StrictMode, single/Family remount and replacement, late font/line evidence and stale PNG rejection passed.");
} finally { await browser.close(); await server.close(); }
