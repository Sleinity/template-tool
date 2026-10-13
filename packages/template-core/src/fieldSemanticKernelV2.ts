import { isCalendarDateValueV1, normalizeColorInputV1 } from "./fieldValuesV2";
import type { FieldValidationIssueV2 } from "./fieldValidationV2";
import type {
  CalendarDateValueV1,
  DateDisplayFormatV1,
  EditableFieldDefinitionV2,
  ImageFieldConfigurationV1,
  ImageReplacementModeV1,
  ImageReplacementPlacementV1,
  NumberDisplayFormatV1,
  StaticChoiceSet,
  TemplateFieldCanonicalValueV1,
  TemplatePackageV2,
} from "./types";
import { getTemplateFieldNameV2, TEMPLATE_FIELD_PORTABLE_ID_PATTERN } from "./types";

const LINE_SEPARATOR_PATTERN = /[\r\n\u2028\u2029]/u;
const CROP_DETERMINANT_EPSILON = 1e-12;
const NUMBER_STEP_EPSILON = 1e-10;

export interface ValidateTemplateFieldValueOptionsV2 {
  /** Validate image asset identity against this canonical package. */
  packageValue?: Pick<TemplatePackageV2, "assets">;
  /** Enforce suggested/restricted choice behavior. Defaults to true. */
  enforceChoices?: boolean;
  /** Emit configured advisory thresholds. Defaults to true. */
  includeWarnings?: boolean;
  /** Reject convenience inputs that are not already canonical serialized values. */
  canonicalInputOnly?: boolean;
  /** Optional explicit stable choice provenance supplied by a typed controller. */
  selectedChoiceId?: string;
}

export interface TemplateFieldValueValidationResultV2 {
  valid: boolean;
  canonicalValue?: TemplateFieldCanonicalValueV1;
  issues: FieldValidationIssueV2[];
}

function fieldLabel(field: EditableFieldDefinitionV2): string {
  return field.label?.trim() || getTemplateFieldNameV2(field);
}

function issue(
  field: EditableFieldDefinitionV2,
  code: string,
  message: string,
  severity: "warning" | "error" = "error",
): FieldValidationIssueV2 {
  return {
    code,
    fieldId: field.id,
    severity,
    message,
    blocksExport: severity === "error",
  };
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return Boolean(input) && typeof input === "object" && !Array.isArray(input);
}

function hasOnlyKeys(input: Record<string, unknown>, keys: readonly string[]): boolean {
  const allowed = new Set(keys);
  return Object.keys(input).every((key) => allowed.has(key));
}

function cloneValue<T>(value: T): T {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value)) as T;
}

/** Unicode extended-grapheme count used by both Text and Textarea limits. */
export function countTemplateFieldGraphemesV1(value: string): number {
  const Segmenter = typeof Intl === "undefined" ? undefined : (Intl as unknown as {
    Segmenter?: new (
      locale?: string,
      options?: { granularity: "grapheme" },
    ) => { segment(input: string): Iterable<unknown> };
  }).Segmenter;
  if (Segmenter) {
    return Array.from(
      new Segmenter("und", { granularity: "grapheme" }).segment(value),
    ).length;
  }
  // Core targets modern runtimes with Intl.Segmenter. This code-point fallback
  // keeps validation available in older runtimes without splitting surrogates.
  return Array.from(value.normalize("NFC")).length;
}

