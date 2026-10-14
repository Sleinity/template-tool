import { useEffect, useState } from "react";
import type {
  EditableFieldBinding,
  PackageImageFieldConstraints,
  PackageTextFieldConstraints,
} from "@sleinity/template-core";
import { CheckboxField, Input, Select } from "../../ui";

const imageFormats = [
  { label: "JPEG", mimeType: "image/jpeg" },
  { label: "PNG", mimeType: "image/png" },
  { label: "WebP", mimeType: "image/webp" },
  { label: "SVG", mimeType: "image/svg+xml" },
] as const;

function ConstraintNumberInput({
  label,
  value,
  integer = false,
  onCommit,
}: {
  label: string;
  value: number | undefined;
  integer?: boolean;
  onCommit(value: number | undefined): void;
}) {
  const [draft, setDraft] = useState(value === undefined ? "" : String(value));

  useEffect(() => {
    setDraft(value === undefined ? "" : String(value));
  }, [value]);

  const parsed = draft === "" ? undefined : Number(draft);
  const invalid = draft !== "" && (
    !Number.isFinite(parsed) ||
    Number(parsed) <= 0 ||
    (integer && !Number.isSafeInteger(parsed))
  );

  return (
    <Input
      label={label}
      type="number"
      min={integer ? 1 : 0.1}
      step={integer ? 1 : 0.1}
      value={draft}
      placeholder="No limit"
      error={invalid ? `${label} must be ${integer ? "a whole number" : "a number"} greater than zero.` : undefined}
      onChange={(event) => {
        const next = event.target.value;
        setDraft(next);
        if (next === "") onCommit(undefined);
        else {
          const number = Number(next);
          if (Number.isFinite(number) && number > 0 && (!integer || Number.isSafeInteger(number))) {
            onCommit(number);
          }
        }
      }}
    />
  );
}

export function FieldRuleConstraintControls({
  fieldType,
  constraints,
  onChange,
}: {
  fieldType: EditableFieldBinding["type"];
  constraints: PackageTextFieldConstraints | PackageImageFieldConstraints | undefined;
  onChange(key: string, value: unknown): void;
}) {
  if (fieldType === "text" || fieldType === "textarea") {
    const value = constraints as PackageTextFieldConstraints | undefined;
    return (
      <div className="field-rules-two-column field-rules-two-column--narrow">
        <ConstraintNumberInput
          label="Maximum characters"
          integer
          value={value?.maxCharacters}
          onCommit={(next) => onChange("maxCharacters", next)}
        />
        {fieldType === "textarea" ? (
          <ConstraintNumberInput
            label="Maximum lines"
            integer
            value={value?.maxLines}
            onCommit={(next) => onChange("maxLines", next)}
          />
        ) : null}
      </div>
    );
  }

  if (fieldType === "image") {
    const value = constraints as PackageImageFieldConstraints | undefined;
    return (
      <div className="space-y-4">
        <div className="field-rules-two-column">
          <ConstraintNumberInput label="Maximum file size (MB)" value={value?.maxFileSizeMb} onCommit={(next) => onChange("maxFileSizeMb", next)} />
          <ConstraintNumberInput label="Minimum width" integer value={value?.minWidth} onCommit={(next) => onChange("minWidth", next)} />
          <ConstraintNumberInput label="Minimum height" integer value={value?.minHeight} onCommit={(next) => onChange("minHeight", next)} />
          <Select
            label="Default placement"
            value={value?.replacementMode === "contain" || value?.replacementMode === "user-crop" ? value.replacementMode : "cover"}
            onChange={(event) => onChange("replacementMode", event.target.value)}
          >
            <option value="cover">Fill frame</option>
            <option value="contain">Fit inside frame</option>
            <option value="user-crop">Host-provided crop</option>
          </Select>
          <Select
            label="Aspect ratio"
            value={typeof value?.aspectRatio === "number" ? "custom" : value?.aspectRatio ?? "preserve-frame"}
            onChange={(event) => onChange("aspectRatio", event.target.value === "custom" ? 1 : event.target.value)}
          >
            <option value="preserve-frame">Match template frame</option>
            <option value="free">Any ratio</option>
            <option value="custom">Custom ratio</option>
          </Select>
          {typeof value?.aspectRatio === "number" ? (
            <ConstraintNumberInput
              label="Custom aspect ratio"
              value={value.aspectRatio}
              onCommit={(next) => onChange("aspectRatio", next ?? "preserve-frame")}
            />
          ) : null}
        </div>
        <fieldset className="field-format-options">
          <legend className="ui-field__label">Allowed formats</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {imageFormats.map((format) => (
              <CheckboxField
                key={format.mimeType}
                label={format.label}
                checked={(value?.allowedMimeTypes ?? []).includes(format.mimeType)}
                onChange={(checked) => {
                  const current = value?.allowedMimeTypes ?? [];
                  const next = checked
                    ? [...new Set([...current, format.mimeType])]
                    : current.filter((candidate) => candidate !== format.mimeType);
                  onChange("allowedMimeTypes", next.length ? next : undefined);
                }}
              />
            ))}
          </div>
        </fieldset>
      </div>
    );
  }

  return <p className="text-sm text-content-muted">This field type has no configurable input rules.</p>;
}
