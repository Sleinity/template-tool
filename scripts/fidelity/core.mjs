import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { arch, platform, release, totalmem } from "node:os";
import { basename, join, resolve } from "node:path";
import { unzipSync } from "fflate";

export const repoRoot = resolve(new URL("../../", import.meta.url).pathname);
export const manifestPath = join(repoRoot, "fidelity", "fixtures.json");
export const surfaces = ["validate", "fields", "editor", "png-export"];

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function loadManifest(path = manifestPath) {
  const manifest = JSON.parse(readFileSync(path, "utf8"));
  validateManifest(manifest);
  return manifest;
}

export function validateManifest(manifest) {
  if (manifest?.schemaVersion !== 1 || !Array.isArray(manifest.fixtures)) {
    throw new Error("Fixture manifest must use schemaVersion 1 and contain fixtures[].");
  }
  const ids = new Set();
  const names = new Set();
  for (const fixture of manifest.fixtures) {
    for (const key of ["id", "filename", "byteSize", "zipSha256", "canvas", "rootNodeId", "packageVersion", "status"]) {
      if (fixture[key] === undefined || fixture[key] === null || fixture[key] === "") {
        throw new Error(`Fixture ${fixture.id ?? "<unknown>"} is missing ${key}.`);
      }
    }
    if (ids.has(fixture.id)) throw new Error(`Duplicate fixture ID: ${fixture.id}`);
    if (names.has(fixture.filename)) throw new Error(`Duplicate fixture filename: ${fixture.filename}`);
    ids.add(fixture.id);
    names.add(fixture.filename);
    if (!/^[a-f0-9]{64}$/.test(fixture.zipSha256)) throw new Error(`Invalid ZIP SHA-256 for ${fixture.id}.`);
    if (!Number.isInteger(fixture.byteSize) || fixture.byteSize <= 0) throw new Error(`Invalid byte size for ${fixture.id}.`);
  }
  return manifest;
}

export function fixtureDirectory(manifest, environment = process.env) {
  return resolve(environment[manifest.fixtureDirectoryEnv] || manifest.defaultFixtureDirectory);
}

export function resolveFixture(manifest, fixture, environment = process.env) {
  return join(fixtureDirectory(manifest, environment), fixture.filename);
}

function packageMetadataFromZip(bytes) {
  const entries = unzipSync(new Uint8Array(bytes));
  const templateBytes = entries["template.json"];
  if (!templateBytes) throw new Error("ZIP is missing template.json.");
  const template = JSON.parse(new TextDecoder().decode(templateBytes));
  return { entries, template };
}

export function verifyFixture(manifest, fixture, environment = process.env) {
  const path = resolveFixture(manifest, fixture, environment);
  if (!existsSync(path)) {
    throw new Error(`Missing fixture ${fixture.id}: expected exact path ${path}`);
  }
  if (basename(path) !== fixture.filename) throw new Error(`Fixture filename mismatch for ${fixture.id}.`);
  const bytes = readFileSync(path);
  const actualHash = sha256(bytes);
  if (bytes.byteLength !== fixture.byteSize) {
    throw new Error(`Fixture ${fixture.id} byte size mismatch: expected ${fixture.byteSize}, received ${bytes.byteLength}.`);
  }
  if (actualHash !== fixture.zipSha256) {
    throw new Error(`Fixture ${fixture.id} ZIP hash mismatch: expected ${fixture.zipSha256}, received ${actualHash}.`);
  }
  const { entries, template } = packageMetadataFromZip(bytes);
  const preview = fixture.embeddedPreview?.entry ? entries[fixture.embeddedPreview.entry] : null;
  const previewHash = preview ? sha256(preview) : null;
  if (fixture.embeddedPreview?.sha256 && previewHash !== fixture.embeddedPreview.sha256) {
    throw new Error(`Fixture ${fixture.id} embedded preview hash mismatch.`);
  }
  const canvas = template.canvas ?? { width: template.width, height: template.height };
  const rootNodeId = template.rootNodeId ?? template.root?.id;
  const packageVersion = String(template.schemaVersion ?? template.version ?? "unknown");
  if (canvas?.width !== fixture.canvas.width || canvas?.height !== fixture.canvas.height) {
    throw new Error(`Fixture ${fixture.id} dimensions mismatch: expected ${fixture.canvas.width}x${fixture.canvas.height}, received ${canvas?.width}x${canvas?.height}.`);
  }
  if (rootNodeId !== fixture.rootNodeId) throw new Error(`Fixture ${fixture.id} root ID mismatch: expected ${fixture.rootNodeId}, received ${rootNodeId}.`);
  if (packageVersion !== fixture.packageVersion) throw new Error(`Fixture ${fixture.id} package version mismatch: expected ${fixture.packageVersion}, received ${packageVersion}.`);
  return { fixture, path, bytes, previewHash, template };
}