function normalizedCrop(
  field: EditableFieldDefinitionV2,
  input: unknown,
): { value?: ImageReplacementPlacementV1; issues: FieldValidationIssueV2[] } {
  if (!isRecord(input) || typeof input.mode !== "string") {
    return { issues: [issue(field, "field-v2.image-placement-invalid", "Image placement must be Fill, Fit, or a canonical Crop result.")] };
  }
  if (input.mode === "fill" || input.mode === "fit") {
    if (!hasOnlyKeys(input, ["mode"])) {
      return { issues: [issue(field, "field-v2.image-placement-invalid", "Fill and Fit placement cannot carry crop state.")] };
    }
    return { value: { mode: input.mode }, issues: [] };
  }
  if (input.mode !== "crop" || !hasOnlyKeys(input, ["mode", "crop"]) || !isRecord(input.crop)) {
    return { issues: [issue(field, "field-v2.image-placement-invalid", "Image placement must be Fill, Fit, or a canonical Crop result.")] };
  }
  const crop = input.crop;
  const transform = crop.transform;
  if (
    crop.schemaVersion !== "normalized-image-crop-v1" ||
    crop.coordinateSpace !== "normalized-slot-to-normalized-source" ||
    !hasOnlyKeys(crop, ["schemaVersion", "coordinateSpace", "transform"]) ||
    !Array.isArray(transform) ||
    transform.length !== 2 ||
    !transform.every((row) =>
      Array.isArray(row) &&
      row.length === 3 &&
      row.every((entry) => typeof entry === "number" && Number.isFinite(entry))
    )
  ) {
    return { issues: [issue(field, "field-v2.image-crop-invalid", "Crop must use a finite 2×3 normalized slot-to-source transform.")] };
  }
  const rows = transform as [[number, number, number], [number, number, number]];
  const determinant = rows[0][0] * rows[1][1] - rows[1][0] * rows[0][1];
  if (!Number.isFinite(determinant) || Math.abs(determinant) <= CROP_DETERMINANT_EPSILON) {
    return { issues: [issue(field, "field-v2.image-crop-noninvertible", "Crop transform must be invertible.")] };
  }
  return {
    value: {
      mode: "crop",
      crop: {
        schemaVersion: "normalized-image-crop-v1",
        coordinateSpace: "normalized-slot-to-normalized-source",
        transform: cloneValue(rows),
      },
    },
    issues: [],
  };
}

export function resolveDefaultImageReplacementPlacementV1(
  configuration: ImageFieldConfigurationV1,
): Exclude<ImageReplacementModeV1, "crop"> {
  return configuration.replacementPlacement === "fit" ? "fit" : "fill";
}

