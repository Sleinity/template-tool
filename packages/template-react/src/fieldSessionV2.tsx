import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PropsWithChildren,
  type ReactNode,
} from "react";
import {
  createTemplateFieldFamilySessionV2,
  createTemplateSessionV2,
  type TemplateFieldControllerV2,
  type TemplateFieldFamilySessionV2,
  type TemplateFieldFamilySessionV2Options,
  type TemplateFieldFamilySessionV2Snapshot,
  type TemplateSessionV2,
  type TemplateSessionV2Options,
  type TemplateSessionV2Snapshot,
} from "@sleinity/template-browser/session";
import { downloadPngDataUrl, exportTemplatePackagePng } from "@sleinity/template-browser/capture";
import { getManagedFontRegistry, prepareTemplatePackageFonts, type ManagedFontRegistry } from "@sleinity/template-browser/fonts";
import type { PackagePngExportRequest, PackagePngExportResult } from "@sleinity/template-browser";
import {
  TemplatePackageRenderer,
  type TemplatePackageMotionRenderMode,
  type TemplatePackageRenderMode,
  type TemplateRenderedTextLineEvidenceV1,
} from "./render/TemplatePackageRenderer";
import type { ResolvedProductRenderIdentityV1 } from "./render/productRenderIdentity";

import { useFieldSessionSnapshotV2 } from "./internal/useFieldSessionSnapshotV2";

export type ReactTemplateFieldSessionV2 =
  | TemplateSessionV2
  | TemplateFieldFamilySessionV2;

const TemplateFieldSessionV2Context = createContext<ReactTemplateFieldSessionV2 | null>(null);

export interface TemplateFieldSessionV2ProviderProps {
  session: ReactTemplateFieldSessionV2;
}

export function TemplateFieldSessionV2Provider({
  session,
  children,
}: PropsWithChildren<TemplateFieldSessionV2ProviderProps>) {
  return (
    <TemplateFieldSessionV2Context.Provider value={session}>
      {children}
    </TemplateFieldSessionV2Context.Provider>
  );
}

function resolvedSession(
  override?: ReactTemplateFieldSessionV2,
): ReactTemplateFieldSessionV2 {
  const context = useContext(TemplateFieldSessionV2Context);
  const session = override ?? context;
  if (!session) {
    throw new Error(
      "A V2 field session is required. Pass one or use TemplateFieldSessionV2Provider.",
    );
  }
  return session;
}

function useOwnedSession<Session extends { dispose(): void }>(
  create: () => Session,
): Session {
  const [session] = useState(create);
  const lifecycleGeneration = useRef(0);
  useEffect(() => {
    const generation = ++lifecycleGeneration.current;
    return () => {
      queueMicrotask(() => {
        if (lifecycleGeneration.current === generation) session.dispose();
      });
    };
  }, [session]);
  return session;
}

/** Owns one canonical TemplatePackageV2 browser session for a React host. */
export function useTemplateSessionV2(
  options: TemplateSessionV2Options = {},
): TemplateSessionV2 {
  return useOwnedSession(() => createTemplateSessionV2(options));
}

/** Owns one shared-content V2 Template Field Family session. */
export function useTemplateFieldFamilySessionV2(
  options: TemplateFieldFamilySessionV2Options = {},
): TemplateFieldFamilySessionV2 {
  return useOwnedSession(() => createTemplateFieldFamilySessionV2(options));
}

export function useTemplateFieldSessionV2Snapshot(
  sessionOverride?: ReactTemplateFieldSessionV2,
): TemplateSessionV2Snapshot | TemplateFieldFamilySessionV2Snapshot {
  const session = resolvedSession(sessionOverride);
  return useFieldSessionSnapshotV2(session).view.nativeSnapshot;
}

/**
 * Ordered, typed host controllers. `controlRole` is data only; React hosts
 * retain complete control-selection and fallback ownership.
 */
