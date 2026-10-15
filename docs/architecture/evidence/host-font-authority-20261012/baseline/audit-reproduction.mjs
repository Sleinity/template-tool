import { createHash } from "node:crypto";
import {
  copyFile,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { strToU8, unzipSync, zipSync } from "file:///Users/niels/Documents/Projects/template-tool/node_modules/.pnpm/fflate@0.8.3/node_modules/fflate/esm/index.mjs";
import { chromium } from "file:///Users/niels/Documents/Projects/template-tool/node_modules/.pnpm/playwright@1.61.1/node_modules/playwright/index.mjs";
import { preview } from "file:///Users/niels/Documents/Projects/template-tool/node_modules/.pnpm/vite@6.4.3_@types+node@26.0.1_jiti@1.21.7_terser@5.48.0/node_modules/vite/dist/node/index.js";
import { createCompactLifecycleFixture } from "file:///Users/niels/Documents/Projects/template-tool/scripts/compact-lifecycle-fixture.mjs";
import {
  loadRuntimePackageDefinitions,
  resolveFixedRuntimeVersion,
  runtimeArchiveName,
} from "file:///Users/niels/Documents/Projects/template-tool/scripts/repository/sdk-runtime-manifest.mjs";

const root = process.cwd();
const fixedVersion = await resolveFixedRuntimeVersion(root);
const version =
  process.env.TEMPLATE_RUNTIME_RELEASE_VERSION ??
  fixedVersion;
if (version !== fixedVersion) {
  throw new Error(
    `Requested runtime version ${version} does not match ${fixedVersion}.`,
  );
}
const args = process.argv.slice(2);
if (args.length > 0 && (args[0] !== "--archives" || !args[1])) {
  throw new Error(
    "Usage: node verify-template-editor-reference.mjs [--archives ARCHIVES_DIRECTORY]",
  );
}
const sourceArchivesDirectory = args[0] === "--archives"
  ? path.resolve(args[1])
  : null;
const packageDefinitions = await loadRuntimePackageDefinitions(root);
const pnpmExecutable = process.env.TEMPLATE_PNPM_EXECUTABLE ?? "pnpm";
const workspace = await mkdtemp(
  path.join(os.tmpdir(), "template-editor-reference-"),
);
const consumerDirectory = path.join(workspace, "consumer");
const vendorDirectory = path.join(consumerDirectory, "vendor");
const fixturePath = path.join(workspace, "template-editor-acceptance.zip");
const imagePath = path.join(workspace, "replacement.png");
const fontPath = path.join(
  root,
  "apps",
  "studio",
  "src",
  "assets",
  "fonts",
  "rethink-sans-600.ttf",
);
let browser;
let server;
let restrictedServer;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: "pipe",
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed:\n${result.stdout}\n${result.stderr}`,
    );
  }
  return result.stdout;
}

function secretFreeEnvironment() {
  const environment = { ...process.env, CI: "true" };
  for (const name of [
    "NODE_AUTH_TOKEN",
    "NPM_TOKEN",
    "GITHUB_TOKEN",
    "GH_TOKEN",
  ]) {
    delete environment[name];
  }
  environment.NPM_CONFIG_USERCONFIG = path.join(
    consumerDirectory,
    ".npmrc-public-only",
  );
  return environment;
}

async function createAcceptanceFixture() {
  const compact = await createCompactLifecycleFixture(root);
  const files = unzipSync(compact.bytes);
  const packageValue = JSON.parse(
    new TextDecoder().decode(files["template.json"]),
  );
  const assetId = "asset:image:template-editor-acceptance";
  packageValue.nodes.root.children.push("hero-image");
  packageValue.nodes["hero-image"] = {
    id: "hero-image",
    name: "Hero image",
    type: "RECTANGLE",
    parentId: "root",
    children: [],
    bounds: {
      absolute: { x: 320, y: 20, width: 120, height: 120 },
      relative: { x: 320, y: 20, width: 120, height: 120 },
    },
    positioning: "ABSOLUTE",
    layout: {
      mode: "NONE",
      wrap: false,
      gap: 0,
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      primaryAlignment: "MIN",
      counterAlignment: "MIN",
      clipContent: false,
    },
    sizing: {
      horizontal: { mode: "FIXED", value: 120, min: null, max: null },
      vertical: { mode: "FIXED", value: 120, min: null, max: null },
    },
    appearance: {
      visible: true,
      opacity: 1,
      fills: [{
        type: "IMAGE",
        visible: true,
        opacity: 1,
        blendMode: "NORMAL",
      }],
      strokes: [],
      effects: [],
      cornerRadius: 0,
      clipContent: false,
    },
    image: {
      assetId,
      deferred: false,
      hash: "template-editor-acceptance",
      scaleMode: "FILL",
      imageTransform: [[1, 0, 0], [0, 1, 0]],
    },
  };
  packageValue.assets[assetId] = {
    id: assetId,
    type: "image",
    source: "embedded",
    deferred: false,
    nodeId: "hero-image",
    mimeType: "image/png",
    hash: "template-editor-acceptance",
    dataUrl:
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    width: 120,
    height: 120,
    scaleMode: "FILL",
    imageTransform: [[1, 0, 0], [0, 1, 0]],
  };
  packageValue.editableFields.push({
    id: "hero-image",
    type: "image",
    nodeId: "hero-image",
    property: "image.assetId",
    label: "Hero image",
    defaultValue: assetId,
    constraints: {
      allowedMimeTypes: ["image/png"],
      maxFileSizeMb: 0.01,
      replacementMode: "cover",
    },
  });
  const headlineNodeId =
    packageValue.editableFields.find((field) => field.id === "headline")
      ?.nodeId ?? packageValue.rootNodeId;
  packageValue.fontRequirements = [
    {
      id: "font:rethink-sans:600:normal",
      family: "Rethink Sans",
      style: "SemiBold",
      cssStyle: "normal",
      weight: 600,
      postScriptName: "RethinkSans-SemiBold",
      usedBy: [headlineNodeId],
      characters: "Portable SDK session ☀️",
      editable: true,
      mixedStyle: false,
      source: "template-editor-acceptance",
      availableInFigma: false,
    },
  ];
  return zipSync({
    "template.json": strToU8(JSON.stringify(packageValue)),
    "assets.json": strToU8(JSON.stringify({ version: 1, assets: [] })),
  }, { level: 0 });
}

try {
  await cp(
    path.join(root, "examples", "template-editor-integration"),
    consumerDirectory,
    {
      recursive: true,
      filter(source) {
        const relative = path.relative(
          path.join(root, "examples", "template-editor-integration"),
          source,
        );
        const segments = relative.split(path.sep);
        return !segments.some((segment) =>
          segment === "dist" ||
          segment === "node_modules" ||
          segment.endsWith(".tsbuildinfo") ||
          segment === "vite.config.js" ||
          segment === "vite.config.d.ts");
      },
    },
  );
  const referenceSource = await readFile(
    path.join(consumerDirectory, "src", "main.tsx"),
    "utf8",
  );
  for (const required of [
    'from "@sleinity/template-react/editor"',
    "TemplateSessionViewport",
    "useTemplateSessionEditableFields",
    "useTemplateSessionEditableField",
    "useTemplateSessionDiagnosticSummary",
  ]) {
    if (!referenceSource.includes(required)) {
      throw new Error(`The generic reference does not adopt ${required}.`);
    }
  }
  for (const retiredGlue of [
    "function SessionPreviewViewport",
    "getPackageFieldValue",
    "ResizeObserver",
  ]) {
    if (referenceSource.includes(retiredGlue)) {
      throw new Error(`The generic reference retains host glue: ${retiredGlue}.`);
    }
  }
  await mkdir(vendorDirectory, { recursive: true });
  await writeFile(
    path.join(consumerDirectory, ".npmrc-public-only"),
    "",
  );
  await writeFile(fixturePath, await createAcceptanceFixture());
  await writeFile(
    imagePath,
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    ),
  );

  if (sourceArchivesDirectory) {
    for (const item of packageDefinitions) {
      const archive = runtimeArchiveName(item, version);
      await copyFile(
        path.join(sourceArchivesDirectory, archive),
        path.join(vendorDirectory, archive),
      );
    }
  } else {
    for (const item of packageDefinitions) {
      run(
        pnpmExecutable,
        ["pack", "--pack-destination", vendorDirectory],
        {
          cwd: path.join(root, "packages", item.directory),
          env: { ...process.env, CI: "true" },
        },
      );
    }
  }

  const archiveEvidence = [];
  const vendoredDependencies = {};
  for (const item of packageDefinitions) {
    const archive = runtimeArchiveName(item, version);
    const archivePath = path.join(vendorDirectory, archive);
    const bytes = await readFile(archivePath);
    archiveEvidence.push({
      ...item,
      archive,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    });
    vendoredDependencies[item.name] = `file:vendor/${archive}`;
  }

  const consumerManifestPath = path.join(consumerDirectory, "package.json");
  const consumerManifest = JSON.parse(
    await readFile(consumerManifestPath, "utf8"),
  );
  consumerManifest.dependencies = {
    ...consumerManifest.dependencies,
    ...vendoredDependencies,
  };
  await writeFile(
    consumerManifestPath,
    JSON.stringify(consumerManifest, null, 2) + "\n",
  );
  await writeFile(
    path.join(consumerDirectory, "pnpm-workspace.yaml"),
    `packages:
  - "."
allowBuilds:
  esbuild: true
onlyBuiltDependencies:
  - esbuild
overrides:
${Object.entries(vendoredDependencies)
  .map(([name, archive]) => `  "${name}": "${archive}"`)
  .join("\n")}
`,
  );

  const environment = secretFreeEnvironment();
  run(pnpmExecutable, ["install", "--prefer-offline=false"], {
    cwd: consumerDirectory,
    env: environment,
  });
  const lockFile = await readFile(
    path.join(consumerDirectory, "pnpm-lock.yaml"),
    "utf8",
  );
  if (
    lockFile.includes("workspace:") ||
    lockFile.includes("link:") ||
    lockFile.includes("npm.pkg.github.com")
  ) {
    throw new Error(
      "The packed reference lockfile contains a workspace, link, or GitHub Packages reference.",
    );
  }
  for (const item of archiveEvidence) {
    if (!lockFile.includes(`vendor/${item.archive}`)) {
      throw new Error(`The packed reference lockfile omits ${item.archive}.`);
    }
    const installedRoot = path.join(
      consumerDirectory,
      "node_modules",
      "@sleinity",
      item.directory,
    );
    const manifest = JSON.parse(
      await readFile(path.join(installedRoot, "package.json"), "utf8"),
    );
    if (manifest.version !== version) {
      throw new Error(
        `${item.name}@${manifest.version} installed; expected ${version}.`,
      );
    }
    for (const fileName of ["index.js", "index.d.ts"]) {
      const source = await readFile(
        path.join(installedRoot, "dist", fileName),
        "utf8",
      );
      if (
        [
          "apps/studio",
          "workspace:",
          "/Users/",
          "/private/",
          "NODE_AUTH_TOKEN",
        ].some((term) => source.includes(term)) ||
        /(?:from|import)\s*["']\.\.\/\.\.\/src\//.test(source)
      ) {
        throw new Error(
          `${item.name}/${fileName} contains a repository or credential reference.`,
        );
      }
    }
    if (item.directory === "template-react") {
      for (const fileName of [
        "importer.js",
        "importer.d.ts",
        "importer.css",
        "editor.js",
        "editor.d.ts",
      ]) {
        const source = await readFile(
          path.join(installedRoot, "dist", fileName),
          "utf8",
        );
        if (
          [
            "apps/studio",
            "lucide-react",
            "workspace:",
            "/Users/",
            "/private/",
          ].some((term) => source.includes(term))
        ) {
          throw new Error(
            `@sleinity/template-react/${fileName} contains a Studio, workspace, or repository reference.`,
          );
        }
      }
    }
  }
  const mainPath = path.join(consumerDirectory, "src", "main.tsx");
  let main = await readFile(mainPath, "utf8");
  main = 'import { createTemplateSessionV2 as auditCreateSession } from "@sleinity/template-browser/session";\nimport { runTemplatePackageImportPipelineV2 as auditImport } from "@sleinity/template-browser/importer";\n' + main;
  main = main.replace('createRoot(document.getElementById("root")!).render(', 'const auditRoot = createRoot(document.getElementById("root")!);\n(window as unknown as Record<string, unknown>).__auditUnmount = () => auditRoot.unmount();\nauditRoot.render(');
  main = 'import { TemplateFieldSessionRendererV2 as AuditFontRenderer, type TemplateFieldSessionRendererV2Handle as AuditFontHandle } from "@sleinity/template-react/editor";\nimport { InMemoryManagedFontRegistry as auditRegistry, uploadExactManagedFontForRequirement as auditUploadFont, prepareTemplatePackageFonts as auditPrepareFonts } from "@sleinity/template-browser/fonts";\n' + main;
  main += '\nconst auditWindow = window as unknown as Record<string, unknown>;\nauditWindow.__auditOpen = async (bytes: number[]) => {const c=await auditImport({format:"zip",sourceId:"audit",sourceName:"audit.zip",buffer:new Uint8Array(bytes).buffer,fontRegistry:null});const s=auditCreateSession();try{if(c.status!=="ready"||!c.package)throw new Error("Not accepted");s.load(c.package);auditWindow.__auditSession=s;return s.getSnapshot().status;}finally{c.dispose();}};\nauditWindow.__auditSave = async () => {const s=auditWindow.__auditSession as ReturnType<typeof auditCreateSession>;try{return await s.save();}finally{s.dispose();}};\n';
  main += '\nauditWindow.__auditCustomFonts = async (bytes: number[],fontBytes:number[]) => {const c=await auditImport({format:"zip",sourceId:"fonts",sourceName:"font-probe.zip",buffer:new Uint8Array(bytes).buffer,fontRegistry:null});const r=new auditRegistry();const p=c.importEvidence?.package;if(!p?.fontRequirements?.length)throw Error("Missing font requirements");const linked=await auditUploadFont(p,p.fontRequirements[0].id,new Uint8Array(fontBytes).buffer,{registry:r,fileName:"rethink-sans-600.ttf"});const session=auditCreateSession();try{const snap=session.load(linked.packageValue);if(!snap.rendererPackage||!snap.resolvedTree)throw Error("No resolved renderer");const implicit=await auditPrepareFonts(snap.rendererPackage,snap.resolvedTree,document.fonts);const explicit=await auditPrepareFonts(snap.rendererPackage,snap.resolvedTree,document.fonts,r);auditWindow.__auditFontSession=session;const ref:{current:AuditFontHandle|null}={current:null};auditWindow.__auditFontExport=()=>ref.current!.exportPng({download:false});auditWindow.__auditFontCleanup=()=>{auditRoot.unmount();session.dispose();c.dispose();};auditRoot.render(<AuditFontRenderer ref={ref} session={session} mode="editor" />);return {implicit,explicit};}catch(error){session.dispose();c.dispose();throw error;}};\n';
  await writeFile(mainPath, main);
  run(pnpmExecutable, ["build"], {
    cwd: consumerDirectory,
    env: environment,
  });

  server = await preview({
    root: consumerDirectory,
    configFile: false,
    logLevel: "warn",
    preview: {
      host: "127.0.0.1",
      port: 0,
      headers: {
        "Content-Security-Policy": [
          "default-src 'self'",
          "script-src 'self' 'unsafe-eval'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob:",
          "font-src 'self' data: blob:",
          "connect-src 'self' blob: data:",
          "worker-src 'self' blob:",
          "object-src 'none'",
          "base-uri 'self'",
        ].join("; "),
      },
    },
  });
  const applicationUrl = server.resolvedUrls?.local?.[0];
  if (!applicationUrl) {
    throw new Error("The packed template editor reference has no browser URL.");
  }

  browser = await chromium.launch({ headless: true });

  const exampleContext=await browser.newContext();
  await exampleContext.addInitScript(()=>{
    window.__auditUrls={created:[],revoked:[]};
    const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);
    URL.createObjectURL=blob=>{const url=create(blob);window.__auditUrls.created.push(url);return url;};
    URL.revokeObjectURL=url=>{window.__auditUrls.revoked.push(url);return revoke(url);};
  });
  const page=await exampleContext.newPage();
  await page.goto(applicationUrl+'?fields-v2');
  await page.getByLabel('Load V2 JSON or exporter ZIP').setInputFiles("/Users/niels/Documents/Templates/V2 Tests/template-package-carrousel-v0.6.1.zip");
  await page.locator('[data-host-field]').first().waitFor();
  const loaded=await page.evaluate(()=>({fields:document.querySelectorAll('[data-host-field]').length,urls:window.__auditUrls,errors:[...document.querySelectorAll('[role="alert"]')].map(n=>n.textContent)}));
  await page.evaluate(async()=>{window.__auditUnmount();await new Promise(resolve=>queueMicrotask(()=>queueMicrotask(resolve)));});
  const after=await page.evaluate(()=>window.__auditUrls);
  console.log(JSON.stringify({example:'actual FieldRulesV2Host',loaded,afterUnmount:after,unreleasedUrls:after.created.filter(url=>!after.revoked.includes(url)).length},null,2));
  await exampleContext.close();
  const blockedContext=await browser.newContext();
  const blockedPage=await blockedContext.newPage();
  await blockedPage.goto(applicationUrl+'?fields-v2');
  const bytes=[...await readFile(fixturePath)];
  await blockedPage.evaluate(async bytes=>{await window.__auditOpen(bytes);},bytes);
  await blockedPage.evaluate(async()=>{
    window.__holder=await new Promise((resolve,reject)=>{const r=indexedDB.open('template-package-platform',4);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
    const open=indexedDB.open.bind(indexedDB);
    indexedDB.open=(name,version)=>{const r=open(name,version);if(name==='template-package-platform'&&version===5)r.addEventListener('blocked',()=>{window.__blockedObserved=true;});return r;};
    window.__saveSettled=false;
    window.__savePromise=window.__auditSave().then(value=>{window.__saveSettled=true;return value;},error=>{window.__saveSettled=true;throw error;});
  });
  await blockedPage.waitForFunction(()=>window.__blockedObserved===true);
  const blocked=await blockedPage.evaluate(()=>({blockedEvent:true,saveSettled:window.__saveSettled}));
  const completed=await blockedPage.evaluate(async()=>{window.__holder.close();const record=await window.__savePromise;return {saveSettled:window.__saveSettled,savedId:record.id};});
  console.log(JSON.stringify({case:'public session.save with another connection blocking the DB upgrade',blocked,afterConnectionClosed:completed},null,2));
  await blockedContext.close();
  const fontContext=await browser.newContext();
  const fontPage=await fontContext.newPage();
  await fontPage.goto(applicationUrl+'?fields-v2');
  const fontResult=await fontPage.evaluate(async ({bytes,fontBytes})=>window.__auditCustomFonts(bytes,fontBytes),{bytes,fontBytes:[...await readFile(fontPath)]});
  await fontPage.waitForFunction(()=>['ready','blocked'].includes(window.__auditFontSession.getSnapshot().readiness.fonts));
  const rendererResult=await fontPage.evaluate(async()=>{const readiness=window.__auditFontSession.getSnapshot().readiness;let exportError=null;try{await window.__auditFontExport();}catch(e){exportError=e.message;}window.__auditFontCleanup();return {readiness,exportError};});
  console.log(JSON.stringify({case:'public custom font registry with default versus explicit runtime preparation',result:fontResult,ordinaryRenderer:rendererResult},null,2));
  await fontContext.close();
  const staleContext=await browser.newContext();
  const stalePage=await staleContext.newPage();
  await stalePage.goto(applicationUrl+'?fields-v2');
  await stalePage.evaluate(()=>{const read=File.prototype.arrayBuffer;File.prototype.arrayBuffer=function(){if(this.name==='old-failure.zip')return new Promise((resolve,reject)=>{window.__rejectOld=reject;});return read.call(this);};});
  await stalePage.getByLabel('Load V2 JSON or exporter ZIP').setInputFiles({name:'old-failure.zip',mimeType:'application/zip',buffer:Buffer.from([0])});
  await stalePage.waitForFunction(()=>typeof window.__rejectOld==='function');
  await stalePage.getByLabel('Load V2 JSON or exporter ZIP').setInputFiles(fixturePath);
  await stalePage.locator('[data-host-field]').first().waitFor();
  await stalePage.evaluate(()=>window.__rejectOld(new Error('obsolete file read failure')));
  await stalePage.getByRole('alert').filter({hasText:'obsolete file read failure'}).waitFor();
  console.log(JSON.stringify({case:'older import failure after newer source accepted',fields:await stalePage.locator('[data-host-field]').count(),visibleError:await stalePage.getByRole('alert').allTextContents()},null,2));
  await staleContext.close();

} finally {
 await browser?.close(); await server?.close(); await restrictedServer?.close(); await rm(workspace,{recursive:true,force:true});
}
