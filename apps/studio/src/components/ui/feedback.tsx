import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "./utils";

export type StatusTone =
  | "blocked"
  | "attention"
  | "repaired"
  | "info"
  | "neutral";

export function Status({
  tone = "neutral",
  children,
  icon,
  className,
  ...props
}: {
  tone?: StatusTone;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
} & Omit<HTMLAttributes<HTMLSpanElement>, "children">) {
  return (
    <span {...props} className={cx("ui-status", className)} data-tone={tone}>
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      <span>{children}</span>
    </span>
  );
}

export function Alert({
  tone = "neutral",
  title,
  children,
  icon,
  className,
  ...props
}: {
  tone?: StatusTone;
  title: ReactNode;
  children?: ReactNode;
  icon?: ReactNode;
  className?: string;
} & Omit<HTMLAttributes<HTMLDivElement>, "title" | "children">) {
  const role = tone === "blocked" ? "alert" : "status";
  return (
    <div {...props} className={cx("ui-alert", className)} data-tone={tone} role={role}>
      <span aria-hidden="true">{icon}</span>
      <div>
        <p className="ui-alert__title">{title}</p>
        {children ? <div>{children}</div> : null}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: ReactNode;
  description: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("ui-empty-state", className)}>
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      <h2 className="ui-empty-state__title">{title}</h2>
      <p className="ui-empty-state__description">{description}</p>
      {action}
    </div>
  );
}