export function useTemplateFieldControllersV2(
  sessionOverride?: ReactTemplateFieldSessionV2,
): readonly TemplateFieldControllerV2[] {
  const session = resolvedSession(sessionOverride);
  useFieldSessionSnapshotV2(session);
  return session.getFieldControllers();
}

export type TemplateFieldSessionV2PngExportOptions = Omit<
  PackagePngExportRequest,
  "packageValue" | "node" | "renderMode" | "fontRegistry"
>;

export interface TemplateFieldSessionRendererV2Handle {
  exportPng(options?: TemplateFieldSessionV2PngExportOptions): Promise<PackagePngExportResult>;
  getRenderIdentity(): ResolvedProductRenderIdentityV1 | null;
}

export interface TemplateFieldSessionRendererV2Props {
  session?: ReactTemplateFieldSessionV2;
  /** Borrowed font authority. Omitted uses the default registry; null disables registry lookup. */
  fontRegistry?: ManagedFontRegistry | null;
  mode?: TemplatePackageRenderMode;
  className?: string;
  style?: CSSProperties;
  fallback?: ReactNode;
  debugOverlay?: boolean;
  highlightNodeId?: string | null;
  highlightNodeIds?: string[];
  motionTimeMs?: number;
  motionRenderMode?: TemplatePackageMotionRenderMode;
  onAssetLoadError?: (assetId: string, nodeId: string) => void;
  onRenderIdentity?: (identity: ResolvedProductRenderIdentityV1) => void;
}

interface RuntimePublisherScope {
  session: ReactTemplateFieldSessionV2;
  registryInput: ManagedFontRegistry | null | undefined;
  fontRegistry: ManagedFontRegistry | null;
  base: number;
  active: boolean;
}

/**
 * The ordinary V2 rendering bridge. It is the sole publisher of renderer-backed
 * field evidence; hosts consume controller state and never submit line counts.
 */
export const TemplateFieldSessionRendererV2 = forwardRef<
  TemplateFieldSessionRendererV2Handle,
  TemplateFieldSessionRendererV2Props
