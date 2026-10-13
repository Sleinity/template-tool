import assert from "node:assert/strict";
import { loadManifest } from "../fidelity/core.mjs";
import { loadSdkGateProfile } from "../fidelity/gate-profile.mjs";
import { selectFamilyProbeFixtures, withFamilyProbeImports, historicalFamilyFixtureIds } from "./sdk-061-family-profile.mjs";
const manifest = loadManifest();
const profile = loadSdkGateProfile();
assert.deepEqual(selectFamilyProbeFixtures(manifest).map(item => item.id), profile.fixtures.map(item => item.id));
assert.deepEqual(selectFamilyProbeFixtures(manifest, "historical-family-061").map(item => item.id), historicalFamilyFixtureIds);
assert.throws(() => selectFamilyProbeFixtures(manifest, "unknown"), /Unknown/);
assert.throws(() => selectFamilyProbeFixtures(manifest, "sdk-061", { ...profile, fixtures: [] }), /empty/);
assert.throws(() => selectFamilyProbeFixtures(manifest, "sdk-061", { ...profile, fixtures: [profile.fixtures[0], profile.fixtures[0]] }), /Duplicate/);
assert.throws(() => selectFamilyProbeFixtures({ ...manifest, fixtures: manifest.fixtures.filter(item => item.id !== profile.fixtures[0].id) }), /missing or duplicate/);
assert.throws(() => selectFamilyProbeFixtures({ ...manifest, fixtures: [...manifest.fixtures, manifest.fixtures.find(item => item.id === profile.fixtures[0].id)] }), /missing or duplicate/);
assert.throws(() => selectFamilyProbeFixtures(manifest, "sdk-061", { ...profile, fixtures: profile.fixtures.map((item,index) => index ? item : { ...item, zipSha256: "0".repeat(64) }) }), /identity differs/);
for (const failure of ["blocked", "error", "throw", "use"]) {
  const disposed = []; let called = false;
  await assert.rejects(withFamilyProbeImports([{ id: "a" }, { id: "b" }], async fixture => {
    if (fixture.id === "b" && failure === "throw") throw new Error("storage failed");
    return { sourceId: fixture.id, sourceName: fixture.id, package: {}, status: fixture.id === "b" && ["blocked", "error"].includes(failure) ? failure : "ready", dispose: () => disposed.push(fixture.id) };
  }, async () => { called = true; throw new Error("candidate failed"); }));
  assert.deepEqual(disposed, failure === "throw" ? ["a"] : ["a", "b"]);
  assert.equal(called, failure === "use");
}
const disposed = [];
await withFamilyProbeImports([{ id: "source-id" }], async item => ({ sourceId: item.id, sourceName: "original.zip", package: {}, status: "ready", dispose: () => disposed.push(item.id) }), async sources => {
  assert.equal(sources[0].id, "source-id"); assert.equal(sources[0].name, "original.zip"); assert.deepEqual(disposed, []);
});
assert.deepEqual(disposed, ["source-id"]);
console.log("Family probe profiles, exact identities and failed import/candidate cleanup passed.");
