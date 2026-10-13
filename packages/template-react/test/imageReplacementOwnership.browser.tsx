import { createElement, createRef, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createTemplateSessionV2, createTemplateFieldFamilySessionV2 } from "@sleinity/template-browser/session";
import { createTemplateFieldFamilyFromSourcesV2 } from "@sleinity/template-browser/importer";
import { TemplateFieldSessionRendererV2, type TemplateFieldSessionRendererV2Handle } from "@sleinity/template-react/editor";
import { v2Package } from "../../template-browser/test/sessionContract.fixtures";
/** Synthetic image lifecycle evidence only; no new source-fidelity certification. */
export async function startImageOwnershipProbe(kind: "single" | "family", oldData: string, nextData: string) {
  const pkg = v2Package(), field = pkg.editableFields.find(f => f.type === "image")!;
  const rootNode = pkg.nodes[pkg.rootNodeId], imageNode = pkg.nodes[field.binding.nodeId];
  rootNode.children = [imageNode.id]; imageNode.children = []; imageNode.parentId = rootNode.id;
  pkg.nodes = { [rootNode.id]: rootNode, [imageNode.id]: imageNode }; pkg.editableFields = [field]; pkg.editableFieldOrder = [field.id];
  pkg.fontRequirements = []; pkg.canvas.width = 64; pkg.canvas.height = 64;
  for (const node of [rootNode, imageNode]) { node.bounds = { relative: { x: 0, y: 0, width: 64, height: 64 }, absolute: { x: 0, y: 0, width: 64, height: 64 } }; node.layout.mode = "NONE"; node.sizing = { horizontal: { mode: "FIXED", value: 64, min: null, max: null }, vertical: { mode: "FIXED", value: 64, min: null, max: null } }; }
  imageNode.positioning = "ABSOLUTE";
  const host = document.createElement("div"); document.body.replaceChildren(host); const renderRoot = createRoot(host);
  const created: string[] = [], revoked: string[] = [];
  const objectUrls = { create: (blob: Blob) => { const url = URL.createObjectURL(blob); created.push(url); return url; }, revoke: (url: string) => { revoked.push(url); URL.revokeObjectURL(url); } };
  const session = kind === "single" ? createTemplateSessionV2({ objectUrls }) : createTemplateFieldFamilySessionV2({ objectUrls });
  if (kind === "single") (session as ReturnType<typeof createTemplateSessionV2>).load(pkg); else (session as ReturnType<typeof createTemplateFieldFamilySessionV2>).load(createTemplateFieldFamilyFromSourcesV2([pkg, pkg], "Synthetic ownership"));
  const image = () => { const c = session.getFieldControllers().find(c => c.type === "image"); if (!c || c.type !== "image") throw Error("Image controller missing: " + JSON.stringify(session.getSnapshot())); return c; };
  const blob = await (await fetch(oldData)).blob(); const first = await image().replaceImage({ blob, assetId: "same-id", width: 1, height: 1 }); if (!first.accepted) throw Error("Blob replacement rejected");
  const oldUrl = session.getSnapshot().sessionAssets["same-id"].stableUrl!;
  const peer = createTemplateSessionV2(); peer.load(structuredClone(session.getSnapshot().workingPackage!));
  const currentRef = createRef<TemplateFieldSessionRendererV2Handle>(), peerRef = createRef<TemplateFieldSessionRendererV2Handle>();
  renderRoot.render(createElement(StrictMode, null, createElement("div", { id: "current" }, createElement(TemplateFieldSessionRendererV2, { ref: currentRef, session, mode: "editor" })), createElement("div", { id: "peer" }, createElement(TemplateFieldSessionRendererV2, { ref: peerRef, session: peer, mode: "editor" }))));
  return {
    state: () => ({ ready: session.getSnapshot().readiness.exportReady && peer.getSnapshot().readiness.exportReady && currentRef.current?.getRenderIdentity()?.readiness === "ready" && peerRef.current?.getRenderIdentity()?.readiness === "ready", revision: session.getSnapshot().revision, created: [...created], revoked: [...revoked], oldUrl, currentAsset: session.getSnapshot().sessionAssets["same-id"] }),
    replace: () => image().replaceImage({ dataUrl: nextData, assetId: "same-id", width: 1, height: 1 }),
    export: async () => ({ current: await currentRef.current!.exportPng({ download: false }), peer: await peerRef.current!.exportPng({ download: false }) }),
    releasePeer: () => peer.dispose(),
    dispose: () => { renderRoot.unmount(); session.dispose(); peer.dispose(); host.remove(); },
  };
}
