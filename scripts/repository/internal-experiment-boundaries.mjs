const importsExperiment = (source, name) => new RegExp(
  `(?:from\\s*|import\\s*\\(|require\\s*\\(|import\\s*)["'][^"']*${name}(?:[/"'])`,
).test(source);

export function internalExperimentViolations(relative, source) {
  const preparationOwner = relative === "packages/template-browser/src/import/templateSourceAssemblyV2.ts";
  const preparationSelf = relative === "packages/template-browser/src/import/familySourcePreparationV2.ts";
  const testOnly = relative.includes("/test/") || /\.test\.[cm]?[jt]sx?$/.test(relative) || relative === "src/test-suite.ts";
  const importsTextMeasurementInputs = importsExperiment(source, "textMeasurementInputs") ||
    /(?:from\s*|import\s*\(|require\s*\(|import\s*)["'][^"']*textMeasurementInputs\.[cm]?[jt]sx?["']/.test(source);
  if (!testOnly && importsTextMeasurementInputs) {
    if (relative !== "packages/template-react/src/render/TemplatePackageRenderer.tsx")
      return [`Production dependency on private mounted text inputs: ${relative}`];
    if (/export\s+(?:type\s+)?(?:\*|\{[^}]*\})\s+from\s*["'][^"']*textMeasurementInputs/s.test(source))
      return [`Public re-export of private mounted text inputs: ${relative}`];
  }
  const importsSaveQueue = importsExperiment(source, "serializedSaveQueue") ||
    /(?:from\s*|import\s*\(|require\s*\(|import\s*)["'][^"']*serializedSaveQueue\.[cm]?[jt]sx?["']/.test(source);
  if (!testOnly && importsSaveQueue) {
    if (![
      "packages/template-browser/src/session/templateSessionV2.ts",
      "packages/template-browser/src/session/templateFieldFamilySessionV2.ts",
    ].includes(relative)) return [`Production dependency on private save queue: ${relative}`];
    if (/export\s+(?:type\s+)?(?:\*|\{[^}]*\})\s+from\s*["'][^"']*serializedSaveQueue/s.test(source))
      return [`Public re-export of private save queue: ${relative}`];
  }
  const importsFieldEvidence = importsExperiment(source, "fieldRenderEvidence") ||
    /(?:from\s*|import\s*\(|require\s*\(|import\s*)["'][^"']*fieldRenderEvidence\.[cm]?[jt]sx?["']/.test(source);
  if (!testOnly && importsFieldEvidence) {
    if (!["packages/template-browser/src/session/templateSessionV2.ts", "packages/template-browser/src/session/templateFieldFamilySessionV2.ts"].includes(relative))
      return [`Production dependency on private field render evidence: ${relative}`];
    if (/export\s+(?:type\s+)?(?:\*|\{[^}]*\})\s+from\s*["'][^"']*fieldRenderEvidence/s.test(source))
      return [`Public re-export of private field render evidence: ${relative}`];
  }
  const importsHydration = importsExperiment(source, "storedAssetHydration") ||
    /(?:from\s*|import\s*\(|require\s*\(|import\s*)["'][^"']*storedAssetHydration\.[cm]?[jt]sx?["']/.test(source);
  if (!testOnly && importsHydration) {
    if (!["packages/template-browser/src/session/templateSessionV2.ts", "packages/template-browser/src/session/templateFieldFamilySessionV2.ts"].includes(relative))
      return [`Production dependency on private asset hydration: ${relative}`];
    if (/export\s+(?:type\s+)?(?:\*|\{[^}]*\})\s+from\s*["'][^"']*storedAssetHydration/s.test(source))
      return [`Public re-export of private asset hydration: ${relative}`];
  }
  if (!testOnly && importsExperiment(source, "familySourcePreparationV2")) {
    if (!preparationOwner && !preparationSelf) return [`Production dependency on private Family preparation: ${relative}`];
    if (/export\s+(?:type\s+)?(?:\*|\{[^}]*\})\s+from\s*["'][^"']*familySourcePreparationV2/s.test(source))
      return [`Public re-export of private Family preparation: ${relative}`];
  }
  const compiler = relative.startsWith("packages/template-browser/src/internal/compilerResult/");
  const projection = relative.startsWith("packages/template-core/src/internal/definitionProjection/");
  const session = relative.startsWith("packages/template-browser/src/internal/sessionContract/");
  const readerFacade = relative === "packages/template-browser/src/session-internal.ts";
  const reactReader = relative === "packages/template-react/src/internal/useFieldSessionSnapshotV2.ts";
  if (!testOnly && importsExperiment(source, "useFieldSessionSnapshotV2") && relative !== "packages/template-react/src/fieldSessionV2.tsx")
    return [`Production dependency on private React snapshot bridge: ${relative}`];
  if (!testOnly && importsExperiment(source, "session-internal") && !reactReader)
    return [`Production dependency on restricted session-internal entry: ${relative}`];
  if (!testOnly && /export\s+(?:type\s+)?(?:\*|\{[^}]*\})\s+from\s*["'][^"']*(?:session-internal|useFieldSessionSnapshotV2)/s.test(source))
    return [`Re-export of private session reader: ${relative}`];
  if (!testOnly && importsExperiment(source, "sessionContract") && !session && !readerFacade)
    return [`Production dependency on internal sessionContract: ${relative}`];
  if (readerFacade && /export\s+(?:type\s+)?(?:\*|\{[^}]*\})\s+from\s*["'][^"']*sessionContract/s.test(source))
    return [`Re-export of internal session adapter: ${relative}`];
  if (session) return ["compilerResult", "definitionProjection"].flatMap(name => importsExperiment(source, name)
    ? [`Session contract depends on internal ${name}: ${relative}`] : []);
  if (compiler) return importsExperiment(source, "definitionProjection")
    ? [`Compiler result depends on definition projection: ${relative}`] : [];
  if (projection) return importsExperiment(source, "compilerResult")
    ? [`Definition projection depends on compiler result: ${relative}`] : [];
  if (testOnly) return [];
  // One supported ingestion facade may delegate to the compiler, never re-export it.
  if (relative === "packages/template-browser/src/import/runTemplatePackageImportPipelineV2.ts") {
    return /export\s+(?:type\s+)?(?:\*|\{[^}]*\})\s+from\s*["'][^"']*compilerResult/s.test(source)
      ? [`Public re-export of internal compilerResult: ${relative}`]
      : importsExperiment(source, "definitionProjection")
        ? [`Production dependency on internal definitionProjection: ${relative}`] : [];
  }
  return ["definitionProjection", "compilerResult"].flatMap(name => importsExperiment(source, name)
    ? [`Production dependency on internal ${name}: ${relative}`] : []);
}
