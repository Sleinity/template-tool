/** Test-only explicit Family probe selection and import ownership. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "../fidelity/core.mjs";
import { loadSdkGateProfile } from "../fidelity/gate-profile.mjs";

export const historicalFamilyFixtureIds = Object.freeze([
  "exporter-061-family-landscape-gray", "exporter-061-family-landscape-pink",
  "exporter-061-family-portrait-gray", "exporter-061-family-portrait-pink",
]);
export function selectFamilyProbeFixtures(manifest, name = "sdk-061", profile) {
  if (!["sdk-061", "historical-family-061"].includes(name)) throw new Error(`Unknown Family probe profile ${name}.`);
  const selected = profile ?? (name === "sdk-061" ? loadSdkGateProfile() : {
    exporterVersion: "0.6.1",
    fixtures: JSON.parse(readFileSync(join(repoRoot, "fidelity/gates/archive/sdk-061-ten-fixture-profile-20261004.json"), "utf8"))
      .fixtures.filter(item => historicalFamilyFixtureIds.includes(item.id)),
  });
  const expectedIds = name === "sdk-061" ? ["exporter-061-now-hiring", "exporter-061-cover", "exporter-061-carrousel"] : historicalFamilyFixtureIds;
  if (!selected.fixtures?.length) throw new Error("Family probe fixture selection is empty.");
  const ids = selected.fixtures.map(item => item.id);
  if (new Set(ids).size !== ids.length) throw new Error("Duplicate Family profile fixture records.");
  if (JSON.stringify(ids) !== JSON.stringify(expectedIds)) throw new Error(`Family profile ${name} must select its exact ordered fixture IDs.`);
  return selected.fixtures.map(record => {
    const matches = manifest.fixtures.filter(item => item.id === record.id);
    if (matches.length !== 1) throw new Error(`Family fixture ${record.id} has missing or duplicate registry records.`);
    const item = matches[0];
    if (item.exporterVersion !== selected.exporterVersion || item.zipSha256 !== record.zipSha256 ||
        item.embeddedPreview?.sha256 !== record.embeddedPreviewSha256 ||
        (name === "sdk-061" && item.templateJsonSha256 !== record.templateJsonSha256)) {
      throw new Error(`Family fixture ${record.id} identity differs from its tracked profile.`);
    }
    return item;
  });
}
/** Keep every returned owner through validation and use; cleanup also covers blocked/error results. */
export async function withFamilyProbeImports(fixtures, importSource, useSources) {
  const owners = [];
  try {
    const sources = [];
    for (const fixture of fixtures) {
      const result = await importSource(fixture);
      owners.push(result);
      if (result.status !== "ready" || !result.package) {
        const details = {
          importDiagnostics: result.importEvidence?.validation?.diagnostics?.filter(item => item.severity === "error") ?? [],
          parseDiagnostics: result.parseResult?.validation?.diagnostics?.filter(item => item.severity === "error") ?? [],
          exception: result.failure ? String(result.failure.cause) : null,
        };
        throw new Error(`Family source ${fixture.id} import ${result.status}: ${result.failure?.stage ?? "acceptance"}; ${JSON.stringify(details)}`);
      }
      sources.push({ id: result.sourceId, name: result.sourceName, packageValue: result.package });
    }
    return await useSources(sources);
  } finally {
    for (const owner of owners) owner.dispose();
  }
}
