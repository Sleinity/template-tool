import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { launchBrowser } from "../fidelity/browser.mjs";
import { createStudioViteServer } from "../repository/studio-vite-server.mjs";

// Test-only, isolated browser contexts. This diagnostic does not certify pixels
// or alter user storage, source fixtures, approved references, or tolerances.
const root = process.cwd();
const out = resolve("fidelity/evidence/field-rule-renderer-architecture-20261019");
await mkdir(out, { recursive: true });
const fixture = JSON.parse(await readFile("src/template-package/fixtures/figma-plugin-v0.4.1.json", "utf8"));
const server = await createStudioViteServer();
await server.listen();
const browser = await launchBrowser(false);
const reports = [];
try {
  for (const family of [false, true]) {
    const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(server.resolvedUrls.local[0]);
    const result = await page.evaluate(async ({ root, fixture, family }) => {
      const core = await import(`/@fs${root}/packages/template-core/src/index.ts`);
      const single = await import(`/@fs${root}/packages/template-browser/src/session/templateSessionV2.ts`);
      const families = await import(`/@fs${root}/packages/template-browser/src/session/templateFieldFamilySessionV2.ts`);
      const assembly = await import(`/@fs${root}/packages/template-browser/src/import/templateSourceAssemblyV2.ts`);
      const { measureRenderedTextLines } = await import(`/@fs${root}/packages/template-browser/src/editor/textMeasurement.ts`);
      const { commitRenderedTextareaDraft } = await import(`/@fs${root}/apps/studio/src/field-rules/renderedTextareaDrafts.ts`);
      const { default: React } = await import("/node_modules/.vite/deps/react.js");
      const { default: { createRoot } } = await import("/node_modules/.vite/deps/react-dom_client.js");
      const { InMemoryManagedFontRegistry } = await import(`/@fs${root}/packages/template-browser/src/fonts/inMemoryFontRegistry.ts`);
      const { TemplateFieldSessionRendererV2 } = await import(`/@fs${root}/packages/template-react/src/fieldSessionV2.tsx`);
      const checks = [];
      const check = (name, passed, details) => {
        checks.push({ name, passed, ...(details === undefined ? {} : { details }) });
        if (!passed) throw new Error(`${name}: ${JSON.stringify(details)}`);
      };
      const pkg = core.normalizeTemplatePackageV1ToV2(fixture).package;
      pkg.fontRequirements = [];
      for (const n of Object.values(pkg.nodes)) if (n.type === "TEXT") n.text.fontFamily = "sans-serif";
      pkg.editableFields = [
        { id: "textarea:hug", type: "textarea", binding: { kind: "text-characters", nodeId: "58:57" }, defaultValue: "Hi", configuration: { maxLines: 1 } },
        { id: "textarea:body", type: "textarea", binding: { kind: "text-characters", nodeId: "58:60" }, defaultValue: "Body", configuration: { maxLines: 2, warningAtLines: 2 } },
        { id: "boolean:visible", type: "boolean", binding: { kind: "structural-visibility", nodeId: "58:60" }, defaultValue: true, configuration: {} },
      ];
      pkg.editableFieldOrder = pkg.editableFields.map(f => f.id);
      const other = structuredClone(pkg); other.packageId += "-second";
      other.editableFields.find(f => f.id === "textarea:body").configuration = { maxLines: 1, warningAtLines: 1 };
      const value = family ? assembly.createTemplateFieldFamilyFromSourcesV2([pkg, other], "Architecture audit") : pkg;
      const session = family ? families.createTemplateFieldFamilySessionV2() : single.createTemplateSessionV2();
      session.load(value);
      // Exercise native evidence ownership independently of the React bridge.
      const native = family ? families.createTemplateFieldFamilySessionV2() : single.createTemplateSessionV2();
      native.load(value);
      const lease = native.beginRuntimeEvidencePublication();
      const initial = native.getSnapshot();
      const materialization = family ? initial.familyMaterialization.materialization : initial.materialization;
      const nativePackage = family ? initial.effectivePackage : initial.basePackage;
      const runtimeEvidence = {
        contentRevision: initial.contentState.revision,
        materializationRevision: materialization.materializationRevision,
        settlementRevision: "native-before-reload", fontRevision: "native-font",
        publicationGeneration: lease + 1, fonts: "ready", renderer: "ready",
      };
      check("Native initial runtime accepted", native.publishRuntimeReadiness(runtimeEvidence));
      const lineEvidence = id => ({ ...runtimeEvidence, schemaVersion: "field-layout-evidence-v1", fieldId: id,
        packageIdentity: nativePackage.packageId, participation: "active", reliability: "reliable", measuredVisualLines: 1 });
      for (const id of ["textarea:hug", "textarea:body"]) check("Native initial line accepted " + id, native.publishFieldLayoutEvidence(lineEvidence(id)));
      const mediaDeadline = performance.now() + 10000;
      while (native.getSnapshot().readiness.assets === "pending" && performance.now() < mediaDeadline) await new Promise(resolve => requestAnimationFrame(resolve));
      const beforeReloadReady = native.getSnapshot().readiness.exportReady;
      native.load(value);
      const staleRuntimeAccepted = native.publishRuntimeReadiness(runtimeEvidence);
      const staleLinesAccepted = ["textarea:hug", "textarea:body"].map(id => native.publishFieldLayoutEvidence(lineEvidence(id)));
      const nativeReload = { beforeReloadReady, staleRuntimeAccepted, staleLinesAccepted,
        readiness: native.getSnapshot().readiness, operationRevisionBefore: initial.operationRevision,
        operationRevisionAfter: native.getSnapshot().operationRevision };
      checks.push({ name: "Native same-source reload rejects old publisher evidence", passed: !staleRuntimeAccepted && staleLinesAccepted.every(accepted => !accepted), diagnostic: true, details: nativeReload });
      native.dispose();
      let imageDiagnostics;
      if (family) {
        const familyCore = await import(`/@fs${root}/packages/template-core/src/family/fieldRulesV2.ts`);
        const { familyFieldIssues } = await import(`/@fs${root}/apps/studio/src/field-rules/fieldAuthoring.ts`);
        const a = structuredClone(pkg), b = structuredClone(pkg);
        const image = { id: "image:hero", type: "image", binding: { kind: "image-content", nodeId: "58:61" },
          defaultValue: { assetId: pkg.nodes["58:61"].image.assetId, placement: { mode: "imported" } }, configuration: { replacementPlacement: "fill" } };
        a.editableFields = [image]; a.editableFieldOrder = [image.id];
        b.editableFields = [{ ...structuredClone(image), configuration: { replacementPlacement: "fit" } }]; b.editableFieldOrder = [image.id]; b.packageId += "-fit";
        const imageFamily = assembly.createTemplateFieldFamilyFromSourcesV2([a, b], "Placement diagnostic audit");
        const content = { ...familyCore.createTemplateFieldFamilyContentStateV3(imageFamily),
          values: { [image.id]: { value: { assetId: image.defaultValue.assetId, placement: { mode: "fill" } } } },
          variantImagePlacements: { [imageFamily.variants[1].id]: { [image.id]: { mode: "fit" } } } };
        const resolved = imageFamily.variants.map(v => familyCore.materializeTemplateFieldFamilyVariantV2(imageFamily, v.id, content));
        const studioIssues = familyFieldIssues(imageFamily, content);
        imageDiagnostics = { nativeVariants: resolved.map(v => ({ valid: v.valid, issues: v.materialization.fieldIssues })), studioIssues };
        check("Variant-specific Fill/Fit content is natively valid", resolved.every(v => v.valid), imageDiagnostics);
        checks.push({ name: "Studio all-design image diagnostics agree with effective placement", passed: studioIssues.every(i => i.severity === "warning"), diagnostic: true, details: imageDiagnostics });
      }
      const host = document.createElement("div"); document.body.replaceChildren(host);
      const reactRoot = createRoot(host), renderer = React.createRef();
      let mounted = true, registry;
      const render = () => reactRoot.render(React.createElement(React.StrictMode, {}, mounted
        ? React.createElement(TemplateFieldSessionRendererV2, { session, ref: renderer, mode: "editor", fontRegistry: registry }) : null));
      const settle = async (predicate = s => s.readiness.exportReady) => {
        const until = performance.now() + 15000;
        while (performance.now() < until) {
          const s = session.getSnapshot();
          if (predicate(s) && renderer.current) return s;
          await new Promise(resolve => requestAnimationFrame(resolve));
        }
        throw new Error("Readiness timeout: " + JSON.stringify(session.getSnapshot().readiness));
      };
      const controller = id => session.getFieldControllers().find(f => f.id === id);
      const field = id => session.getSnapshot().fields.find(f => f.descriptor.id === id);
      const write = (id, text) => check(`native commit ${id} ${JSON.stringify(text)}`, controller(id).setValue(text).accepted);
      const probe = async (id, candidate) => {
        const before = field(id);
        const nodeId = id === "textarea:hug" ? "58:57" : "58:60";
        const node = host.querySelector(`[data-package-node-id="${nodeId}"]`);
        const previousWidth = node?.clientWidth;
        const predictedLines = measureRenderedTextLines(host, { nodeId }, candidate);
        const outcome = await commitRenderedTextareaDraft({ session, fieldId: id, value: candidate, signal: new AbortController().signal, isCurrent: () => true });
        const guard = { accepted: outcome.disposition === "accepted", outcome };
        check(`renderer transaction ${id}`, guard.accepted, outcome);
        await settle(s => s.fields.find(f => f.descriptor.id === id).renderValidation.state !== "pending");
        const after = field(id);
        return { id, previous: before.value, candidate, previousWidth, currentWidth: host.querySelector(`[data-package-node-id="${nodeId}"]`)?.clientWidth, predictedLines, guard, actual: after.renderValidation };
      };
      try {
        render(); await settle();
        check("StrictMode initial publication settles", true);
        const fixed = await probe("textarea:body", "One\nTwo");
        check("Fixed/FILL-width guard agrees at line boundary", fixed.predictedLines === 2 && fixed.guard.accepted && fixed.actual.state === "valid", fixed);
        const hug = await probe("textarea:hug", "A considerably longer heading");
        // Record guard/paint agreement as an audit finding, not an approved golden.
        const guardGap = !hug.guard.accepted && hug.actual.state === "valid";
        check("Native HUG candidate remains valid", hug.actual.state === "valid", hug);
        checks.push({ name: "HUG candidate transaction/paint agreement", passed: !guardGap, diagnostic: true, details: hug });
        write("textarea:hug", "Hi"); await settle();
        for (let i = 0; i < 3; i++) {
          mounted = false; render();
          const untilUnmount = performance.now() + 10000;
          while (renderer.current && performance.now() < untilUnmount) await new Promise(resolve => requestAnimationFrame(resolve));
          check("Bridge unmount releases handle " + i, !renderer.current);
          mounted = true; render(); await settle();
        }
        check("Three full bridge remounts recover current evidence", true);
        const revisionBeforeRegistry = session.getSnapshot().revision;
        registry = new InMemoryManagedFontRegistry(); render();
        await settle(s => s.revision > revisionBeforeRegistry && s.readiness.exportReady);
        check("Font-registry scope replacement republishes current evidence", true);
        write("textarea:body", "One\nTwo\nThree");
        await settle(s => field("textarea:body").renderValidation.state === "invalid");
        check("Native visual overflow stays editable and blocks export", !session.getSnapshot().readiness.exportReady);
        let rejected = false;
        try { await renderer.current.exportPng({ download: false }); } catch { rejected = true; }
        check("Bridge refuses PNG for invalid current lines", rejected);
        write("textarea:body", "One\nTwo"); await settle();
        check("Maximum boundary warning is nonblocking", field("textarea:body").renderValidation.warnings?.length === 1);
        if (family) {
          session.selectVariant(value.variants[1].id);
          await settle(s => field("textarea:body").renderValidation.state === "invalid");
          check("Stricter Family selection blocks while retaining content", !session.getSnapshot().readiness.exportReady && field("textarea:body").value === "One\nTwo");
          write("textarea:body", "One"); await settle();
          session.selectVariant(value.variants[0].id); await settle();
        }
        let mutated = false, superseded = false;
        try {
          await renderer.current.exportPng({ download: false, onProgress: () => {
            if (!mutated) { mutated = true; controller("textarea:body").setValue("Changed"); }
          } });
        } catch (error) { superseded = /superseded|readiness|current/i.test(error.message); }
        check("Canonical mutation during export rejects superseded PNG", mutated && superseded);
        await settle();
        const png = await renderer.current.exportPng({ download: false });
        check("Current renderer recovers and exports PNG", png.width > 0 && png.height > 0 && png.pngDataUrl.startsWith("data:image/png"));
        return { family, checks, guardGap, nativeReload, imageDiagnostics };
      } finally { reactRoot.unmount(); session.dispose(); }
    }, { root, fixture, family });
    assert.deepEqual(errors, []);
    reports.push(result);
    await writeFile(resolve(out, "report.json"), JSON.stringify({ browser: browser.version(), reports }, null, 2) + "\n");
    await page.close();
  }
  const checkpoints = reports.flatMap(report => report.checks);
  const gaps = checkpoints.filter(check => !check.passed);
  const report = { status: gaps.length ? "gaps-found" : "passed", browser: browser.version(),
    checkpointCount: checkpoints.length, passedCheckpointCount: checkpoints.length - gaps.length,
    diagnosticGapCount: gaps.length, reports };
  await writeFile(resolve(out, "report.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({ status: report.status, checkpointCount: report.checkpointCount,
    passedCheckpointCount: report.passedCheckpointCount, diagnosticGapCount: gaps.length, report: resolve(out, "report.json") }));
  // Audit mode reports gaps without aborting remaining scenarios. CI/check mode
  // is intentionally red until every recorded architecture gap is addressed.
  assert.equal(gaps.length, 0, "All architecture regressions must pass");
} finally { await browser.close(); await server.close(); }