function normalizeBaseValue(
  field: EditableFieldDefinitionV2,
  input: unknown,
  options: ValidateTemplateFieldValueOptionsV2,
): TemplateFieldValueValidationResultV2 {
  const issues: FieldValidationIssueV2[] = [];
  let canonicalValue: TemplateFieldCanonicalValueV1 | undefined;

  if (field.type === "text" || field.type === "textarea") {
    if (typeof input !== "string") {
      return { valid: false, issues: [issue(field, "field-v2.value-type", `${fieldLabel(field)} must be a string.`)] };
    }
    if (field.type === "text" && LINE_SEPARATOR_PATTERN.test(input)) {
      issues.push(issue(field, "field-v2.text-line-break", "Text fields do not accept line separators."));
    }
    const characterCount = countTemplateFieldGraphemesV1(input);
    if (field.configuration.maxCharacters !== undefined &&
        characterCount > field.configuration.maxCharacters) {
      issues.push(issue(
        field,
        "field-v2.max-characters",
        `${fieldLabel(field)} exceeds its maximum of ${field.configuration.maxCharacters} characters.`,
      ));
    }
    if (options.includeWarnings !== false &&
        field.configuration.warningAtCharacters !== undefined &&
        characterCount >= field.configuration.warningAtCharacters) {
      issues.push(issue(
        field,
        "field-v2.warning-characters",
        `${fieldLabel(field)} has reached its ${field.configuration.warningAtCharacters}-character warning threshold.`,
        "warning",
      ));
    }
    canonicalValue = input;
  } else if (field.type === "number") {
    if (typeof input !== "number" || !Number.isFinite(input)) {
      return { valid: false, issues: [issue(field, "field-v2.number-invalid", `${fieldLabel(field)} must be a finite number.`)] };
    }
    canonicalValue = Object.is(input, -0) ? 0 : input;
    if (field.configuration.min !== undefined && canonicalValue < field.configuration.min) {
      issues.push(issue(field, "field-v2.number-min", `${fieldLabel(field)} must be at least ${field.configuration.min}.`));
    }
    if (field.configuration.max !== undefined && canonicalValue > field.configuration.max) {
      issues.push(issue(field, "field-v2.number-max", `${fieldLabel(field)} must be at most ${field.configuration.max}.`));
    }
    if (field.configuration.step !== undefined &&
        !isTemplateNumberStepAlignedV1(canonicalValue, field.configuration.step, field.configuration.min ?? 0)) {
      issues.push(issue(
        field,
        "field-v2.number-step",
        `${fieldLabel(field)} must align to step ${field.configuration.step} from ${field.configuration.min ?? 0}.`,
      ));
    }
  } else if (field.type === "date") {
    if (!isCalendarDateValueV1(input)) {
      return { valid: false, issues: [issue(field, "field-v2.date-invalid", `${fieldLabel(field)} must be a real calendar date in YYYY-MM-DD form.`)] };
    }
    canonicalValue = input;
  } else if (field.type === "color") {
    const normalized = normalizeColorInputV1(input);
    if (!normalized || (options.canonicalInputOnly && input !== normalized)) {
      return { valid: false, issues: [issue(field, "field-v2.color-invalid", `${fieldLabel(field)} must use canonical opaque #rrggbb Color.`)] };
    }
    canonicalValue = normalized;
  } else if (field.type === "boolean") {
    if (typeof input !== "boolean") {
      return { valid: false, issues: [issue(field, "field-v2.boolean-invalid", `${fieldLabel(field)} must be true or false.`)] };
    }
    canonicalValue = input;
  } else {
    if (!isRecord(input) || !hasOnlyKeys(input, ["assetId", "placement"]) ||
        typeof input.assetId !== "string" || input.assetId.length === 0) {
      return { valid: false, issues: [issue(field, "field-v2.image-invalid", `${fieldLabel(field)} must identify a replacement asset and placement.`)] };
    }
    const placement = normalizedCrop(field, input.placement);
    issues.push(...placement.issues);
    if (placement.value) {
      const policy = field.configuration.replacementPlacement;
      const authorized = placement.value.mode === policy ||
        (policy === "crop" && placement.value.mode === "fill");
      if (!authorized) {
        issues.push(issue(
          field,
          "field-v2.image-placement-unauthorized",
          `${placement.value.mode} is incompatible with the ${policy} replacement policy for ${fieldLabel(field)}.`,
        ));
      }
      canonicalValue = { assetId: input.assetId, placement: placement.value };
    }
    if (options.packageValue && options.packageValue.assets[input.assetId]?.type !== "image") {
      issues.push(issue(field, "field-v2.image-asset-missing", `Image asset "${input.assetId}" is not a canonical image asset in this package.`));
    }
  }

  return {
    valid: !issues.some((item) => item.severity === "error"),
    ...(canonicalValue !== undefined ? { canonicalValue } : {}),
    issues,
  };
}

function choicesForField(
  field: EditableFieldDefinitionV2,
): StaticChoiceSet<unknown> | undefined {
  return field.type === "image" || field.type === "boolean"
    ? undefined
    : field.configuration.choices as StaticChoiceSet<unknown> | undefined;
}

export function canonicalTemplateFieldValueKeyV1(value: TemplateFieldCanonicalValueV1): string {
  if (typeof value === "number") return `number:${String(value === 0 ? 0 : value)}`;
  if (typeof value === "string") return `string:${value}`;
  if (typeof value === "boolean") return `boolean:${String(value)}`;
  return `image:${JSON.stringify(value)}`;
}

