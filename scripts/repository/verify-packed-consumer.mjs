import {
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

const root = process.cwd();
const workspace = await mkdtemp(path.join(os.tmpdir(), "template-sdk-consumer-"));
const archivesDirectory = path.join(workspace, "archives");
const consumerDirectory = path.join(workspace, "consumer");
const packageNames = ["template-core", "template-browser", "template-react"];
const pnpmExecutable = process.env.TEMPLATE_PNPM_EXECUTABLE ?? "pnpm";

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
        skipLibCheck: true,
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
    `import { useState } from "react";
import { createRoot } from "react-dom/client";
import { createTemplateSession } from "@sleinity/template-browser/session";
import {
  TemplateSessionProvider,
  TemplateSessionRenderer,
  TemplateInspectionPreview,
  TemplateInspectionViewport,
  useTemplateSessionSnapshot,
} from "@sleinity/template-react";
import { TemplateImportWizard } from "@sleinity/template-react/importer";
import {
  TemplateSessionViewport,
  useTemplateSessionDiagnosticSummary,
  useTemplateSessionEditableField,
  useTemplateSessionEditableFields,
  type TemplateSessionViewportSnapshotV1,
} from "@sleinity/template-react/editor";
import type { FieldConstraintValidation } from "@sleinity/template-core/editor";
import type { PackageAssetSafetyIssue } from "@sleinity/template-core/assets";
import type { FontRequirement } from "@sleinity/template-core/fonts";
import type { PackageMotionSummary } from "@sleinity/template-core/motion";
import type { SettlementComparisonV1 } from "@sleinity/template-core/inspection";
import type { AssetReliabilityReport } from "@sleinity/template-browser/assets";
import type { ManagedFontRecord } from "@sleinity/template-browser/fonts";
import type { SavedTemplateRecord } from "@sleinity/template-browser/persistence";
import type { PackagePngExportDiagnostic } from "@sleinity/template-browser/capture";
import type { FigmaMcpMetadata } from "@sleinity/template-browser/enrichment";
import type { PackageQualityReport } from "@sleinity/template-react/inspection";
import "@sleinity/template-react/importer.css";

type CuratedSdkContract = [
  FieldConstraintValidation,
  PackageAssetSafetyIssue,
  FontRequirement,
  PackageMotionSummary,
  SettlementComparisonV1,
  AssetReliabilityReport,
  ManagedFontRecord,
  SavedTemplateRecord,
  PackagePngExportDiagnostic,
  FigmaMcpMetadata,
  PackageQualityReport,
];
const curatedContractTypecheck: CuratedSdkContract | null = null;

const session = createTemplateSession();

function Player() {
  const snapshot = useTemplateSessionSnapshot();
  const fields = useTemplateSessionEditableFields();
  const firstField = useTemplateSessionEditableField(fields[0]?.field.id ?? "missing");
  const diagnostics = useTemplateSessionDiagnosticSummary();
  const viewportSnapshot: TemplateSessionViewportSnapshotV1 | null = null;
  void firstField;
  void viewportSnapshot;
  return <main data-status={snapshot.status}>
    <output data-diagnostic-status={diagnostics.status}>{fields.length}</output>
    <TemplateSessionViewport mode="editor" fallback={<p>Waiting</p>} />
    <TemplateSessionRenderer mode="static" fallback={<p>Waiting</p>} />
    {snapshot.workingPackage ? <>
      <TemplateInspectionPreview packageValue={snapshot.workingPackage} showControls={false} />
      <TemplateInspectionViewport packageValue={snapshot.workingPackage} />
    </> : null}
  </main>;
}

function App() {
  const [runtime] = useState(() => session);
  void curatedContractTypecheck;
  return <TemplateSessionProvider session={runtime}>
    <TemplateImportWizard options={{ session: runtime }} onComplete={() => undefined} />
    <Player />
  </TemplateSessionProvider>;
}

createRoot(document.getElementById("root")!).render(<App />);
`,
  );

  run(pnpmExecutable, ["install", "--prefer-offline"], {
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
        "importer.js",
        "importer.d.ts",
        "importer.css",
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
