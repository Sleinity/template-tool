import type {
  PackageFontCssStyle,
  TemplatePackageFontRequirement,
  TemplatePackageV1,
} from "@sleinity/template-core";

export interface RuntimeFontTarget {
  requestId: string;
  family: string;
  weight: number;
  style: PackageFontCssStyle;
  binaryHash: string | null;
  faceIndex: number | null;
  classification: string;
}

function normalizeFamily(value: string): string {
  return value.trim().replace(/^['"]|['"]$/g, "").toLowerCase();
}

function weightMatches(value: string, requested: number): boolean {
  const values = value.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (values.length === 1) return Math.abs(values[0] - requested) < 1;
  if (values.length >= 2) return requested >= values[0] && requested <= values[1];
  return requested === 400 && value.toLowerCase() === "normal";
}

export function runtimeFontTarget(
  requirement: TemplatePackageFontRequirement,
): RuntimeFontTarget {
  const resolution = requirement.resolution;
  return {
    requestId: requirement.id,
    // Without a private linked family the requested family remains first in
    // the CSS stack, even when a confirmed compatibility fallback follows it.
    // Observe that primary family so delayed exact-face activation invalidates
    // the earlier fallback measurement.
    family: resolution?.runtimeFamily ?? requirement.family,
    weight: resolution?.effectiveWeight ?? requirement.weight,
    style: resolution?.effectiveStyle ?? requirement.cssStyle,
    binaryHash: resolution?.binaryHash ?? null,
    faceIndex: resolution?.faceIndex ?? null,
    classification:
      resolution?.classification ?? resolution?.match ?? "unresolved",
  };
}

export function runtimeFontTargets(
  packageValue: Pick<TemplatePackageV1, "fontRequirements">,
): RuntimeFontTarget[] {
  return (packageValue.fontRequirements ?? [])
    .map(runtimeFontTarget)
    .sort((left, right) => left.requestId.localeCompare(right.requestId));
}

export function runtimeFontFaceSignature(
  family: string | null,
  weight: number,
  style: PackageFontCssStyle,
): string {
  if (!family) return "font-target-unavailable";
  const target = `${normalizeFamily(family)}|${weight}|${style}`;
  if (typeof document === "undefined" || !document.fonts) {
    return `${target}|font-set-unavailable`;
  }
  const matches = [
    ...new Set(
      [...document.fonts]
        .filter(
          (face) =>
            normalizeFamily(face.family) === normalizeFamily(family) &&
            face.style.toLowerCase() === style &&
            weightMatches(face.weight, weight),
        )
        .map((face) => `${face.family}|${face.style}|${face.weight}|${face.status}`),
    ),
  ].sort();
  return `${target}|${matches.length ? matches.join(",") : "missing"}`;
}

export function packageRuntimeFontSignature(
  packageValue: Pick<TemplatePackageV1, "fontRequirements">,
): string {
  const targets = runtimeFontTargets(packageValue);
  if (!targets.length) return "no-declared-font-targets";
  return targets
    .map(
      (target) =>
        [
          target.requestId,
          target.binaryHash ?? "no-binary",
          target.faceIndex ?? "no-face-index",
          target.classification,
          runtimeFontFaceSignature(target.family, target.weight, target.style),
        ].join("|"),
    )
    .join(";");
}
