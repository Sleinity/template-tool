import type { TemplatePackageV2 } from "@sleinity/template-core";
import type { TemplateSessionV2, TemplateSessionV2Snapshot } from "../../session/templateSessionV2";
import type { TemplateFieldFamilySessionV2, TemplateFieldFamilySessionV2Snapshot } from "../../session/templateFieldFamilySessionV2";

type NativeSnapshot = TemplateSessionV2Snapshot | TemplateFieldFamilySessionV2Snapshot;
type SnapshotView<Kind, Snapshot extends NativeSnapshot> = Readonly<{
  kind: Kind;
  nativeSnapshot: Snapshot;
  status: Snapshot["status"];
  revision: number;
  operationRevision: number;
  contentRevision: number | null;
  contentState: Snapshot["contentState"];
  fields: Snapshot["fields"];
  sessionAssets: Snapshot["sessionAssets"];
  readiness: Snapshot["readiness"];
  configuredPackage: TemplatePackageV2 | null;
  workingPackage: Snapshot["workingPackage"];
  rendererPackage: Snapshot["rendererPackage"];
  resolvedTree: Snapshot["resolvedTree"];
  materializationRevision: string | null;
  savedRecordId: string | null;
  error: Snapshot["error"];
}>;

export type SingleSessionView = SnapshotView<"single", TemplateSessionV2Snapshot>;
export type FamilySessionView = SnapshotView<"family", TemplateFieldFamilySessionV2Snapshot> & Readonly<{
  selectedVariantId: string | null;
}>;
export type InternalSessionView = SingleSessionView | FamilySessionView;

type BorrowedAdapter<Kind, Session, View> = Readonly<{
  kind: Kind;
  /** Borrowed authority. Loading, saving, selection, reset and disposal stay native. */
  authority: Session;
  getSnapshot(): View;
}> & Pick<TemplateSessionV2, "subscribe" | "beginRuntimeEvidencePublication" | "publishFieldLayoutEvidence" | "publishRuntimeReadiness">;

export type SingleSessionAdapter = BorrowedAdapter<"single", TemplateSessionV2, SingleSessionView> & Pick<TemplateSessionV2, "getFieldControllers">;
export type FamilySessionAdapter = BorrowedAdapter<"family", TemplateFieldFamilySessionV2, FamilySessionView> & Pick<TemplateFieldFamilySessionV2, "getFieldControllers">;
export type InternalSessionAdapter = SingleSessionAdapter | FamilySessionAdapter;
