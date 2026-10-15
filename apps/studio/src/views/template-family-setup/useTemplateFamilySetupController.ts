import { useRef, useState } from "react";
import type {SavedTemplateFamilyRecord} from "../../../../../packages/template-browser/test/legacyEntry";
import type {TemplateFamilyReimportPlanV1} from "../../../../../packages/template-browser/test/legacyImporter";
import type { ResolvedProductRenderIdentityV1 } from "@sleinity/template-react";

export type FamilyFieldFilter = "all" | "shared" | "specific" | "attention";
export type FamilyRuleFilter = "all" | "visible" | "shared" | "specific" | "attention";

export function useTemplateFamilySetupController(
  savedFamily: SavedTemplateFamilyRecord | null,
) {
  const [stepIndex, setStepIndex] = useState(0);
  const [maxVisitedStep, setMaxVisitedStep] = useState(0);
  const [pendingTemplateName, setPendingTemplateName] = useState(savedFamily?.family.title ?? "");
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [expandedRuleFieldId, setExpandedRuleFieldId] = useState<string | null>(null);
  const [fieldFilter, setFieldFilter] = useState<FamilyFieldFilter>("all");
  const [fieldQuery, setFieldQuery] = useState("");
  const [selectedPendingTarget, setSelectedPendingTarget] = useState<{
    variantId: string;
    key: string;
  } | null>(null);
  const [ruleFilter, setRuleFilter] = useState<FamilyRuleFilter>("all");
  const [openRuleDifferences, setOpenRuleDifferences] = useState<Set<string>>(() => new Set());
  const [saving, setSaving] = useState(false);
  const [checkingAll, setCheckingAll] = useState(false);
  const [checkingVariantId, setCheckingVariantId] = useState<string | null>(null);
  const [selectedQualityIssueId, setSelectedQualityIssueId] = useState<string | null>(null);
  const [renderEvidence, setRenderEvidence] = useState<{
    variantId: string;
    sessionRevision: number;
    identity: ResolvedProductRenderIdentityV1;
  } | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [confirmRemoveVariantId, setConfirmRemoveVariantId] = useState<string | null>(null);
  const [variantDrawerOpen, setVariantDrawerOpen] = useState(false);
  const [draggedEditorControlKey, setDraggedEditorControlKey] = useState<string | null>(null);
  const [editorControlDropIndex, setEditorControlDropIndex] = useState<number | null>(null);
  const [reimportPlans, setReimportPlans] = useState<Record<string, TemplateFamilyReimportPlanV1>>({});
  const [reimportAddedChoices, setReimportAddedChoices] = useState<Record<string, Record<string, string>>>({});
  const [reimportFieldChoices, setReimportFieldChoices] = useState<Record<string, Record<string, string>>>({});
  const [reimportOrphanRemovals, setReimportOrphanRemovals] = useState<Record<string, string[]>>({});
  const contentRef = useRef<HTMLDivElement>(null);
  const validationVisitStartedRef = useRef(false);
  const savedFamilyBaselineRef = useRef(JSON.stringify(savedFamily?.family ?? null));

  return {
    stepIndex, setStepIndex,
    maxVisitedStep, setMaxVisitedStep,
    pendingTemplateName, setPendingTemplateName,
    selectedVariantId, setSelectedVariantId,
    selectedFieldId, setSelectedFieldId,
    expandedRuleFieldId, setExpandedRuleFieldId,
    fieldFilter, setFieldFilter,
    fieldQuery, setFieldQuery,
    selectedPendingTarget, setSelectedPendingTarget,
    ruleFilter, setRuleFilter,
    openRuleDifferences, setOpenRuleDifferences,
    saving, setSaving,
    checkingAll, setCheckingAll,
    checkingVariantId, setCheckingVariantId,
    selectedQualityIssueId, setSelectedQualityIssueId,
    renderEvidence, setRenderEvidence,
    dragActive, setDragActive,
    confirmRemoveVariantId, setConfirmRemoveVariantId,
    variantDrawerOpen, setVariantDrawerOpen,
    draggedEditorControlKey, setDraggedEditorControlKey,
    editorControlDropIndex, setEditorControlDropIndex,
    reimportPlans, setReimportPlans,
    reimportAddedChoices, setReimportAddedChoices,
    reimportFieldChoices, setReimportFieldChoices,
    reimportOrphanRemovals, setReimportOrphanRemovals,
    contentRef,
    validationVisitStartedRef,
    savedFamilyBaselineRef,
  };
}
