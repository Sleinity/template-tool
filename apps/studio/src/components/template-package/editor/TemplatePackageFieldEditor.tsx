import { AlertTriangle, ImagePlus } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Alert,
  Button,
  CheckboxField,
  Input,
  MediaInput,
  Select,
  Textarea,
} from "../../ui";
import { resolvePackageAssetSource } from "../../../../../../src/template-package/render";
import { resolvePackageAssetReference } from "../../../../../../src/template-package/assets/packageAssetResolution";
import type {
  EditableFieldBinding,
  PackageImageFieldConstraints,
  TemplatePackageV1,
} from "../../../../../../src/template-package/types";
import {
  getPackageEditorFieldWarnings,
  clearTemplatePackageImageOverride,
  getEffectiveEditableFields,
  getPackageEditorFieldTargetStatuses,
  getPackageFieldOverrideValue,
  getPackageFieldValue,
  type PackageEditorFieldWarning,
  replaceTemplatePackageImage,
  setTemplatePackageImageReplacementMode,
  updateTemplatePackageField,
} from "../../../../../../src/template-package/editor/packageFieldBindings";
import {
  fieldCounter,
  resolveFieldBehavior,
  validateTextFieldValue,
} from "../../../../../../src/template-package/editor/fieldConstraints";
import { formatEditableFieldLabel } from "./fieldLabels";
import {
  createRenderedTextLineMeasure,
} from "../../../../../../src/template-package/editor/textMeasurement";

interface TemplatePackageFieldEditorProps {
  packageValue: TemplatePackageV1;
  onPackageChange: (packageValue: TemplatePackageV1) => void;
  onFieldEdited?: (field: EditableFieldBinding) => void;
  onWarningsChange?: (warnings: PackageEditorFieldWarning[]) => void;
  variant?: "card" | "plain";
  grouped?: boolean;
  showTechnicalDetails?: boolean;
  showWarnings?: boolean;
  getMeasurementRoot?: () => ParentNode | null;
}

const acceptedImageTypes =
  "image/png,image/jpeg,image/jpg,image/webp,image/gif,image/svg+xml";
const textFieldTypes = new Set(["text", "textarea", "number", "date"]);

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("The selected image could not be read."));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error("Image upload failed."));
    reader.readAsDataURL(file);
  });
}

function readImageDimensions(
  dataUrl: string,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const publish = () => resolve({
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
      const developmentDelay = import.meta.env.DEV
        ? (window as Window & { __templatePackageImageDecodeDelayMs?: number })
            .__templatePackageImageDecodeDelayMs
        : 0;
      if (developmentDelay && developmentDelay > 0) {
        window.setTimeout(publish, developmentDelay);
      } else {
        publish();
      }
    };
    image.onerror = () =>
      reject(new Error("The selected image dimensions could not be read."));
    image.src = dataUrl;
  });
}

function warningKey(warning: PackageEditorFieldWarning): string {
  return `${warning.fieldId}:${warning.code}`;
}

function fieldGroup(field: EditableFieldBinding): string {
  if (field.type === "image") return "Media";
  if (field.type === "text" || field.type === "textarea") return "Content";
  if (field.type === "color") return "Colours";
  if (field.type === "boolean") return "Visibility";
  return "Advanced";
}

