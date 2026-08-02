import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type PropsWithChildren,
  type ReactNode,
} from "react";
import {
  createTemplateSession,
  type TemplateSessionOptions,
  type TemplateSessionSnapshotV1,
  type TemplateSessionV1,
} from "@sleinity/template-browser/session";
import {
  exportTemplatePackagePng,
  type PackagePngExportRequest,
  type PackagePngExportResult,
} from "@sleinity/template-browser";
import {
  TemplatePackageRenderer,
  type TemplatePackageMotionRenderMode,
  type TemplatePackageRenderMode,
} from "./render/TemplatePackageRenderer";
import type { ResolvedProductRenderIdentityV1 } from "./render/productRenderIdentity";

const TemplateSessionContext = createContext<TemplateSessionV1 | null>(null);

export interface TemplateSessionProviderProps {
  session: TemplateSessionV1;
}

/**
 * Owns one browser session for the mounted React workspace. Disposal is
 * deferred by one microtask so React StrictMode's development effect replay
 * cannot dispose the active session between its synthetic cleanup/setup pair.
 */
export function useTemplateSession(
  options: TemplateSessionOptions = {},
): TemplateSessionV1 {
  const [session] = useState(() => createTemplateSession(options));
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

export function TemplateSessionProvider({
  session,
  children,
}: PropsWithChildren<TemplateSessionProviderProps>) {
  return (
    <TemplateSessionContext.Provider value={session}>
      {children}
    </TemplateSessionContext.Provider>
  );
}

function useResolvedTemplateSession(override?: TemplateSessionV1): TemplateSessionV1 {
  const context = useContext(TemplateSessionContext);
  const session = override ?? context;
  if (!session) {
    throw new Error(
      "A TemplateSession is required. Pass session or use TemplateSessionProvider.",
    );
  }
  return session;
}

export function useTemplateSessionSnapshot(
  sessionOverride?: TemplateSessionV1,
): TemplateSessionSnapshotV1 {
  const session = useResolvedTemplateSession(sessionOverride);
  return useSyncExternalStore(
    session.subscribe,
    session.getSnapshot,
    session.getSnapshot,
  );
}

export type TemplateSessionPngExportOptions = Omit<
  PackagePngExportRequest,
  "packageValue" | "node" | "renderMode"
>;

export interface TemplateSessionRendererHandle {
  exportPng(options?: TemplateSessionPngExportOptions): Promise<PackagePngExportResult>;
  getRenderIdentity(): ResolvedProductRenderIdentityV1 | null;
}

export interface TemplateSessionRendererProps {
  session?: TemplateSessionV1;
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

interface RevisionedIdentity {
  sessionRevision: number;
  value: ResolvedProductRenderIdentityV1;
}

export const TemplateSessionRenderer = forwardRef<
  TemplateSessionRendererHandle,
  TemplateSessionRendererProps
>(function TemplateSessionRenderer(
  {
    session: sessionOverride,
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
  const session = useResolvedTemplateSession(sessionOverride);
  const snapshot = useTemplateSessionSnapshot(session);
  const hostRef = useRef<HTMLDivElement>(null);
  const [identity, setIdentity] = useState<RevisionedIdentity | null>(null);
  const currentIdentity = identity?.sessionRevision === snapshot.revision
    ? identity.value
    : null;
  const handleIdentity = useCallback(
    (value: ResolvedProductRenderIdentityV1) => {
      setIdentity({ sessionRevision: snapshot.revision, value });
      onRenderIdentity?.(value);
    },
    [onRenderIdentity, snapshot.revision],
  );

  useImperativeHandle(forwardedRef, () => ({
    getRenderIdentity: () => currentIdentity,
    async exportPng(options = {}) {
      const latestSnapshot = session.getSnapshot();
      const latestIdentity = identity?.sessionRevision === latestSnapshot.revision
        ? identity.value
        : null;
      if (
        latestSnapshot.status !== "ready" ||
        !latestSnapshot.workingPackage ||
        !hostRef.current ||
        latestIdentity?.readiness !== "ready"
      ) {
        throw new Error(
          "PNG export requires the current TemplateSession render identity to be ready.",
        );
      }
      return exportTemplatePackagePng({
        ...options,
        packageValue: latestSnapshot.workingPackage,
        node: hostRef.current,
        renderMode: mode,
        fontSet: options.fontSet ?? (
          typeof document === "undefined" ? undefined : document.fonts
        ),
        templateName: options.templateName ?? latestSnapshot.workingPackage.name,
      });
    },
  }), [currentIdentity, identity, mode, session]);

  if (
    snapshot.status !== "ready" ||
    !snapshot.workingPackage ||
    !snapshot.resolvedTree
  ) {
    return <>{fallback}</>;
  }

  return (
    <div
      ref={hostRef}
      className={className}
      style={style}
      data-template-session-revision={snapshot.revision}
    >
      <TemplatePackageRenderer
        packageValue={snapshot.workingPackage}
        resolvedTree={snapshot.resolvedTree}
        mode={mode}
        debugOverlay={debugOverlay}
        highlightNodeId={highlightNodeId}
        highlightNodeIds={highlightNodeIds}
        motionTimeMs={motionTimeMs}
        motionRenderMode={motionRenderMode}
        onAssetLoadError={onAssetLoadError}
        onRenderIdentity={handleIdentity}
      />
    </div>
  );
});
