import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "./utils";

type SurfaceElement = "div" | "section" | "aside";

export function Surface({
  as: Component = "div",
  tone = "primary",
  className,
  children,
  ...props
}: {
  as?: SurfaceElement;
  tone?: "primary" | "secondary" | "raised";
  className?: string;
  children: ReactNode;
} & HTMLAttributes<HTMLElement>) {
  return (
    <Component
      {...props}
      className={cx("ui-surface", className)}
      data-tone={tone}
    >
      {children}
    </Component>
  );
}

export function Disclosure({
  summary,
  children,
  defaultOpen = false,
  className,
}: {
  summary: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  return (
    <details className={cx("ui-disclosure", className)} open={defaultOpen}>
      <summary className="ui-disclosure__summary">{summary}</summary>
      <div className="ui-disclosure__content">{children}</div>
    </details>
  );
}

export function Menu({
  label,
  accessibleLabel,
  children,
  className,
  panelRole = "menu",
  panelLabel,
}: {
  label: ReactNode;
  accessibleLabel: string;
  children: ReactNode;
  className?: string;
  panelRole?: "menu" | "group";
  panelLabel?: string;
}) {
  return (
    <details className={cx("ui-menu", className)}>
      <summary className="ui-menu__trigger" aria-label={accessibleLabel}>
        {label}
      </summary>
      <div
        className="ui-menu__panel"
        role={panelRole}
        aria-label={panelLabel}
      >
        {children}
      </div>
    </details>
  );
}

export function MenuItem({
  children,
  destructive = false,
  onClick,
}: {
  children: ReactNode;
  destructive?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className="ui-menu__item"
      data-destructive={destructive || undefined}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