export function TemplatePackageFieldEditor({
  packageValue,
  onPackageChange,
  onFieldEdited,
  onWarningsChange,
  variant = "card",
  grouped = false,
  showTechnicalDetails = true,
  showWarnings = true,
  getMeasurementRoot,
}: TemplatePackageFieldEditorProps) {
  const [operationWarnings, setOperationWarnings] = useState<
    Record<string, PackageEditorFieldWarning>
  >({});
  const [loadingImages, setLoadingImages] = useState<Record<string, boolean>>({});
  const imageOperationRevisionRef = useRef<Record<string, number>>({});
  const packageValueRef = useRef(packageValue);
  packageValueRef.current = packageValue;
  useEffect(() => {
    packageValueRef.current = packageValue;
    for (const key of Object.keys(imageOperationRevisionRef.current)) {
      imageOperationRevisionRef.current[key] += 1;
    }
    setLoadingImages({});
  }, [packageValue]);
  const [, setFontMeasureVersion] = useState(0);
  useEffect(() => {
    if (typeof document === "undefined" || !document.fonts) return;
    const refreshMeasurements = () => setFontMeasureVersion((current) => current + 1);
    document.fonts.ready.then(refreshMeasurements).catch(() => undefined);
    document.fonts.addEventListener("loadingdone", refreshMeasurements);
    return () => document.fonts.removeEventListener("loadingdone", refreshMeasurements);
  }, []);
  const structuralWarnings = useMemo(
    () => getPackageEditorFieldWarnings(packageValue),
    [packageValue],
  );
  const editableFields = useMemo(
    () => getEffectiveEditableFields(packageValue),
    [packageValue],
  );
  const targetStatuses = useMemo(
    () => getPackageEditorFieldTargetStatuses(packageValue),
    [packageValue],
  );
  const warnings = useMemo(
    () =>
      [
        ...structuralWarnings,
        ...Object.values(operationWarnings),
      ].filter(
        (item, index, all) =>
          all.findIndex(
            (candidate) => warningKey(candidate) === warningKey(item),
          ) === index,
      ),
    [operationWarnings, structuralWarnings],
  );
  useEffect(() => {
    onWarningsChange?.(warnings);
  }, [onWarningsChange, warnings]);
  const groupedFields = useMemo(
    () => editableFields.map((field, index) => {
      const group = fieldGroup(field);
      return {
        field,
        group,
        firstInGroup: index === 0 || fieldGroup(editableFields[index - 1]) !== group,
      };
    }),
    [editableFields],
  );

  const applyValue = (field: EditableFieldBinding, value: unknown) => {
    const update = updateTemplatePackageField(
      packageValue,
      field,
      value,
      textFieldTypes.has(field.type)
        ? { measureLines: createRenderedTextLineMeasure(getMeasurementRoot?.(), field) }
        : undefined,
    );
    const operationKey = `${field.id}:${field.nodeId}`;
    if (update.warning) {
      setOperationWarnings((current) => ({
        ...current,
        [operationKey]: update.warning as PackageEditorFieldWarning,
      }));
      if (update.applied === false) return;
    } else {
      setOperationWarnings((current) => {
        const next = { ...current };
        delete next[operationKey];
        return next;
      });
    }
    onPackageChange(update.packageValue);
    onFieldEdited?.(field);
  };

  const replaceImage = async (
    field: EditableFieldBinding,
    file: File | undefined,
  ) => {
    if (!file) return;
    const operationKey = `${field.id}:${field.nodeId}`;
    const operationRevision = (imageOperationRevisionRef.current[operationKey] ?? 0) + 1;
    imageOperationRevisionRef.current[operationKey] = operationRevision;
    setLoadingImages((current) => ({ ...current, [operationKey]: true }));
    try {
      const dataUrl = await readFileAsDataUrl(file);
      if (imageOperationRevisionRef.current[operationKey] !== operationRevision) return;
      const dimensions = await readImageDimensions(dataUrl);
      if (imageOperationRevisionRef.current[operationKey] !== operationRevision) return;
      const update = replaceTemplatePackageImage(
        packageValueRef.current,
        field,
        dataUrl,
        {
          mimeType: file.type,
          sizeBytes: file.size,
          width: dimensions.width,
          height: dimensions.height,
          placementState: "replacement-fill",
        },
      );
      if (imageOperationRevisionRef.current[operationKey] !== operationRevision) return;
      if (update.warning) {
        setOperationWarnings((current) => ({
          ...current,
          [operationKey]: update.warning as PackageEditorFieldWarning,
        }));
        if (update.applied === false) return;
      } else {
        setOperationWarnings((current) => {
          const next = { ...current };
          delete next[operationKey];
          return next;
        });
      }
      onPackageChange(update.packageValue);
      onFieldEdited?.(field);
    } catch (error) {
      setOperationWarnings((current) => ({
        ...current,
        [operationKey]: {
          code: "image-read-failed",
          fieldId: field.id,
          nodeId: field.nodeId,
          message:
            error instanceof Error ? error.message : "The image could not be read.",
        },
      }));
    } finally {
      if (imageOperationRevisionRef.current[operationKey] !== operationRevision) return;
      setLoadingImages((current) => {
        const next = { ...current };
        delete next[operationKey];
        return next;
      });
    }
  };

  const clearImageReplacement = (field: EditableFieldBinding) => {
    const operationKey = `${field.id}:${field.nodeId}`;
    imageOperationRevisionRef.current[operationKey] =
      (imageOperationRevisionRef.current[operationKey] ?? 0) + 1;
    const update = clearTemplatePackageImageOverride(packageValueRef.current, field);
    setLoadingImages((current) => {
      const next = { ...current };
      delete next[operationKey];
      return next;
    });
    if (update.warning) {
      setOperationWarnings((current) => ({
        ...current,
        [operationKey]: update.warning as PackageEditorFieldWarning,
      }));
      return;
    }
    setOperationWarnings((current) => {
      const next = { ...current };
      delete next[operationKey];
      return next;
    });
    onPackageChange(update.packageValue);
    onFieldEdited?.(field);
  };

  const setImageReplacementMode = (
    field: EditableFieldBinding,
    state: "replacement-fill" | "replacement-fit",
  ) => {
    const operationKey = `${field.id}:${field.nodeId}`;
    imageOperationRevisionRef.current[operationKey] =
      (imageOperationRevisionRef.current[operationKey] ?? 0) + 1;
    const update = setTemplatePackageImageReplacementMode(
      packageValueRef.current,
      field,
      state,
    );
    if (update.warning || update.applied === false) return;
    onPackageChange(update.packageValue);
    onFieldEdited?.(field);
  };

  return (
    <section
      className={
        variant === "card"
          ? "rounded-lg border border-line-subtle bg-surface-secondary p-5"
          : ""
      }
    >
      {variant === "card" ? <div>
        <h2 className="ui-subsection-title">Edit content</h2>
      </div> : null}

      {editableFields.length > 0 ? (
        <div className="mt-5 space-y-4">
          {groupedFields.map(({ field, group, firstInGroup }) => {
            const renderedValue = getPackageFieldValue(packageValue, field);
            const value = textFieldTypes.has(field.type)
              ? getPackageFieldOverrideValue(packageValue, field)
              : renderedValue;
            const controlId = `package-field-${field.id}-${field.nodeId}`;
            const targetStatus = targetStatuses.find(
              (status) =>
                status.field.id === field.id &&
                status.field.nodeId === field.nodeId,
            );
            const wrapControl = (control: ReactNode) => (
              <div
                key={`${field.id}:${field.nodeId}`}
                data-package-field-id={field.id}
                data-package-field-node-id={field.nodeId}
                data-package-field-source={targetStatus?.source}
                data-package-field-target-status={
                  targetStatus?.targetExists && targetStatus.propertySupported
                    ? "resolved"
                    : "warning"
                }
                className={
                  grouped && firstInGroup
                    ? "border-t border-line-subtle pt-5 first:border-t-0 first:pt-0"
                    : ""
                }
              >
                {grouped && firstInGroup ? (
                  <h3 className="ui-control-group-title mb-3">
                    {group}
                  </h3>
                ) : null}
                {control}
              </div>
            );

            if (field.type === "boolean") {
              return wrapControl(
                <div className="rounded-lg border border-line-default bg-surface-primary p-4">
                  <CheckboxField
                    id={controlId}
                    label={formatEditableFieldLabel(field)}
                    checked={Boolean(value)}
                    onChange={(checked) => applyValue(field, checked)}
                  />
                  {showTechnicalDetails ? (
                    <details className="mt-3 border-t border-line-subtle pt-2">
                      <summary className="cursor-pointer text-sm text-content-muted">Technical details</summary>
                      <p className="mt-2 font-mono text-xs text-content-muted">{field.property}</p>
                    </details>
                  ) : null}
                </div>
              );
            }

            if (field.type === "image") {
              const imageConstraints = field.constraints as
                | PackageImageFieldConstraints
                | undefined;
              const assetId = typeof renderedValue === "string" ? renderedValue : null;
              const asset = resolvePackageAssetReference(
                packageValue,
                assetId,
              )?.asset;
              const source = resolvePackageAssetSource(asset);
              const hasOverride = getPackageFieldOverrideValue(packageValue, field) !== null;
              const activePlacement = packageValue.nodes[field.nodeId]?.image?.activePlacement;
              const replacementPlacement = activePlacement?.state === "replacement-fit"
                ? "replacement-fit"
                : "replacement-fill";
              const operationKey = `${field.id}:${field.nodeId}`;
              const fieldWarning = warnings.find(
                (warning) => warning.fieldId === field.id && warning.nodeId === field.nodeId,
              );
              const accept =
                Array.isArray(imageConstraints?.allowedMimeTypes) &&
                imageConstraints.allowedMimeTypes.length > 0
                  ? imageConstraints.allowedMimeTypes.join(",")
                  : acceptedImageTypes;
              const fieldLabel = formatEditableFieldLabel(field);
              const warningId = fieldWarning ? `${controlId}-warning` : undefined;
              return wrapControl(
                <div className="ui-field field-editor-media">
                  <label className="ui-field__label" htmlFor={controlId}>
                    {fieldLabel}
                  </label>
                  <MediaInput
                    id={controlId}
                    label={null}
                    previewSrc={source}
                    emptyPreview={<ImagePlus aria-hidden="true" size={20} />}
                    accept={accept}
                    loading={Boolean(loadingImages[operationKey])}
                    inputAriaLabel={`${fieldLabel} image`}
                    inputDescribedBy={warningId}
                    onSelect={(file) => void replaceImage(field, file)}
                    secondaryAction={hasOverride ? (
                      <Button
                        variant="quiet"
                        size="small"
                        onClick={() => clearImageReplacement(field)}
                      >
                        Clear replacement
                      </Button>
                    ) : null}
                  />
                  {hasOverride ? (
                    <Select
                      label="Replacement placement"
                      value={replacementPlacement}
                      onChange={(event) => setImageReplacementMode(
                        field,
                        event.target.value as "replacement-fill" | "replacement-fit",
                      )}
                    >
                      <option value="replacement-fill">Fill</option>
                      <option value="replacement-fit">Fit</option>
                    </Select>
                  ) : null}
                  {fieldWarning ? (
                    <span id={warningId} className="ui-field__warning">
                      {fieldWarning.message}
                    </span>
                  ) : null}
                  {showTechnicalDetails ? (
                    <details className="mt-3 border-t border-line-subtle pt-2">
                      <summary className="cursor-pointer text-sm text-content-muted">Technical details</summary>
                      <p className="mt-2 truncate font-mono text-xs text-content-muted">
                        {assetId ?? "No image asset"}
                        {targetStatus?.constraints.scaleMode
                          ? ` · ${targetStatus.constraints.scaleMode}`
                          : ""}
                        {` · ${activePlacement?.state ?? "imported-source"}`}
                        {` · revision ${activePlacement?.revision ?? 0}`}
                      </p>
                    </details>
                  ) : null}
                </div>
              );
            }

            if (field.type === "color") {
              const color =
                typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value)
                  ? value
                  : "#000000";
              return wrapControl(
                <div>
                  <label
                    htmlFor={controlId}
                    className="mb-2 block text-sm font-medium text-content-primary"
                  >
                    {formatEditableFieldLabel(field)}
                  </label>
                  <div className="flex items-center gap-3 rounded-lg border border-line-subtle bg-surface-interactive p-2">
                    <input
                      id={controlId}
                      type="color"
                      value={color}
                      onChange={(event) => applyValue(field, event.target.value)}
                      className="h-10 w-12 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                    />
                    <span className="font-mono text-xs uppercase text-content-secondary">
                      {color}
                    </span>
                  </div>
                </div>
              );
            }

            const stringValue =
              typeof value === "string" || typeof value === "number"
                ? String(value)
                : "";
            const constraintIssues = validateTextFieldValue(
              field,
              stringValue,
            );
            const behavior = resolveFieldBehavior(field);
            const counter = fieldCounter(field, stringValue);
            const operationKey = `${field.id}:${field.nodeId}`;
            const fieldWarning = operationWarnings[operationKey]?.message ?? constraintIssues[0]?.message;
            const pattern = field.constraints && "pattern" in field.constraints
              ? field.constraints.pattern ?? "free"
              : "free";
            const isTextarea = field.type === "textarea" && pattern === "free";
            const inputType = pattern === "number" || field.type === "number"
              ? "number"
              : pattern === "date" || field.type === "date"
                ? "date"
                : pattern === "email"
                  ? "email"
                  : pattern === "url"
                    ? "url"
                    : "text";
            const placeholder = String(field.defaultValue ?? "");
            const showCharacterCounter = behavior.showCounter && counter.limit !== undefined;
            const counterLabel = `${counter.value}${counter.limit !== undefined ? ` / ${counter.limit}` : ""}`;
            const counterAdornment = showCharacterCounter ? (
              <span
                className={`field-editor-input__counter ${counter.soft ? "field-editor-input__counter--attention" : ""}`}
                data-multiline={isTextarea || undefined}
                role="status"
                aria-label={`${counter.value} of ${counter.limit ?? "unlimited"} characters${counter.state === "maximum" ? ", maximum reached" : counter.state === "warning" ? ", approaching maximum" : ""}`}
              >
                {counterLabel}
              </span>
            ) : undefined;
            return wrapControl(
              <div>
                  {isTextarea ? (
                    <Textarea
                      id={controlId}
                      label={formatEditableFieldLabel(field)}
                      value={stringValue}
                      rows={4}
                      onChange={(event) => applyValue(field, event.target.value)}
                      placeholder={placeholder}
                      warning={fieldWarning}
                      className={showCharacterCounter ? "field-editor-input__control" : undefined}
                      controlAdornment={counterAdornment}
                    />
                  ) : (
                    <Input
                      id={controlId}
                      label={formatEditableFieldLabel(field)}
                      type={inputType}
                      inputMode={inputType === "number" ? "decimal" : undefined}
                      step={inputType === "number" ? "any" : undefined}
                      value={stringValue}
                      onChange={(event) => applyValue(field, event.target.value)}
                      placeholder={placeholder}
                      warning={fieldWarning}
                      className={showCharacterCounter ? "field-editor-input__control" : undefined}
                      controlAdornment={counterAdornment}
                    />
                  )}
                {showTechnicalDetails ? (
                  <details className="mt-3 border-t border-line-subtle pt-2">
                    <summary className="cursor-pointer text-sm text-content-muted">Technical details</summary>
                    <p className="mt-2 font-mono text-xs text-content-muted">{field.property}</p>
                  </details>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-5 rounded-lg border border-dashed border-line-default bg-surface-secondary p-4">
          <p className="text-sm font-medium text-content-primary">No editable fields found.</p>
          <p className="mt-2 text-sm leading-6 text-content-muted">
            Add field markers in Figma to expose editable controls, for example:
          </p>
          <p className="mt-2 font-mono text-xs leading-5 text-content-secondary">
            field:text:headline
            <br />
            field:image:productImage
          </p>
        </div>
      )}

      {showWarnings ? (
      <div className="mt-6 border-t border-line-subtle pt-5">
        <h3 className="text-sm font-semibold text-content-secondary">
          Field warnings
        </h3>
        {warnings.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {warnings.map((item) => (
              <li key={warningKey(item)}>
                <Alert tone="attention" title="This field needs attention" icon={<AlertTriangle size={18} />}>
                  <p>{item.message}</p>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm">Technical details</summary>
                    <p className="mt-1 font-mono text-xs">{item.code} · {item.fieldId} · {item.nodeId}</p>
                  </details>
                </Alert>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-content-muted">No field warnings.</p>
        )}
      </div>
      ) : null}
    </section>
  );
}
