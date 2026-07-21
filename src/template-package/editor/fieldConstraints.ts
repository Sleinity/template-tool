import type {
  EditableFieldBinding,
  PackageFieldBehavior,
  PackageFieldPattern,
  PackageImageFieldConstraints,
  PackageTextFieldConstraints,
  TemplatePackageV1,
} from "../types";

export type FieldConstraintSeverity = "info" | "warning" | "error";

export interface FieldConstraintIssue {
  code: string;
  fieldId: string;
  nodeId: string;
  severity: FieldConstraintSeverity;
  message: string;
  blocksExport: boolean;
}

export interface FieldConstraintValidation {
  valid: boolean;
  exportReady: boolean;
  issues: FieldConstraintIssue[];
}

export interface TextInputConstraintResult {
  value: string;
  prevented: boolean;
  trimmed: boolean;
  issues: FieldConstraintIssue[];
}

export interface TextInputConstraintOptions {
  measureLines?: (value: string) => number | null;
}

export type FieldLimitState = "normal" | "warning" | "maximum";

export interface ImageReplacementMetadata {
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
}

export interface TextFitMeasurement {
  clientWidth: number;
  clientHeight: number;
  scrollWidth: number;
  scrollHeight: number;
  lineHeightPx: number;
  measuredLines?: number;
  visualOverflowPx?: { x: number; y: number };
}

export interface FieldTextFitResult {
  fieldId: string;
  nodeId: string;
  fits: boolean;
  measuredLines: number;
  maxLines?: number;
  overflowPx: { x: number; y: number };
  clipped: boolean;
  reliable: boolean;
}

export interface FieldConstraintReadiness {
  constrainedFieldCount: number;
  unconstrainedFieldCount: number;
  visualFitAvailable: boolean;
  warnings: FieldConstraintIssue[];
}

const textFieldTypes = new Set(["text", "textarea", "number", "date"]);

function currentFieldValue(
  packageValue: TemplatePackageV1,
  field: EditableFieldBinding,
): unknown {
  const node = packageValue.nodes[field.nodeId];
  if (!node) return field.defaultValue;
  if (field.property === "text.characters" && node.type === "TEXT") {
    return "characters" in node.text ? node.text.characters : node.text.content;
  }
  if (field.property === "image.assetId") {
    return node.image?.assetId ?? null;
  }
  return field.defaultValue;
}

function label(field: EditableFieldBinding): string {
  return field.label?.trim() || field.id;
}

function lines(value: string): string[] {
  return value.split(/\r?\n/);
}

export function splitGraphemes(value: string): string[] {
  const Segmenter = typeof Intl === "undefined"
    ? undefined
    : (Intl as unknown as {
        Segmenter?: new (
          locale?: string,
          options?: { granularity: "grapheme" },
        ) => { segment(input: string): Iterable<{ segment: string }> };
      }).Segmenter;
  if (Segmenter) {
    return Array.from(
      new Segmenter(undefined, { granularity: "grapheme" }).segment(value),
      (item) => item.segment,
    );
  }
  return Array.from(value.normalize("NFC"));
}

export function countGraphemes(value: string): number {
  return splitGraphemes(value).length;
}

export function truncateGraphemes(value: string, maximum: number): string {
  return splitGraphemes(value).slice(0, Math.max(0, maximum)).join("");
}

function textConstraints(
  field: EditableFieldBinding,
): PackageTextFieldConstraints {
  return (field.constraints ?? {}) as PackageTextFieldConstraints;
}

export function withTextFieldConstraint<K extends keyof PackageTextFieldConstraints>(
  field: EditableFieldBinding,
  key: K,
  value: PackageTextFieldConstraints[K] | undefined,
): EditableFieldBinding {
  const next = structuredClone(field);
  const constraints = {
    ...(next.constraints as PackageTextFieldConstraints | undefined),
  };
  if (value === undefined) delete constraints[key];
  else constraints[key] = value;
  next.constraints = constraints;
  return next;
}

