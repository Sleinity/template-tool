import { useCallback, useEffect, useMemo, useState } from "react";
import type { TemplatePackageV1 } from "../types";
import { createCanonicalSceneGraph, type CanonicalSceneGraphV1 } from "../scene";
import { createCoreLayoutRoute } from "./createCoreLayoutRoute";
import { settleCoreLayout } from "./settleCoreLayout";
import type { CoreLayoutRouteV1, CoreLayoutSettlementV1, IntrinsicTextMeasurementV1 } from "./types";
import { applyVerticalTrimCompatibilityRoute } from "./verticalTextTrim";
import { packageRuntimeFontSignature } from "../fonts/runtimeFontSignature";

export interface CoreLayoutRuntimeState {
  mode: "authoritative";
  canonicalRevision: string;
  revision: string;
  route: CoreLayoutRouteV1;
  preliminary: CoreLayoutSettlementV1;
  settled: CoreLayoutSettlementV1;
  publishTextMeasurement(measurement: Omit<IntrinsicTextMeasurementV1, "revision">): void;
}

function stableSignature(value: unknown): string {
  const source = JSON.stringify(value);
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) hash = Math.imul(hash ^ source.charCodeAt(index), 16777619);
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function renderSemanticRevisionInput(scene: CanonicalSceneGraphV1): unknown {
  return {
    schemaVersion: scene.schemaVersion,
    canvas: scene.canvas,
    rootNodeId: scene.rootNodeId,
    nodeOrder: scene.nodeOrder,
    nodes: scene.nodeOrder.map((nodeId) => {
      const node = scene.nodes[nodeId];
      return {
        id: nodeId,
        parentId: node.identity.parentId,
        children: node.identity.children,
        layout: {
          positioning: node.layout.positioning.value,
          mode: node.layout.autoLayout.mode.value,
          wrap: node.layout.autoLayout.wrap.value,
          gap: node.layout.autoLayout.gap.value,
          rowGap: node.layout.autoLayout.rowGap.value,
          columnGap: node.layout.autoLayout.columnGap.value,
          padding: node.layout.autoLayout.padding.value,
          primary: node.layout.autoLayout.primaryAlignment.value,
          counter: node.layout.autoLayout.counterAlignment.value,
          horizontal: { mode: node.layout.sizing.horizontal.mode.value, value: node.layout.sizing.horizontal.value.value, min: node.layout.sizing.horizontal.min.value, max: node.layout.sizing.horizontal.max.value },
          vertical: { mode: node.layout.sizing.vertical.mode.value, value: node.layout.sizing.vertical.value.value, min: node.layout.sizing.vertical.min.value, max: node.layout.sizing.vertical.max.value },
        },
        bounds: node.geometry.relativeBounds.value,
        text: node.text ? {
          characters: node.text.characters.value,
          family: node.text.fontFamily.value,
          style: node.text.fontStyle.value,
          weight: node.text.fontWeight.value,
          size: node.text.fontSize.value,
          lineHeight: node.text.lineHeight.value,
          letterSpacing: node.text.letterSpacing.value,
          paragraphSpacing: node.text.paragraphSpacing.value,
          leadingTrim: node.text.leadingTrim.value,
          autoResize: node.text.autoResize.value,
          styleRanges: node.text.styleRanges,
        } : null,
        media: node.media ? { assetId: node.media.assetId.value, scaleMode: node.media.scaleMode.value, transform: node.media.imageTransform.value, focal: node.media.focalPosition.value, activePlacementState: node.media.activePlacementState.value, placementRevision: node.media.placementRevision.value, replacementMode: node.media.replacementMode.value, intrinsic: node.media.intrinsicSize } : null,
        clipsContent: node.appearance.clipping.clipsContent.value,
        mask: node.relationships.maskRelationship,
        transform: { relative: node.transform.relativeTransform.value, matrix: node.transform.transform.value, rotation: node.transform.rotation.value },
      };
    }),
    fonts: scene.fonts.map((font) => ({ family: font.family, style: font.style, weight: font.weight, postScriptName: font.postScriptName, usedBy: font.usedBy })),
  };
}

export function useCoreLayoutRuntime(packageValue: TemplatePackageV1): CoreLayoutRuntimeState {
  const [, setFontEpoch] = useState(0);
  const [measurements, setMeasurements] = useState<Record<string, IntrinsicTextMeasurementV1>>({});
  const scene = useMemo(() => createCanonicalSceneGraph(packageValue).graph, [packageValue]);
  const packageSignature = useMemo(() => stableSignature(renderSemanticRevisionInput(scene)), [scene]);
  const fontSignature = packageRuntimeFontSignature(packageValue);
  const revision = `${packageSignature}|${stableSignature(fontSignature)}`;
  const baseRoute = useMemo(() => createCoreLayoutRoute(scene), [scene]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const refresh = () => setFontEpoch((current) => current + 1);
    document.fonts?.addEventListener?.("loadingdone", refresh);
    document.fonts?.addEventListener?.("loadingerror", refresh);
    return () => {
      document.fonts?.removeEventListener?.("loadingdone", refresh);
      document.fonts?.removeEventListener?.("loadingerror", refresh);
    };
  }, []);

  useEffect(() => setMeasurements({}), [revision]);

  const publishTextMeasurement = useCallback((measurement: Omit<IntrinsicTextMeasurementV1, "revision">) => {
    const current = { ...measurement, revision };
    setMeasurements((previous) => {
      const existing = previous[measurement.nodeId];
      if (
        existing &&
        existing.revision === revision &&
        Math.abs(existing.width - current.width) < 0.01 &&
        Math.abs(existing.height - current.height) < 0.01 &&
        existing.lineCount === current.lineCount &&
        existing.fontState === current.fontState &&
        existing.trimAuthority === current.trimAuthority &&
        existing.verticalTrim === current.verticalTrim &&
        Math.abs((existing.capHeight ?? 0) - (current.capHeight ?? 0)) < 0.01 &&
        Math.abs((existing.glyphOrigin?.translationY ?? 0) - (current.glyphOrigin?.translationY ?? 0)) < 0.01 &&
        Math.abs((existing.glyphOrigin?.resolvedFinalBaselineY ?? 0) - (current.glyphOrigin?.resolvedFinalBaselineY ?? 0)) < 0.01
      ) return previous;
      return { ...previous, [measurement.nodeId]: current };
    });
  }, [revision]);

  const route = useMemo(
    () => applyVerticalTrimCompatibilityRoute(scene, baseRoute, measurements),
    [baseRoute, measurements, scene],
  );
  const preliminary = useMemo(() => settleCoreLayout({ scene, route, revision }), [revision, route, scene]);
  const settled = useMemo(() => settleCoreLayout({ scene, route, revision, textMeasurements: Object.values(measurements) }), [measurements, revision, route, scene]);
  return { mode: "authoritative", canonicalRevision: packageSignature, revision, route, preliminary, settled, publishTextMeasurement };
}
