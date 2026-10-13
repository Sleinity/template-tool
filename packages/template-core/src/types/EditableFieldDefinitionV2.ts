export type TemplateFieldType =
  | "text"
  | "textarea"
  | "image"
  | "color"
  | "number"
  | "date"
  | "boolean";

export type NonEmptyArray<T> = [T, ...T[]];

/** Stable portable identifier used for source field names and configured choice options. */
export const TEMPLATE_FIELD_PORTABLE_ID_PATTERN = /^[A-Za-z][A-Za-z0-9_-]*$/u;

/** Canonical Field Rules ID. Choice option IDs continue using the portable pattern above. */
export const TEMPLATE_FIELD_ID_PATTERN = /^(text|textarea|image|color|number|date|boolean):([A-Za-z][A-Za-z0-9_-]*)$/u;

export type TemplateFieldIdV2 = `${TemplateFieldType}:${string}`;

export function createTemplateFieldIdV2(
  type: TemplateFieldType,
  name: string,
): TemplateFieldIdV2 | null {
  return TEMPLATE_FIELD_PORTABLE_ID_PATTERN.test(name) ? `${type}:${name}` : null;
}

export function parseTemplateFieldIdV2(
  value: string,
): { type: TemplateFieldType; name: string } | null {
  const match = TEMPLATE_FIELD_ID_PATTERN.exec(value);
  return match ? { type: match[1] as TemplateFieldType, name: match[2] } : null;
}

export function getTemplateFieldNameV2(
  field: Pick<EditableFieldDefinitionV2, "id" | "type">,
): string {
  const parsed = parseTemplateFieldIdV2(field.id);
  return parsed?.type === field.type ? parsed.name : field.id;
}

export type ColorValueV1 = string;
export type ColorInputV1 = ColorValueV1 | `#${string}`;
export type CalendarDateValueV1 = string;

export interface StaticChoiceOption<T> {
  id: string;
  label?: string;
  value: T;
}

export interface StaticChoiceSet<T> {
  mode: "suggested" | "restricted";
  options: NonEmptyArray<StaticChoiceOption<T>>;
}

export interface TextFieldConfigurationV1 {
  maxCharacters?: number;
  warningAtCharacters?: number;
  choices?: StaticChoiceSet<string>;
}

export interface TextareaFieldConfigurationV1 {
  maxCharacters?: number;
  maxLines?: number;
  warningAtCharacters?: number;
  warningAtLines?: number;
  choices?: StaticChoiceSet<string>;
}

export type ImageReplacementModeV1 = "fill" | "fit" | "crop";

/**
 * A producer-independent crop result. The matrix maps normalized slot
 * coordinates to normalized source coordinates, matching the imported CROP
 * direction already established by ADR 0048.
 */
export interface NormalizedImageCropV1 {
  schemaVersion: "normalized-image-crop-v1";
  coordinateSpace: "normalized-slot-to-normalized-source";
  transform: [[number, number, number], [number, number, number]];
}

export type ImageReplacementPlacementV1 =
  | { mode: "fill" }
  | { mode: "fit" }
  | { mode: "crop"; crop: NormalizedImageCropV1 };

export interface ImportedImageValueV1 {
  assetId: string | null;
  placement: { mode: "imported" };
}

export interface ImageFieldConfigurationV1 {
  /** Required policy for newly uploaded images. Imported placement stays source-authoritative. */
  replacementPlacement: ImageReplacementModeV1;
}

export interface ColorFieldConfigurationV1 {
  choices?: StaticChoiceSet<ColorValueV1>;
}

export interface NumberDisplayFormatV1 {
  schemaVersion: "number-display-v1";
  prefix?: string;
  suffix?: string;
  decimalSeparator?: "." | ",";
  thousandSeparator?: "." | "," | " ";
  decimalPlaces?: number;
}

export interface NumberFieldConfigurationV1 {
  min?: number;
  max?: number;
  step?: number;
  format?: NumberDisplayFormatV1;
  choices?: StaticChoiceSet<number>;
}

export interface DateDisplayFormatV1 {
  schemaVersion: "date-display-v1";
  preset:
    | "iso"
    | "numeric-year-first"
    | "numeric-day-first"
    | "numeric-month-first"
    | "numeric-day-month"
    | "numeric-month-day";
  prefix?: string;
  suffix?: string;
  separator?: "-" | "/" | ".";
}