function imageConstraints(
  field: EditableFieldBinding,
): PackageImageFieldConstraints {
  return (field.constraints ?? {}) as PackageImageFieldConstraints;
}

export function resolveFieldBehavior(
  field: EditableFieldBinding,
): Required<
  Pick<
    PackageFieldBehavior,
    "onOverflow" | "showCounter" | "counterType" | "softLimitWarning" | "preserveBox"
  >
> {
  return {
    onOverflow: "prevent-input",
    showCounter: textConstraints(field).maxCharacters !== undefined,
    counterType: "characters",
    softLimitWarning: field.behavior?.softLimitWarning ?? 0.8,
    preserveBox: field.behavior?.preserveBox ?? false,
  };
}

export function resolveAllowLineBreaks(
  field: EditableFieldBinding,
): boolean {
  const constraints = textConstraints(field);
  if (constraints.allowLineBreaks !== undefined) {
    return constraints.allowLineBreaks;
  }
  if (constraints.maxLines === 1) return false;
  return field.type === "textarea";
}

function issue(
  field: EditableFieldBinding,
  code: string,
  message: string,
  severity: FieldConstraintSeverity,
  blocksExport: boolean,
): FieldConstraintIssue {
  return {
    code,
    fieldId: field.id,
    nodeId: field.nodeId,
    severity,
    message,
    blocksExport,
  };
}

function safeCustomPattern(value: string): RegExp | null {
  if (
    value.length === 0 ||
    value.length > 256 ||
    /\\[1-9]|\\k<|\(\?<|(?:\+|\*|\{\d+,?\d*\})\s*(?:\+|\*|\{)|\([^)]*(?:\+|\*|\{\d+,?\d*\})[^)]*\)(?:\+|\*|\{\d+,?\d*\})/.test(
      value,
    )
  ) {
    return null;
  }
  try {
    return new RegExp(value, "u");
  } catch {
    return null;
  }
}

export function matchesFieldPattern(
  value: string,
  pattern: PackageFieldPattern = "free",
  customPattern?: string,
): boolean {
  if (!value.trim() || pattern === "free") return true;
  switch (pattern) {
    case "number":
      return /^-?\d+(?:\.\d+)?$/u.test(value.trim());
    case "currency":
      return /^(?:[€$£]\s*)?-?\d+(?:[.\s]\d{3})*(?:[.,]\d{1,2}|,-)?(?:\s*[€$£])?$/u.test(
        value.trim(),
      );
    case "percentage":
      return /^-?\s*\d+(?:[.,]\d+)?\s*%(?:\s*OFF)?$/iu.test(
        value.trim(),
      );
    case "date":
      return /^(?:\d{4}-\d{2}-\d{2}|(?:Ends\s+)?(?:\d{1,2}[\/.-]\d{1,2}(?:[\/.-]\d{2,4})?|\d{1,2}\s+[A-Za-z]{3,9}|[A-Za-z]{3,9}\s+\d{1,2}))$/iu.test(
        value.trim(),
      );
    case "email":
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value.trim());
    case "url":
      try {
        const parsed = new URL(value.trim());
        return parsed.protocol === "http:" || parsed.protocol === "https:";
      } catch {
        return false;
      }
    case "custom":
      return customPattern
        ? safeCustomPattern(customPattern)?.test(value) === true
        : false;
    default:
      return true;
  }
}

