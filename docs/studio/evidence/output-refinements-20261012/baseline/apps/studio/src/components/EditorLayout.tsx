import type { HTMLAttributes, ReactNode } from "react";
import { AppShell, SplitWorkspace } from "./ui";

interface EditorLayoutProps {
  panel: ReactNode;
  preview: ReactNode;
  toolbar?: ReactNode;
  panelPosition?: "left" | "right";
  contentInactive?: boolean;
  previewInactive?: boolean;
  workspaceProps?: HTMLAttributes<HTMLDivElement> & { "data-testid"?: string; inert?: boolean };
}

export function EditorLayout({
  panel,
  preview,
  toolbar,
  panelPosition = "right",
  contentInactive = false,
  previewInactive = false,
  workspaceProps,
}: EditorLayoutProps) {
  const panelElement = (
    <div className="template-workspace-layout__panel" aria-hidden={contentInactive || undefined} inert={contentInactive || undefined} data-view-inactive={contentInactive || undefined}>
      {panel}
    </div>
  );

  return (
    <AppShell
      workspaceMinimum={768}
      mainLabel="Template workspace"
      workspaceMessage="The full template workspace is available on tablet and desktop. Use a screen at least 768 pixels wide to edit fields and inspect the preview."
    >
      <div {...workspaceProps} className={`template-workspace-layout${workspaceProps?.className ? ` ${workspaceProps.className}` : ""}`}>
        {toolbar ? <div className="shrink-0 pb-4">{toolbar}</div> : null}
        <SplitWorkspace className="template-workspace-layout__split">
          {panelPosition === "left" ? panelElement : null}
          <div className="template-workspace-layout__preview" aria-hidden={previewInactive || undefined} inert={previewInactive || undefined} data-view-inactive={previewInactive || undefined}>{preview}</div>
          {panelPosition === "right" ? panelElement : null}
        </SplitWorkspace>
      </div>
    </AppShell>
  );
}
