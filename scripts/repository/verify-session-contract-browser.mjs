/** Automated headless React lifecycle evidence; not a manual source-fidelity review. */
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { strFromU8, unzipSync } from "fflate";
import { createCompactLifecycleFixture } from "../compact-lifecycle-fixture.mjs";
import { createStudioViteServer } from "./studio-vite-server.mjs";

const fixture = await createCompactLifecycleFixture();
const raw = JSON.parse(strFromU8(unzipSync(fixture.bytes)["template.json"]));
raw.editableFields.forEach(field => { field.id = `${field.type}:${field.id.replace(/^.*:/, "")}`; });
const entry = `/@fs/${fileURLToPath(new URL("../../packages/template-react/test/sessionLifecycle.browser.tsx", import.meta.url))}`;
const server = await createStudioViteServer(); await server.listen();
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage(), errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(server.resolvedUrls.local[0]);
  await page.evaluate(async ({ entry, raw }) => { const module = await import(entry); window.lifecycle = module.startLifecycleProbe(raw); }, { entry, raw });
  await page.waitForFunction(() => window.lifecycle.state().canvasMounted && window.lifecycle.state().publications.some(item => item.session === "single" && item.accepted));
  const mounted = await page.evaluate(() => window.lifecycle.state());
  assert(mounted.commits >= 2 && mounted.cleanups >= 1, "StrictMode replays the renderer lifecycle.");
  assert(mounted.ownedStatuses.every(status => status !== "disposed"), "StrictMode replay does not dispose the live owned session.");
  await page.evaluate(() => window.lifecycle.remount());
  await page.waitForFunction(revision => window.lifecycle.state().single.revision > revision && window.lifecycle.state().commits >= 4, mounted.single.revision);
  assert.equal(await page.evaluate(() => window.lifecycle.rejectOldSingle(window.lifecycle.oldSingleEvidence)), false, "Renderer remount rejects the prior publisher.");
  const remounted = await page.evaluate(() => window.lifecycle.state());
  await page.evaluate(() => window.lifecycle.replace());
  await page.waitForFunction(() => window.lifecycle.state().publications.some(item => item.session === "family" && item.accepted));
  assert.equal(await page.evaluate(() => window.lifecycle.rejectOldFamily()), false, "Replacement Family rejects old publisher generations.");
  const replacement = await page.evaluate(() => window.lifecycle.state());
  assert.equal(replacement.single.status, "ready", "Borrowed session is not disposed by renderer replacement.");
  await page.evaluate(() => window.lifecycle.unmount());
  await page.waitForFunction(() => window.lifecycle.state().ownedStatuses.every(status => status === "disposed"));
  const unmounted = await page.evaluate(() => window.lifecycle.state());
  assert.equal(unmounted.single.status, "ready"); assert.equal(unmounted.family.status, "ready");
  assert.deepEqual(errors, []);
  await page.evaluate(() => window.lifecycle.dispose());
  await mkdir("fidelity/evidence/session-contract", { recursive: true });
  await writeFile("fidelity/evidence/session-contract/browser.json", JSON.stringify({ environment: "headless Chromium", synthetic: true, sourceReview: false, mounted, remounted, replacement, unmounted, errors }, null, 2));
  console.log("React StrictMode, renderer remount/replacement, stale publication and final owned-session disposal passed.");
} finally { await browser.close(); await server.close(); }