export function validateTemplateFieldValueV2(
  field: EditableFieldDefinitionV2,
  input: unknown,
  options: ValidateTemplateFieldValueOptionsV2 = {},
): TemplateFieldValueValidationResultV2 {
  const result = normalizeBaseValue(field, input, options);
  if (result.canonicalValue === undefined || options.enforceChoices === false) return result;
  const choices = choicesForField(field);
  if (!choices) {
    if (options.selectedChoiceId === undefined) return result;
    const issues = [
      ...result.issues,
      issue(field, "field-v2.choice-id-unknown", `${fieldLabel(field)} does not define static choices.`),
    ];
    return { valid: false, canonicalValue: result.canonicalValue, issues };
  }

  const normalizedOptions = choices.options.flatMap((option) => {
    const normalized = normalizeBaseValue(field, option.value, {
      ...options,
      enforceChoices: false,
      includeWarnings: false,
      canonicalInputOnly: true,
      selectedChoiceId: undefined,
    });
    return normalized.valid && normalized.canonicalValue !== undefined
      ? [{ option, value: normalized.canonicalValue }]
      : [];
  });
  const selected = options.selectedChoiceId === undefined
    ? undefined
    : normalizedOptions.find((entry) => entry.option.id === options.selectedChoiceId);
  const matching = normalizedOptions.find((entry) =>
    canonicalTemplateFieldValueKeyV1(entry.value) ===
      canonicalTemplateFieldValueKeyV1(result.canonicalValue!)
  );
  const issues = [...result.issues];
  if (options.selectedChoiceId !== undefined && !selected) {
    issues.push(issue(field, "field-v2.choice-id-unknown", `Choice "${options.selectedChoiceId}" is not configured for ${fieldLabel(field)}.`));
  } else if (selected &&
      canonicalTemplateFieldValueKeyV1(selected.value) !==
        canonicalTemplateFieldValueKeyV1(result.canonicalValue)) {
    issues.push(issue(field, "field-v2.choice-value-mismatch", "Selected choice identity does not match the submitted canonical value."));
  }
  if (choices.mode === "restricted" && !matching) {
    issues.push(issue(field, "field-v2.restricted-choice", `${fieldLabel(field)} only accepts configured choice values.`));
  }
  return {
    valid: !issues.some((item) => item.severity === "error"),
    canonicalValue: result.canonicalValue,
    issues,
  };
}

/** Deterministic numeric step rule anchored at min when present, otherwise 0. */
export function isTemplateNumberStepAlignedV1(
  value: number,
  step: number,
  base = 0,
): boolean {
  if (![value, step, base].every(Number.isFinite) || step <= 0) return false;
  const quotient = (value - base) / step;
  if (!Number.isFinite(quotient)) return false;
  const nearest = Math.round(quotient);
  const tolerance = Math.min(
    NUMBER_STEP_EPSILON,
    Number.EPSILON * 8 * Math.max(1, Math.abs(quotient)),
  );
  return Math.abs(quotient - nearest) <= Math.max(Number.EPSILON * 8, tolerance);
}

export function formatTemplateNumberV1(
  value: number,
  format?: NumberDisplayFormatV1,
): string {
  const normalized = Object.is(value, -0) ? 0 : value;
  if (!Number.isFinite(normalized)) return String(normalized);
  const decimalPlaces = format?.decimalPlaces;
  const raw = decimalPlaces !== undefined && decimalPlaces <= 100
    ? normalized.toFixed(decimalPlaces)
    : String(normalized);
  const exponentIndex = raw.search(/[eE]/u);
  const exponent = exponentIndex >= 0 ? raw.slice(exponentIndex) : "";
  const significand = exponentIndex >= 0 ? raw.slice(0, exponentIndex) : raw;
  const [rawInteger, fraction] = significand.split(".");
  const sign = rawInteger.startsWith("-") ? "-" : "";
  const digits = sign ? rawInteger.slice(1) : rawInteger;
  const grouped = format?.thousandSeparator
    ? digits.replace(/\B(?=(\d{3})+(?!\d))/gu, format.thousandSeparator)
    : digits;
  const decimalSeparator = format?.decimalSeparator ?? ".";
  const body = `${sign}${grouped}${fraction === undefined ? "" : `${decimalSeparator}${fraction}`}${exponent}`;
  return `${format?.prefix ?? ""}${body}${format?.suffix ?? ""}`;
}

