export interface MeasurementInventoryEntryV1 {
  id: string;
  property: string;
  currentLocation: string;
  trigger: string;
  currentConsumer: string;
  staleWorkProtection: string;
  milestone3Contract: string;
}

export const CURRENT_MEASUREMENT_INVENTORY: MeasurementInventoryEntryV1[] = [
  { id: "MEAS-001", property: "HUG text cap/line height", currentLocation: "render/TemplatePackageRenderer.tsx: useCapHeightTextHeight", trigger: "mount, ResizeObserver, document.fonts.ready/loadingdone, requestAnimationFrame", currentConsumer: "mounted renderer element style", staleWorkProtection: "effect cleanup only; no package revision token", milestone3Contract: "text-range and text-box records" },
  { id: "MEAS-002", property: "Field text fit and overflow", currentLocation: "editor/fieldConstraints.ts and TemplatePackageFieldEditor.tsx", trigger: "field edit and font loadingdone", currentConsumer: "field diagnostics", staleWorkProtection: "current DOM query; no shared epoch", milestone3Contract: "text-box record plus diagnostic dependency" },
  { id: "MEAS-003", property: "Layout diagnostics", currentLocation: "debug/packageLayoutDebug.ts and TemplatePackageLayoutDebugger.tsx", trigger: "requestAnimationFrame and ResizeObserver", currentConsumer: "layout diagnostic report", staleWorkProtection: "observer disconnect only", milestone3Contract: "bounds record plus diagnostic dependency" },
  { id: "MEAS-004", property: "Preview scale", currentLocation: "render/ScaledTemplatePackagePreview.tsx and TemplateInspectionPreview.tsx", trigger: "ResizeObserver", currentConsumer: "preview transform", staleWorkProtection: "observer disconnect only", milestone3Contract: "container record; preview scale remains outside scene settlement" },
  { id: "MEAS-005", property: "Image intrinsic size/readiness", currentLocation: "export/pngExport.ts, editor/TemplatePackageFieldEditor.tsx, fidelity/browser.mjs", trigger: "HTMLImageElement.decode/load", currentConsumer: "export readiness, replacement metadata and harness", staleWorkProtection: "per-promise completion; no package/asset revision", milestone3Contract: "intrinsic-image and asset-readiness records" },
  { id: "MEAS-006", property: "Renderer capture stability", currentLocation: "scripts/fidelity/browser.mjs", trigger: "three identical requestAnimationFrame geometry samples after fonts/assets", currentConsumer: "fidelity harness", staleWorkProtection: "capture-local page state", milestone3Contract: "measurement snapshot readiness and environment profile" },
];
