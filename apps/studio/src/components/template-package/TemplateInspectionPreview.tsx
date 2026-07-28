import { Focus, Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import { useRef, useState } from "react";
import {
  TemplateInspectionViewport,
  type ResolvedProductRenderIdentityV1,
  type TemplateInspectionViewportHandle,
  type TemplateInspectionViewportSnapshot,
  type TemplatePackageMotionRenderMode,
  type TemplatePackageRenderMode,
} from "@sleinity/template-react";
import type { TemplatePackageV1 } from "@sleinity/template-core";
import { Button, IconButton } from "../ui";

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
          <Button
            variant="quiet"
            size="small"
            leadingIcon={<Maximize2 size={15} />}
            aria-pressed={snapshot.focusMode === "template"}
            onClick={() => runViewportAction((viewport) => viewport.fitTemplate())}
          >
            Fit template
          </Button>
          <Button
            variant="quiet"
            size="small"
            leadingIcon={<Focus size={15} />}
            aria-pressed={snapshot.focusMode === "target"}
            disabled={!snapshot.canFitTarget}
            onClick={() => runViewportAction((viewport) => viewport.fitTarget())}
          >
            {targetFitLabel}
          </Button>
          <div className="inspection-preview-toolbar__zoom">
            <IconButton label="Zoom out" icon={<ZoomOut size={16} />} onClick={() => runViewportAction((viewport) => viewport.zoomBy(0.8))} />
            <span className="min-w-12 text-center text-xs text-content-muted" aria-live="polite">
              {Math.round(snapshot.scale * 100)}%
            </span>
            <IconButton label="Zoom in" icon={<ZoomIn size={16} />} onClick={() => runViewportAction((viewport) => viewport.zoomBy(1.25))} />
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
