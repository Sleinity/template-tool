import type {
  PackageQualityCategory,
  PackageQualityHealth,
  PackageQualityIssue,
  PackageQualityOrigin,
} from "./types";
import {
  getDiagnosticAudience,
  getDiagnosticFriendlyTarget,
  getDiagnosticPresentation,
  getDiagnosticPresentationState,
  getPackageQualityRootCause,
} from "./diagnosticPresentation";

export type PackageQualitySeverityFilter =
  | "unresolved"
  | "all"
  | "blockers"
  | "review"
  | "repaired"
  | "info";

export type PackageQualityAreaFilter =
  | "all"
  | "import"
  | "template"
  | "preview"
  | "media"
  | "fonts"
  | "fields"
  | "motion"
  | "export";

export interface PackageQualityFilters {
  query: string;
  severity: PackageQualitySeverityFilter;
  area: PackageQualityAreaFilter;
  technical: string;
}

export interface PackageQualityIssueGroup {
  id: string;
  code: string;
  category: PackageQualityCategory;
  issues: PackageQualityIssue[];
  primaryIssue: PackageQualityIssue;
  blocksImport: boolean;
}

export interface PackageQualityCategorySummary {
  category: PackageQualityCategory;
  count: number;
  status: PackageQualityHealth;
}

export const packageQualityCategoryLabels: Record<
  PackageQualityCategory,
  string
> = {
  import: "Import",
  package: "Template",
  "node-graph": "Layout",
  renderer: "Preview",
  assets: "Media",
  fonts: "Fonts",
  fields: "Fields",
  export: "Export",
  source: "Import",
  motion: "Motion preview",
  preview: "Reference image",
};

export const packageQualityAreaLabels: Record<PackageQualityAreaFilter, string> = {
  all: "All areas",
  import: "Import",
  template: "Template",
  preview: "Preview",
  media: "Media",
  fonts: "Fonts",
  fields: "Fields",
  motion: "Motion",
  export: "Export",
};

const categoriesByArea: Record<Exclude<PackageQualityAreaFilter, "all">, PackageQualityCategory[]> = {
  import: ["import", "source"],
  template: ["package", "node-graph"],
  preview: ["renderer", "preview"],
  media: ["assets"],
  fonts: ["fonts"],
  fields: ["fields"],
  motion: ["motion"],
  export: ["export"],
};

const categoryOrder = Object.keys(
  packageQualityCategoryLabels,
) as PackageQualityCategory[];

function normalizedValues(issue: PackageQualityIssue): string[] {
  const presentation = getDiagnosticPresentation(issue);
  return [
    issue.code,
    issue.message,
    presentation.userTitle,
    presentation.userSummary,
    presentation.userImpact,
    presentation.userAction?.label,
    getDiagnosticFriendlyTarget(issue),
    issue.category,
    issue.layer,
    ...issue.origins,
    issue.file,
    issue.path,
    issue.nodeId,
    issue.nodeName,
    issue.layerPath,
    issue.fieldId,
    issue.assetId,
    issue.ref,
    issue.sourceNodeId,
    issue.capabilityId,
    issue.regionId,
    issue.backendOwner,
    issue.supportLevel,
    issue.confidence,
    issue.suggestedFix,
    ...(issue.relatedIds ?? []),
  ].filter((value): value is string => Boolean(value));
}

export function packageQualityIssueMatchesSearch(
  issue: PackageQualityIssue,
  query: string,
): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  return normalizedValues(issue).some((value) =>
    value.toLowerCase().includes(normalizedQuery),
  );
}

function matchesSeverity(
  issue: PackageQualityIssue,
  severity: PackageQualitySeverityFilter,
): boolean {
  if (severity === "all") return true;
  if (severity === "blockers") {
    return getDiagnosticPresentationState(issue) === "blocked";
  }
  if (severity === "review") {
    return getDiagnosticPresentationState(issue) === "review";
  }
  if (severity === "repaired") {
    return getDiagnosticPresentationState(issue) === "repaired";
  }
  if (severity === "info") {
    return getDiagnosticPresentationState(issue) === "information";
  }
  const state = getDiagnosticPresentationState(issue);
  return state === "blocked" || state === "review";
}

export function isMainPackageQualityIssue(issue: PackageQualityIssue): boolean {
  return getDiagnosticAudience(issue) === "user";
}

function matchesArea(issue: PackageQualityIssue, area: PackageQualityAreaFilter): boolean {
  return area === "all" || categoriesByArea[area].includes(issue.category);
}

function matchesTechnicalFilter(
  issue: PackageQualityIssue,
  technical: string,
): boolean {
  if (technical === "all") return true;
  const [kind, value] = technical.split(":", 2);
  if (kind === "layer") return issue.layer === value;
  if (kind === "origin") {
    return issue.origins.includes(value as PackageQualityOrigin);
  }
  if (kind === "capability") return issue.capabilityId === value;
  if (kind === "region") return issue.regionId === value;
  return true;
}

export function filterPackageQualityIssues(
  issues: PackageQualityIssue[],
  filters: PackageQualityFilters,
): PackageQualityIssue[] {
  return issues.filter(
    (issue) => {
      const audience = getDiagnosticAudience(issue);
      const audienceVisible =
        audience === "user" ||
        (audience === "validation-history" &&
          (filters.severity === "repaired" || filters.severity === "all"));
      return (
      audienceVisible &&
      matchesSeverity(issue, filters.severity) &&
      matchesArea(issue, filters.area) &&
      matchesTechnicalFilter(issue, filters.technical) &&
      packageQualityIssueMatchesSearch(issue, filters.query)
      );
    },
  );
}