export function selectFixtures(manifest, requested) {
  if (!requested || requested === "all") return manifest.fixtures;
  const ids = String(requested).split(",").filter(Boolean);
  return ids.map((id) => {
    const fixture = manifest.fixtures.find((item) => item.id === id);
    if (!fixture) throw new Error(`Unknown fixture ID ${id}. Exact manifest IDs are required.`);
    return fixture;
  });
}

export function selectSurfaces(requested) {
  if (!requested || requested === "all") return surfaces;
  const values = String(requested).split(",").filter(Boolean);
  for (const value of values) if (!surfaces.includes(value)) throw new Error(`Unknown surface ${value}. Expected ${surfaces.join(", ")}.`);
  return values;
}

export function safeSegment(value) {
  const result = String(value).replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  if (!result) throw new Error("Artifact path segment is empty.");
  return result;
}

export function artifactDirectory(root, runId, fixtureId, surface) {
  return join(resolve(root), safeSegment(runId), safeSegment(fixtureId), safeSegment(surface));
}

export function stableStringify(value) {
  return JSON.stringify(sortValue(value), null, 2) + "\n";
}

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])]));
}

const rounded = (value, digits = 4) => typeof value === "number" && Number.isFinite(value) ? Number(value.toFixed(digits)) : value;
const roundedTree = (value) => Array.isArray(value)
  ? value.map(roundedTree)
  : value && typeof value === "object"
    ? Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, roundedTree(entry)]))
    : rounded(value);

export function normalizeStructuralSnapshot(report) {
  const normalized = structuredClone(report);
  delete normalized.captureTimestamp;
  delete normalized.timings;
  delete normalized.runId;
  delete normalized.environment;
  delete normalized.browserConsole;
  normalized.nodes = (normalized.nodes ?? []).map((node, order) => ({
    ...node,
    order,
    bounds: node.bounds ? Object.fromEntries(Object.entries(node.bounds).map(([key, value]) => [key, rounded(value)])) : null,
    transform: Array.isArray(node.transform) ? node.transform.map((value) => rounded(value, 6)) : node.transform ?? null,
    textMeasurement: node.textMeasurement ? Object.fromEntries(Object.entries(node.textMeasurement).map(([key, value]) => [key, rounded(value)])) : null,
    textGeometry: node.textGeometry ? roundedTree(node.textGeometry) : null,
    imageSlot: node.imageSlot ? Object.fromEntries(Object.entries(node.imageSlot).map(([key, value]) => [key, rounded(value)])) : null,
    imagePlacement: node.imagePlacement ? roundedTree(node.imagePlacement) : null,
    primitiveAppearance: node.primitiveAppearance ? roundedTree(node.primitiveAppearance) : null,
  }));
  return sortValue(normalized);
}

function deltaExceeded(left, right, tolerance) {
  return typeof left === "number" && typeof right === "number" && Math.abs(left - right) > tolerance;
}