export function formatTemplateCalendarDateV1(
  value: CalendarDateValueV1,
  format?: DateDisplayFormatV1,
): string {
  if (!isCalendarDateValueV1(value) || !format) return value;
  const [year, month, day] = value.split("-");
  const separator = format.separator ?? "/";
  const body = format.preset === "iso"
    ? value
    : format.preset === "numeric-year-first"
      ? `${year}${separator}${month}${separator}${day}`
      : format.preset === "numeric-day-first"
        ? `${day}${separator}${month}${separator}${year}`
        : format.preset === "numeric-month-first"
          ? `${month}${separator}${day}${separator}${year}`
          : format.preset === "numeric-day-month"
            ? `${day}${separator}${month}`
            : `${month}${separator}${day}`;
  return `${format.prefix ?? ""}${body}${format.suffix ?? ""}`;
}

export function validateEditableFieldDefinitionSemanticsV2(
  field: EditableFieldDefinitionV2,
): FieldValidationIssueV2[] {
  const issues: FieldValidationIssueV2[] = [];
  if (field.type === "text" || field.type === "textarea") {
    const { maxCharacters, warningAtCharacters } = field.configuration;
    if (maxCharacters !== undefined && warningAtCharacters !== undefined &&
        warningAtCharacters > maxCharacters) {
      issues.push(issue(field, "field-v2.character-warning-after-maximum", "Character warning threshold cannot exceed the maximum."));
    }
    if (field.type === "textarea") {
      const { maxLines, warningAtLines } = field.configuration;
      if (maxLines !== undefined && warningAtLines !== undefined && warningAtLines > maxLines) {
        issues.push(issue(field, "field-v2.line-warning-after-maximum", "Line warning threshold cannot exceed the maximum."));
      }
    }
  } else if (field.type === "number") {
    const { min, max, decimalPlaces } = {
      ...field.configuration,
      decimalPlaces: field.configuration.format?.decimalPlaces,
    };
    if (min !== undefined && max !== undefined && min > max) {
      issues.push(issue(field, "field-v2.number-range-invalid", "Number min cannot exceed max."));
    }
    if (decimalPlaces !== undefined && decimalPlaces > 100) {
      issues.push(issue(field, "field-v2.number-format-precision-unsupported", "Deterministic number formatting supports at most 100 decimal places."));
    }
  }

  const choices = choicesForField(field);
  if (choices) {
    const ids = new Set<string>();
    const values = new Set<string>();
    choices.options.forEach((option) => {
      if (!TEMPLATE_FIELD_PORTABLE_ID_PATTERN.test(option.id)) {
        issues.push(issue(field, "field-v2.choice-id-invalid", `Choice option ID "${option.id}" is not portable.`));
      }
      if (ids.has(option.id)) {
        issues.push(issue(field, "field-v2.choice-id-duplicate", `Choice option ID "${option.id}" is duplicated within field "${field.id}".`));
      }
      ids.add(option.id);
      const validated = normalizeBaseValue(field, option.value, {
        enforceChoices: false,
        includeWarnings: false,
        canonicalInputOnly: true,
      });
      if (!validated.valid || validated.canonicalValue === undefined) {
        const code = field.type === "text" && typeof option.value === "string" && LINE_SEPARATOR_PATTERN.test(option.value)
          ? "field-v2.text-choice-multiline"
          : field.type === "date"
            ? "field-v2.date-choice-invalid"
            : "field-v2.choice-value-invalid";
        issues.push(issue(field, code, `Choice option "${option.id}" is not a valid canonical ${field.type} value.`));
        return;
      }
      const key = canonicalTemplateFieldValueKeyV1(validated.canonicalValue);
      if (values.has(key)) {
        issues.push(issue(field, "field-v2.choice-value-duplicate", `Choice option values must be unique after ${field.type} normalization.`));
      }
      values.add(key);
    });
  }

  if (field.type !== "image") {
    const defaultValidation = validateTemplateFieldValueV2(field, field.defaultValue, {
      enforceChoices: true,
      includeWarnings: false,
      canonicalInputOnly: true,
    });
    issues.push(...defaultValidation.issues.filter((item) => item.severity === "error"));
  }
  return issues;
}
