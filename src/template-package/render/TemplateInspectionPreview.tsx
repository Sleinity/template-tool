import { useRef, useState } from "react";
import type { TemplatePackageV1 } from "../types";
import {
  TemplateInspectionViewport,
  type TemplateInspectionViewportHandle,
  type TemplateInspectionViewportSnapshot,
} from "./TemplateInspectionViewport";
import type {
  TemplatePackageMotionRenderMode,
  TemplatePackageRenderMode,
} from "./TemplatePackageRenderer";
import type { ResolvedProductRenderIdentityV1 } from "./productRenderIdentity";

export interface TemplateInspectionPreviewProps {
  packageValue: TemplatePackageV1;
  targetNodeIds?: string[];
  targetFitLabel?: string;
  mode?: TemplatePackageRenderMode;
  motionRenderMode?: TemplatePackageMotionRenderMode;
  dimUnselected?: boolean;
  showControls?: boolean;
  className?: string;
  onRenderIdentity?: (identity: ResolvedProductRenderIdentityV1) => void;
}

const initialSnapshot: TemplateInspectionViewportSnapshot = {
  focusMode: "template",
  transform: { scale: 0.1, translateX: 0, translateY: 0 },
  scale: 0.1,
  measured: false,
  canFitTarget: false,
};

export function TemplateInspectionPreview({
  packageValue,
  targetNodeIds = [],
  targetFitLabel = "Fit target",
  mode = "static",
  motionRenderMode = "final-frame",
  dimUnselected = true,
  showControls = true,
  className,
  onRenderIdentity,
}: TemplateInspectionPreviewProps) {
  const viewportRef = useRef<TemplateInspectionViewportHandle>(null);
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const runViewportAction = (action: (viewport: TemplateInspectionViewportHandle) => void) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    action(viewport);
    setSnapshot(viewport.getSnapshot());
  };

  return (
    <div className={`template-inspection-preview ${className ?? ""}`} data-focus-mode={snapshot.focusMode}>
      {showControls ? (
        <div className="inspection-preview-toolbar" aria-label="Preview controls">
          <button
            type="button"
            aria-pressed={snapshot.focusMode === "template"}
            onClick={() => runViewportAction((viewport) => viewport.fitTemplate())}
          >
            Fit template
          </button>
          <button
            type="button"
            aria-pressed={snapshot.focusMode === "target"}
            disabled={!snapshot.canFitTarget}
            onClick={() => runViewportAction((viewport) => viewport.fitTarget())}
          >
            {targetFitLabel}
          </button>
          <div className="inspection-preview-toolbar__zoom">
            <button type="button" aria-label="Zoom out" onClick={() => runViewportAction((viewport) => viewport.zoomBy(0.8))}>−</button>
            <span aria-live="polite">{Math.round(snapshot.scale * 100)}%</span>
            <button type="button" aria-label="Zoom in" onClick={() => runViewportAction((viewport) => viewport.zoomBy(1.25))}>+</button>
          </div>
        </div>
      ) : null}
      <TemplateInspectionViewport
        ref={viewportRef}
        packageValue={packageValue}
        targetNodeIds={targetNodeIds}
        mode={mode}
        motionRenderMode={motionRenderMode}
        dimUnselected={dimUnselected}
        onRenderIdentity={onRenderIdentity}
        onViewportSnapshot={setSnapshot}
        className="template-preview-stage inspection-preview-viewport"
        data-tone="light"
        data-size="standard"
        data-testid="inspection-preview-viewport"
      />
    </div>
  );
}
