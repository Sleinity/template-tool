import { useEffect, useMemo, useState } from "react";
import type {
  TemplateFamilyContentStateV1,
  TemplateFamilyFieldTargetV1,
  TemplateFamilyV1,
} from "@sleinity/template-core/family";
import type {
  SavedTemplateFamilyRecord,
} from "@sleinity/template-browser/persistence";
import type { TemplateFamilyImportConfirmationV1 } from "@sleinity/template-browser/importer";
import {
  applyTemplateFamilyVariantReimport,
  createTemplatePackageDigest,
  planTemplateFamilyVariantReimport,
  runTemplatePackageImportPipeline,
  type TemplateFamilyReimportPlanV1,
} from "@sleinity/template-browser/importer";
import {
  TemplateFamilyImportPreview,
  TemplateFamilyImportWizardProvider,
  TemplateFamilyZipInput,
  useTemplateFamilyImportWizard,
  useTemplateFamilyImportWizardSnapshot,
} from "@sleinity/template-react/importer";
import {
  AppShell,
  Alert,
  Button,
  Input,
  PageContent,
  PageFooter,
  PageHeader,
  PageWorkspace,
  Surface,
} from "../components/ui";

export interface TemplateFamilySetupPageProps {
  savedFamily?: SavedTemplateFamilyRecord | null;
  onCancel: () => void;
  onSave: (
    confirmation: TemplateFamilyImportConfirmationV1,
    previous?: SavedTemplateFamilyRecord | null,
  ) => Promise<void>;
}

function withBinding(
  family: TemplateFamilyV1,
  variantId: string,
  familyFieldId: string,
  target: TemplateFamilyFieldTargetV1,
): TemplateFamilyV1 {
  const next = structuredClone(family);
  const variant = next.variants.find((item) => item.id === variantId);
  if (!variant) return next;
  const existing = variant.bindings.find((item) => item.familyFieldId === familyFieldId);
  if (existing) existing.targets = [target];
  else variant.bindings.push({ familyFieldId, targets: [target] });
  return next;
}

