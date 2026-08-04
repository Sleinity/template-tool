import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const defaultRoot = path.resolve(path.dirname(scriptPath), "../..");

export async function loadSdkEntryPointInventory(root = defaultRoot) {
  const inventory = JSON.parse(
    await readFile(path.join(root, "config", "sdk-entry-points.json"), "utf8"),
  );
  if (
    inventory.schemaVersion !== "template-sdk-entry-points-v1" ||
    !Array.isArray(inventory.packages) ||
    inventory.packages.length === 0
  ) {
    throw new Error("The SDK entry-point inventory is invalid.");
  }

  const packageNames = new Set();
  for (const packageValue of inventory.packages) {
    if (
      typeof packageValue.name !== "string" ||
      typeof packageValue.directory !== "string" ||
      !Array.isArray(packageValue.entries) ||
      packageValue.entries.length === 0 ||
      packageNames.has(packageValue.name)
    ) {
      throw new Error("Every SDK package needs one unique entry-point inventory.");
    }
    packageNames.add(packageValue.name);
    const entryPaths = new Set();
    for (const entry of packageValue.entries) {
      if (
        typeof entry.path !== "string" ||
        (entry.path !== "." && !entry.path.startsWith("./")) ||
        typeof entry.source !== "string" ||
        !entry.source.startsWith("src/") ||
        typeof entry.classification !== "string" ||
        entryPaths.has(entry.path)
      ) {
        throw new Error(`Invalid SDK entry for ${packageValue.name}.`);
      }
      entryPaths.add(entry.path);
      await access(
        path.join(root, "packages", packageValue.directory, entry.source),
      );
    }
  }
  return inventory;
}

export async function sdkEntryPointByPackage(root = defaultRoot) {
  const inventory = await loadSdkEntryPointInventory(root);
  return new Map(inventory.packages.map((item) => [item.name, item]));
}
