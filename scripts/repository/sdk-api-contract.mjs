import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import ts from "typescript";
import {
  loadRuntimePackageDefinitions,
  resolveFixedRuntimeVersion,
} from "./sdk-runtime-manifest.mjs";

const root = process.cwd();
const contractPath = path.join(root, "config", "sdk-public-api.json");
const classifications = {
  "@sleinity/template-core": {
    ".": "supported-low-level-adapter",
  },
  "@sleinity/template-browser": {
    ".": "supported-low-level-adapter",
    "./session": "recommended-high-level-integration",
    "./importer": "recommended-high-level-integration",
    "./compatibility": "recommended-high-level-integration",
  },
  "@sleinity/template-react": {
    ".": "recommended-high-level-integration",
    "./importer": "recommended-high-level-integration",
    "./importer.css": "recommended-high-level-integration",
  },
};

function publicSymbols(source, fileName) {
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const symbols = new Set();
  for (const statement of sourceFile.statements) {
    if (
      ts.isExportDeclaration(statement) &&
      statement.exportClause &&
      ts.isNamedExports(statement.exportClause)
    ) {
      for (const element of statement.exportClause.elements) {
        symbols.add(element.name.text);
      }
      continue;
    }
    const modifiers = ts.canHaveModifiers(statement)
      ? ts.getModifiers(statement)
      : undefined;
    if (!modifiers?.some((item) => item.kind === ts.SyntaxKind.ExportKeyword)) {
      continue;
    }
    if ("name" in statement && statement.name && ts.isIdentifier(statement.name)) {
      symbols.add(statement.name.text);
    } else if (ts.isExportAssignment(statement)) {
      symbols.add("default");
    }
  }
  return [...symbols].sort((left, right) => left.localeCompare(right));
}

async function createContract() {
  const version = await resolveFixedRuntimeVersion(root);
  const packages = [];
  for (const definition of await loadRuntimePackageDefinitions(root)) {
    const packageRoot = path.join(root, "packages", definition.directory);
    const manifest = JSON.parse(
      await readFile(path.join(packageRoot, "package.json"), "utf8"),
    );
    const entries = [];
    for (const [exportPath, target] of Object.entries(manifest.exports ?? {})) {
      const typesPath =
        target && typeof target === "object" && typeof target.types === "string"
          ? target.types
          : null;
      const classification =
        classifications[definition.name]?.[exportPath] ?? null;
      if (!classification) {
        throw new Error(
          `Public export ${definition.name}${exportPath} has no API classification.`,
        );
      }
      const symbols = typesPath
        ? publicSymbols(
            await readFile(path.join(packageRoot, typesPath), "utf8"),
            typesPath,
          )
        : [];
      entries.push({
        path: exportPath,
        classification,
        types: typesPath,
        symbols,
      });
    }
    packages.push({
      name: definition.name,
      version: manifest.version,
      entries: entries.sort((left, right) => left.path.localeCompare(right.path)),
    });
  }
  return {
    schemaVersion: "template-sdk-public-api-contract-v1",
    sdkVersion: version,
    packages,
  };
}

const generated = `${JSON.stringify(await createContract(), null, 2)}\n`;
if (process.argv.includes("--print")) {
  process.stdout.write(generated);
} else if (process.argv.includes("--check")) {
  const expected = await readFile(contractPath, "utf8");
  if (expected !== generated) {
    throw new Error(
      "The built SDK public API differs from config/sdk-public-api.json. " +
        "Update the contract only for an intentional versioned API change.",
    );
  }
  console.log("SDK public API contract matches every built package entry point.");
} else {
  throw new Error("Use --print or --check.");
}
