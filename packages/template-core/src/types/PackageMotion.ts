export type PackageJsonPrimitive = string | number | boolean | null;
export type PackageJsonValue =
  | PackageJsonPrimitive
  | PackageJsonValue[]
  | { [key: string]: PackageJsonValue };

export interface PackageMotionLinkingDiagnostics {
  status:
    | "unchecked"
    | "pass"
    | "warning"
    | "fail"
    | "pass-with-warnings"
    | "static-only";
  matchedNodeIds: string[];
  missingNodeIds: string[];
  extraTemplateNodeIds?: string[];
  extraPackageNodeIds?: string[];
}

export interface PackageMotion {
  format: string;
  raw: PackageJsonValue;
  linking: PackageMotionLinkingDiagnostics;
  sourceName?: string;
  linkedAt?: string;
}