export function compareGeometry(expected, actual, tolerances = {}) {
  const tolerance = { x: 0.25, y: 0.25, width: 0.25, height: 0.25, transform: 0.001, text: 0.5, image: 0.25, ...tolerances };
  const expectedNodes = new Map((expected.nodes ?? []).map((node) => [node.id, node]));
  const actualNodes = new Map((actual.nodes ?? []).map((node) => [node.id, node]));
  const missingNodes = [...expectedNodes.keys()].filter((id) => !actualNodes.has(id));
  const extraNodes = [...actualNodes.keys()].filter((id) => !expectedNodes.has(id));
  const expectedOrder = (expected.nodes ?? []).map((node) => node.id).filter((id) => actualNodes.has(id));
  const actualOrder = (actual.nodes ?? []).map((node) => node.id).filter((id) => expectedNodes.has(id));
  const reorderedNodes = expectedOrder.filter((id, index) => actualOrder[index] !== id);
  const geometryChanges = [];
  const textMeasurementChanges = [];
  const textGeometryChanges = [];
  const imagePlacementChanges = [];
  for (const [id, left] of expectedNodes) {
    const right = actualNodes.get(id);
    if (!right) continue;
    const changedBounds = ["x", "y", "width", "height"].filter((key) => deltaExceeded(left.bounds?.[key], right.bounds?.[key], tolerance[key]));
    const transformChanged = Array.isArray(left.transform) && Array.isArray(right.transform)
      ? left.transform.length !== right.transform.length || left.transform.some((value, index) => deltaExceeded(value, right.transform[index], tolerance.transform))
      : stableStringify(left.transform ?? null) !== stableStringify(right.transform ?? null);
    if (changedBounds.length || transformChanged || left.parentId !== right.parentId) geometryChanges.push({ id, changedBounds, transformChanged, expected: left.bounds, actual: right.bounds, parentChanged: left.parentId !== right.parentId });
    if (Boolean(left.textMeasurement) !== Boolean(right.textMeasurement) || ["width", "height", "scrollWidth", "scrollHeight"].some((key) => deltaExceeded(left.textMeasurement?.[key], right.textMeasurement?.[key], tolerance.text))) textMeasurementChanges.push({ id, expected: left.textMeasurement, actual: right.textMeasurement });
    if (stableStringify(left.textGeometry ?? null) !== stableStringify(right.textGeometry ?? null)) textGeometryChanges.push({ id, expected: left.textGeometry ?? null, actual: right.textGeometry ?? null });
    if (Boolean(left.imageSlot) !== Boolean(right.imageSlot) || ["x", "y", "width", "height"].some((key) => deltaExceeded(left.imageSlot?.[key], right.imageSlot?.[key], tolerance.image)) || stableStringify(left.imagePlacement ?? null) !== stableStringify(right.imagePlacement ?? null)) imagePlacementChanges.push({ id, expected: { slot: left.imageSlot, placement: left.imagePlacement }, actual: { slot: right.imageSlot, placement: right.imagePlacement } });
  }
  const equal = !missingNodes.length && !extraNodes.length && !reorderedNodes.length && !geometryChanges.length && !textMeasurementChanges.length && !textGeometryChanges.length && !imagePlacementChanges.length;
  return { equal, tolerances: tolerance, missingNodes, extraNodes, reorderedNodes, geometryChanges, textMeasurementChanges, textGeometryChanges, imagePlacementChanges };
}

export function createRepeatabilityReport(captures) {
  const reports = [];
  for (let index = 1; index < captures.length; index += 1) {
    const previous = captures[index - 1];
    const current = captures[index];
    reports.push({
      pair: [index, index + 1],
      pixel: current.pixelRepeat ?? null,
      geometry: compareGeometry(normalizeStructuralSnapshot(previous.structure), normalizeStructuralSnapshot(current.structure)),
      timingVariationMs: Object.fromEntries(Object.keys(current.timings ?? {}).map((key) => [key, rounded((current.timings?.[key] ?? 0) - (previous.timings?.[key] ?? 0), 2)])),
      fontReadinessChanged: stableStringify(previous.fontReadiness ?? null) !== stableStringify(current.fontReadiness ?? null),
    });
  }
  return { repeatCount: captures.length, stable: reports.every((item) => item.pixel?.equal !== false && item.geometry.equal && !item.fontReadinessChanged), comparisons: reports };
}

export function environmentMetadata(browser = {}) {
  const packageJson = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
  const buildIdentifier = sha256(Buffer.concat([
    readFileSync(join(repoRoot, "package.json")),
    readFileSync(join(repoRoot, "pnpm-lock.yaml")),
  ]));
  return {
    schemaVersion: 1,
    operatingSystem: `${platform()} ${release()}`,
    architecture: arch(),
    nodeVersion: process.version,
    packageManager: process.env.npm_config_user_agent ?? packageJson.packageManager ?? "unknown",
    browser: browser.name ?? "unknown",
    browserVersion: browser.version ?? "unknown",
    viewport: browser.viewport ?? { width: 1440, height: 1600 },
    devicePixelRatio: browser.devicePixelRatio ?? 1,
    locale: browser.locale ?? "en-US",
    timezone: browser.timezone ?? "UTC",
    captureScale: browser.captureScale ?? 1,
    loadedFonts: browser.loadedFonts ?? [],
    fontSources: browser.fontSources ?? [],
    fontProfile: browser.fontProfile ?? "application-default",
    fallbackFonts: browser.fallbackFonts ?? [],
    fontDecisions: browser.fontDecisions ?? [],
    testTimestamp: new Date().toISOString(),
    buildIdentifier: browser.buildIdentifier ?? buildIdentifier,
    gitCommit: null,
    approximateSystemMemoryBytes: totalmem(),
    approximateProcessMemoryBytes: process.memoryUsage().rss,
  };
}

export function parseArguments(argv) {
  const result = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) { result._.push(value); continue; }
    const [rawKey, inline] = value.slice(2).split("=", 2);
    if (inline !== undefined) result[rawKey] = inline;
    else if (argv[index + 1] && !argv[index + 1].startsWith("--")) result[rawKey] = argv[++index];
    else result[rawKey] = true;
  }
  return result;
}
