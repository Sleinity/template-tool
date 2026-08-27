import { StrictMode, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  createTemplateFamilyFieldForTarget,
  getTemplateFamilyFieldScope,
  type TemplateFamilyV1,
} from "@sleinity/template-core/family";
import {
  planTemplateFamilyVariantReimport,
  runTemplatePackageImportPipeline,
  type TemplateFamilyImportWizardV1,
  type TemplateFamilyReimportPlanV1,
} from "@sleinity/template-browser/importer";
import {
  TemplateFamilyImportPreview,
  TemplateFamilyImportWizardProvider,
  TemplateFamilyZipInput,
  useTemplateFamilyImportWizard,
  useTemplateFamilyImportWizardSnapshot,
} from "@sleinity/template-react/importer";
import "@sleinity/template-react/importer.css";
import {
  TemplateFamilySessionProvider,
  TemplateSessionViewport,
  type TemplateSessionViewportHandle,
  useTemplateFamilyEditor,
  useTemplateFamilySessionSnapshot,
} from "@sleinity/template-react/editor";
import "./styles.css";

function addExampleProperty(family: TemplateFamilyV1): TemplateFamilyV1 {
  const next = structuredClone(family);
  const groupId = "example-group:variant";
  next.variantGroups = [{
    id: groupId,
    title: "Design",
    options: next.variants.map((variant) => ({
      id: `option:${variant.id}`,
      title: variant.title,
    })),
  }];
  for (const variant of next.variants) {
    variant.groupAssignments[groupId] = `option:${variant.id}`;
  }
  return next;
}

function FamilyEditor() {
  const snapshot = useTemplateFamilySessionSnapshot();
  const editor = useTemplateFamilyEditor();
  const viewport = useRef<TemplateSessionViewportHandle>(null);
  const [captureStatus, setCaptureStatus] = useState("idle");
  return (
    <section className="workspace">
      <div className="panel">
        <h2>Variant and shared content</h2>
        {editor.controls.map((control) => {
          if (control.kind === "direct-variant-selector") {
            return (
              <label key={control.kind}>
                Variant
                <select
                  aria-label="Current family variant"
                  value={snapshot.selectedVariantId ?? ""}
                  onChange={(event) => control.selection.selectVariant(event.target.value)}
                >
                  {control.selection.variants.map((variant) => (
                    <option key={variant.id} value={variant.id}>{variant.title}</option>
                  ))}
                </select>
              </label>
            );
          }
          if (control.kind === "selection-property") {
            const property = control.selection;
            return (
              <label key={property.group.id}>
                {property.group.title}
                <select
                  aria-label={property.group.title}
                  value={property.selectedOptionId ?? ""}
                  onChange={(event) => property.selectOption(event.target.value)}
                >
                  {property.options.map((option) => (
                    <option key={option.optionId} value={option.optionId} disabled={!option.available && !option.selected}>
                      {option.title}
                    </option>
                  ))}
                </select>
              </label>
            );
          }
          const controller = control.controller;
          return controller.field.type === "image" ? (
            <label key={controller.field.id}>
              {controller.field.title} ({controller.scope.kind})
              <input
                aria-label={controller.field.title}
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  if (!file || !controller.replaceImage) return;
                  const reader = new FileReader();
                  reader.onload = () => controller.replaceImage?.({
                    dataUrl: String(reader.result),
                    mimeType: file.type,
                    sizeBytes: file.size,
                  });
                  reader.readAsDataURL(file);
                }}
              />
              <span data-testid={`family-image-${controller.field.id}`}>
                {controller.value && typeof controller.value === "object" && "assetRef" in controller.value
                  ? controller.value.assetRef
                  : "no shared image"}
              </span>
            </label>
          ) : (
            <label key={controller.field.id}>
              {controller.field.title} ({controller.scope.kind})
              <input
                aria-label={controller.field.title}
                value={String(controller.value ?? "")}
                onChange={(event) => controller.setValue(event.target.value)}
              />
            </label>
          );
        })}
        <button
          type="button"
          onClick={() => {
            setCaptureStatus("capturing");
            void viewport.current?.exportPng({ download: false })
              .then(() => setCaptureStatus("captured"))
              .catch((error: unknown) => setCaptureStatus(
                `blocked: ${error instanceof Error ? error.message : String(error)}`,
              ));
          }}
        >
          Capture current variant
        </button>
        <p data-testid="family-capture-status">{captureStatus}</p>
        <ul>
          {snapshot.validation?.issues.map((issue, index) => (
            <li key={`${issue.code}:${index}`}>{issue.message}</li>
          ))}
        </ul>
      </div>
      <TemplateSessionViewport
        ref={viewport}
        session={editor.renderSession}
        className="preview"
      />
    </section>
  );
}

let lastWizard: TemplateFamilyImportWizardV1 | null = null;