export interface DateFieldConfigurationV1 {
  format?: DateDisplayFormatV1;
  choices?: StaticChoiceSet<CalendarDateValueV1>;
}

export interface BooleanFieldConfigurationV1 {}

export interface TextCharactersBindingV2 {
  kind: "text-characters";
  nodeId: string;
}

export interface ImageContentBindingV2 {
  kind: "image-content";
  nodeId: string;
}

export interface SolidFillColorBindingV2 {
  kind: "solid-fill-color";
  nodeId: string;
  sourceIndex: number;
}

export interface StructuralVisibilityBindingV2 {
  kind: "structural-visibility";
  nodeId: string;
  /** Additional nodes controlled by the same canonical Boolean value. */
  additionalNodeIds?: NonEmptyArray<string>;
}

export interface EditableFieldProvenanceV2 {
  sourceContract: "template-package-v1" | "template-package-v2";
  source: "descriptor" | "field-marker";
  sourceField?: Record<string, unknown>;
  marker?: string;
  normalization: string[];
}

export interface EditableFieldDefinitionBaseV2<
  Type extends TemplateFieldType,
  Value,
  Binding,
  Configuration,
> {
  /** Canonical values are validated against TemplateFieldIdV2 at the package boundary. */
  id: string;
  type: Type;
  label?: string;
  /** Non-semantic host hint; unknown roles always fall back to the type editor. */
  controlRole?: string;
  binding: Binding;
  defaultValue: Value;
  configuration: Configuration;
  /** Preserved source evidence; never consulted as a runtime rule authority. */
  provenance?: EditableFieldProvenanceV2;
}

export type TextFieldDefinitionV2 = EditableFieldDefinitionBaseV2<
  "text",
  string,
  TextCharactersBindingV2,
  TextFieldConfigurationV1
>;

export type TextareaFieldDefinitionV2 = EditableFieldDefinitionBaseV2<
  "textarea",
  string,
  TextCharactersBindingV2,
  TextareaFieldConfigurationV1
>;

export type ImageFieldDefinitionV2 = EditableFieldDefinitionBaseV2<
  "image",
  ImportedImageValueV1,
  ImageContentBindingV2,
  ImageFieldConfigurationV1
>;

export type ColorFieldDefinitionV2 = EditableFieldDefinitionBaseV2<
  "color",
  ColorValueV1,
  SolidFillColorBindingV2,
  ColorFieldConfigurationV1
>;

export type NumberFieldDefinitionV2 = EditableFieldDefinitionBaseV2<
  "number",
  number,
  TextCharactersBindingV2,
  NumberFieldConfigurationV1
>;

export type DateFieldDefinitionV2 = EditableFieldDefinitionBaseV2<
  "date",
  CalendarDateValueV1,
  TextCharactersBindingV2,
  DateFieldConfigurationV1
>;

export type BooleanFieldDefinitionV2 = EditableFieldDefinitionBaseV2<
  "boolean",
  boolean,
  StructuralVisibilityBindingV2,
  BooleanFieldConfigurationV1
>;

export type EditableFieldDefinitionV2 =
  | TextFieldDefinitionV2
  | TextareaFieldDefinitionV2
  | ImageFieldDefinitionV2
  | ColorFieldDefinitionV2
  | NumberFieldDefinitionV2
  | DateFieldDefinitionV2
  | BooleanFieldDefinitionV2;

/** Portable authoring metadata; immutable imported bindings/defaults are absent. */
export type TemplateFieldConfigurationV2 = EditableFieldDefinitionV2 extends infer Field
  ? Field extends EditableFieldDefinitionV2
    ? Pick<Field, "id" | "type" | "label" | "controlRole" | "configuration">
    : never
  : never;

export type TemplateFieldCanonicalValueV1 =
  | string
  | number
  | boolean
  | {
      assetId: string;
      placement: ImageReplacementPlacementV1;
    };

export interface TemplateFieldContentEntryV1 {
  readonly value: TemplateFieldCanonicalValueV1;
  /** Choice identity/provenance never replaces the canonical value. */
  readonly selectedChoiceId?: string;
}

/**
 * Serializable canonical field state. Callers receive immutable snapshots;
 * typed Core/session mutations are the supported write authority.
 */
export interface TemplateFieldContentStateV1 {
  readonly schemaVersion: "template-field-content-v1";
  readonly packageId: string;
  readonly packageSchemaVersion: "2.2";
  readonly revision: number;
  readonly values: Readonly<Record<string, TemplateFieldContentEntryV1>>;
}