export function validateTextFieldValue(
  field: EditableFieldBinding,
  value: string,
): FieldConstraintIssue[] {
  const constraints = textConstraints(field);
  const fieldLabel = label(field);
  const result: FieldConstraintIssue[] = [];
  const overflowSeverity = "error";
  const blocksOverflow = true;
  const characterCount = countGraphemes(value);
  const lineCount = lines(value).length;

  if (
    constraints.minCharacters !== undefined &&
    characterCount < constraints.minCharacters &&
    value.length > 0
  ) {
    result.push(
      issue(
        field,
        "field-min-characters",
        `${fieldLabel} needs at least ${constraints.minCharacters} characters.`,
        "warning",
        false,
      ),
    );
  }
  if (
    constraints.maxCharacters !== undefined &&
    characterCount > constraints.maxCharacters
  ) {
    result.push(
      issue(
        field,
        "field-max-characters",
        `${fieldLabel} is too long. Max ${constraints.maxCharacters} characters.`,
        overflowSeverity,
        blocksOverflow,
      ),
    );
  }
  if (
    constraints.maxLines !== undefined &&
    lineCount > constraints.maxLines
  ) {
    result.push(
      issue(
        field,
        "field-max-lines",
        `Maximum ${constraints.maxLines} ${
          constraints.maxLines === 1 ? "line" : "lines"
        } allowed.`,
        overflowSeverity,
        blocksOverflow,
      ),
    );
  }
  if (!resolveAllowLineBreaks(field) && /[\r\n]/.test(value)) {
    result.push(
      issue(
        field,
        "field-line-breaks-disallowed",
        "Line breaks are not allowed in this field.",
        overflowSeverity,
        blocksOverflow,
      ),
    );
  }
  const pattern = constraints.pattern ?? "free";
  if (
    pattern !== "free" &&
    value.trim() &&
    !matchesFieldPattern(value, pattern, constraints.customPattern)
  ) {
    result.push(
      issue(
        field,
        "field-pattern-invalid",
        `${fieldLabel} must use a valid ${pattern === "custom" ? "custom" : pattern} format.`,
        overflowSeverity,
        blocksOverflow,
      ),
    );
  }
  return result;
}

export function constrainTextInput(
  field: EditableFieldBinding,
  currentValue: string,
  candidateValue: string,
  options: TextInputConstraintOptions = {},
): TextInputConstraintResult {
  const constraints = textConstraints(field);
  let value = candidateValue;
  let trimmed = false;
  if (!resolveAllowLineBreaks(field) && /[\r\n]/.test(value)) {
    return {
      value: currentValue,
      prevented: true,
      trimmed: false,
      issues: [
        issue(
          field,
          "field-max-lines",
          "Text does not fit within this field.",
          "error",
          true,
        ),
      ],
    };
  }
  if (
    constraints.maxCharacters !== undefined &&
    countGraphemes(value) > constraints.maxCharacters
  ) {
    return {
      value: currentValue,
      prevented: true,
      trimmed: false,
      issues: [
        issue(
          field,
          "field-max-characters",
          `Maximum of ${constraints.maxCharacters} characters reached.`,
          "error",
          true,
        ),
      ],
    };
  }
  if (constraints.maxLines !== undefined) {
    const measure = options.measureLines ?? ((candidate: string) => lines(candidate).length);
    const measured = measure(value);
    if (measured !== null && measured > constraints.maxLines) {
      return {
        value: currentValue,
        prevented: true,
        trimmed: false,
        issues: [
          issue(
            field,
            "field-max-lines",
            "Text does not fit within this field.",
            "error",
            true,
          ),
        ],
      };
    }
  }
  const pattern = constraints.pattern ?? "free";
  if (
    pattern !== "free" &&
    value.trim() &&
    !matchesFieldPattern(value, pattern, constraints.customPattern)
  ) {
    return {
      value: currentValue,
      prevented: true,
      trimmed: false,
      issues: [
        issue(
          field,
          "field-pattern-invalid",
          `${label(field)} must use a valid ${pattern} format.`,
          "error",
          true,
        ),
      ],
    };
  }
  return {
    value,
    prevented: false,
    trimmed,
    issues: validateTextFieldValue(field, value),
  };
}

export function fieldCounter(
  field: EditableFieldBinding,
  value: string,
): { value: number; limit?: number; type: "characters"; soft: boolean; state: FieldLimitState } {
  const constraints = textConstraints(field);
  const count = countGraphemes(value);
  const limit = constraints.maxCharacters;
  const warningAt = limit === undefined ? undefined : Math.ceil(limit * 0.8);
  const state: FieldLimitState = limit !== undefined && count >= limit
    ? "maximum"
    : warningAt !== undefined && count >= warningAt
      ? "warning"
      : "normal";
  return {
    value: count,
    limit,
    type: "characters",
    soft: state !== "normal",
    state,
  };
}

