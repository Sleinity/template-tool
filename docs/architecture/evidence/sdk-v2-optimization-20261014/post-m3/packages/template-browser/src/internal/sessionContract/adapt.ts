import type { TemplateSessionV2, TemplateSessionV2Snapshot } from "../../session/templateSessionV2";
import type { TemplateFieldFamilySessionV2, TemplateFieldFamilySessionV2Snapshot } from "../../session/templateFieldFamilySessionV2";
import type { SingleSessionAdapter, FamilySessionAdapter, InternalSessionView } from "./types";

function borrowView(kind: "single" | "family", snapshot: TemplateSessionV2Snapshot | TemplateFieldFamilySessionV2Snapshot): InternalSessionView {
  const common = {
    status: snapshot.status,
    revision: snapshot.revision,
    operationRevision: snapshot.operationRevision,
    contentRevision: snapshot.contentState?.revision ?? null,
    fields: snapshot.fields,
    sessionAssets: snapshot.sessionAssets,
    readiness: snapshot.readiness,
    workingPackage: snapshot.workingPackage,
    rendererPackage: snapshot.rendererPackage,
    resolvedTree: snapshot.resolvedTree,
  };
  if (kind === "single" && "basePackage" in snapshot) return Object.freeze({
    ...common, kind, nativeSnapshot: snapshot, contentState: snapshot.contentState,
    configuredPackage: snapshot.basePackage, savedRecordId: snapshot.savedSessionId,
    materializationRevision: snapshot.materialization?.materializationRevision ?? null,
    error: snapshot.error,
  });
  if (kind === "family" && "family" in snapshot) return Object.freeze({
    ...common, kind, nativeSnapshot: snapshot, contentState: snapshot.contentState,
    configuredPackage: snapshot.effectivePackage, savedRecordId: snapshot.savedFamilyId,
    selectedVariantId: snapshot.selectedVariantId,
    materializationRevision: snapshot.familyMaterialization?.materialization?.materializationRevision ?? null,
    error: snapshot.error,
  });
  throw new Error("Internal session kind does not match its native snapshot.");
}

function borrowSession(kind: "single" | "family", authority: TemplateSessionV2 | TemplateFieldFamilySessionV2) {
  let previous: ReturnType<typeof authority.getSnapshot> | undefined;
  let view: InternalSessionView;
  return Object.freeze({
    kind, authority,
    getSnapshot() {
      const snapshot = authority.getSnapshot();
      if (snapshot !== previous) { view = borrowView(kind, snapshot); previous = snapshot; }
      return view;
    },
    getFieldControllers: () => authority.getFieldControllers(),
    subscribe: (listener: () => void) => authority.subscribe(listener),
    beginRuntimeEvidencePublication: () => authority.beginRuntimeEvidencePublication(),
    publishFieldLayoutEvidence: (evidence: Parameters<TemplateSessionV2["publishFieldLayoutEvidence"]>[0]) => authority.publishFieldLayoutEvidence(evidence),
    publishRuntimeReadiness: (evidence: Parameters<TemplateSessionV2["publishRuntimeReadiness"]>[0]) => authority.publishRuntimeReadiness(evidence),
  });
}

/** A borrowed observation/forwarding view; construction and reads have no side effects. */
export function adaptSingleSession(authority: TemplateSessionV2): SingleSessionAdapter {
  return borrowSession("single", authority) as SingleSessionAdapter;
}

export function adaptFamilySession(authority: TemplateFieldFamilySessionV2): FamilySessionAdapter {
  return borrowSession("family", authority) as FamilySessionAdapter;
}