>(function TemplateFieldSessionRendererV2(
  {
    session: sessionOverride,
    fontRegistry,
    mode = "static",
    className,
    style,
    fallback = null,
    debugOverlay,
    highlightNodeId,
    highlightNodeIds,
    motionTimeMs,
    motionRenderMode,
    onAssetLoadError,
    onRenderIdentity,
  },
  forwardedRef,
) {
  const session = resolvedSession(sessionOverride);
  // Acquiring authority is a commit-side effect. StrictMode may evaluate a
  // render/state initializer twice and discard the state that owned the lease.
  const [publicationLease, setPublicationLease] = useState<RuntimePublisherScope | null>(null);
  const scopeRef = useRef<RuntimePublisherScope | null>(null);
  const publicationScope = publicationLease?.session === session &&
    publicationLease.registryInput === fontRegistry && publicationLease.active
    ? publicationLease : null;
  const publicationLeaseBase = publicationScope?.base ?? 0;
  const scopeIsCurrent = useCallback((scope: RuntimePublisherScope | null) =>
    Boolean(scope?.active && scopeRef.current === scope), []);
  const { reader, view: snapshot } = useFieldSessionSnapshotV2(session);
  const rendererAvailable = snapshot.status === "ready" && Boolean(snapshot.rendererPackage && snapshot.resolvedTree);
  const hostRef = useRef<HTMLDivElement>(null);
  const latestLineEvidence = useRef(new Map<string, {
    contextKey: string;
    evidence: TemplateRenderedTextLineEvidenceV1;
  }>());
  const fontAuthority = useRef<{
    contextKey: string;
    publicationGeneration: number;
    ready: boolean;
  } | null>(null);
  const [identity, setIdentity] = useState<ResolvedProductRenderIdentityV1 | null>(null);
  const identityRef = useRef<{ scope: RuntimePublisherScope; value: ResolvedProductRenderIdentityV1 } | null>(null);
  useLayoutEffect(() => {
    if (!rendererAvailable) return;
    // A canonical error unmounts the inner renderer and its local generation
    // counter. Recovery needs a fresh lease so new evidence cannot be mistaken
    // for an older publication from before that unmount.
    const scope: RuntimePublisherScope = {
      session, registryInput: fontRegistry,
      fontRegistry: fontRegistry === undefined ? getManagedFontRegistry() : fontRegistry,
      base: session.beginRuntimeEvidencePublication(), active: true,
    };
    scopeRef.current = scope;
    latestLineEvidence.current.clear();
    fontAuthority.current = null;
    identityRef.current = null;
    setIdentity(null);
    setPublicationLease(scope);
    return () => {
      scope.active = false;
      if (scopeRef.current === scope) scopeRef.current = null;
    };
  }, [session, fontRegistry, rendererAvailable]);
  const configuredPackage = snapshot.configuredPackage;
  const contentRevision = snapshot.contentRevision;
  const operationRevision = snapshot.operationRevision;
  const materializationRevision = snapshot.materializationRevision;
  const rendererPackage = snapshot.rendererPackage;
  // The existing renderer allocates publication generations on package identity.
  // A new committed publisher must validate and observe again, even when its
  // canonical content is unchanged. Keep the same data and mounted measurement
  // caches; only the private publication shell changes with the committed lease.
  const publicationPackage = useMemo(() => rendererPackage
    ? { ...rendererPackage } : null, [rendererPackage, publicationLease]);
  const resolvedTree = snapshot.resolvedTree;
  const evidenceContext = useMemo(() => {
    if (
      contentRevision === null ||
      !materializationRevision ||
      !rendererPackage ||
      !resolvedTree
    ) return null;
    return {
      contextKey: `${rendererPackage.packageId}:${operationRevision}:${contentRevision}:${materializationRevision}`,
      operationRevision,
      contentRevision,
      materializationRevision,
      packageIdentity: rendererPackage.packageId,
      packageValue: rendererPackage,
      resolvedTree,
    };
  }, [operationRevision, contentRevision, materializationRevision, rendererPackage, resolvedTree]);
  const requests = useMemo(() => configuredPackage?.editableFields.flatMap((field) =>
    field.type === "textarea" &&
      (field.configuration.maxLines !== undefined || field.configuration.warningAtLines !== undefined)
      ? [{ fieldId: field.id, nodeId: field.binding.nodeId }]
      : []
  ) ?? [], [configuredPackage]);
  const publishRuntime = useCallback((value: {
    settlementRevision: string;
    fontRevision: string;
    publicationGeneration: number;
    renderer?: "pending" | "ready" | "blocked";
    fonts?: "pending" | "ready" | "blocked";
  }, expected: NonNullable<typeof evidenceContext>) => {
    if (!scopeIsCurrent(publicationScope)) return false;
    const current = reader.getSnapshot();
    const contentRevision = current.contentRevision;
    const materializationRevision = current.materializationRevision;
    if (
      current.operationRevision !== expected.operationRevision ||
      contentRevision !== expected.contentRevision ||
      materializationRevision !== expected.materializationRevision ||
      current.configuredPackage?.packageId !== expected.packageIdentity
    ) return false;
    return session.publishRuntimeReadiness({
      contentRevision: expected.contentRevision,
      materializationRevision: expected.materializationRevision,
      ...value,
    });
  }, [publicationScope, scopeIsCurrent, reader, session]);
  const publishLineEvidence = useCallback((
    evidence: TemplateRenderedTextLineEvidenceV1,
    expected: NonNullable<typeof evidenceContext>,
    fontsReady: boolean,
  ) => {
    const publicationGeneration = publicationLeaseBase + evidence.publicationGeneration;
    if (!publishRuntime({
      settlementRevision: evidence.settlementRevision,
      fontRevision: evidence.fontRevision,
      publicationGeneration,
      renderer: evidence.reliability === "unsupported" ? "blocked" : evidence.reliability === "reliable" ? "ready" : "pending",
    }, expected)) return false;
    const reliability = evidence.participation === "structurally-excluded" || fontsReady
      ? evidence.reliability
      : evidence.reliability === "unsupported"
        ? "unsupported"
        : "pending";
    return session.publishFieldLayoutEvidence({
      schemaVersion: "field-layout-evidence-v1",
      fieldId: evidence.fieldId,
      packageIdentity: expected.packageIdentity,
      contentRevision: expected.contentRevision,
      materializationRevision: expected.materializationRevision,
      settlementRevision: evidence.settlementRevision,
      fontRevision: evidence.fontRevision,
      publicationGeneration,
      participation: evidence.participation,
      ...(evidence.measuredVisualLines !== undefined
        ? { measuredVisualLines: evidence.measuredVisualLines }
        : {}),
      reliability,
    });
  }, [publicationLeaseBase, publishRuntime, session]);
  const handleIdentity = useCallback((value: ResolvedProductRenderIdentityV1) => {
    if (!evidenceContext || !publicationScope || !scopeIsCurrent(publicationScope)) return;
    const renderer = value.readiness === "ready"
      ? "ready"
      : value.readiness === "unsupported"
        ? "blocked"
        : "pending";
    const canvas = hostRef.current?.querySelector<HTMLElement>("[data-template-package-canvas]");
    const publicationGeneration = publicationLeaseBase + Number(canvas?.dataset.packageSettlementGeneration ?? 0);
    const acceptedIdentity = publishRuntime({
      settlementRevision: value.settlementRevision,
      fontRevision: value.fontRevision,
      publicationGeneration,
      renderer,
      fonts: "pending",
    }, evidenceContext);
    if (!acceptedIdentity) return;
    fontAuthority.current = {
      contextKey: evidenceContext.contextKey,
      publicationGeneration,
      ready: false,
    };
    identityRef.current = { scope: publicationScope, value };
    setIdentity(value);
    onRenderIdentity?.(value);
    if (typeof document !== "undefined" && document.fonts) {
      void prepareTemplatePackageFonts(
        evidenceContext.packageValue,
        evidenceContext.resolvedTree,
        document.fonts,
        publicationScope.fontRegistry,
      ).then((report) => {
        if (!scopeIsCurrent(publicationScope)) return;
        const accepted = publishRuntime({
          settlementRevision: value.settlementRevision,
          fontRevision: value.fontRevision,
          publicationGeneration,
          fonts: report.exportReady ? "ready" : "blocked",
          renderer,
        }, evidenceContext);
        if (!accepted || !report.exportReady) return;
        fontAuthority.current = {
          contextKey: evidenceContext.contextKey,
          publicationGeneration,
          ready: true,
        };
        for (const cached of latestLineEvidence.current.values()) {
          if (
            cached.contextKey === evidenceContext.contextKey &&
            publicationLeaseBase + cached.evidence.publicationGeneration === publicationGeneration
          ) publishLineEvidence(cached.evidence, evidenceContext, true);
        }
      }).catch(() => {
        if (!scopeIsCurrent(publicationScope)) return;
        publishRuntime({
          settlementRevision: value.settlementRevision,
          fontRevision: value.fontRevision,
          publicationGeneration,
          fonts: "blocked",
          renderer,
        }, evidenceContext);
      });
    } else {
      publishRuntime({
        settlementRevision: value.settlementRevision,
        fontRevision: value.fontRevision,
        publicationGeneration,
        fonts: "blocked",
        renderer,
      }, evidenceContext);
    }
  }, [evidenceContext, onRenderIdentity, publicationLeaseBase, publicationScope, scopeIsCurrent, publishLineEvidence, publishRuntime]);
  const handleLineEvidence = useCallback((evidence: TemplateRenderedTextLineEvidenceV1) => {
    if (!evidenceContext || !scopeIsCurrent(publicationScope)) return;
    const publicationGeneration = publicationLeaseBase + evidence.publicationGeneration;
    latestLineEvidence.current.set(evidence.fieldId, {
      contextKey: evidenceContext.contextKey,
      evidence,
    });
    const fontsReady = fontAuthority.current?.contextKey === evidenceContext.contextKey &&
      fontAuthority.current.publicationGeneration === publicationGeneration &&
      fontAuthority.current.ready;
    publishLineEvidence(evidence, evidenceContext, Boolean(fontsReady));
  }, [evidenceContext, publicationLeaseBase, publicationScope, scopeIsCurrent, publishLineEvidence]);
  useImperativeHandle(forwardedRef, () => ({
    getRenderIdentity: () => scopeIsCurrent(publicationScope) && identityRef.current?.scope === publicationScope
      ? identityRef.current.value : null,
    async exportPng(options = {}) {
      const current = reader.getSnapshot();
      const scope = publicationScope;
      const node = hostRef.current;
      const renderIdentity = identityRef.current;
      if (!scope || !scopeIsCurrent(scope) || renderIdentity?.scope !== scope ||
          !current.rendererPackage || !node || !current.readiness.exportReady || renderIdentity.value.readiness !== "ready") {
        throw new Error("PNG export requires current renderer-backed field validation and render readiness.");
      }
      const assertCurrent = () => {
        const latest = reader.getSnapshot();
        if (!scopeIsCurrent(scope) || hostRef.current !== node || !node.isConnected ||
            latest.status !== "ready" || !latest.readiness.exportReady ||
            latest.operationRevision !== current.operationRevision ||
            latest.contentRevision !== current.contentRevision ||
            latest.materializationRevision !== current.materializationRevision ||
            latest.configuredPackage?.packageId !== current.configuredPackage?.packageId ||
            identityRef.current?.scope !== scope ||
            identityRef.current.value.identityId !== renderIdentity.value.identityId) {
          throw new Error("PNG export was superseded by a font registry, session, or renderer change.");
        }
      };
      let result: PackagePngExportResult;
      try {
        result = await exportTemplatePackagePng({
          ...options,
          download: false,
          fontRegistry: scope.fontRegistry,
          packageValue: current.rendererPackage,
          node,
          renderMode: mode,
          fontSet: options.fontSet ?? (typeof document === "undefined" ? undefined : document.fonts),
          templateName: options.templateName ?? current.rendererPackage.name,
          onProgress: message => { assertCurrent(); options.onProgress?.(message); },
        });
      } catch (error) {
        assertCurrent();
        throw error;
      }
      assertCurrent();
      if (options.download !== false) {
        options.onProgress?.("Downloading PNG…");
        assertCurrent();
        downloadPngDataUrl(result.filename, result.pngDataUrl);
      }
      return result;
    },
  }), [identity, mode, reader, publicationScope, scopeIsCurrent]);
  if (snapshot.status !== "ready" || !snapshot.rendererPackage || !snapshot.resolvedTree) return <>{fallback}</>;
  return (
    <div ref={hostRef} className={className} style={style} data-template-field-session-v2-revision={snapshot.revision}>
      <TemplatePackageRenderer
        packageValue={publicationPackage!}
        resolvedTree={snapshot.resolvedTree}
        mode={mode}
        debugOverlay={debugOverlay}
        highlightNodeId={highlightNodeId}
        highlightNodeIds={highlightNodeIds}
        motionTimeMs={motionTimeMs}
        motionRenderMode={motionRenderMode}
        onAssetLoadError={onAssetLoadError}
        onRenderIdentity={handleIdentity}
        textLineEvidenceRequests={requests}
        onTextLineEvidence={handleLineEvidence}
      />
    </div>
  );
});
