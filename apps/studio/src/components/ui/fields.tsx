import {
  useId,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cx } from "./utils";

interface FieldFrameProps {
  id: string;
  label: ReactNode;
  required?: boolean;
  helpText?: ReactNode;
  error?: ReactNode;
  warning?: ReactNode;
  children: ReactNode;
}

function FieldFrame({
  id,
  label,
  required,
  helpText,
  error,
  warning,
  children,
}: FieldFrameProps) {
  return (
    <div className="ui-field">
      <label className="ui-field__label" htmlFor={id}>
        {label}
        {required ? (
          <span className="ui-field__required" aria-hidden="true">
            {" "}*
          </span>
        ) : null}
      </label>
      {children}
      {error ? (
        <span className="ui-field__error" id={`${id}-error`}>
          {error}
        </span>
      ) : warning ? (
        <span className="ui-field__warning" id={`${id}-warning`}>
          {warning}
        </span>
      ) : helpText ? (
        <span className="ui-help-text" id={`${id}-help`}>
          {helpText}
        </span>
      ) : null}
    </div>
  );
}

interface SharedFieldProps {
  label: ReactNode;
  helpText?: ReactNode;
  error?: ReactNode;
  warning?: ReactNode;
  controlAdornment?: ReactNode;
}

export interface InputProps
  extends InputHTMLAttributes<HTMLInputElement>,
    SharedFieldProps {}

export function Input({
  id: providedId,
  label,
  helpText,
  error,
  warning,
  controlAdornment,
  required,
  className,
  ...props
}: InputProps) {
  const generatedId = useId();
  const id = providedId ?? `input-${generatedId}`;
  const descriptionId = error
    ? `${id}-error`
    : warning
      ? `${id}-warning`
    : helpText
      ? `${id}-help`
      : undefined;
  return (
    <FieldFrame
      id={id}
      label={label}
      required={required}
      helpText={helpText}
      error={error}
      warning={warning}
    >
      {controlAdornment ? (
        <div className="ui-field__control">
          <input
            {...props}
            id={id}
            required={required}
            aria-describedby={descriptionId}
            aria-invalid={Boolean(error)}
            data-warning={Boolean(warning) || undefined}
            className={cx("ui-input", className)}
          />
          {controlAdornment}
        </div>
      ) : (
        <input
          {...props}
          id={id}
          required={required}
          aria-describedby={descriptionId}
          aria-invalid={Boolean(error)}
          data-warning={Boolean(warning) || undefined}
          className={cx("ui-input", className)}
        />
      )}
    </FieldFrame>
  );
}

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement>,
    SharedFieldProps {}

export function Textarea({
  id: providedId,
  label,
  helpText,
  error,
  warning,
  controlAdornment,
  required,
  className,
  ...props
}: TextareaProps) {
  const generatedId = useId();
  const id = providedId ?? `textarea-${generatedId}`;
  const descriptionId = error
    ? `${id}-error`
    : warning
      ? `${id}-warning`
    : helpText
      ? `${id}-help`
      : undefined;
  return (
    <FieldFrame
      id={id}
      label={label}
      required={required}
      helpText={helpText}
      error={error}
      warning={warning}
    >
      {controlAdornment ? (
        <div className="ui-field__control ui-field__control--textarea">
          <textarea
            {...props}
            id={id}
            required={required}
            aria-describedby={descriptionId}
            aria-invalid={Boolean(error)}
            data-warning={Boolean(warning) || undefined}
            className={cx("ui-textarea", className)}
          />
          {controlAdornment}
        </div>
      ) : (
        <textarea
          {...props}
          id={id}
          required={required}
          aria-describedby={descriptionId}
          aria-invalid={Boolean(error)}
          data-warning={Boolean(warning) || undefined}
          className={cx("ui-textarea", className)}
        />
      )}
    </FieldFrame>
  );
}

export interface SelectProps
  extends SelectHTMLAttributes<HTMLSelectElement>,
    SharedFieldProps {}

