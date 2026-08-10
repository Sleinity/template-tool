import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
  type CSSProperties,
  type PropsWithChildren,
  type ReactNode,
} from "react";
import {
  createTemplateFamilyImportWizard,
  type TemplateFamilyImportConfirmationV1,
  type TemplateFamilyImportWizardOptionsV1,
  type TemplateFamilyImportWizardSnapshotV1,
  type TemplateFamilyImportWizardV1,
} from "@sleinity/template-browser/importer";
import { TemplateSessionViewport } from "./editor";

const TemplateFamilyImportWizardContext =
  createContext<TemplateFamilyImportWizardV1 | null>(null);

export function useTemplateFamilyImportWizard(
  options: TemplateFamilyImportWizardOptionsV1 = {},
): TemplateFamilyImportWizardV1 {
  const [wizard] = useState(() => createTemplateFamilyImportWizard(options));
  const lifecycleGeneration = useRef(0);
  useEffect(() => {
    const generation = ++lifecycleGeneration.current;
    return () => {
      queueMicrotask(() => {
        if (lifecycleGeneration.current === generation) wizard.dispose();
      });
    };
  }, [wizard]);
  return wizard;
}

export interface TemplateFamilyImportWizardProviderProps {
  wizard: TemplateFamilyImportWizardV1;
}

export function TemplateFamilyImportWizardProvider({
  wizard,
  children,
}: PropsWithChildren<TemplateFamilyImportWizardProviderProps>) {
  return (
    <TemplateFamilyImportWizardContext.Provider value={wizard}>
      {children}
    </TemplateFamilyImportWizardContext.Provider>
  );
}

function useResolvedTemplateFamilyImportWizard(
  override?: TemplateFamilyImportWizardV1,
): TemplateFamilyImportWizardV1 {
  const context = useContext(TemplateFamilyImportWizardContext);
  const wizard = override ?? context;
  if (!wizard) {
    throw new Error(
      "A TemplateFamilyImportWizard is required. Pass wizard or use TemplateFamilyImportWizardProvider.",
    );
  }
  return wizard;
}

export function useTemplateFamilyImportWizardSnapshot(
  wizardOverride?: TemplateFamilyImportWizardV1,
): TemplateFamilyImportWizardSnapshotV1 {
  const wizard = useResolvedTemplateFamilyImportWizard(wizardOverride);
  return useSyncExternalStore(
    wizard.subscribe,
    wizard.getSnapshot,
    wizard.getSnapshot,
  );
}

export interface TemplateFamilyImportPreviewProps {
  wizard?: TemplateFamilyImportWizardV1;
  className?: string;
  style?: CSSProperties;
  fallback?: ReactNode;
}

export function TemplateFamilyImportPreview({
  wizard: wizardOverride,
  className,
  style,
  fallback = <p>Preparing family preview…</p>,
}: TemplateFamilyImportPreviewProps) {
  const wizard = useResolvedTemplateFamilyImportWizard(wizardOverride);
  const snapshot = useTemplateFamilyImportWizardSnapshot(wizard);
  const issues = useRef<Array<{
    code: string;
    severity: "info" | "warning" | "error";
    message: string;
  }>>([]);
  useEffect(() => {
    issues.current = [];
  }, [snapshot.previewVariantId, snapshot.revision]);
  return (
    <TemplateSessionViewport
      session={wizard.familySession.renderSession}
      className={className}
      style={style}
      fallback={fallback}
      onAssetLoadError={(assetId, nodeId) => {
        issues.current.push({
          code: "family-preview.asset-load-failed",
          severity: "error",
          message: `Asset "${assetId}" failed for node "${nodeId}".`,
        });
      }}
      onRenderIdentity={(identity) => {
        const variantId = snapshot.previewVariantId;
        if (!variantId) return;
        const blocked = identity.readiness === "unsupported" ||
          identity.exportSafety === "blocked" ||
          issues.current.some((issue) => issue.severity === "error");
        wizard.publishRenderValidation({
          variantId,
          status: blocked
            ? "blocked"
            : issues.current.length
              ? "warning"
              : "ready",
          sessionRevision: wizard.familySession.renderSession.getSnapshot().revision,
          issues: issues.current,
        });
      }}
    />
  );
}

export interface TemplateFamilyZipInputProps {
  wizard?: TemplateFamilyImportWizardV1;
  mode: "first" | "add-variant";
  title?: string;
  label?: ReactNode;
  disabled?: boolean;
  onLoaded?: (snapshot: TemplateFamilyImportWizardSnapshotV1) => void;
}

export function TemplateFamilyZipInput({
  wizard: wizardOverride,
  mode,
  title,
  label = mode === "first" ? "Choose first ZIP" : "Add variant ZIP",
  disabled,
  onLoaded,
}: TemplateFamilyZipInputProps) {
  const wizard = useResolvedTemplateFamilyImportWizard(wizardOverride);
  const load = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    const input = {
      bytes: await file.arrayBuffer(),
      sourceName: file.name,
      title,
    };
    const next = mode === "first"
      ? await wizard.loadFirstZip(input)
      : await wizard.addVariant(input);
    onLoaded?.(next);
  };
  return (
    <label>
      {label}
      <input
        type="file"
        accept=".zip,application/zip,application/x-zip-compressed"
        disabled={disabled}
        onChange={(event) => void load(event)}
      />
    </label>
  );
}

export interface TemplateFamilyImportConfirmationActionProps {
  wizard?: TemplateFamilyImportWizardV1;
  children?: ReactNode;
  disabled?: boolean;
  onComplete?: (confirmation: TemplateFamilyImportConfirmationV1) => void | Promise<void>;
}

export function TemplateFamilyImportConfirmationAction({
  wizard: wizardOverride,
  children = "Confirm family",
  disabled,
  onComplete,
}: TemplateFamilyImportConfirmationActionProps) {
  const wizard = useResolvedTemplateFamilyImportWizard(wizardOverride);
  const snapshot = useTemplateFamilyImportWizardSnapshot(wizard);
  return (
    <button
      type="button"
      disabled={disabled || !snapshot.canContinue || snapshot.activeStep !== "confirmation"}
      onClick={() => void wizard.confirm().then(onComplete)}
    >
      {children}
    </button>
  );
}
