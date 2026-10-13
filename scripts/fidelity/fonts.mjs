import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { repoRoot } from "./core.mjs";

function expandEnvironment(value) {
  let missing = false;
  const expanded = value.replace(/\$\{([^}]+)\}/g, (_match, name) => {
    if (!process.env[name]) missing = true;
    return process.env[name] ?? "";
  });
  return missing ? "" : expanded;
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

export function loadExactFontManifest(requirements = null) {
  const manifestPath = join(repoRoot, "fidelity", "fonts.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  return {
    ...manifest,
    fonts: manifest.fonts.filter(font => !requirements || requirements.some(requirement =>
      font.family.toLowerCase() === requirement.family.trim().toLowerCase() &&
      font.weight === Number(requirement.weight) && font.style === (requirement.style ?? "normal"),
    )).map((font) => {
      const configured = expandEnvironment(font.sourcePath ?? "");
      const path = resolve(configured || font.defaultSourcePath || "");
      if (!path || !existsSync(path)) {
        throw new Error(`Exact font file is missing for ${font.id}: ${path || "no path configured"}`);
      }
      const byteSize = statSync(path).size;
      const binaryHash = sha256(path);
      if (byteSize !== font.byteSize || binaryHash !== font.sha256) {
        throw new Error(
          `Exact font identity mismatch for ${font.id}: expected ${font.byteSize}/${font.sha256}, received ${byteSize}/${binaryHash}.`,
        );
      }
      return { ...font, path, verifiedByteSize: byteSize, verifiedSha256: binaryHash };
    }),
  };
}

export function exactFontForRequirement(manifest, family, weight, style) {
  return manifest.fonts.find(
    (font) =>
      font.family.toLowerCase() === family.trim().toLowerCase() &&
      font.weight === Number(weight) &&
      font.style === style,
  ) ?? null;
}

export function requireExactFont(manifest, family, weight, style) {
  const font = exactFontForRequirement(manifest, family, weight, style);
  if (!font) throw new Error(`No verified exact font binary is registered for ${family} ${weight} ${style}.`);
  return font;
}
