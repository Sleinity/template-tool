import { useEffect, useRef, useState } from "react";
import type { TemplatePackageV1 } from "../types";
import {
  TemplatePackageRenderer,
  type TemplatePackageMotionRenderMode,
  type TemplatePackageRenderMode,
} from "./TemplatePackageRenderer";

interface ScaledTemplatePackagePreviewProps {
  packageValue: TemplatePackageV1;
  fill?: boolean;
  mode?: TemplatePackageRenderMode;
  debugOverlay?: boolean;
  highlightNodeId?: string | null;
  motionTimeMs?: number;
  motionRenderMode?: TemplatePackageMotionRenderMode;
  padding?: number;
  className?: string;
  onAssetLoadError?: (assetId: string, nodeId: string) => void;
}

export function ScaledTemplatePackagePreview({
  packageValue,
  fill = false,
  mode = "static",
  debugOverlay = false,
  highlightNodeId,
  motionTimeMs,
  motionRenderMode,
  padding = 16,
  className,
  onAssetLoadError,
}: ScaledTemplatePackagePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.25);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateScale = () => {
      const { width, height } = container.getBoundingClientRect();
      setScale(
        Math.max(
          0.05,
          Math.min(
            (width - padding * 2) / packageValue.canvas.width,
            (height - padding * 2) / packageValue.canvas.height,
          ),
        ),
      );
    };
    const observer = new ResizeObserver(updateScale);
    observer.observe(container);
    updateScale();
    return () => observer.disconnect();
  }, [packageValue.canvas.height, packageValue.canvas.width, padding]);

  return (
    <div
      ref={containerRef}
      className={`template-preview-scaler ${fill ? "h-full" : "h-[560px]"} ${className ?? ""}`}
      style={{ padding }}
    >
      <div
        className="template-preview-scaler__content"
        style={{
          width: packageValue.canvas.width * scale,
          height: packageValue.canvas.height * scale,
        }}
      >
        <div
          style={{
            width: packageValue.canvas.width,
            height: packageValue.canvas.height,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <TemplatePackageRenderer
            packageValue={packageValue}
            mode={mode}
            debugOverlay={debugOverlay}
            highlightNodeId={highlightNodeId}
            motionTimeMs={motionTimeMs}
            motionRenderMode={motionRenderMode}
            onAssetLoadError={onAssetLoadError}
          />
        </div>
      </div>
    </div>
  );
}
