import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cx } from "./utils";

export function PageWorkspace({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} className={cx("page-workspace", className)}>
      {children}
    </div>
  );
}

export function PageHeader({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <header {...props} className={cx("page-workspace__header", className)}>
      {children}
    </header>
  );
}

export const PageContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function PageContent({ className, children, ...props }, ref) {
  return (
    <div
      {...props}
      ref={ref}
      className={cx("page-workspace__content", className)}
      data-scroll-owner="page"
    >
      {children}
    </div>
  );
  },
);

export function PageFooter({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <footer {...props} className={cx("page-workspace__footer", className)}>
      {children}
    </footer>
  );
}

export function SplitWorkspace({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} className={cx("split-workspace", className)}>
      {children}
    </div>
  );
}

export function WorkspaceSidePanel({
  header,
  footer,
  children,
  className,
  bodyClassName,
  ...props
}: {
  header: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
} & Omit<HTMLAttributes<HTMLElement>, "children">) {
  return (
    <aside {...props} className={cx("workspace-side-panel", className)}>
      <header className="workspace-side-panel__header">{header}</header>
      <div
        className={cx("workspace-side-panel__body", bodyClassName)}
        data-scroll-owner="panel"
      >
        {children}
      </div>
      {footer ? (
        <footer className="workspace-side-panel__footer">{footer}</footer>
      ) : null}
    </aside>
  );
}
