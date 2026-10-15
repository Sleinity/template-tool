import { assertCoreDeclaration } from "./core-declaration-contract.mjs";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { strToU8, zipSync } from "fflate";

const root = process.cwd();
const workspace = await mkdtemp(path.join(os.tmpdir(), "template-core-node-consumer-"));
const archivesDirectory = path.join(workspace, "archives");
const consumerDirectory = path.join(workspace, "consumer");
const pnpmExecutable = process.env.TEMPLATE_PNPM_EXECUTABLE ?? "pnpm";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: "pipe",
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed:\n${result.stderr || result.stdout}`);
  }
  return result.stdout;
}

function appearance(color) {
  return {
    visible: true,
    opacity: 1,
    fills: color ? [{ type: "SOLID", color }] : [],
    strokes: [],
    effects: [],
    cornerRadius: 0,
    clipContent: false,
  };
}

function layout() {
  return {
    mode: "NONE",
    wrap: false,
    gap: 0,
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
    primaryAlignment: "MIN",
    counterAlignment: "MIN",
    clipContent: false,
  };
}

function fixed(value) {
  return { mode: "FIXED", value, min: null, max: null };
}

function bounds(x, y, width, height) {
  return {
    absolute: { x, y, width, height },
    relative: { x, y, width, height },
  };
}

const packageValue = {
  schemaVersion: "1.0",
  source: { type: "figma", rootNodeId: "root", pluginVersion: "0.6.1", packageContract: "template-package-v1" },
  packageId: "packed-core-node-smoke",
  name: "Packed Core Node Smoke",
  canvas: {
    width: 320,
    height: 180,
    background: { r: 1, g: 1, b: 1, a: 1 },
    coordinateSpace: "figma",
  },
  rootNodeId: "root",
  nodes: {
    root: {
      id: "root",
      name: "Root",
      type: "FRAME",
      parentId: null,
      children: [],
      bounds: bounds(0, 0, 320, 180),
      positioning: "ROOT",
      layout: layout(),
      sizing: { horizontal: fixed(320), vertical: fixed(180) },
      appearance: appearance({ r: 0.2, g: 0.3, b: 0.4, a: 1 }),
    },
  },
  editableFields: [],
  assets: {},
};

try {
  await Promise.all([
    mkdir(archivesDirectory, { recursive: true }),
    mkdir(consumerDirectory, { recursive: true }),
  ]);

  run(pnpmExecutable, ["pack", "--pack-destination", archivesDirectory], {
    cwd: path.join(root, "packages/template-core"),
  });
  const archive = (await readdir(archivesDirectory)).find((file) => file.endsWith(".tgz"));
  if (!archive) throw new Error("Packed template-core archive is missing.");

  await writeFile(
    path.join(consumerDirectory, "package.json"),
    JSON.stringify({
      name: "template-core-isolated-node-consumer",
      private: true,
      type: "module",
      dependencies: {
        "@sleinity/template-core": `file:${path.join(archivesDirectory, archive)}`,
      },
    }, null, 2),
  );
  await writeFile(
    path.join(consumerDirectory, "pnpm-workspace.yaml"),
    'packages:\n  - "."\n',
  );
  await writeFile(
    path.join(consumerDirectory, "template.zip"),
    zipSync({
      "template.json": strToU8(JSON.stringify(packageValue)),
      "assets.json": strToU8(JSON.stringify({ version: 1, assets: [] })),
    }, { level: 0 }),
  );
  await writeFile(
    path.join(consumerDirectory, "verify.mjs"),
    `import { readFile } from "node:fs/promises";