function groupFingerprint(issue: PackageQualityIssue): string {
  return [
    getPackageQualityRootCause(issue),
    issue.category,
    issue.layer ?? "",
    issue.severity,
    issue.blocksImport ? "blocker" : "non-blocker",
    issue.capabilityId ?? "",
  ].join("|");
}

export function groupPackageQualityIssues(
  issues: PackageQualityIssue[],
): PackageQualityIssueGroup[] {
  const groups = new Map<string, PackageQualityIssue[]>();
  issues.forEach((issue) => {
    const key = groupFingerprint(issue);
    const group = groups.get(key);
    if (group) group.push(issue);
    else groups.set(key, [issue]);
  });
  return Array.from(groups, ([id, instances]) => ({
    id,
    code: instances[0].code,
    category: instances[0].category,
    issues: instances,
    primaryIssue:
      instances.find((issue) => issue.blocksImport) ?? instances[0],
    blocksImport: instances.some((issue) => issue.blocksImport),
  }));
}

export function summarizePackageQualityCategories(
  issues: PackageQualityIssue[],
): PackageQualityCategorySummary[] {
  return categoryOrder.flatMap((category) => {
    const categoryIssues = issues.filter((issue) => issue.category === category);
    if (categoryIssues.length === 0) return [];
    return [
      {
        category,
        count: categoryIssues.length,
        status: categoryIssues.some(
          (issue) => getDiagnosticPresentationState(issue) === "blocked",
        )
          ? "blocked"
          : categoryIssues.some(
              (issue) => getDiagnosticPresentationState(issue) === "review",
            )
            ? "review"
            : "ready",
      },
    ];
  });
}

export function getPackageQualityWorkspaceCounts(
  issues: PackageQualityIssue[],
): {
  blockers: number;
  warnings: number;
  repaired: number;
  info: number;
  affectedCategories: number;
} {
  const userIssues = issues.filter(isMainPackageQualityIssue);
  return {
    blockers: userIssues.filter(
      (issue) => getDiagnosticPresentationState(issue) === "blocked",
    ).length,
    warnings: userIssues.filter(
      (issue) => getDiagnosticPresentationState(issue) === "review",
    ).length,
    repaired: issues.filter(
      (issue) => getDiagnosticPresentationState(issue) === "repaired",
    ).length,
    info: userIssues.filter(
      (issue) => getDiagnosticPresentationState(issue) === "information",
    ).length,
    affectedCategories: new Set(userIssues.map((issue) => issue.category)).size,
  };
}

export function getPackageQualityAreaCounts(
  issues: PackageQualityIssue[],
): Array<{ area: Exclude<PackageQualityAreaFilter, "all">; count: number; status: PackageQualityHealth }> {
  return (Object.keys(categoriesByArea) as Array<Exclude<PackageQualityAreaFilter, "all">>)
    .map((area) => {
      const matching = issues.filter(
        (issue) => isMainPackageQualityIssue(issue) && categoriesByArea[area].includes(issue.category),
      );
      const status: PackageQualityHealth = matching.some(
        (issue) => getDiagnosticPresentationState(issue) === "blocked",
      )
        ? "blocked"
        : matching.some((issue) => getDiagnosticPresentationState(issue) === "review")
          ? "review"
          : "ready";
      return { area, count: matching.length, status };
    })
    .filter(({ count }) => count > 0);
}

export function getPackageQualityValidationHistory(
  issues: PackageQualityIssue[],
): PackageQualityIssue[] {
  return issues.filter((issue) => getDiagnosticAudience(issue) === "validation-history");
}

export function getPackageQualityTechnicalTrace(
  issues: PackageQualityIssue[],
): PackageQualityIssue[] {
  return issues.filter((issue) => getDiagnosticAudience(issue) === "technical-trace");
}

export function getPreferredPackageQualitySelection(
  issues: PackageQualityIssue[],
): PackageQualityIssue | null {
  return (
    issues.find((issue) => getDiagnosticPresentationState(issue) === "blocked") ??
    issues.find((issue) => getDiagnosticPresentationState(issue) === "review") ??
    null
  );
}

export function getPackageQualityTechnicalOptions(
  issues: PackageQualityIssue[],
): { layers: string[]; origins: string[]; capabilities: string[]; regions: string[] } {
  return {
    layers: Array.from(
      new Set(issues.flatMap((issue) => (issue.layer ? [issue.layer] : []))),
    ).sort(),
    origins: Array.from(new Set(issues.flatMap((issue) => issue.origins))).sort(),
    capabilities: Array.from(new Set(issues.flatMap((issue) => issue.capabilityId ? [issue.capabilityId] : []))).sort(),
    regions: Array.from(new Set(issues.flatMap((issue) => issue.regionId ? [issue.regionId] : []))).sort(),
  };
}

export function getPackageQualityPrimaryTarget(
  issue: PackageQualityIssue,
): string | undefined {
  return (
    issue.layerPath ??
    issue.nodeName ??
    issue.nodeId ??
    issue.fieldId ??
    issue.assetId ??
    issue.file ??
    issue.path ??
    issue.ref ??
    issue.sourceNodeId
    ?? issue.regionId
  );
}

export function visiblePackageQualitySelection(
  selectedIssueId: string | null,
  visibleIssues: PackageQualityIssue[],
): string | null {
  return selectedIssueId &&
    visibleIssues.some((issue) => issue.id === selectedIssueId)
    ? selectedIssueId
    : null;
}
