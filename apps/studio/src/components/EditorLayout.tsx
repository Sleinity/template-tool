import type { ReactNode } from "react";
import { AppShell, SplitWorkspace } from "./ui";

interface EditorLayoutProps {
  panel: ReactNode;
  preview: ReactNode;
  toolbar?: ReactNode;
  panelPosition?: "left" | "right";
}

export function EditorLayout({
  panel,
  preview,
  toolbar,
  panelPosition = "right",
}: EditorLayoutProps) {
  const panelElement = (
    <div className="template-workspace-layout__panel">
      {panel}
    </div>
  );

  return (
    <AppShell
      workspaceMinimum={768}
      mainLabel="Template workspace"
      workspaceMessage="The full template workspace is available on tablet and desktop. Use a screen at least 768 pixels wide to edit fields and inspect the preview."
    >
      <div className="template-workspace-layout">
        {toolbar ? <div className="shrink-0 pb-4">{toolbar}</div> : null}
        <SplitWorkspace className="template-workspace-layout__split">
          {panelPosition === "left" ? panelElement : null}
          <div className="template-workspace-layout__preview">{preview}</div>
          {panelPosition === "right" ? panelElement : null}
        </SplitWorkspace>
      </div>
    </AppShell>
  );
}
