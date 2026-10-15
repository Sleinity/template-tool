# SDK — V2 candidate

The unpublished 1.0.0 candidate supports V2 host workflows only. ZIP admission requires raw source schema 1.0 and exporter 0.6.1 before asset persistence or font linking. Other or missing versions return blocked with SOURCE_EXPORTER_VERSION_UNSUPPORTED and retained raw evidence. Canonical packages remain schema 2.2.

Source normalization and the private V1-shaped renderer bridge remain necessary for current exports. Read-only versioned evidence does not authorize V1 editing. V1 sessions, Family editing, wizard/confirmation, persistence, React importer and importer styles are retired. Historical readers/adapters are test-only and absent from supported host entries. Existing V2 records, assets, fonts and recovery tokens are preserved. Unknown historical records remain untouched outside the catalogue; no V1 migration is provided.

See [V2 integration](V2_INTEGRATION.md), [lifecycle](HOST_LIFECYCLE.md), [operation outcomes](OPERATION_OUTCOMES.md), [migration contract](SDK_1_0_MIGRATION.md) and [runtime handoff](RUNTIME_HANDOFF.md).

Use createTemplateSessionV2 and createTemplateFieldFamilySessionV2 from Browser /session; runTemplatePackageImportPipelineV2, appendTemplateSourcesV2 and mutateTemplateFamilyV2 from Browser /importer. React /editor exposes existing owning hooks, TemplateFieldSessionV2Provider, TemplateFieldSessionRendererV2 and typed controllers. Core supports DOM-free createZipBundleReader/loadTemplatePackageBundleSource, parseTemplatePackageV2 and strict validation/materialization.

Hosts own controls, navigation, storage policy and output delivery. Sessions own canonical content and native resource lifetimes; React subscriptions borrow sessions. Exact fonts, image Fill/Fit/Crop/Reset, stale-evidence rejection and PNG readiness guards remain intact. Use Browser /persistence for V2 records and template-scoped recovery; do not persist derived renderer trees as content authority.

The delivered API and entry inventories specify supported imports. renderer-internal and session-internal are restricted repository seams; they are not supported host APIs. React /inspection retains read-only advanced evidence. There is no selectable compatibility renderer.

The three examples compile V2 workflows. Archive/source hashes identify this same-version candidate. Publication and tagging require separate authorization. Runtime validators and the rasterizer are retained.

<!-- sdk-capability-entry-points:start -->
| Package | Entry | Classification | Representative exports |
| --- | --- | --- | --- |
| core | `@sleinity/template-core` | `supported-low-level-adapter` | `createBackendDiagnosticProjection`, `createCanonicalSceneGraph` |
| core | `@sleinity/template-core/assets` | `supported-low-level-adapter` | `resolvePackageAssetReference`, `resolvePackageAssetSource` |
| core | `@sleinity/template-core/editor` | `supported-low-level-adapter` | `createTemplateFieldContentStateV1`, `createTextFitResult` |
| core | `@sleinity/template-core/family` | `recommended-high-level-integration` | `createTemplateFieldFamilyContentStateV3`, `materializeTemplateFieldFamilyVariantV2` |
| core | `@sleinity/template-core/fonts` | `supported-low-level-adapter` | `checkResolvedFontReadiness`, `collectResolvedFontRequirements` |
| core | `@sleinity/template-core/inspection` | `supported-advanced-inspection` | `createAppearanceBackendRequirements`, `createAppearanceContractProjection` |
| core | `@sleinity/template-core/motion` | `supported-low-level-adapter` | `evaluatePackageMotion`, `getPackageMotionFinalFrameTimeMs` |
| core | `@sleinity/template-core/renderer-internal` | `sdk-internal` | Prohibited for host applications |
| browser | `@sleinity/template-browser` | `supported-low-level-adapter` | `createCanonicalFontRequest`, `createFailedTemplatePackageValidation` |
| browser | `@sleinity/template-browser/assets` | `supported-low-level-adapter` | `createIndexedDbAssetStore`, `resolvePackageAssetReference` |
| browser | `@sleinity/template-browser/capture` | `supported-low-level-adapter` | `createPngRasterReadinessTracker`, `createTemplatePackageCaptureOptions` |
| browser | `@sleinity/template-browser/compatibility` | `recommended-high-level-integration` | `inspectTemplateRuntimeSupport`, `TEMPLATE_RUNTIME_SUPPORT_REPORT_SCHEMA_VERSION` |
| browser | `@sleinity/template-browser/enrichment` | `supported-low-level-adapter` | `createRendererHints` |
| browser | `@sleinity/template-browser/fonts` | `supported-low-level-adapter` | `createCanonicalFontRequest`, `createFontRequirementKey` |
| browser | `@sleinity/template-browser/importer` | `recommended-high-level-integration` | `createFailedTemplatePackageValidation`, `createLoadedSourceDiagnosticReport` |
| browser | `@sleinity/template-browser/persistence` | `supported-low-level-adapter` | `createIndexedDbTemplateRecoveryRepository`, `createInMemoryTemplateRecoveryRepository` |
| browser | `@sleinity/template-browser/session` | `recommended-high-level-integration` | `createTemplateFieldFamilyFieldV2`, `createTemplateFieldFamilySessionV2` |
| browser | `@sleinity/template-browser/session-internal` | `sdk-internal` | Prohibited for host applications |
| react | `@sleinity/template-react` | `recommended-high-level-integration` | `createResolvedProductRenderIdentity`, `TemplateFieldSessionRendererV2` |
| react | `@sleinity/template-react/editor` | `recommended-high-level-integration` | `TemplateFieldSessionRendererV2`, `TemplateFieldSessionRendererV2Handle` |
| react | `@sleinity/template-react/inspection` | `supported-advanced-inspection` | `createPackageQualityIssueFingerprint`, `createTemplatePackageQualityReport` |
| react | `@sleinity/template-react/renderer-internal` | `sdk-internal` | Prohibited for host applications |
<!-- sdk-capability-entry-points:end -->
