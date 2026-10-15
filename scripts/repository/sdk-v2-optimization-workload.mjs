import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import * as before from '@optimization/before';
import * as current from '@optimization/current';
import { quantile, pairedMedianInterval } from '../text-geometry/pairedTimingAnalysis.mjs';

export async function measure() {
  const manifest = JSON.parse(await readFile('fidelity/fixtures.json', 'utf8'));
  const gate = JSON.parse(await readFile('fidelity/gates/sdk-061.json', 'utf8'));
  const candidates = [], urls = new Map(), fixtures = [], sources = {};
  const storage = { async put(hash, bytes, mimeType) {
    if (!urls.has(hash)) urls.set(hash, URL.createObjectURL(new Blob([bytes], { type: mimeType })));
    return { storageKey: `sha256:${hash}`, stableUrl: urls.get(hash) };
  } };
  const rows = [], comparisons = [];
  const operations = globalThis.__optimizationOptions.operations ?? ['edit','tree','save','recovery'];
  try {
    for (const fixture of gate.fixtures) {
      const entry = manifest.fixtures.find(item => item.id === fixture.id);
      const bytes = await readFile(entry.sourcePath.replace('${TEMPLATE_PACKAGE_FIXTURE_DIR}', process.env.TEMPLATE_PACKAGE_FIXTURE_DIR ?? manifest.defaultFixtureDirectory));
      assert.equal(createHash('sha256').update(bytes).digest('hex'), fixture.zipSha256);
      fixtures.push({ id: entry.id, sha256: fixture.zipSha256 });
      for (const phase of ['before', 'current']) {
        const candidate = await ({ before, current }[phase]).runTemplatePackageImportPipelineV2({ format: 'zip', buffer: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), sourceName: entry.filename, sourceId: entry.id, assetStorage: storage, fontRegistry: null });
        candidates.push(candidate); assert.equal(candidate.status, 'ready');
        (sources[phase] ??= []).push(candidate.package);
      }
      assert.deepEqual(sources.before.at(-1), sources.current.at(-1));
    }
    const scenarios = [...fixtures.map((fixture, index) => ({ id: fixture.id, index })), { id: 'family', index: -1 }].filter(scenario => !globalThis.__optimizationOptions.scenarios?.length || globalThis.__optimizationOptions.scenarios.includes(scenario.id));
    const count = globalThis.__optimizationOptions.counters || globalThis.__optimizationOptions.memory ? 5 : 50;
    for (const scenario of scenarios) for (const operation of operations) {
      for (let trial = -1; trial < 5; trial++) {
        let expected;
        for (const phase of (trial % 2 ? ['current', 'before'] : ['before', 'current'])) {
          const api = { before, current }[phase], repository = new api.InMemoryTemplateSessionRepositoryV2();
          const session = scenario.index < 0 ? api.createTemplateFieldFamilySessionV2({ repository }) : api.createTemplateSessionV2({ repository });
          let recovery, lease;
          try {
            if (scenario.index < 0) {
              const family = api.createTemplateFieldFamilyFromSourcesV2(sources[phase], 'Optimization family');
              family.id = 'optimization-family'; session.load(family);
            } else session.load(sources[phase][scenario.index]);
            const getField = () => session.getFieldControllers().find(field => field.type === 'text' || field.type === 'textarea');
            assert(getField());
            for (let i = 0; i < 5; i++) assert(getField().setValue(`Warm ${i}`).accepted);
            if (operation === 'recovery') {
              recovery = api.createInMemoryTemplateRecoveryRepository();
              ({ lease } = await recovery.begin({ kind: scenario.index < 0 ? 'family' : 'single', templateId: 'optimization-record' }, 'fresh'));
            }
            const durations = [];
            let lastRecord = null; const memory = [];
            const nativeClone = globalThis.structuredClone;
            if(globalThis.__optimizationOptions.memory){
              assert(globalThis.gc, 'Memory profile requires --expose-gc');globalThis.gc();memory.push(process.memoryUsage());
              globalThis.structuredClone=(...args)=>{const value=nativeClone(...args);memory.push(process.memoryUsage());return value;};
            }
            globalThis.__optimizationWork = globalThis.__optimizationOptions.counters ? {} : null;
            for (let index = 0; index < count; index++) {
              const field = getField(), snapshot = session.getSnapshot();
              const start = performance.now();
              if (operation === 'edit') assert(field.setValue(`Edit ${index}`).accepted);
              else if (operation === 'tree') api.createResolvedRenderTree(snapshot.rendererPackage);
              else if (operation === 'save') lastRecord = await session.save({ name: 'Optimization record' });
              else {
                const record = await session.save({ name: 'Optimization record' });
                lastRecord = await recovery.save(lease, record);
              }
              durations.push(performance.now() - start);
              if(globalThis.__optimizationOptions.counters || globalThis.__optimizationOptions.memory) memory.push(process.memoryUsage());
            }
            globalThis.structuredClone=nativeClone;
            const final = session.getSnapshot();
            const comparable = { content: final.contentState, workingPackage: final.workingPackage, tree: final.resolvedTree, fields: final.fields, readiness: final.readiness, record: lastRecord ? {...lastRecord,id:'record',createdAt:'time',updatedAt:'time'} : null };
            if (expected) assert.deepEqual(comparable, expected);
            else expected = comparable;
            if (trial >= 0) rows.push({ scenario: scenario.id, operation, trial, phase, count, medianMs: quantile(durations, .5), p95Ms: quantile(durations, .95), work: globalThis.__optimizationWork, nodes: Object.keys(final.workingPackage.nodes).length, observedMemory: memory });
            comparisons.push({ scenario: scenario.id, operation, trial, phase, equal: true });
          } finally { globalThis.__optimizationWork = null; session.dispose(); }
        }
      }
    }
    const summary = scenarios.flatMap(scenario => operations.map(operation => {
      const selected = rows.filter(row => row.scenario === scenario.id && row.operation === operation);
      const medians = [], tails = [];
      for (let trial = 0; trial < 5; trial++) {
        const a = selected.find(row => row.phase === 'before' && row.trial === trial), b = selected.find(row => row.phase === 'current' && row.trial === trial);
        medians.push(b.medianMs - a.medianMs); tails.push(b.p95Ms - a.p95Ms);
      }
      return { scenario: scenario.id, operation, beforeMedianMs: quantile(selected.filter(row => row.phase === 'before').map(row => row.medianMs), .5), currentMedianMs: quantile(selected.filter(row => row.phase === 'current').map(row => row.medianMs), .5), medianDeltaInterval: pairedMedianInterval(medians), p95DeltaInterval: pairedMedianInterval(tails) };
    }));
    return { schemaVersion: 'sdk-v2-optimization-evidence-v1', node: process.version, platform: process.platform, arch: process.arch, profile: globalThis.__optimizationOptions.memory ? 'clone-boundary-memory-not-timing' : globalThis.__optimizationOptions.counters ? 'counters-not-timing' : 'native-node-timing', limitation: 'Real ZIPs and Blob-backed sources; no DOM, text settlement, exact font activation or Studio rendering. Recovery timing includes native record capture/save.', fixtures, rows, comparisons, summary };
  } finally { candidates.forEach(candidate => candidate.dispose()); urls.forEach(url => URL.revokeObjectURL(url)); }
}
