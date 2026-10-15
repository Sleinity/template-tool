import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
} from "react";
import { createResolvedRenderTree } from "@sleinity/template-core";
import type { TemplatePackageV1 } from "@sleinity/template-core";
import {
  expandPreviewBounds,
  fitPreviewBounds,
  preservePreviewCenterOnResize,
  previewVisibleCenter,
  resolvePreviewTargetBounds,
  resolvePreviewTargetBoundsList,
  resolveInspectionTargetBounds,
  zoomPreviewAtPoint,
  type PreviewBounds,
  type PreviewFocusMode,
  type PreviewViewportSize,
  type PreviewViewportTransform,
} from "./previewViewport";
import {
  TemplatePackageRenderer,
  type TemplatePackageMotionRenderMode,
  type TemplatePackageRenderMode,
} from "./TemplatePackageRenderer";
import type { ResolvedProductRenderIdentityV1 } from "./productRenderIdentity";

export interface TemplateInspectionViewportSnapshot {
  focusMode: PreviewFocusMode;
  transform: PreviewViewportTransform;
  scale: number;
  measured: boolean;
  canFitTarget: boolean;
}

export interface TemplateInspectionViewportHandle {
  fitTemplate(): void;
  fitTarget(): void;
  zoomBy(factor: number): void;
  getSnapshot(): TemplateInspectionViewportSnapshot;
}

export interface TemplateInspectionViewportProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
  packageValue: TemplatePackageV1;
  targetNodeIds?: string[];
  mode?: TemplatePackageRenderMode;
  motionRenderMode?: TemplatePackageMotionRenderMode;
  dimUnselected?: boolean;
  onRenderIdentity?: (identity: ResolvedProductRenderIdentityV1) => void;
  onViewportSnapshot?: (snapshot: TemplateInspectionViewportSnapshot) => void;
}

const emptyTransform: PreviewViewportTransform = {
  scale: 0.1,
  translateX: 0,
  translateY: 0,
};

export const TemplateInspectionViewport = /* @__PURE__ */ forwardRef<
  TemplateInspectionViewportHandle,
  TemplateInspectionViewportProps
