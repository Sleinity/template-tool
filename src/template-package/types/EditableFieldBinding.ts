export type PackageEditableFieldType =
  | "text"
  | "textarea"
  | "image"
  | "color"
  | "number"
  | "date"
  | "boolean";

export type PackageEditableValue = string | number | boolean | null;

export interface PackageNumberFormat {
  prefix?: string;
  suffix?: string;
  decimalSeparator?: "." | ",";
  thousandSeparator?: "." | "," | " ";
  decimalPlaces?: number;
}

export type PackageFieldPattern =
  | "free"
  | "number"
  | "currency"
  | "percentage"
  | "date"
  | "email"
  | "url"
  | "custom";

export interface PackageTextFieldConstraints {
  /** @deprecated Imported for package provenance only. Empty overrides use the template default. */
  required?: boolean;
  minCharacters?: number;
  maxCharacters?: number;
  minWords?: number;
  /** @deprecated Imported for package provenance only. Use maxCharacters for new configuration. */
  maxWords?: number;
  maxLines?: number;
  allowLineBreaks?: boolean;
  pattern?: PackageFieldPattern;
  customPattern?: string;
  placeholder?: string;
}

export interface PackageImageFieldConstraints {
  /** @deprecated Imported for package provenance only. Missing overrides use the template default. */
  required?: boolean;
  allowedMimeTypes?: string[];
  maxFileSizeMb?: number;
  minWidth?: number;
  minHeight?: number;
  aspectRatio?: "preserve-frame" | "free" | number;
  replacementMode?:
    | "cover"
    | "contain"
    | "preserve-original-crop"
    | "user-crop";
  scaleMode?: "FILL" | "FIT" | "STRETCH" | "CROP" | "TILE";
}

export type PackageFieldConstraints =
  | PackageTextFieldConstraints
  | PackageImageFieldConstraints;

export interface PackageFieldBehavior {
  onOverflow?:
    | "prevent-input"
    | "trim"
    | "warn-only"
    | "clip-preview"
    | "shrink-to-fit"
    | "allow";
  showCounter?: boolean;
  counterType?: "characters" | "words" | "lines";
  softLimitWarning?: number;
  preserveBox?: boolean;
}

export interface EditableFieldBinding {
  id: string;
  type: PackageEditableFieldType;
  nodeId: string;
  property: string;
  defaultValue: PackageEditableValue;
  label?: string;
  format?: PackageNumberFormat | Record<string, unknown>;
  constraints?: PackageFieldConstraints;
  behavior?: PackageFieldBehavior;
  assetRef?: string;
  typedRef?: string;
  refType?: "asset";
}

export type PackageEditableField = EditableFieldBinding;
