import type {
  PackageFontResolution,
  TemplatePackageFontRequirement,
  TemplatePackageV1,
} from "../types";
import {
  fontUsesPlatformEmojiFallback,
  textFaceCoverageCharacters,
} from "./fontCharacterCoverage";
import type { ResolvedRenderTreeV1 } from "./types";

export interface FontRequirement {
  id?: string;
  family: string;
  weight: number;
  style: "normal" | "italic" | "oblique";
  usedBy: string[];
  characters?: string;
  postScriptName?: string | null;
  editable?: boolean;
  assetId?: string;
  resolution?: PackageFontResolution;
  runtimeFamily?: string;
  binaryHash?: string;
  faceIndex?: number;
}

export interface FontReadinessEntry extends FontRequirement {
  status: "loaded" | "missing" | "fallback" | "unknown";
  source:
    | "package"
    | "managed"
    | "application"
    | "browser"
    | "replacement"
    | "fallback"
    | "unresolved";
  verified: boolean;
  deterministicForExport: boolean;
  fallbackFamily?: string;
  glyphCoverage?: "verified" | "unverified" | "fallback-likely";
}

export interface FontReadinessReport {
  reliable: boolean;
  exportReady: boolean;
  required: FontReadinessEntry[];
  missing: FontReadinessEntry[];
  fallback: FontReadinessEntry[];
  unknown: FontReadinessEntry[];
  groups: Array<{
    family: string;
    faces: FontReadinessEntry[];
  }>;
  /** Backward-compatible alias for entries that are not confirmed loaded. */
  unverified: FontReadinessEntry[];
}

export interface FontFaceSetLike {
  ready?: Promise<unknown>;
  check(font: string, text?: string): boolean;
  load?(font: string, text?: string): Promise<unknown[]>;
}

export type FontManifestFace = Omit<FontRequirement, "usedBy">;

export const bundledFontManifest: FontManifestFace[] = [
  { family: "Rethink Sans", weight: 600, style: "normal" },
  { family: "Rethink Sans", weight: 700, style: "normal" },
];

const safeSystemFamilies = new Set([
  "arial",
  "helvetica",
  "times new roman",
  "system-ui",
  "sans-serif",
  "serif",
  "monospace",
]);

