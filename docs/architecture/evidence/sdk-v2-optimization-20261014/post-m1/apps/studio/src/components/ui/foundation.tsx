import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "./utils";

export type WayfindingAccent =
  | "variants"
  | "fonts"
  | "fields"
  | "field-rules"
  | "validate"
  | "review"
  | "neutral";

export function IconPlate({
  icon,
  label,
  accent = "neutral",
  size = "medium",
  className,
}: {
  icon: ReactNode;
  label?: string;
  accent?: WayfindingAccent;
  size?: "small" | "medium" | "large";
  className?: string;
}) {
  return (
    <span
      className={cx("ui-icon-plate", className)}
      data-accent={accent}
      data-size={size}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {icon}
    </span>
  );
}

export function WayfindingBadge({
  value,
  label,
  accent = "neutral",
  size = "medium",
  shape = "circle",
  state = "inactive",
  className,
}: {
  value: string;
  label?: string;
  accent?: WayfindingAccent;
  size?: "small" | "medium" | "large";
  shape?: "circle" | "square";
  state?: "inactive" | "hover" | "active";
  className?: string;
}) {
  return (
    <span
      className={cx("ui-wayfinding-badge", className)}
      data-accent={accent}
      data-size={size}
      data-shape={shape}
      data-state={state}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {value}
    </span>
  );
}

export function WayfindingMark({
  number,
  label,
  accent,
  state = "inactive",
  className,
}: {
  number: number;
  label: string;
  accent: Exclude<WayfindingAccent, "neutral">;
  state?: "inactive" | "hover" | "active";
  className?: string;
}) {
  return (
    <div
      className={cx("ui-wayfinding-mark", className)}
      data-accent={accent}
      data-state={state}
    >
      <WayfindingBadge
        value={String(number)}
        accent={accent}
        size="large"
        state={state}
        className="ui-wayfinding-mark__station"
      />
      <span className="ui-wayfinding-mark__label">{label}</span>
    </div>
  );
}

export function ConnectedList({
  label,
  header,
  children,
  className,
  ...props
}: {
  label: string;
  header?: ReactNode;
  children: ReactNode;
  className?: string;
} & Omit<HTMLAttributes<HTMLDivElement>, "children" | "aria-label">) {
  return (
    <div
      {...props}
      className={cx("ui-connected-list", className)}
      role="list"
      aria-label={label}
    >
      {header ? <div className="ui-connected-list__header" role="presentation">{header}</div> : null}
      {children}
    </div>
  );
}

export function ConnectedListItem({
  children,
  selected = false,
  disabled = false,
  tone = "neutral",
  className,
  ...props
}: {
  children: ReactNode;
  selected?: boolean;
  disabled?: boolean;
  tone?: "neutral" | "attention" | "blocked";
  className?: string;
} & Omit<HTMLAttributes<HTMLDivElement>, "children">) {
  return (
    <div
      {...props}
      className={cx("ui-connected-list__item", className)}
      role="listitem"
      data-selected={selected || undefined}
      data-disabled={disabled || undefined}
      data-tone={tone === "neutral" ? undefined : tone}
      aria-disabled={disabled || undefined}
    >
      {children}
    </div>
  );
}

export function ConnectedListRow({
  icon,
  title,
  description,
  meta,
  status,
  actions,
  selected = false,
  disabled = false,
  children,
  className,
  ...props
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  status?: ReactNode;
  actions?: ReactNode;
  selected?: boolean;
  disabled?: boolean;
  children?: ReactNode;
  className?: string;
} & Omit<HTMLAttributes<HTMLDivElement>, "children" | "title">) {
  return (
    <ConnectedListItem
      {...props}
      className={cx("ui-connected-list__row", className)}
      selected={selected}
      disabled={disabled}
    >
      {icon ? <span className="ui-connected-list__icon">{icon}</span> : null}
      <div className="ui-connected-list__content">
        <div className="ui-connected-list__heading">
          <span className="ui-connected-list__title">{title}</span>
          {meta ? <span className="ui-connected-list__meta">{meta}</span> : null}
        </div>
        {description ? (
          <span className="ui-connected-list__description">{description}</span>
        ) : null}
        {children ? (
          <div className="ui-connected-list__details">{children}</div>
        ) : null}
      </div>
      {status ? <div className="ui-connected-list__status">{status}</div> : null}
      {actions ? <div className="ui-connected-list__actions">{actions}</div> : null}
    </ConnectedListItem>
  );
}
