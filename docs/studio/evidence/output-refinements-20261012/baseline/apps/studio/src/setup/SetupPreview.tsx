import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Focus, Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import { TemplateFieldSessionRendererV2, useTemplateFieldSessionV2Snapshot, type ReactTemplateFieldSessionV2, type TemplateFieldSessionRendererV2Handle } from "@sleinity/template-react";
import { IconButton } from "../components/ui";
import type { ResolvedRenderTreeV1 } from "@sleinity/template-core";

/** A view-location projection; never replaces native field participation. */
export function previewTargetState(tree: ResolvedRenderTreeV1 | null, nodeId?: string): "visible" | "hidden" | "unavailable" {
  const node = nodeId ? tree?.nodes[nodeId] : undefined;
  if (!node || !tree) return "unavailable";
  let ancestor: typeof node | undefined = node;
  while (ancestor) { if (!ancestor.appearance.visible) return "hidden"; ancestor = ancestor.parentId ? tree.nodes[ancestor.parentId] : undefined; }
  return node.bounds.absolute.width > 0 && node.bounds.absolute.height > 0 ? "visible" : "unavailable";
}

/** Studio viewport only: never changes the renderer's intrinsic canvas or layout. */
export function SetupPreview({ session, width, height, highlightNodeId, mode = "static", rendererRef, showControls = true, viewIdentity, designLabel, onMeasurementRootChange }: {
  mode?: "static" | "editor"; rendererRef?: React.Ref<TemplateFieldSessionRendererV2Handle>;
  session: ReactTemplateFieldSessionV2; width: number; height: number; highlightNodeId?: string; showControls?: boolean;
  onMeasurementRootChange?: (root: HTMLDivElement | null) => void;
  viewIdentity?: string;
  designLabel?: string;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 400, height: 400 });
  const [focus, setFocus] = useState<"template" | "target" | "manual">("template");
  const [manualScale, setManualScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [fieldFrame, setFieldFrame] = useState<{ nodeId: string; x: number; y: number; width: number; height: number } | null>(null);
  const drag = useRef<{ x: number; y: number; pan: typeof pan } | null>(null);
  const [liveTarget, setLiveTarget] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const scaleRef = useRef(1);
  const snapshot = useTemplateFieldSessionV2Snapshot(session);
  useLayoutEffect(() => { setFocus("template"); setPan({ x: 0, y: 0 }); setFieldFrame(null); drag.current = null; }, [session, viewIdentity]);
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
    return previewTargetState(snapshot.resolvedTree, highlightNodeId) === "visible" ? { x: node.bounds.absolute.x - (root?.bounds.absolute.x ?? 0), y: node.bounds.absolute.y - (root?.bounds.absolute.y ?? 0), width: node.bounds.absolute.width, height: node.bounds.absolute.height } : null;
  }, [highlightNodeId, snapshot.resolvedTree]);
  const target = resolvedTarget ? liveTarget ?? resolvedTarget : null;
  const framedTarget = mode === "editor" ? fieldFrame : target;
  const bounds = focus === "target" && framedTarget ? { x: framedTarget.x - 24, y: framedTarget.y - 24, width: framedTarget.width + 48, height: framedTarget.height + 48 } : { x: 0, y: 0, width, height };
  const fitted = Math.max(0.02, Math.min((size.width - 32) / bounds.width, (size.height - 32) / bounds.height, focus === "target" ? 4 : 1));
  const scale = focus === "manual" ? manualScale : fitted;
  scaleRef.current = scale;
  const translateX = size.width / 2 - (bounds.x + bounds.width / 2) * scale + pan.x;
  const translateY = size.height / 2 - (bounds.y + bounds.height / 2) * scale + pan.y;
  const fit = (next: "template" | "target") => { if (next === "target" && target && highlightNodeId) setFieldFrame({ ...target, nodeId: highlightNodeId }); setFocus(next); setPan({ x: 0, y: 0 }); };
  const zoomBy = (factor: number) => {
    // Preserve the currently viewed centre when leaving target-fit mode.
    const nextScale = Math.max(0.02, Math.min(4, scale * factor));
    setPan({ x: (translateX - (size.width / 2 - width / 2 * scale)) * nextScale / scale, y: (translateY - (size.height / 2 - height / 2 * scale)) * nextScale / scale });
    setManualScale(nextScale); setFocus("manual");
  };
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
      <IconButton size="small" label={mode === "editor" ? "Fit design" : "Fit template"} icon={<Maximize2 size={16} />} aria-pressed={focus === "template"} onClick={() => fit("template")} />
      {(highlightNodeId || mode === "editor") && <IconButton size="small" label={mode === "editor" ? "Fit field" : "Fit selected field"} icon={<Focus size={16} />} disabled={!target} aria-pressed={focus === "target" && (mode !== "editor" || fieldFrame?.nodeId === highlightNodeId)} onClick={() => fit("target")} />}
    </div>{designLabel && <span className="studio-preview-design-name" title={designLabel} role="status">{designLabel}</span>}<div className="inspection-preview-toolbar__zoom"><IconButton size="small" label="Zoom out" icon={<ZoomOut size={16} />} onClick={() => zoomBy(0.8)} /><span className="inspection-preview-toolbar__scale" aria-live="polite">{Math.round(scale * 100)}%</span><IconButton size="small" label="Zoom in" icon={<ZoomIn size={16} />} onClick={() => zoomBy(1.25)} /></div></div>}
    <div ref={setStage} className="studio-setup-canvas" tabIndex={0} aria-label="Design canvas" data-view-mode={focus}
      onPointerDown={event => { if (mode !== "editor" || event.button !== 0) return; event.preventDefault(); event.currentTarget.focus({ preventScroll: true }); drag.current = { x: event.clientX, y: event.clientY, pan: { x: translateX - (size.width / 2 - width / 2 * scale), y: translateY - (size.height / 2 - height / 2 * scale) } }; setManualScale(scale); setFocus("manual"); event.currentTarget.setPointerCapture(event.pointerId); }}
      onPointerMove={event => { if (drag.current) setPan({ x: drag.current.pan.x + event.clientX - drag.current.x, y: drag.current.pan.y + event.clientY - drag.current.y }); }}
      onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }}
      onKeyDown={event => { if (mode !== "editor" || event.target !== event.currentTarget) return;
        if (event.shiftKey && event.key === "1") { event.preventDefault(); fit("template"); }
        else if (event.shiftKey && event.key === "2" && target) { event.preventDefault(); fit("target"); }
        else if (event.key === "+" || event.key === "=") { event.preventDefault(); zoomBy(1.25); }
        else if (event.key === "-") { event.preventDefault(); zoomBy(.8); }
        else if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) { event.preventDefault(); setManualScale(scale); setFocus("manual"); setPan({ x: translateX - (size.width / 2 - width / 2 * scale) + (event.key === "ArrowLeft" ? 32 : event.key === "ArrowRight" ? -32 : 0), y: translateY - (size.height / 2 - height / 2 * scale) + (event.key === "ArrowUp" ? 32 : event.key === "ArrowDown" ? -32 : 0) }); }
      }}>
      <div data-studio-preview-transform style={{ width, height, position: "absolute", transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`, transformOrigin: "top left", opacity: size.width > 0 ? 1 : 0 }}>
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
