import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import ts from "typescript";
import {
  loadRuntimePackageDefinitions,
  resolveFixedRuntimeVersion,
} from "./sdk-runtime-manifest.mjs";
import { sdkEntryPointByPackage } from "./sdk-entry-points.mjs";

const root = process.cwd();
const contractPath = path.join(root, "config", "sdk-public-api.json");
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
  const entryInventory = await sdkEntryPointByPackage(root);
  const packages = [];
  for (const definition of await loadRuntimePackageDefinitions(root)) {
    const packageRoot = path.join(root, "packages", definition.directory);
    const manifest = JSON.parse(
      await readFile(path.join(packageRoot, "package.json"), "utf8"),
    );
    const internalExports = new Set(manifest.sdkInternalExports ?? []);
    const inventoryEntries = new Map(
      (entryInventory.get(definition.name)?.entries ?? []).map((entry) => [
        entry.path,
        entry,
      ]),
    );
    const entries = [];
    for (const [exportPath, target] of Object.entries(manifest.exports ?? {})) {
      if (internalExports.has(exportPath)) continue;
      const typesPath =
        target && typeof target === "object" && typeof target.types === "string"
          ? target.types
          : null;
      const classification = inventoryEntries.get(exportPath)?.classification ?? null;
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
    const manifestEntryPaths = new Set(Object.keys(manifest.exports ?? {}));
    for (const inventoryEntry of inventoryEntries.values()) {
      if (!manifestEntryPaths.has(inventoryEntry.path)) {
        throw new Error(
          `SDK entry inventory contains missing manifest export ${definition.name}${inventoryEntry.path}.`,
        );
      }
      if (
        inventoryEntry.classification === "sdk-internal" &&
        !internalExports.has(inventoryEntry.path)
      ) {
        throw new Error(
          `SDK internal entry ${definition.name}${inventoryEntry.path} is not declared internal by its manifest.`,
        );
      }
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
} else if (process.argv.includes("--write")) {
  await writeFile(contractPath, generated);
  console.log("Updated the versioned SDK public API contract.");
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
  throw new Error("Use --print, --write, or --check.");
}