export function Select({
  id: providedId,
  label,
  helpText,
  error,
  warning,
  required,
  className,
  children,
  ...props
}: SelectProps) {
  const generatedId = useId();
  const id = providedId ?? `select-${generatedId}`;
  const descriptionId = error
    ? `${id}-error`
    : warning
      ? `${id}-warning`
    : helpText
      ? `${id}-help`
      : undefined;
  return (
    <FieldFrame
      id={id}
      label={label}
      required={required}
      helpText={helpText}
      error={error}
      warning={warning}
    >
      <select
        {...props}
        id={id}
        required={required}
        aria-describedby={descriptionId}
        aria-invalid={Boolean(error)}
        data-warning={Boolean(warning) || undefined}
        className={cx("ui-select", className)}
      >
        {children}
      </select>
    </FieldFrame>
  );
}

export interface ToggleProps
  extends Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "onChange" | "children"
  > {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  disabled?: boolean;
  className?: string;
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
  className,
  ...props
}: ToggleProps) {
  return (
    <button
      {...props}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx("ui-toggle", className)}
    >
      <span className="ui-toggle__track" aria-hidden="true">
        <span className="ui-toggle__thumb" />
      </span>
      <span>{label}</span>
    </button>
  );
}

export function CheckboxField({
  id: providedId,
  label,
  helpText,
  error,
  checked,
  onChange,
  disabled = false,
  className,
}: {
  id?: string;
  label: ReactNode;
  helpText?: ReactNode;
  error?: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}) {
  const generatedId = useId();
  const id = providedId ?? `checkbox-${generatedId}`;
  const descriptionId = error
    ? `${id}-error`
    : helpText
      ? `${id}-help`
      : undefined;
  return (
    <div className={cx("ui-checkbox-field", className)} data-disabled={disabled || undefined}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-describedby={descriptionId}
        aria-invalid={Boolean(error)}
        onChange={(event) => onChange(event.target.checked)}
        className="ui-checkbox-field__input"
      />
      <div className="ui-checkbox-field__content">
        <label htmlFor={id} className="ui-checkbox-field__label">
          {label}
        </label>
        {error ? (
          <span id={`${id}-error`} className="ui-field__error">{error}</span>
        ) : helpText ? (
          <span id={`${id}-help`} className="ui-help-text">{helpText}</span>
        ) : null}
      </div>
    </div>
  );
}

export function MediaInput({
  id: providedId,
  label,
  previewSrc,
  previewAlt = "",
  emptyPreview,
  actionLabel = "Replace image",
  accept,
  helpText,
  error,
  warning,
  loading = false,
  disabled = false,
  onSelect,
  className,
  secondaryAction,
  inputAriaLabel,
  inputDescribedBy,
}: {
  id?: string;
  label: ReactNode;
  previewSrc?: string | null;
  previewAlt?: string;
  emptyPreview?: ReactNode;
  actionLabel?: string;
  accept?: string;
  helpText?: ReactNode;
  error?: ReactNode;
  warning?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  onSelect: (file: File | undefined) => void;
  className?: string;
  secondaryAction?: ReactNode;
  inputAriaLabel?: string;
  inputDescribedBy?: string;
}) {
  const generatedId = useId();
  const id = providedId ?? `media-${generatedId}`;
  const message = error ?? warning ?? helpText;
  const messageId = message ? `${id}-message` : undefined;
  return (
    <div
      className={cx("ui-media-input", className)}
      data-state={error ? "invalid" : warning ? "warning" : loading ? "loading" : "ready"}
      data-disabled={disabled || undefined}
    >
      <div className="ui-media-input__preview" aria-hidden={previewAlt ? undefined : true}>
        {previewSrc ? (
          <img src={previewSrc} alt={previewAlt} />
        ) : (
          emptyPreview ?? <span>No image</span>
        )}
      </div>
      <div className="ui-media-input__content">
        {label ? <span className="ui-media-input__label">{label}</span> : null}
        <label className="ui-media-input__action" htmlFor={id}>
          {loading ? "Loading image" : actionLabel}
        </label>
        <input
          id={id}
          type="file"
          accept={accept}
          disabled={disabled || loading}
          aria-describedby={inputDescribedBy ?? messageId}
          aria-label={inputAriaLabel}
          aria-invalid={Boolean(error)}
          className="ui-visually-hidden"
          onChange={(event) => {
            onSelect(event.target.files?.[0]);
            event.currentTarget.value = "";
          }}
        />
        {secondaryAction}
        {message ? (
          <span
            id={messageId}
            className={error ? "ui-field__error" : warning ? "ui-field__warning" : "ui-help-text"}
          >
            {message}
          </span>
        ) : null}
      </div>
    </div>
  );
}
