# SDK capabilities and checked entries

Use [the feature catalogue](FEATURES.md) for behavior, limitations and examples, [the API task guide](API_GUIDE.md) for integration seams and [the starter](QUICKSTART.md) for a complete host. The SDK 2.0.1 contract is V2-only, exporter-0.6.1-only, canonical schema 2.2. Internal entries below are not host APIs.

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
