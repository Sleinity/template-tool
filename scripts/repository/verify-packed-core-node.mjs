import { createHash } from "node:crypto";
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
    clearTemplatePackageImageOverride,
    editableFieldRuleKey,
    getPackageFieldValue,
    importTemplatePackage,
    replaceTemplatePackageImage,
    restoreImportedPackageForEditing,
    setTemplatePackageImageReplacementMode,
    updatePackageEditableFieldRule,
    updateTemplatePackageField,
    validateTemplatePackage,
  } = await import("@sleinity/template-core");
  const bytes = await readFile(new URL("./template.zip", import.meta.url));
  const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const imported = importTemplatePackage(arrayBuffer, "packed-core-node-smoke.zip");
  if (!imported.importable || !imported.workingPackage || !imported.basePackage) {
    throw new Error("Packed core importer rejected the inline canonical ZIP.");
  }
  if (!validateTemplatePackage(imported.workingPackage).valid) {
    throw new Error("Packed core validator rejected its imported canonical package.");
  }
  if (imported.basePackage === imported.workingPackage) {
    throw new Error("Packed core importer did not preserve independent base and working values.");
  }
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

  const editable = structuredClone(imported.workingPackage);
  editable.nodes.copy = {
    ...structuredClone(editable.nodes.root),
    id: "copy",
    name: "field:text:copy",
    type: "TEXT",
    parentId: "root",
    children: [],
    text: {
      characters: "Imported",
      fontFamily: "sans-serif",
      fontStyle: "Regular",
      fontWeight: 400,
      fontSize: 20,
      lineHeight: { value: 24, unit: "PIXELS" },
      letterSpacing: { value: 0, unit: "PIXELS" },
      textAlignHorizontal: "LEFT",
      textAlignVertical: "TOP",
      textAutoResize: "HEIGHT",
      paragraphSpacing: 0,
      textDecoration: "NONE",
      textCase: "ORIGINAL",
    },
  };
  editable.nodes.root.children = ["copy"];
  const textField = {
    id: "copy",
    type: "text",
    nodeId: "copy",
    property: "text.characters",
    defaultValue: "Imported",
  };
  const colorField = {
    id: "background",
    type: "color",
    nodeId: "root",
    property: "appearance.fills",
    defaultValue: "#334d66",
  };
  const visibilityField = {
    id: "visibility",
    type: "boolean",
    nodeId: "root",
    property: "visible",
    defaultValue: true,
  };
  const imageField = {
    id: "image",
    type: "image",
    nodeId: "root",
    property: "image.assetId",
    defaultValue: null,
  };
  editable.editableFields = [textField, colorField, visibilityField, imageField];
  const configured = updatePackageEditableFieldRule(
    editable,
    editableFieldRuleKey(textField),
    {
      label: "Configured copy",
      constraints: { maxCharacters: 40, maxLines: 2 },
      behavior: { onOverflow: "prevent-input" },
    },
  );
  if (
    !configured.applied ||
    configured.fields[0]?.label !== "Configured copy"
  ) {
    throw new Error("Packed core field-rule contract did not apply portable configuration.");
  }
  const textEdited = updateTemplatePackageField(
    configured.packageValue,
    configured.fields[0],
    "Edited",
  );
  const colorEdited = updateTemplatePackageField(textEdited.packageValue, colorField, "#ff3366");
  const hidden = updateTemplatePackageField(colorEdited.packageValue, visibilityField, false);
  const imageEdited = replaceTemplatePackageImage(
    hidden.packageValue,
    imageField,
    "data:image/png;base64,iVBORw0KGgo=",
    {
      assetId: "asset:image:user:packed-smoke",
      mimeType: "image/png",
      sizeBytes: 16,
      width: 10,
      height: 10,
    },
  );
  const fit = setTemplatePackageImageReplacementMode(
    imageEdited.packageValue,
    imageField,
    "replacement-fit",
  );
  if (
    getPackageFieldValue(textEdited.packageValue, textField) !== "Edited" ||
    hidden.packageValue.nodes.root.appearance.visible !== false ||
    fit.packageValue.nodes.root.image?.activePlacement?.state !== "replacement-fit"
  ) {
    throw new Error("Packed core field editing contract did not apply portable mutations.");
  }
  const cleared = clearTemplatePackageImageOverride(fit.packageValue, imageField);
  if (cleared.warning?.code !== "missing-default-image") {
    throw new Error("Packed core image reset did not retain missing-default diagnostics.");
  }
  const restored = restoreImportedPackageForEditing(imported.basePackage, fit.packageValue);
  if (restored.assets["asset:image:user:packed-smoke"]) {
    throw new Error("Packed core full restore retained a user replacement asset.");
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
  const declarationHash = createHash("sha256").update(declaration).digest("hex");
  if (
    declaration.byteLength !== 87431 ||
    declarationHash !== "7aeba90568921568baa477bec68dcab378d6c0413903c058fc332f9e48624033"
  ) {
    throw new Error(
      `Packed core declaration drifted: ${declaration.byteLength} bytes / ${declarationHash}`,
    );
  }
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