function FamilyExample() {
  const wizard = useTemplateFamilyImportWizard();
  lastWizard = wizard;
  const snapshot = useTemplateFamilyImportWizardSnapshot(wizard);
  const [reimportPlan, setReimportPlan] = useState<TemplateFamilyReimportPlanV1 | null>(null);
  const [persistenceStatus, setPersistenceStatus] = useState("idle");

  const keepUnmatchedFieldsVariantSpecific = () => {
    if (!snapshot.family || !snapshot.content) return;
    let family = snapshot.family;
    let content = snapshot.content;
    for (const variant of family.variants) {
      for (const target of snapshot.matchPlans[variant.id]?.unmatchedTargets ?? []) {
        const alreadyBound = variant.bindings.some((binding) =>
          binding.targets.some((candidate) =>
            candidate.fieldId === target.fieldId &&
            candidate.nodeId === target.nodeId &&
            candidate.property === target.property,
          ),
        );
        if (alreadyBound) continue;
        const created = createTemplateFamilyFieldForTarget({
          family,
          content,
          variantId: variant.id,
          target,
          fieldId: `field:${crypto.randomUUID()}`,
        });
        family = created.family;
        content = created.content;
      }
    }
    wizard.replaceFamily(family);
    wizard.replaceContent(content);
  };

  const unboundTargetCount = snapshot.family?.variants.reduce(
    (count, variant) => count + (snapshot.matchPlans[variant.id]?.unmatchedTargets ?? [])
      .filter((target) => !variant.bindings.some((binding) =>
        binding.targets.some((candidate) =>
          candidate.fieldId === target.fieldId &&
          candidate.nodeId === target.nodeId &&
          candidate.property === target.property,
        ),
      )).length,
    0,
  ) ?? 0;

  const inspectReimport = async (file: File) => {
    if (!snapshot.family || !snapshot.previewVariantId) return;
    const imported = await runTemplatePackageImportPipeline({
      format: "zip",
      buffer: await file.arrayBuffer(),
      sourceName: file.name,
    });
    if (imported.package) {
      setReimportPlan(planTemplateFamilyVariantReimport(
        snapshot.family,
        snapshot.previewVariantId,
        imported.package,
      ));
    }
  };

  return (
    <TemplateFamilyImportWizardProvider wizard={wizard}>
      <TemplateFamilySessionProvider session={wizard.familySession}>
        <header>
          <p>Template Family reference</p>
          <h1>Template Family integration</h1>
          <p>Import ZIP variants, share content, preview sequentially, persist, reopen and capture.</p>
        </header>
        <main>
          <section className="panel controls">
            <h2>Family setup</h2>
            <TemplateFamilyZipInput wizard={wizard} mode="first" />
            <TemplateFamilyZipInput
              wizard={wizard}
              mode="add-variant"
              disabled={!snapshot.family}
            />
            <button
              type="button"
              disabled={!snapshot.family || snapshot.family.variants.length < 2}
              onClick={() => snapshot.family && wizard.replaceFamily(addExampleProperty(snapshot.family))}
            >
              Add “Design” property
            </button>
            <button
              type="button"
              disabled={unboundTargetCount === 0}
              onClick={keepUnmatchedFieldsVariantSpecific}
            >
              Keep unmatched fields variant-specific ({unboundTargetCount})
            </button>
            {snapshot.family ? (
              <p data-testid="family-field-scopes">
                {snapshot.family.fields.map((field) =>
                  `${field.title}:${getTemplateFamilyFieldScope(snapshot.family!, field.id).kind}`
                ).join(" | ")}
              </p>
            ) : null}
            <button type="button" onClick={() => wizard.back()}>Back</button>
            {snapshot.activeStep === "confirmation" ? (
              <button
                type="button"
                disabled={!snapshot.canContinue}
                onClick={() => void wizard.confirm()}
              >
                Confirm family
              </button>
            ) : (
              <button type="button" disabled={!snapshot.canContinue} onClick={() => wizard.next()}>
                Continue
              </button>
            )}
            <p>Step: {snapshot.activeStep}</p>
            <p data-testid="family-wizard-status">{snapshot.status}</p>
            {snapshot.error ? <p role="alert">{snapshot.error.message}</p> : null}
            <label>
              Inspect reimport for selected variant
              <input
                type="file"
                accept=".zip,application/zip"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  if (file) void inspectReimport(file);
                }}
              />
            </label>
            {reimportPlan ? (
              <p data-testid="family-reimport-status">
                Reimport: {reimportPlan.canApply ? "ready" : "needs resolution"};{" "}
                {reimportPlan.fieldChanges.filter((change) => change.status === "unresolved").length} unresolved.
              </p>
            ) : null}
            <button
              type="button"
              disabled={!snapshot.family}
              onClick={() => {
                setPersistenceStatus("saving");
                void wizard.familySession.save().then(async (family) => {
                  const draft = await wizard.familySession.saveDraft();
                  wizard.familySession.reset();
                  await wizard.familySession.loadSavedFamily(family.id, draft.id);
                  setPersistenceStatus("reopened");
                }).catch(() => setPersistenceStatus("blocked"));
              }}
            >
              Save, reset and reopen offline
            </button>
            <p data-testid="family-persistence-status">{persistenceStatus}</p>
          </section>
          {snapshot.family ? (
            <>
              <section className="panel" aria-label="Sequential variant preview">
                <h2>Preview one variant</h2>
                {snapshot.family.variants.map((variant) => (
                  <button
                    type="button"
                    key={variant.id}
                    onClick={() => wizard.selectPreviewVariant(variant.id)}
                  >
                    Preview {variant.title}
                  </button>
                ))}
              </section>
              <TemplateFamilyImportPreview wizard={wizard} className="preview" />
              <FamilyEditor />
            </>
          ) : null}
        </main>
      </TemplateFamilySessionProvider>
    </TemplateFamilyImportWizardProvider>
  );
}

function ExampleRoot() {
  const [mounted, setMounted] = useState(true);
  const [disposalStatus, setDisposalStatus] = useState("mounted");
  useEffect(() => {
    if (mounted) return;
    queueMicrotask(() => {
      setDisposalStatus(lastWizard?.getSnapshot().status ?? "missing");
    });
  }, [mounted]);
  return (
    <>
      <button type="button" onClick={() => setMounted(false)}>Unmount family workspace</button>
      <p data-testid="family-disposal-status">{disposalStatus}</p>
      {mounted ? <FamilyExample /> : null}
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode><ExampleRoot /></StrictMode>,
);