>(function TemplateInspectionViewport({
  packageValue,
  targetNodeIds = [],
  mode = "static",
  motionRenderMode = "final-frame",
  dimUnselected = true,
  className,
  onRenderIdentity,
  onViewportSnapshot,
  ...viewportProps
}, forwardedRef) {
  const viewportElementRef = useRef<HTMLDivElement>(null);
  const transformElementRef = useRef<HTMLDivElement>(null);
  const viewportSizeRef = useRef<PreviewViewportSize>({ width: 0, height: 0 });
  const transformRef = useRef<PreviewViewportTransform>(emptyTransform);
  const focusModeRef = useRef<PreviewFocusMode>("template");
  const targetKeyRef = useRef(targetNodeIds.join("|"));
  const [focusMode, setFocusModeState] = useState<PreviewFocusMode>("template");
  const [transform, setTransformState] = useState<PreviewViewportTransform>(emptyTransform);
  const [measured, setMeasured] = useState(false);
  const measuredRef = useRef(false);
  const [liveTargetBoundsList, setLiveTargetBoundsList] = useState<PreviewBounds[] | null>(null);

  const resolvedTree = useMemo(
    () => createResolvedRenderTree(packageValue),
    [packageValue],
  );
  const templateBounds = useMemo<PreviewBounds>(
    () => ({ x: 0, y: 0, width: resolvedTree.canvas.width, height: resolvedTree.canvas.height }),
    [resolvedTree.canvas.height, resolvedTree.canvas.width],
  );
  const targetKey = targetNodeIds.join("|");
  const resolvedTargetBoundsList = useMemo(
    () => resolvePreviewTargetBoundsList(resolvedTree, targetNodeIds),
    [resolvedTree, targetKey],
  );
  const resolvedTargetBounds = useMemo(
    () => resolvePreviewTargetBounds(resolvedTree, targetNodeIds),
    [resolvedTree, targetKey],
  );
  const targetBoundsList = liveTargetBoundsList ?? resolvedTargetBoundsList;
  const targetBounds = useMemo(() => {
    if (!liveTargetBoundsList?.length) return resolvedTargetBounds;
    const left = Math.min(...liveTargetBoundsList.map((bounds) => bounds.x));
    const top = Math.min(...liveTargetBoundsList.map((bounds) => bounds.y));
    const right = Math.max(...liveTargetBoundsList.map((bounds) => bounds.x + bounds.width));
    const bottom = Math.max(...liveTargetBoundsList.map((bounds) => bounds.y + bounds.height));
    return { x: left, y: top, width: right - left, height: bottom - top };
  }, [liveTargetBoundsList, resolvedTargetBounds]);
  const isolationMaskId = `inspection-mask-${useId().replace(/:/g, "")}`;
  const paddedTargetBounds = useMemo(
    () => targetBounds ? expandPreviewBounds(targetBounds) : null,
    [targetBounds],
  );

  useEffect(() => {
    const transformElement = transformElementRef.current;
    if (!transformElement || targetNodeIds.length === 0) {
      setLiveTargetBoundsList(null);
      return;
    }
    setLiveTargetBoundsList(null);
    const canvas = transformElement.querySelector<HTMLElement>("[data-template-package-canvas]");
    if (!canvas) return;
    let frame = 0;
    let disposed = false;
    const sameBounds = (left: PreviewBounds[] | null, right: PreviewBounds[]) =>
      Boolean(left && left.length === right.length && left.every((bounds, index) => {
        const candidate = right[index];
        return candidate && Math.abs(bounds.x - candidate.x) < 0.01 && Math.abs(bounds.y - candidate.y) < 0.01 && Math.abs(bounds.width - candidate.width) < 0.01 && Math.abs(bounds.height - candidate.height) < 0.01;
      }));
    const publish = () => {
      frame = 0;
      if (disposed || canvas.dataset.packageSettlementReadiness !== "ready") return;
      const canvasRect = canvas.getBoundingClientRect();
      const scaleX = canvas.offsetWidth > 0 ? canvasRect.width / canvas.offsetWidth : 0;
      const scaleY = canvas.offsetHeight > 0 ? canvasRect.height / canvas.offsetHeight : 0;
      if (scaleX <= 0 || scaleY <= 0) return;
      const targets = [...canvas.querySelectorAll<HTMLElement>("[data-package-node-id]")];
      const next = targetNodeIds.flatMap((nodeId) => {
        const element = targets.find((candidate) => candidate.dataset.packageNodeId === nodeId);
        if (!element) return [];
        const rect = element.getBoundingClientRect();
        return [resolveInspectionTargetBounds(rect, canvasRect, { x: scaleX, y: scaleY }, {
          trimAuthority: element.dataset.packageTextTrimAuthority,
          trimmedBox: element.dataset.packageTextTrimmedBox,
        })];
      });
      if (next.length === targetNodeIds.length) {
        setLiveTargetBoundsList((current) => sameBounds(current, next) ? current : next);
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(publish);
    };
    const resizeObserver = new ResizeObserver(schedule);
    resizeObserver.observe(canvas);
    for (const element of canvas.querySelectorAll<HTMLElement>("[data-package-node-id]")) {
      if (targetNodeIds.includes(element.dataset.packageNodeId ?? "")) resizeObserver.observe(element);
    }
    const mutationObserver = new MutationObserver(schedule);
    mutationObserver.observe(canvas, { attributes: true, attributeFilter: ["data-package-settlement-readiness", "data-package-settlement-revision"], subtree: true });
    document.fonts?.addEventListener?.("loadingdone", schedule);
    schedule();
    return () => {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      document.fonts?.removeEventListener?.("loadingdone", schedule);
    };
  }, [packageValue, targetKey]);

  const commitTransform = useCallback((next: PreviewViewportTransform) => {
    transformRef.current = next;
    setTransformState(next);
  }, []);
  const commitFocusMode = useCallback((next: PreviewFocusMode) => {
    focusModeRef.current = next;
    setFocusModeState(next);
  }, []);

  const fitTemplate = useCallback((viewport = viewportSizeRef.current) => {
    if (viewport.width <= 0 || viewport.height <= 0) return;
    commitFocusMode("template");
    commitTransform(fitPreviewBounds(viewport, templateBounds));
  }, [commitFocusMode, commitTransform, templateBounds]);

  const fitTarget = useCallback((viewport = viewportSizeRef.current) => {
    if (!paddedTargetBounds || viewport.width <= 0 || viewport.height <= 0) return;
    commitFocusMode("target");
    commitTransform(fitPreviewBounds(viewport, paddedTargetBounds, { maximumScale: 4 }));
  }, [commitFocusMode, commitTransform, paddedTargetBounds]);

  const zoomBy = useCallback((factor: number) => {
    const viewport = viewportSizeRef.current;
    if (viewport.width <= 0 || viewport.height <= 0) return;
    const focalPoint = focusModeRef.current === "target" && targetBounds
      ? { x: targetBounds.x + targetBounds.width / 2, y: targetBounds.y + targetBounds.height / 2 }
      : focusModeRef.current === "template"
        ? { x: templateBounds.x + templateBounds.width / 2, y: templateBounds.y + templateBounds.height / 2 }
        : previewVisibleCenter(viewport, transformRef.current);
    commitTransform(zoomPreviewAtPoint(viewport, transformRef.current, focalPoint, factor));
    commitFocusMode("manual");
  }, [commitFocusMode, commitTransform, targetBounds, templateBounds]);

  const getSnapshot = useCallback((): TemplateInspectionViewportSnapshot => ({
    focusMode: focusModeRef.current,
    transform: transformRef.current,
    scale: transformRef.current.scale,
    measured: measuredRef.current,
    canFitTarget: Boolean(targetBounds),
  }), [targetBounds]);

  useImperativeHandle(forwardedRef, () => ({
    fitTemplate: () => fitTemplate(),
    fitTarget: () => fitTarget(),
    zoomBy,
    getSnapshot,
  }), [fitTarget, fitTemplate, getSnapshot, zoomBy]);

  useEffect(() => {
    const viewportElement = viewportElementRef.current;
    if (!viewportElement) return;
    const update = () => {
      const rect = viewportElement.getBoundingClientRect();
      const nextViewport = { width: rect.width, height: rect.height };
      if (nextViewport.width <= 0 || nextViewport.height <= 0) return;
      const previousViewport = viewportSizeRef.current;
      viewportSizeRef.current = nextViewport;
      if (focusModeRef.current === "target" && paddedTargetBounds) {
        commitTransform(fitPreviewBounds(nextViewport, paddedTargetBounds, { maximumScale: 4 }));
      } else if (focusModeRef.current === "template") {
        commitTransform(fitPreviewBounds(nextViewport, templateBounds));
      } else if (previousViewport.width > 0 && previousViewport.height > 0) {
        commitTransform(
          preservePreviewCenterOnResize(previousViewport, nextViewport, transformRef.current),
        );
      }
      measuredRef.current = true;
      setMeasured(true);
    };
    const observer = new ResizeObserver(update);
    observer.observe(viewportElement);
    update();
    return () => observer.disconnect();
  }, [commitTransform, paddedTargetBounds, templateBounds]);

  useEffect(() => {
    const viewport = viewportSizeRef.current;
    const targetChanged = targetKeyRef.current !== targetKey;
    targetKeyRef.current = targetKey;
    if (targetChanged && !paddedTargetBounds) {
      fitTemplate(viewport);
      return;
    }
    if (focusModeRef.current === "target") {
      if (paddedTargetBounds) fitTarget(viewport);
      else fitTemplate(viewport);
    }
  }, [fitTarget, fitTemplate, paddedTargetBounds, targetKey]);

  useEffect(() => {
    onViewportSnapshot?.({
      focusMode,
      transform,
      scale: transform.scale,
      measured,
      canFitTarget: Boolean(targetBounds),
    });
  }, [focusMode, measured, onViewportSnapshot, targetBounds, transform]);

  const transformStyle = {
    width: resolvedTree.canvas.width,
    height: resolvedTree.canvas.height,
    transform: `translate(${transform.translateX}px, ${transform.translateY}px) scale(${transform.scale})`,
    transformOrigin: "0 0",
    opacity: measured ? 1 : 0,
    "--preview-inverse-scale": 1 / Math.max(transform.scale, 0.001),
  } as CSSProperties;
  const inverseScale = 1 / Math.max(transform.scale, 0.001);
  const rootOutlineInset = inverseScale * 0.75;

  return (
      <div
        {...viewportProps}
        ref={viewportElementRef}
        className={className}
      >
        <div
          ref={transformElementRef}
          className="inspection-preview-transform"
          style={transformStyle}
          data-inspection-geometry-contract="settled-core-with-compatibility-fallback"
        >
          <TemplatePackageRenderer
            packageValue={packageValue}
            resolvedTree={resolvedTree}
            mode={mode}
            motionRenderMode={motionRenderMode}
            onRenderIdentity={onRenderIdentity}
          />
          <svg
            aria-hidden="true"
            className="inspection-preview-overlay"
            data-testid="inspection-preview-overlay"
            viewBox={`0 0 ${resolvedTree.canvas.width} ${resolvedTree.canvas.height}`}
          >
            <defs>
              <mask id={isolationMaskId} maskUnits="userSpaceOnUse">
                <rect width={resolvedTree.canvas.width} height={resolvedTree.canvas.height} fill="white" />
                {targetBoundsList.map((bounds, index) => (
                  <rect
                    key={`cutout:${index}:${bounds.x}:${bounds.y}`}
                    x={bounds.x}
                    y={bounds.y}
                    width={bounds.width}
                    height={bounds.height}
                    fill="black"
                  />
                ))}
              </mask>
            </defs>
            {dimUnselected && targetBoundsList.length > 0 ? (
              <rect
                width={resolvedTree.canvas.width}
                height={resolvedTree.canvas.height}
                fill="rgb(23 23 23 / 0.42)"
                mask={`url(#${isolationMaskId})`}
                data-inspection-isolation-overlay="true"
              />
            ) : null}
            <rect
              x={rootOutlineInset}
              y={rootOutlineInset}
              width={Math.max(0, resolvedTree.canvas.width - rootOutlineInset * 2)}
              height={Math.max(0, resolvedTree.canvas.height - rootOutlineInset * 2)}
              fill="none"
              stroke="var(--color-border-default)"
              strokeWidth={inverseScale * 1.5}
              data-inspection-root-outline="true"
            />
            {targetBoundsList.map((bounds, index) => (
              <rect
                key={`highlight:${index}:${bounds.x}:${bounds.y}`}
                x={bounds.x}
                y={bounds.y}
                width={bounds.width}
                height={bounds.height}
                fill="none"
                stroke="var(--color-focus-ring)"
                strokeWidth={inverseScale * 3}
                data-inspection-target-outline="true"
              />
            ))}
          </svg>
        </div>
      </div>
  );
});