const forbidden = ["window", "document", "CSS", "indexedDB", "localStorage", "FontFace", "fetch"];
for (const name of forbidden) {
  Object.defineProperty(globalThis, name, {
    configurable: true,
    get() { throw new Error(\`template-core accessed forbidden global \${name}\`); },
  });
}

try {
  const {
    checkResolvedFontReadiness,
    createBackendDiagnosticProjection,
    createResolvedRenderTree,
    createZipBundleReader, loadTemplatePackageBundleSource, parseTemplatePackageV2, validateTemplatePackageV2,
    createTemplateFieldContentStateV1, materializeTemplateFieldContentV2,
  } = await import("@sleinity/template-core");
  const bytes = await readFile(new URL("./template.zip", import.meta.url));
  const loaded = loadTemplatePackageBundleSource(createZipBundleReader(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)));
  if (!loaded.valid || !loaded.packageValue) throw new Error("Packed Core rejected current exporter source.");
  const parsed = parseTemplatePackageV2(loaded.packageValue);
  if (!parsed.package || !validateTemplatePackageV2(parsed.package).valid) throw new Error("Packed Core rejected canonical V2.");
  const content = createTemplateFieldContentStateV1(parsed.package);
  const materialized = materializeTemplateFieldContentV2(parsed.package, content);
  if (!materialized.valid || !materialized.workingPackage) throw new Error("Packed Core V2 materialization failed.");
  const imported = { workingPackage: loaded.packageValue };
  const resolved = createResolvedRenderTree(imported.workingPackage);
  const repeated = createResolvedRenderTree(structuredClone(imported.workingPackage));
  if (
    resolved.schemaVersion !== "resolved-render-tree-v1" ||
    resolved.backendDecisionRevision !== repeated.backendDecisionRevision ||
    resolved.nodes.root?.backendDecision.schemaVersion !== "resolved-backend-decision-v1"
  ) {
    throw new Error("Packed core did not produce a deterministic resolved/backend contract.");
  }
  const projection = createBackendDiagnosticProjection(
    resolved.nodes,
    resolved.warnings,
    resolved.backendDecisionRevision,
  );
  if (
    projection.schemaVersion !== "resolved-backend-diagnostic-projection-v1" ||
    projection.sourceDecisionRevision !== resolved.backendDecisionRevision
  ) {
    throw new Error("Packed core backend diagnostics are not revision-bound.");
  }
  const fontReadiness = await checkResolvedFontReadiness(resolved, {
    ready: Promise.resolve(),
    check: () => true,
  });
  if (!fontReadiness.reliable || !fontReadiness.exportReady) {
    throw new Error("Packed core injected font readiness is not portable.");
  }

} finally {
  for (const name of forbidden) delete globalThis[name];
}
`,
  );

  run(pnpmExecutable, ["install", "--prefer-offline"], {
    cwd: consumerDirectory,
    env: { ...process.env, CI: "true" },
  });

  const installedDist = path.join(
    consumerDirectory,
    "node_modules/@sleinity/template-core/dist",
  );
  const declaration = await readFile(path.join(installedDist, "index.d.ts"));
  const version = JSON.parse(await readFile(path.join(installedDist, "../package.json"), "utf8")).version;
  const workspaceVersion = JSON.parse(await readFile(path.join(root, "packages/template-core/package.json"), "utf8")).version;
  if (version !== workspaceVersion) throw new Error(`Packed Core version ${version} differs from workspace ${workspaceVersion}.`);
  assertCoreDeclaration(version, declaration);
  for (const fileName of ["index.js", "index.d.ts"]) {
    const source = await readFile(path.join(installedDist, fileName), "utf8");
    if (
      /(?:from|import)\s*["']\.\.\/\.\.\/src\//.test(source) ||
      /apps[\\/]studio|\/Users\/|\/private\//.test(source)
    ) {
      throw new Error(`Packed core ${fileName} contains a repository-relative dependency.`);
    }
  }

  run(process.execPath, [path.join(consumerDirectory, "verify.mjs")], {
    cwd: consumerDirectory,
  });
  console.log("Verified packed template-core in an isolated DOM-free Node consumer.");
} finally {
  await rm(workspace, { recursive: true, force: true });
}
