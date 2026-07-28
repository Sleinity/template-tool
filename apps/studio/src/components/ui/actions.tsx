import type {
  ButtonHTMLAttributes,
  ReactNode,
} from "react";
import { cx } from "./utils";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "quiet"
  | "destructive";

export type ButtonSize = "small" | "medium" | "large";

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <>
      <span aria-hidden="true" className="ui-spinner" />
      <span className="ui-visually-hidden">{label}</span>
    </>
  );
}

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingLabel?: string;
  leadingIcon?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "medium",
  loading = false,
  loadingLabel = "Working",
  leadingIcon,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={cx("ui-button", className)}
      data-size={size}
      data-variant={variant}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading ? <Spinner label={loadingLabel} /> : leadingIcon}
      <span>{loading ? loadingLabel : children}</span>
    </button>
  );
}

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> {
  label: string;
  icon: ReactNode;
  loading?: boolean;
}

export function IconButton({
  label,
  icon,
  loading = false,
  className,
  disabled,
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      {...props}
      type={type}
      aria-label={label}
      aria-busy={loading || undefined}
      className={cx("ui-icon-button", className)}
      disabled={disabled || loading}
      title={label}
    >
      {loading ? <Spinner label={label} /> : icon}
    </button>
  );
}

export function CountBadge({
  count,
  label,
  className,
}: {
  count: number;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cx("ui-count-badge", className)}
      aria-label={`${count} ${label}`}
    >
      {count}
    </span>
  );
}

export interface FilterChipProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  selected: boolean;
  label: string;
  count?: number;
}

export function FilterChip({
  selected,
  label,
  count,
  className,
  type = "button",
  ...props
}: FilterChipProps) {
  return (
    <button
      {...props}
      type={type}
      aria-pressed={selected}
      className={cx("ui-filter-chip", className)}
    >
      <span>{label}</span>
      {count !== undefined ? <CountBadge count={count} label={label} /> : null}
    </button>
  );
}
