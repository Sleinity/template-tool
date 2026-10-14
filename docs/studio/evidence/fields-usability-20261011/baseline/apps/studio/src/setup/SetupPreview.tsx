import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Focus, Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import { TemplateFieldSessionRendererV2, useTemplateFieldSessionV2Snapshot, type ReactTemplateFieldSessionV2, type TemplateFieldSessionRendererV2Handle } from "@sleinity/template-react";
import { IconButton } from "../components/ui";

/** Studio viewport only: never changes the renderer's intrinsic canvas or layout. */
export function SetupPreview({ session, width, height, highlightNodeId, mode = "static", rendererRef, showControls = true, onMeasurementRootChange }: {
  mode?: "static" | "editor"; rendererRef?: React.Ref<TemplateFieldSessionRendererV2Handle>;
  session: ReactTemplateFieldSessionV2; width: number; height: number; highlightNodeId?: string; showControls?: boolean;
  onMeasurementRootChange?: (root: HTMLDivElement | null) => void;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 400, height: 400 });
  const [focus, setFocus] = useState<"template" | "target" | "manual">("template");
  const [manualScale, setManualScale] = useState(1);
  const [liveTarget, setLiveTarget] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const scaleRef = useRef(1);
  const snapshot = useTemplateFieldSessionV2Snapshot(session);
  const setStage = useCallback((node: HTMLDivElement | null) => {
    stage.current = node;
    onMeasurementRootChange?.(node);
  }, [onMeasurementRootChange]);
  useEffect(() => {
    if (!stage.current) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(stage.current);
    return () => observer.disconnect();
  }, []);
  const resolvedTarget = useMemo(() => {
    if (!highlightNodeId || !snapshot.resolvedTree) return null;
    const node = snapshot.resolvedTree.nodes[highlightNodeId];
    const root = snapshot.resolvedTree.nodes[snapshot.resolvedTree.rootNodeId];
    return node ? { x: node.bounds.absolute.x - (root?.bounds.absolute.x ?? 0), y: node.bounds.absolute.y - (root?.bounds.absolute.y ?? 0), width: node.bounds.absolute.width, height: node.bounds.absolute.height } : null;
  }, [highlightNodeId, snapshot.resolvedTree]);
  const target = liveTarget ?? resolvedTarget;
  const bounds = focus === "target" && target ? { x: target.x - 24, y: target.y - 24, width: target.width + 48, height: target.height + 48 } : { x: 0, y: 0, width, height };
  const fitted = Math.max(0.02, Math.min((size.width - 32) / bounds.width, (size.height - 32) / bounds.height, focus === "target" ? 4 : 1));
  const scale = focus === "manual" ? manualScale : fitted;
  scaleRef.current = scale;
  const translateX = size.width / 2 - (bounds.x + bounds.width / 2) * scale;
  const translateY = size.height / 2 - (bounds.y + bounds.height / 2) * scale;
  const zoomBy = (factor: number) => { setManualScale(Math.max(0.02, Math.min(4, scale * factor))); setFocus("manual"); };
  useEffect(() => {
    setLiveTarget(null);
    const container = stage.current;
    if (!container || !highlightNodeId || !snapshot.resolvedTree) return;
    let resize: ResizeObserver | null = null;
    const measure = () => {
      const nodes = [...container.querySelectorAll<HTMLElement>("[data-package-node-id]")];
      const node = nodes.find((candidate) => candidate.dataset.packageNodeId === highlightNodeId);
      const root = nodes.find((candidate) => candidate.dataset.packageNodeId === snapshot.resolvedTree?.rootNodeId);
      if (!node || !root || scaleRef.current <= 0) return;
      const nodeRect = node.getBoundingClientRect();
      const rootRect = root.getBoundingClientRect();
      const next = { x: (nodeRect.left - rootRect.left) / scaleRef.current, y: (nodeRect.top - rootRect.top) / scaleRef.current, width: nodeRect.width / scaleRef.current, height: nodeRect.height / scaleRef.current };
      if (next.width > 0 && next.height > 0) setLiveTarget((current) => current && Object.keys(next).every((key) => Math.abs(current[key as keyof typeof next] - next[key as keyof typeof next]) < .25) ? current : next);
      resize?.disconnect(); resize = new ResizeObserver(measure); resize.observe(node); resize.observe(root);
    };
    const mutations = new MutationObserver(measure);
    mutations.observe(container, { childList: true, subtree: true });
    requestAnimationFrame(measure);
    return () => { mutations.disconnect(); resize?.disconnect(); };
  }, [highlightNodeId, snapshot.resolvedTree]);
  return <>
    {showControls && <div className="inspection-preview-toolbar" aria-label="Preview controls"><div className="inspection-preview-toolbar__fit">
      <IconButton size="small" label="Fit template" icon={<Maximize2 size={16} />} aria-pressed={focus === "template"} onClick={() => setFocus("template")} />
      {highlightNodeId && <IconButton size="small" label="Fit selected field" icon={<Focus size={16} />} disabled={!target} aria-pressed={focus === "target"} onClick={() => setFocus("target")} />}
    </div><div className="inspection-preview-toolbar__zoom"><IconButton size="small" label="Zoom out" icon={<ZoomOut size={16} />} onClick={() => zoomBy(0.8)} /><span className="inspection-preview-toolbar__scale" aria-live="polite">{Math.round(scale * 100)}%</span><IconButton size="small" label="Zoom in" icon={<ZoomIn size={16} />} onClick={() => zoomBy(1.25)} /></div></div>}
    <div ref={setStage} className="studio-setup-canvas" tabIndex={0} aria-label="Design canvas">
      <div style={{ width, height, position: "absolute", transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`, transformOrigin: "top left", opacity: size.width > 0 ? 1 : 0 }}>
          <TemplateFieldSessionRendererV2 session={session} ref={rendererRef} mode={mode} motionRenderMode="final-frame" highlightNodeId={highlightNodeId}
            fallback={stage.current ? createPortal(<p className="studio-preview-fallback" role="status">{mode === "editor" ? "Preview unavailable. Correct or reset the affected content." : "Preview unavailable. Inspect the current issues in Validate."}</p>, stage.current) : null} />
      </div>
    </div>
  </>;
}

/** Shared chrome; configuration and diagnostic actions belong in the task column. */
export function SetupPreviewPanel({ title = "Design preview", selector, children, mode = "workspace" }: {
  title?: string;
  selector?: React.ReactNode;
  children: React.ReactNode;
  mode?: "inspection" | "workspace" | "summary";
}) {
  return <aside className="studio-setup-preview" data-preview-mode={mode} data-fields-region="preview" aria-label="Setup preview">
    <h2 className="ui-subsection-title">{title}</h2>
    {children}
    {selector ? <div className="studio-preview-selection">{selector}</div> : null}
  </aside>;
}
