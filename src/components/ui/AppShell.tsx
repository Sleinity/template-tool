import type { ReactNode } from "react";
import { MonitorUp } from "lucide-react";
import { cx } from "./utils";

export function AppNavigation({
  label = "Template Tool",
  children,
}: {
  label?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="app-navigation">
      <div className="app-navigation__label">{label}</div>
      <div className="app-navigation__items">{children}</div>
    </div>
  );
}

export function AppNavigationItem({
  href,
  active = false,
  icon,
  children,
}: {
  href: string;
  active?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <a
      className="app-navigation__item"
      href={href}
      aria-current={active ? "page" : undefined}
    >
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      <span>{children}</span>
    </a>
  );
}

export interface AppShellProps {
  navigation?: ReactNode;
  header?: ReactNode;
  children: ReactNode;
  workspaceMinimum?: 768;
  workspaceMessage?: ReactNode;
  mainLabel?: string;
  className?: string;
}

export function AppShell({
  navigation,
  header,
  children,
  workspaceMinimum,
  workspaceMessage,
  mainLabel = "Main content",
  className,
}: AppShellProps) {
  return (
    <div
      className={cx("app-shell", className)}
      data-workspace-minimum={workspaceMinimum}
    >
      <a className="app-shell__skip-link" href="#app-main-content">
        Skip to main content
      </a>
      <div className="app-shell__frame">
        {navigation ? (
          <nav className="app-shell__navigation" aria-label="Primary">
            {navigation}
          </nav>
        ) : null}
        <div className="app-shell__body">
          {header ? <header className="app-shell__header">{header}</header> : null}
          <main
            id="app-main-content"
            className="app-shell__main"
            aria-label={mainLabel}
          >
            <div className="app-shell__workspace-content">{children}</div>
            {workspaceMinimum ? (
              <section
                className="app-shell__workspace-limit"
                aria-labelledby="workspace-width-title"
              >
                <MonitorUp aria-hidden="true" size={28} />
                <h1 id="workspace-width-title" className="ui-section-title">
                  A larger screen is needed for editing
                </h1>
                <p className="ui-page-description">
                  {workspaceMessage ??
                    "Open this workspace on a screen at least 768 pixels wide. Template details and navigation remain available on smaller screens."}
                </p>
                <a
                  className="ui-button"
                  data-size="medium"
                  data-variant="secondary"
                  href="/templates"
                >
                  Templates
                </a>
              </section>
            ) : null}
          </main>
        </div>
      </div>
    </div>
  );
}