export function TemplateFamilySetupPage({
  savedFamily = null,
  onCancel,
  onSave,
}: TemplateFamilySetupPageProps) {
  const wizard = useTemplateFamilyImportWizard();
  const snapshot = useTemplateFamilyImportWizardSnapshot(wizard);
  const [groupTitle, setGroupTitle] = useState("Format");
  const [saving, setSaving] = useState(false);
  const [reimportPlans, setReimportPlans] = useState<Record<string, TemplateFamilyReimportPlanV1>>({});

  useEffect(() => {
    if (!savedFamily || wizard.getSnapshot().family) return;
    wizard.loadFamily(savedFamily.family);
  }, [savedFamily, wizard]);

  const activeIndex = useMemo(() => [
    "family-variants",
    "field-matches",
    "variant-groups",
    "common-rules",
    "variant-overrides",
    "validation-preview",
    "confirmation",
  ].indexOf(snapshot.activeStep), [snapshot.activeStep]);

  const addGenericGroup = () => {
    if (!snapshot.family || !groupTitle.trim()) return;
    const next = structuredClone(snapshot.family);
    const groupId = `group:${crypto.randomUUID()}`;
    const options = next.variants.map((variant) => ({
      id: `option:${crypto.randomUUID()}`,
      title: variant.title,
    }));
    next.variantGroups.push({ id: groupId, title: groupTitle.trim(), options });
    next.variants.forEach((variant, index) => {
      variant.groupAssignments[groupId] = options[index].id;
    });
    wizard.replaceFamily(next);
  };

  const updateCommonLimit = (fieldId: string, raw: string) => {
    if (!snapshot.family) return;
    const next = structuredClone(snapshot.family);
    const field = next.fields.find((item) => item.id === fieldId);
    if (!field) return;
    const constraints = { ...(field.rule.constraints ?? {}) } as { maxCharacters?: number };
    if (raw === "") delete constraints.maxCharacters;
    else constraints.maxCharacters = Number(raw);
    field.rule.constraints = constraints;
    wizard.replaceFamily(next);
  };

  const updateVariantLimit = (variantId: string, fieldId: string, raw: string) => {
    if (!snapshot.family) return;
    const next = structuredClone(snapshot.family);
    const variant = next.variants.find((item) => item.id === variantId);
    if (!variant) return;
    if (raw === "") delete variant.ruleOverrides[fieldId];
    else variant.ruleOverrides[fieldId] = { constraints: { maxCharacters: Number(raw) } };
    wizard.replaceFamily(next);
  };

  const applySuggestedOverrides = (variantId: string) => {
    if (!snapshot.family) return;
    const suggestions = snapshot.matchPlans[variantId]?.suggestedRuleOverrides;
    if (!suggestions || Object.keys(suggestions).length === 0) return;
    const next = structuredClone(snapshot.family);
    const variant = next.variants.find((item) => item.id === variantId);
    if (!variant) return;
    variant.ruleOverrides = {
      ...variant.ruleOverrides,
      ...structuredClone(suggestions),
    };
    wizard.replaceFamily(next);
  };

  const finish = async () => {
    setSaving(true);
    try {
      const confirmation = await wizard.confirm();
      await onSave(confirmation, savedFamily);
    } finally {
      setSaving(false);
    }
  };

  const inspectReimport = async (variantId: string, file: File) => {
    if (!snapshot.family) return;
    const result = await runTemplatePackageImportPipeline({
      format: "zip",
      buffer: await file.arrayBuffer(),
      sourceName: file.name,
    });
    if (!result.package) throw new Error("The replacement ZIP is not importable.");
    const digest = await createTemplatePackageDigest(result.package);
    const plan = planTemplateFamilyVariantReimport(
      snapshot.family,
      variantId,
      result.package,
      wizard.familySession.getSnapshot().familyRevision,
      {
        sourceName: file.name,
        importedAt: new Date().toISOString(),
        packageDigest: digest.value,
      },
    );
    setReimportPlans((current) => ({ ...current, [variantId]: plan }));
  };

  const applyReimport = (variantId: string) => {
    if (!snapshot.family) return;
    const plan = reimportPlans[variantId];
    if (!plan?.canApply) return;
    const next = applyTemplateFamilyVariantReimport(
      snapshot.family,
      plan,
      wizard.familySession.getSnapshot().familyRevision,
    );
    wizard.replaceFamily(next);
    setReimportPlans((current) => {
      const nextPlans = { ...current };
      delete nextPlans[variantId];
      return nextPlans;
    });
  };

  return (
    <TemplateFamilyImportWizardProvider wizard={wizard}>
      <AppShell>
        <PageWorkspace>
          <PageHeader>
            <div>
              <p className="ui-eyebrow">{savedFamily ? "Family settings" : "Template setup"}</p>
              <h1 className="ui-page-title">{savedFamily ? savedFamily.name : "Create Template Family"}</h1>
              <p className="ui-page-description">Add ZIP variants, match shared fields, configure optional selectors and validate one shared content model.</p>
            </div>
          </PageHeader>
          <PageContent>
            {snapshot.error ? <Alert tone="blocked" title="Family setup needs attention">{snapshot.error.message}</Alert> : null}
            <nav className="mb-6 flex flex-wrap gap-2" aria-label="Family setup steps">
              {[
                "Variants", "Fields", "Groups", "Common rules", "Overrides", "Validate", "Confirm",
              ].map((label, index) => (
                <span className={index === activeIndex ? "font-semibold text-content-primary" : "text-content-muted"} key={label}>
                  {index + 1}. {label}
                </span>
              ))}
            </nav>

            {snapshot.activeStep === "family-variants" ? (
              <Surface className="space-y-4 p-5">
                <h2 className="ui-section-title">Family and variants</h2>
                {!snapshot.family ? (
                  <TemplateFamilyZipInput wizard={wizard} mode="first" label="Choose first TemplatePackage ZIP" />
                ) : (
                  <>
                    <Input
                      label="Family title"
                      value={snapshot.family.title}
                      onChange={(event) => wizard.replaceFamily({ ...snapshot.family!, title: event.target.value })}
                    />
                    <div className="space-y-2">
                      {snapshot.family.variants.map((variant) => (
                        <div className="rounded-lg border border-line-subtle p-3" key={variant.id}>
                          <Input
                            label="Variant title"
                            value={variant.title}
                            onChange={(event) => {
                              const next = structuredClone(snapshot.family!);
                              const editable = next.variants.find((item) => item.id === variant.id);
                              if (editable) editable.title = event.target.value;
                              wizard.replaceFamily(next);
                            }}
                          />
                          <p className="text-xs text-content-muted">
                            {variant.packageValue.canvas.width} × {variant.packageValue.canvas.height} · {variant.source.sourceName}
                          </p>
                          <label className="mt-3 grid gap-1 text-sm">
                            Review replacement ZIP
                            <input
                              type="file"
                              accept=".zip,application/zip"
                              onChange={(event) => {
                                const file = event.currentTarget.files?.[0];
                                event.currentTarget.value = "";
                                if (file) void inspectReimport(variant.id, file);
                              }}
                            />
                          </label>
                          {reimportPlans[variant.id] ? (
                            <div className="mt-2 text-sm">
                              <p>
                                {reimportPlans[variant.id].canApply ? "Exact reimport ready" : "Reimport needs field resolution"}
                                {` · ${reimportPlans[variant.id].addedTargets.length} added · ${reimportPlans[variant.id].removedTargets.length} removed · ${reimportPlans[variant.id].incompatibleTargets.length} incompatible`}
                              </p>
                              <Button
                                variant="secondary"
                                disabled={!reimportPlans[variant.id].canApply}
                                onClick={() => applyReimport(variant.id)}
                              >
                                Apply reviewed reimport
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                    <TemplateFamilyZipInput wizard={wizard} mode="add-variant" label="Add variant ZIP" />
                  </>
                )}
              </Surface>
            ) : null}

            {snapshot.activeStep === "field-matches" && snapshot.family ? (
              <Surface className="space-y-5 p-5">
                <h2 className="ui-section-title">Shared field matches</h2>
                <p className="text-sm text-content-secondary">Exact compatible IDs are already linked. Resolve only the differences below.</p>
                {snapshot.family.variants.map((variant) => {
                  const plan = snapshot.matchPlans[variant.id];
                  return (
                    <section key={variant.id}>
                      <h3 className="font-semibold">{variant.title}</h3>
                      {snapshot.family!.fields.map((field) => {
                        const binding = variant.bindings.find((item) => item.familyFieldId === field.id);
                        if (binding?.targets.length) return <p key={field.id} className="text-sm">✓ {field.title}</p>;
                        const choices = plan?.unmatchedTargets ?? [];
                        return (
                          <label className="mt-2 grid gap-1 text-sm" key={field.id}>
                            {field.title}
                            <select
                              defaultValue=""
                              onChange={(event) => {
                                const target = choices[Number(event.target.value)];
                                if (target) wizard.replaceFamily(withBinding(snapshot.family!, variant.id, field.id, target));
                              }}
                            >
                              <option value="">Choose package field…</option>
                              {choices.map((target, index) => (
                                <option value={index} key={`${target.fieldId}:${target.nodeId}`}>{target.fieldId} · {target.nodeId}</option>
                              ))}
                            </select>
                          </label>
                        );
                      })}
                    </section>
                  );
                })}
              </Surface>
            ) : null}

            {snapshot.activeStep === "variant-groups" && snapshot.family ? (
              <Surface className="space-y-4 p-5">
                <h2 className="ui-section-title">Optional variant groups</h2>
                <p className="text-sm text-content-secondary">Groups are generic. Studio does not assign meaning to names such as Format, Colour or Language.</p>
                {snapshot.family.variantGroups.map((group) => (
                  <p key={group.id}><strong>{group.title}</strong>: {group.options.map((option) => option.title).join(", ")}</p>
                ))}
                <Input label="New group title" value={groupTitle} onChange={(event) => setGroupTitle(event.target.value)} />
                <Button variant="secondary" onClick={addGenericGroup}>Create group from current variants</Button>
              </Surface>
            ) : null}

            {snapshot.activeStep === "common-rules" && snapshot.family ? (
              <Surface className="space-y-4 p-5">
                <h2 className="ui-section-title">Common field rules</h2>
                {snapshot.family.fields.filter((field) => field.type === "text" || field.type === "textarea").map((field) => (
                  <Input
                    key={field.id}
                    label={`${field.title} · maximum characters`}
                    type="number"
                    value={String((field.rule.constraints as { maxCharacters?: number } | undefined)?.maxCharacters ?? "")}
                    onChange={(event) => updateCommonLimit(field.id, event.target.value)}
                  />
                ))}
              </Surface>
            ) : null}

            {snapshot.activeStep === "variant-overrides" && snapshot.family ? (
              <Surface className="space-y-5 p-5">
                <h2 className="ui-section-title">Variant differences</h2>
                {snapshot.family.variants.map((variant) => (
                  <section key={variant.id}>
                    <h3 className="font-semibold">{variant.title}</h3>
                    {snapshot.matchPlans[variant.id]?.ruleDifferences.length ? (
                      <div className="my-3 rounded-lg border border-line-subtle p-3 text-sm">
                        <p>
                          {snapshot.matchPlans[variant.id].ruleDifferences.length} imported rule{" "}
                          {snapshot.matchPlans[variant.id].ruleDifferences.length === 1 ? "difference" : "differences"} found.
                          They remain setup evidence until you deliberately apply them.
                        </p>
                        <ul className="mt-2 list-disc pl-5">
                          {snapshot.matchPlans[variant.id].ruleDifferences.map((difference) => (
                            <li key={`${difference.familyFieldId}:${difference.rulePath}`}>
                              {snapshot.family!.fields.find((field) => field.id === difference.familyFieldId)?.title}
                              {` · ${difference.rulePath}: family ${JSON.stringify(difference.familyValue) ?? "unset"}, imported ${JSON.stringify(difference.importedValue) ?? "unset"}`}
                            </li>
                          ))}
                        </ul>
                        <Button
                          variant="secondary"
                          onClick={() => applySuggestedOverrides(variant.id)}
                        >
                          Apply imported differences as overrides
                        </Button>
                      </div>
                    ) : (
                      <p className="my-2 text-sm text-content-muted">No imported rule differences.</p>
                    )}
                    {snapshot.family!.fields.filter((field) => field.type === "text" || field.type === "textarea").map((field) => (
                      <Input
                        key={field.id}
                        label={`${field.title} override · blank inherits`}
                        type="number"
                        value={String((variant.ruleOverrides[field.id]?.constraints as { maxCharacters?: number } | undefined)?.maxCharacters ?? "")}
                        onChange={(event) => updateVariantLimit(variant.id, field.id, event.target.value)}
                      />
                    ))}
                  </section>
                ))}
              </Surface>
            ) : null}

            {snapshot.activeStep === "validation-preview" && snapshot.family ? (
              <Surface className="space-y-4 p-5">
                <h2 className="ui-section-title">Validate every variant</h2>
                <div className="flex flex-wrap gap-2">
                  {snapshot.family.variants.map((variant) => (
                    <Button
                      key={variant.id}
                      variant={snapshot.previewVariantId === variant.id ? "primary" : "secondary"}
                      onClick={() => wizard.selectPreviewVariant(variant.id)}
                    >
                      {variant.title} · {snapshot.renderValidation[variant.id]?.status ?? "not-run"}
                    </Button>
                  ))}
                </div>
                <TemplateFamilyImportPreview wizard={wizard} className="min-h-[520px] rounded-xl bg-surface-secondary" />
                <ul>{snapshot.validation?.issues.map((issue, index) => <li key={`${issue.code}:${index}`}>{issue.message}</li>)}</ul>
              </Surface>
            ) : null}

            {snapshot.activeStep === "confirmation" && snapshot.family ? (
              <Surface className="space-y-3 p-5">
                <h2 className="ui-section-title">Confirm Template Family</h2>
                <p>{snapshot.family.title} · {snapshot.family.variants.length} variants · {snapshot.family.fields.length} shared fields</p>
                <p className="text-sm text-content-secondary">Studio will save the family definition. Content remains draft-owned.</p>
              </Surface>
            ) : null}
          </PageContent>
          <PageFooter>
            <Button variant="secondary" onClick={onCancel}>Cancel</Button>
            <Button variant="secondary" disabled={activeIndex === 0} onClick={() => wizard.back()}>Back</Button>
            {snapshot.activeStep === "confirmation" ? (
              <Button disabled={!snapshot.canContinue || saving} onClick={() => void finish()}>{saving ? "Saving…" : "Save family"}</Button>
            ) : (
              <Button disabled={!snapshot.canContinue} onClick={() => wizard.next()}>Continue</Button>
            )}
          </PageFooter>
        </PageWorkspace>
      </AppShell>
    </TemplateFamilyImportWizardProvider>
  );
}