export function validateImageReplacement(
  field: EditableFieldBinding,
  metadata: ImageReplacementMetadata,
): FieldConstraintIssue[] {
  const constraints = imageConstraints(field);
  const result: FieldConstraintIssue[] = [];
  if (
    constraints.allowedMimeTypes?.length &&
    !constraints.allowedMimeTypes.includes(metadata.mimeType)
  ) {
    result.push(
      issue(
        field,
        "image-type-not-allowed",
        `${label(field)} does not accept ${metadata.mimeType || "this file type"}.`,
        "error",
        true,
      ),
    );
  }
  if (
    constraints.maxFileSizeMb !== undefined &&
    metadata.sizeBytes > constraints.maxFileSizeMb * 1024 * 1024
  ) {
    result.push(
      issue(
        field,
        "image-file-too-large",
        `${label(field)} must be smaller than ${constraints.maxFileSizeMb} MB.`,
        "error",
        true,
      ),
    );
  }
  if (
    constraints.minWidth !== undefined &&
    metadata.width !== undefined &&
    metadata.width < constraints.minWidth
  ) {
    result.push(
      issue(
        field,
        "image-width-too-small",
        `${label(field)} is ${metadata.width}px wide; ${constraints.minWidth}px is recommended.`,
        "warning",
        false,
      ),
    );
  }
  if (
    constraints.minHeight !== undefined &&
    metadata.height !== undefined &&
    metadata.height < constraints.minHeight
  ) {
    result.push(
      issue(
        field,
        "image-height-too-small",
        `${label(field)} is ${metadata.height}px tall; ${constraints.minHeight}px is recommended.`,
        "warning",
        false,
      ),
    );
  }
  if (
    typeof constraints.aspectRatio === "number" &&
    metadata.width &&
    metadata.height
  ) {
    const actualRatio = metadata.width / metadata.height;
    if (
      Math.abs(actualRatio - constraints.aspectRatio) /
        constraints.aspectRatio >
      0.02
    ) {
      result.push(
        issue(
          field,
          "image-aspect-ratio-mismatch",
          `${label(field)} does not match the requested ${constraints.aspectRatio.toFixed(2)} aspect ratio.`,
          "warning",
          false,
        ),
      );
    }
  }
  if (constraints.replacementMode === "user-crop") {
    result.push(
      issue(
        field,
        "image-user-crop-unavailable",
        "Interactive cropping is not available yet; the original frame crop is preserved.",
        "warning",
        false,
      ),
    );
  }
  return result;
}

export function validatePackageFieldConstraints(
  packageValue: TemplatePackageV1,
): FieldConstraintValidation {
  const issues = packageValue.editableFields.flatMap((field) => {
    const value = currentFieldValue(packageValue, field);
    if (textFieldTypes.has(field.type)) {
      const override = value === field.defaultValue ? "" : value;
      return validateTextFieldValue(field, override == null ? "" : String(override));
    }
    return [];
  });
  return {
    valid: !issues.some((item) => item.severity === "error"),
    exportReady: !issues.some((item) => item.blocksExport),
    issues,
  };
}

