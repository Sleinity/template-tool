import {
  copyFile,
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { gzipSync } from "node:zlib";
import { extractCandidateExamples } from "./local-sdk-candidate.mjs";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const workspace = await mkdtemp(path.join(os.tmpdir(), "template-sdk-consumer-"));
const archivesDirectory = path.join(workspace, "archives");
const consumerDirectory = path.join(workspace, "consumer");
const packageNames = ["template-core", "template-browser", "template-react"];
const pnpmExecutable = process.env.TEMPLATE_PNPM_EXECUTABLE ?? "pnpm";
const manager = process.env.TEMPLATE_CONSUMER_PACKAGE_MANAGER ?? "pnpm";
const archiveIndex=process.argv.indexOf("--archives");
const supplied=archiveIndex<0?null:path.resolve(process.argv[archiveIndex+1]);

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: "pipe",
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed:\n${result.stderr || result.stdout}`,
    );
  }
  return result.stdout;
}

try {
  await Promise.all([
    mkdir(archivesDirectory, { recursive: true }),
    mkdir(path.join(consumerDirectory, "src"), { recursive: true }),
  ]);

  for (const packageName of packageNames) {
    if (supplied) {
      const archive=(await readdir(supplied)).find(file=>file.startsWith(`sleinity-${packageName}-`)&&file.endsWith(".tgz"));
      if(!archive)throw Error(`Missing supplied archive for ${packageName}`);
      await copyFile(path.join(supplied,archive),path.join(archivesDirectory,archive));
      continue;
    }
    run(pnpmExecutable, ["pack", "--pack-destination", archivesDirectory], {
      cwd: path.join(root, "packages", packageName),
    });
  }
  const archives = (await readdir(archivesDirectory))
    .filter((file) => file.endsWith(".tgz"))
    .sort();
  if (archives.length !== packageNames.length) {
    throw new Error(`Expected ${packageNames.length} SDK archives, found ${archives.length}.`);
  }
  const archiveFor = (fragment) => {
    const archive = archives.find((file) => file.includes(fragment));
    if (!archive) throw new Error(`Packed archive for ${fragment} is missing.`);
    return `file:${path.join(archivesDirectory, archive)}`;
  };

  const packedDependencies = {
    "@sleinity/template-core": archiveFor("template-core"),
    "@sleinity/template-browser": archiveFor("template-browser"),
    "@sleinity/template-react": archiveFor("template-react"),
  };
  const installedVersion = async (packageName) => {
    const manifest = JSON.parse(await readFile(
      path.join(root, "node_modules", packageName, "package.json"),
      "utf8",
    ));
    return manifest.version;
  };
  const dependencyVersions = {
    react: await installedVersion("react"),
    "react-dom": await installedVersion("react-dom"),
    "@types/react": await installedVersion("@types/react"),
    "@types/react-dom": await installedVersion("@types/react-dom"),
    typescript: await installedVersion("typescript"),
    vite: await installedVersion("vite"),
  };
  await writeFile(
    path.join(consumerDirectory, "package.json"),
    JSON.stringify({
      name: "template-sdk-isolated-consumer",
      private: true,
      type: "module",
      scripts: {
        build: "tsc -b && vite build",
      },
      dependencies: {
        ...packedDependencies,
        react: dependencyVersions.react,
        "react-dom": dependencyVersions["react-dom"],
      },
      devDependencies: {
        "@types/react": dependencyVersions["@types/react"],
        "@types/react-dom": dependencyVersions["@types/react-dom"],
        typescript: dependencyVersions.typescript,
        vite: dependencyVersions.vite,
      },
    }, null, 2),
  );
  await writeFile(
    path.join(consumerDirectory, "pnpm-workspace.yaml"),
    `packages:\n  - "."\nallowBuilds:\n  esbuild: true\nonlyBuiltDependencies:\n  - esbuild\noverrides:\n${Object.entries(packedDependencies)
      .map(([name, archive]) => `  "${name}": "${archive}"`)
      .join("\n")}\n`,
  );
  await writeFile(
    path.join(consumerDirectory, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        target: "ES2020",
        lib: ["ES2020", "DOM", "DOM.Iterable"],
        module: "ESNext",
        moduleResolution: "Bundler",
        strict: true,
        skipLibCheck: false,
        jsx: "react-jsx",
        noEmit: true,
      },
      include: ["src"],
    }, null, 2),
  );
  await writeFile(
    path.join(consumerDirectory, "index.html"),
    '<!doctype html><html><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>',
  );
  await writeFile(
    path.join(consumerDirectory, "src/main.tsx"),
    `import {createRoot} from "react-dom/client";
import {createTemplateSessionV2,createTemplateFieldFamilySessionV2,type TextFieldControllerV2,type TemplateFieldFamilyImageControllerV3} from "@sleinity/template-browser/session";
import {TemplateFieldSessionV2Provider,TemplateFieldSessionRendererV2,useTemplateFieldSessionV2Snapshot,useTemplateFieldControllersV2} from "@sleinity/template-react/editor";
import type {SavedTemplateSessionRecordV2} from "@sleinity/template-browser/persistence";
import {FieldRulesV2Host} from "./FieldRulesV2Host";
const session=createTemplateSessionV2();const family=createTemplateFieldFamilySessionV2();void family;
function Probe(){const snapshot=useTemplateFieldSessionV2Snapshot();const fields=useTemplateFieldControllersV2();const text=fields.find((field):field is TextFieldControllerV2=>field.type==="text");const setter:((value:string)=>unknown)|undefined=text?.setValue;const crop:TemplateFieldFamilyImageControllerV3["setVariantPlacement"]|undefined=undefined;const record:SavedTemplateSessionRecordV2|null=null;void setter;void crop;void record;return <main data-status={snapshot.status}><output data-v2-status={snapshot.status}>{fields.length}</output><TemplateFieldSessionRendererV2 fallback={<p>Waiting for V2 content</p>}/></main>;}
createRoot(document.getElementById("root")!).render(<TemplateFieldSessionV2Provider session={session}><Probe/><FieldRulesV2Host/></TemplateFieldSessionV2Provider>);
`,
  );

  for (const file of ["FieldRulesV2Host.tsx", "fieldHostLifecycle.ts"]) {
    await writeFile(path.join(consumerDirectory, "src", file), await readFile(
      path.join(root, "examples/template-editor-integration/src", file), "utf8",
    ));
  }

  if (supplied) {
    const guide = await readFile(path.join(supplied, "SDK-V2-INTEGRATION.md"), "utf8");
    const examples = extractCandidateExamples(guide);
    for (const [index, source] of examples.entries()) {
      await writeFile(path.join(consumerDirectory, "src", `candidate-guide-${index}.tsx`), source);
    }
    console.log(`Typechecking ${examples.length} literal delivered guide examples against supplied archives.`);
  }

  run(manager, manager === "npm" ? ["install", "--ignore-scripts", "--no-audit", "--no-fund", "--prefer-offline"] : ["install", "--prefer-offline"], {
    cwd: consumerDirectory,
    env: { ...process.env, CI: "true" },
  });

  for (const packageName of packageNames) {
    const installed = path.join(
      consumerDirectory,
      "node_modules/@sleinity",
      packageName,
      "dist",
    );
    for (const fileName of ["index.js", "index.d.ts"]) {
      const source = await readFile(path.join(installed, fileName), "utf8");
      if (
        /(?:from|import)\s*["']\.\.\/\.\.\/src\//.test(source) ||
        source.includes("/Users/") ||
        source.includes("/private/")
      ) {
        throw new Error(`${packageName}/${fileName} contains a repository-relative source import.`);
      }
      if (packageName === "template-react" && ["apps/studio", "components/ui", "lucide-react"].some((term) => source.includes(term))) {
        throw new Error(`${packageName}/${fileName} contains a Studio UI dependency.`);
      }
    }
    if (packageName === "template-react") {
      for (const fileName of [
        "editor.js",
        "editor.d.ts",
      ]) {
        const source = await readFile(path.join(installed, fileName), "utf8");
        if (
          /(?:from|import)\s*["']\.\.\/\.\.\/src\//.test(source) ||
          ["/Users/", "/private/", "apps/studio", "lucide-react"].some(
            (term) => source.includes(term),
          )
        ) {
          throw new Error(
            `${packageName}/${fileName} contains a repository or Studio dependency.`,
          );
        }
      }
    }
  }

  const browserInstalled = path.join(consumerDirectory, "node_modules/@sleinity/template-browser");
  const browserManifest = JSON.parse(await readFile(path.join(browserInstalled, "package.json"), "utf8"));
  if (JSON.stringify(browserManifest.sdkInternalExports) !== JSON.stringify(["./session-internal"]))
    throw new Error("Packed Browser must mark the React integration entry unsupported.");
  for (const extension of ["js", "d.ts"]) await readFile(path.join(browserInstalled, "dist", `session-internal.${extension}`));
  const reactDist = path.join(consumerDirectory, "node_modules/@sleinity/template-react/dist");
  const reactRuntime = (await Promise.all((await readdir(reactDist)).filter(file => file.endsWith(".js")).map(file => readFile(path.join(reactDist, file), "utf8")))).join("\n");
  if (!reactRuntime.includes("@sleinity/template-browser/session-internal"))
    throw new Error("Packed React must externalize its restricted Browser integration dependency.");
  for (const file of (await readdir(reactDist)).filter(file => file.endsWith(".d.ts"))) {
    const declaration = await readFile(path.join(reactDist, file), "utf8");
    if (/session-internal|SessionSnapshotReader|InternalSessionView|SingleSessionView|FamilySessionView|useFieldSessionSnapshotV2/.test(declaration))
      throw new Error(`Packed React declarations expose private reader types: ${file}`);
  }

  // Exercise the new operation from installed archives, not workspace aliases.
  // This portable synthetic source is contract coverage, not Figma certification.
  const { zipSync, strToU8, unzipSync } = await import("fflate");
  const {createCompactLifecycleFixture}=await import("../compact-lifecycle-fixture.mjs");
  const fixture = await createCompactLifecycleFixture();
  const portablePackage = JSON.parse(new TextDecoder().decode(unzipSync(fixture.bytes)["template.json"]));
  const portableFiles = { "template.json": strToU8(JSON.stringify(portablePackage)) };
  const portableAssets = [];
  for (const [id, asset] of Object.entries(portablePackage.assets ?? {})) {
    if (asset.type !== "image" || !asset.dataUrl) continue;
    const assetPath = `assets/image-${portableAssets.length}.png`;
    const bytes = Buffer.from(asset.dataUrl.split(",")[1], "base64");
    portableFiles[assetPath] = bytes;
    portableAssets.push({ id, type: "image", path: assetPath, mimeType: asset.mimeType ?? "image/png", byteSize: bytes.length });
  }
  portableFiles["assets.json"] = strToU8(JSON.stringify({ version: 1, assets: portableAssets }));
  await writeFile(path.join(consumerDirectory, "import-contract.zip"), zipSync(portableFiles));
  await writeFile(path.join(consumerDirectory, "verify-import.mjs"), `
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as browserRoot from "@sleinity/template-browser";
import * as browserFonts from "@sleinity/template-browser/fonts";
import * as browserCapture from "@sleinity/template-browser/capture";
import * as importer from "@sleinity/template-browser/importer";
import { createTemplateSessionV2 } from "@sleinity/template-browser/session";
import { InMemoryTemplateSessionRepositoryV2 } from "@sleinity/template-browser/persistence";
assert.equal(browserRoot.prepareTemplatePackageFonts, browserFonts.prepareTemplatePackageFonts, "Font activation must have one implementation across packed entries.");
assert.equal(browserRoot.runtimeFontFaceSignature, browserFonts.runtimeFontFaceSignature);
assert.equal(browserRoot.getManagedFontRegistry, browserFonts.getManagedFontRegistry, "Registry lifetime must remain shared across entries.");
assert.equal(browserRoot.exportTemplatePackagePng, browserCapture.exportTemplatePackagePng, "PNG capture must have one implementation across packed entries.");
assert.equal(browserRoot.runTemplatePackageImportPipelineV2, undefined);
for(const specifier of ["@sleinity/template-browser/session","@sleinity/template-browser/persistence","@sleinity/template-browser/importer","@sleinity/template-react"]) {
  const api = await import(specifier);
  for(const name of ["createTemplateSession","createTemplateFamilySession","createTemplateImportWizard","loadTemplateImportConfirmation","InMemoryTemplateRepository","TemplateImportWizard","TemplateSessionViewport"]) assert.equal(api[name],undefined, name+" is retired");
}
for(const specifier of ["@sleinity/template-core","@sleinity/template-core/editor","@sleinity/template-core/family"]) {const api=await import(specifier);for(const name of ["importTemplatePackage","createTemplateFamily","updateTemplatePackageField","updatePackageEditableFieldRule"]) assert.equal(api[name],undefined,name+" is retired");}
await assert.rejects(import("@sleinity/template-react/importer"), {code:"ERR_PACKAGE_PATH_NOT_EXPORTED"});
await assert.rejects(import("@sleinity/template-react/importer.css"), {code:"ERR_PACKAGE_PATH_NOT_EXPORTED"});
assert.equal(importer.createV2ImportOperation, undefined);
assert.equal(importer.compileZipSource, undefined);
for (const name of ["createSingleSessionSnapshotReader", "createFamilySessionSnapshotReader"]) {
  assert.equal(browserRoot[name], undefined, "Restricted reader must not enter the root API.");
  assert.equal(importer[name], undefined, "Restricted reader must not enter supported importer APIs.");
}
const bytes = await readFile(new URL("./import-contract.zip", import.meta.url));
const result = await importer.runTemplatePackageImportPipelineV2({ format: "zip", sourceId: "packed-source", sourceName: "contract.zip", buffer: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), fontRegistry: null });
const repository = new InMemoryTemplateSessionRepositoryV2();
const session = createTemplateSessionV2({ repository });
const restored = createTemplateSessionV2({ repository });
try {
  assert.equal(result.status, "ready"); assert.equal(result.sourceId, "packed-source");
  assert.equal(result.package, result.parseResult.package);
  session.load(result.package); assert.equal(session.getSnapshot().status, "ready");
  result.dispose(); result.dispose();
  const text = session.getFieldControllers().find(field => field.type === "text" || field.type === "textarea");
  assert(text && text.setValue("ABC").accepted);
  const saved = await session.save(); await restored.loadSaved(saved.id);
  assert.deepEqual(restored.getSnapshot().contentState, session.getSnapshot().contentState);
  assert.deepEqual(restored.getSnapshot().workingPackage.nodes, session.getSnapshot().workingPackage.nodes);
} finally { session.dispose(); restored.dispose(); result.dispose(); }
console.log("Packed public V2 ZIP import/edit/save/reload and private-export checks passed.");
`);
  console.log(run(process.execPath, ["verify-import.mjs"], { cwd: consumerDirectory }).trim());

  if (supplied) {
    for (const name of ["single", "family"]) {
      const source = await readFile(path.join(root, `scripts/repository/verify-sdk-061-${name}-host.mjs`), "utf8");
      const relocated = source.replaceAll('"../fidelity/core.mjs"', JSON.stringify(pathToFileURL(path.join(root, "scripts/fidelity/core.mjs")).href))
        .replaceAll('"../fidelity/gate-profile.mjs"', JSON.stringify(pathToFileURL(path.join(root, "scripts/fidelity/gate-profile.mjs")).href))
        .replaceAll('"./sdk-061-family-profile.mjs"', JSON.stringify(pathToFileURL(path.join(root, "scripts/repository/sdk-061-family-profile.mjs")).href));
      await writeFile(path.join(consumerDirectory, `verify-exact-${name}.mjs`), relocated);
      console.log(run(process.execPath, [`verify-exact-${name}.mjs`], { cwd: consumerDirectory }).trim());
    }
  }

  run(process.execPath, [
    path.join(consumerDirectory, "node_modules/typescript/bin/tsc"),
    "-b",
  ], { cwd: consumerDirectory });
  run(process.execPath, [
    path.join(consumerDirectory, "node_modules/vite/bin/vite.js"),
    "build",
  ], { cwd: consumerDirectory });
  const builtAssets = await readdir(path.join(consumerDirectory, "dist/assets"));
  const javascript = builtAssets.find((file) => file.endsWith(".js"));
  if (!javascript) throw new Error("The isolated consumer produced no JavaScript bundle.");
  const builtJavascript = await readFile(
    path.join(consumerDirectory, "dist/assets", javascript),
  );
  const builtSource = builtJavascript.toString("utf8");
  for (const advancedOnlyToken of [
    "appearance-contract-projection-v1",
    "settled-scene-graph-v1",
  ]) {
    if (builtSource.includes(advancedOnlyToken)) {
      throw new Error(
        `Type-only advanced inspection imports leaked ${advancedOnlyToken} into the ordinary consumer bundle.`,
      );
    }
  }
  const sizeBytes = builtJavascript.byteLength;
  const gzipBytes = gzipSync(builtJavascript).byteLength;
  console.log(
    `Verified isolated tarball consumer build (${sizeBytes} JavaScript bytes; ${gzipBytes} gzip bytes).`,
  );
} finally {
  await rm(workspace, { recursive: true, force: true });
}
