import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..", "..");
const manifest = JSON.parse(readFileSync(join(root, "fidelity", "fonts.json"), "utf8"));
const ids = manifest.fonts.map((font) => font.id);
if (new Set(ids).size !== ids.length) throw new Error("Font manifest IDs must be unique.");
for (const font of manifest.fonts) {
  if (!font.family || !Number.isFinite(font.weight) || !/^[a-f0-9]{64}$/.test(font.sha256)) throw new Error(`Invalid exact font identity: ${font.id}`);
  if (!font.sourcePath.includes("${") && !existsSync(font.sourcePath)) throw new Error(`Font path does not exist: ${font.sourcePath}`);
}
const stable = createHash("sha256").update(JSON.stringify(manifest)).digest("hex");
if (!/^[a-f0-9]{64}$/.test(stable)) throw new Error("Font manifest must have a stable content hash.");
console.log("Exact font manifest tests passed.");