export function analyzeFieldConstraintReadiness(
  packageValue: TemplatePackageV1,
): FieldConstraintReadiness {
  const editable = packageValue.editableFields.filter((field) =>
    ["text", "textarea", "image", "number", "date"].includes(field.type),
  );
  const warnings = editable.flatMap((field) => {
    const constraints = field.constraints;
    if (!constraints) {
      return [
        issue(
          field,
          "field-rules-missing",
          `${label(field)} has no editing boundaries.`,
          "warning",
          false,
        ),
      ];
    }
    if (field.type === "image") {
      const image = imageConstraints(field);
      if (
        !image.allowedMimeTypes?.length &&
        image.maxFileSizeMb === undefined &&
        image.minWidth === undefined &&
        image.minHeight === undefined &&
        image.replacementMode === undefined
      ) {
        return [
          issue(
            field,
            "image-rules-missing",
            `${label(field)} has no replacement rules.`,
            "warning",
            false,
          ),
        ];
      }
      return [];
    }
    const text = textConstraints(field);
    const fieldWarnings: FieldConstraintIssue[] = [];
    if (
      text.maxCharacters === undefined && text.maxLines === undefined
    ) {
      fieldWarnings.push(
        issue(
          field,
          "text-upper-bound-missing",
          `${label(field)} has no character or line limit.`,
          "warning",
          false,
        ),
      );
    }
    if (
      field.type === "textarea" &&
      text.maxLines === undefined
    ) {
      fieldWarnings.push(
        issue(
          field,
          "textarea-lines-unlimited",
          `${label(field)} allows unlimited lines.`,
          "warning",
          false,
        ),
      );
    }
    return fieldWarnings;
  });
  return {
    constrainedFieldCount: editable.filter((field) => field.constraints)
      .length,
    unconstrainedFieldCount: editable.filter((field) => !field.constraints)
      .length,
    visualFitAvailable: typeof document !== "undefined",
    warnings,
  };
}

export function createTextFitResult(
  field: EditableFieldBinding,
  measurement: TextFitMeasurement,
  fontReliable: boolean,
): FieldTextFitResult {
  const maxLines = textConstraints(field).maxLines;
  const measuredLines =
    measurement.measuredLines ??
    (measurement.lineHeightPx > 0
      ? Math.max(
          1,
          Math.ceil(measurement.scrollHeight / measurement.lineHeightPx),
        )
      : 1);
  const overflowPx =
    measurement.visualOverflowPx ??
    {
      x: Math.max(0, measurement.scrollWidth - measurement.clientWidth),
      y: Math.max(0, measurement.scrollHeight - measurement.clientHeight),
    };
  return {
    fieldId: field.id,
    nodeId: field.nodeId,
    fits:
      overflowPx.x === 0 &&
      overflowPx.y === 0 &&
      (maxLines === undefined || measuredLines <= maxLines),
    measuredLines,
    maxLines,
    overflowPx,
    clipped: overflowPx.x > 0 || overflowPx.y > 0,
    reliable: fontReliable,
  };
}

export function measureTextFieldFit(
  field: EditableFieldBinding,
  root: ParentNode,
  fontReliable: boolean,
): FieldTextFitResult | null {
  if (!textFieldTypes.has(field.type)) return null;
  const element = root.querySelector<HTMLElement>(
    `[data-package-node-id="${CSS.escape(field.nodeId)}"]`,
  );
  if (!element) return null;
  const computed = getComputedStyle(element);
  const lineHeightPx = Number.parseFloat(computed.lineHeight);
  const range = document.createRange();
  range.selectNodeContents(element);
  const rects = Array.from(range.getClientRects()).filter(
    (rect) => rect.width > 0 || rect.height > 0,
  );
  const isLiveHugText =
    element.dataset.packageHugTextMeasured !== undefined;
  const visualOverflowPx = {
    x: Math.max(0, element.scrollWidth - element.clientWidth),
    // A live vertical-HUG field expands to its measured glyph content. Any
    // overflow of its constrained parent is reported by layout diagnostics,
    // not as clipping inside the field itself.
    y: isLiveHugText
      ? 0
      : Math.max(0, element.scrollHeight - element.clientHeight),
  };
  const measuredLines = rects.length > 0
    ? Math.max(
        1,
        rects
          .map((rect) => rect.top)
          .sort((left, right) => left - right)
          .filter(
            (top, index, values) =>
              index === 0 || Math.abs(top - values[index - 1]) > 0.5,
          ).length,
      )
    : undefined;
  range.detach();
  return createTextFitResult(
    field,
    {
      clientWidth: element.clientWidth,
      clientHeight: element.clientHeight,
      scrollWidth: element.scrollWidth,
      scrollHeight: element.scrollHeight,
      lineHeightPx: Number.isFinite(lineHeightPx) ? lineHeightPx : 0,
      measuredLines,
      visualOverflowPx,
    },
    fontReliable,
  );
}