function normalizeFamily(value: string): string {
  return value
    .split(",")[0]
    .trim()
    .replace(/^['"]|['"]$/g, "");
}

export function collectResolvedFontRequirements(
  tree: ResolvedRenderTreeV1,
): FontRequirement[] {
  const requirements = new Map<string, FontRequirement>();
  Object.values(tree.nodes).forEach((node) => {
    if (!node.text) return;
    const family = normalizeFamily(node.text.fontFamily ?? "");
    if (!family) return;
    const key = `${family.toLowerCase()}:${node.text.fontWeight}:${node.text.fontStyle}`;
    const existing = requirements.get(key);
    if (existing) {
      if (!existing.usedBy.includes(node.id)) existing.usedBy.push(node.id);
      return;
    }
    requirements.set(key, {
      family,
      weight: node.text.fontWeight,
      style: node.text.fontStyle,
      usedBy: [node.id],
    });
  });
  return Array.from(requirements.values());
}

function packageRequirementToReadiness(
  requirement: TemplatePackageFontRequirement,
): FontRequirement {
  return {
    id: requirement.id,
    family: normalizeFamily(requirement.family),
    weight: requirement.weight,
    style: requirement.cssStyle,
    usedBy: [...requirement.usedBy],
    characters: requirement.characters,
    postScriptName: requirement.postScriptName,
    editable: requirement.editable,
    assetId: requirement.assetId,
    resolution: requirement.resolution,
    runtimeFamily: requirement.resolution?.runtimeFamily,
    binaryHash: requirement.resolution?.binaryHash,
    faceIndex: requirement.resolution?.faceIndex,
  };
}

export function collectTemplatePackageFontRequirements(
  packageValue: Pick<TemplatePackageV1, "fontRequirements">,
  tree: ResolvedRenderTreeV1,
): FontRequirement[] {
  return packageValue.fontRequirements?.length
    ? packageValue.fontRequirements.map(packageRequirementToReadiness)
    : collectResolvedFontRequirements(tree);
}

function manifestIncludes(
  requirement: FontRequirement,
  manifest: FontManifestFace[],
): boolean {
  return manifest.some(
    (font) =>
      font.family.toLowerCase() === requirement.family.toLowerCase() &&
      font.weight === requirement.weight &&
      font.style === requirement.style,
  );
}

export async function checkResolvedFontReadiness(
  tree: ResolvedRenderTreeV1,
  fontSet: FontFaceSetLike | null | undefined,
  manifest: FontManifestFace[] = bundledFontManifest,
  suppliedRequirements?: FontRequirement[],
): Promise<FontReadinessReport> {
  const requirements =
    suppliedRequirements ?? collectResolvedFontRequirements(tree);
  if (fontSet?.ready) await fontSet.ready;

  const required = await Promise.all(
    requirements.map(async (requirement): Promise<FontReadinessEntry> => {
      const glyphCoverage = fontUsesPlatformEmojiFallback(
        requirement.family,
        requirement.characters,
      )
        ? "fallback-likely"
        : "unverified";
      if (!fontSet) {
        return {
          ...requirement,
          status: "unknown",
          source: "unresolved",
          verified: false,
          deterministicForExport: false,
          glyphCoverage,
        };
      }
      if (
        requirement.resolution?.match === "fallback" &&
        requirement.resolution.confirmed &&
        requirement.resolution.fallbackFamily
      ) {
        const fallbackFamily = requirement.resolution.fallbackFamily;
        const fallbackSpecification = `${requirement.style} ${requirement.weight} 16px "${fallbackFamily}"`;
        const sample = textFaceCoverageCharacters(
          requirement.family,
          requirement.characters,
        ) || "Template";
        const verified = fontSet.check(fallbackSpecification, sample);
        return {
          ...requirement,
          status: "fallback",
          source: "fallback",
          verified,
          deterministicForExport: verified,
          fallbackFamily,
          glyphCoverage: "fallback-likely",
        };
      }
      const effectiveFamily = requirement.runtimeFamily ?? requirement.family;
      const specification = `${requirement.style} ${requirement.weight} 16px "${effectiveFamily}"`;
      const sample = textFaceCoverageCharacters(
        requirement.family,
        requirement.characters,
      ) || "Template";
      const checkPassed = fontSet.check(specification, sample);
      const manifestRequirement = {
        ...requirement,
        family: effectiveFamily,
      };
      const manifestMatch = manifestIncludes(manifestRequirement, manifest);
      const manifestFamilyKnown = manifest.some(
        (font) =>
          font.family.toLowerCase() === effectiveFamily.toLowerCase(),
      );
      const safeSystem = safeSystemFamilies.has(
        requirement.family.toLowerCase(),
      );
      let loadedFaces = 0;
      if (checkPassed && fontSet.load) {
        try {
          loadedFaces = (
            await fontSet.load(specification, sample)
          ).length;
        } catch {
          loadedFaces = 0;
        }
      }
      if (
        checkPassed &&
        (safeSystem ||
          (manifestMatch && (!fontSet.load || loadedFaces > 0)))
      ) {
        return {
          ...requirement,
          status: "loaded",
          source: requirement.resolution?.managedFontId
            ? "managed"
            : requirement.resolution?.classification === "replacement" ||
                requirement.resolution?.match === "alias" ||
                requirement.resolution?.match === "manual" ||
                requirement.resolution?.match === "replacement"
              ? "replacement"
              : safeSystem
                ? "browser"
                : manifestMatch
                  ? "application"
                  : "package",
          verified: true,
          deterministicForExport: true,
          glyphCoverage:
            glyphCoverage === "fallback-likely" ? glyphCoverage : "verified",
        };
      }
      if (
        !checkPassed ||
        (manifestFamilyKnown && !manifestMatch) ||
        (manifestMatch && loadedFaces === 0)
      ) {
        return {
          ...requirement,
          status:
            checkPassed && manifestFamilyKnown && !manifestMatch
              ? "fallback"
              : "missing",
          source: "unresolved",
          verified: false,
          deterministicForExport: false,
          fallbackFamily:
            checkPassed && manifestFamilyKnown && !manifestMatch
              ? "system-ui, sans-serif"
              : undefined,
          glyphCoverage,
        };
      }
      return {
        ...requirement,
        status: "unknown",
        source: "unresolved",
        verified: false,
        deterministicForExport: false,
        glyphCoverage,
      };
    }),
  );
  const fallback = required.filter((font) => font.status === "fallback");
  const missing = required.filter(
    (font) =>
      font.status === "missing" ||
      (font.status === "fallback" && !font.deterministicForExport),
  );
  const unknown = required.filter((font) => font.status === "unknown");
  const unverified = [...fallback, ...unknown];
  const familyNames = Array.from(
    new Set(required.map((font) => font.family)),
  );
  return {
    reliable: required.every((font) => font.status === "loaded"),
    exportReady: required.every((font) => font.deterministicForExport),
    required,
    missing,
    fallback,
    unknown,
    groups: familyNames.map((family) => ({
      family,
      faces: required.filter(
        (font) => font.family.toLowerCase() === family.toLowerCase(),
      ),
    })),
    unverified,
  };
}
