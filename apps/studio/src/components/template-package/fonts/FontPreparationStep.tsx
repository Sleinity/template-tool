import { blockedStorageCause, studioFailureMessage } from "../../../workspace/storageFailure";
import { FileUp } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button, ConnectedList, ConnectedListItem, Status } from "../../ui";
import type {
  TemplatePackageFontRequirement,
  TemplatePackageV1,
} from "@sleinity/template-core";
import {
  areExactFontRequirementsResolved,
  formatRequiredFontFace,
  isExactFontRequirementResolved,
  managedFontExactlyMatchesRequirement,
} from "@sleinity/template-browser/fonts";
import {
  autoLinkManagedFonts,
  getManagedFontRegistry,
} from "@sleinity/template-browser/fonts";
import {
  uploadExactManagedFontForRequirement,
} from "@sleinity/template-browser/fonts";
import type {
  ManagedFontDiagnostic,
  ManagedFontRecord,
} from "@sleinity/template-browser/fonts";

interface FontPreparationStepProps {
  packageValue: TemplatePackageV1;
  onPackageChange: (packageValue: TemplatePackageV1) => void;
  onDiagnosticsChange?: (diagnostics: ManagedFontDiagnostic[]) => void;
  onReadinessChange?: (ready: boolean) => void;
  onBusyChange?: (busy: boolean) => void;
}

function resolutionSignature(packageValue: TemplatePackageV1): string {
  return (packageValue.fontRequirements ?? [])
    .map((requirement) => [
      requirement.id,
      requirement.assetId ?? "",
      requirement.resolution?.match ?? "",
      requirement.resolution?.binaryHash ?? "",
    ].join(":"))
    .join("|");
}

function linkedFileName(
  packageValue: TemplatePackageV1,
  requirement: TemplatePackageFontRequirement,
  managedFont: ManagedFontRecord | null | undefined,
): string | null {
  if (managedFont?.fileName) return managedFont.fileName;
  const asset = requirement.assetId
    ? packageValue.assets[requirement.assetId]
    : undefined;
  const fileName = asset?.extensions?.fileName;
  return typeof fileName === "string" && fileName.trim() ? fileName : null;
}

export function FontPreparationStep({
  packageValue,
  onPackageChange,
  onDiagnosticsChange,
  onReadinessChange,
  onBusyChange,
}: FontPreparationStepProps) {
  const registry = getManagedFontRegistry();
  const inputRef = useRef<HTMLInputElement>(null);
  const packageValueRef = useRef(packageValue);
  packageValueRef.current = packageValue;
  const scope = useRef(0);
  const [registryRetry, setRegistryRetry] = useState(0);
  const [retryUpload, setRetryUpload] = useState<{ file: File; requirementId: string; packageValue: TemplatePackageV1 } | null>(null);
  const uploadRevision = useRef(0);
  const selectedUploadSource = useRef<TemplatePackageV1 | null>(null);
  const [fonts, setFonts] = useState<ManagedFontRecord[]>([]);
  const [selectedRequirementId, setSelectedRequirementId] =
    useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, unknown>>({});

  useEffect(() => {
    const input = inputRef.current;
    const cancel = () => { setRetryUpload(null); };
    input?.addEventListener("cancel", cancel);
    return () => input?.removeEventListener("cancel", cancel);
  }, []);

  useEffect(() => {
    onBusyChange?.(busyId !== null);
    return () => onBusyChange?.(false);
  }, [busyId, onBusyChange]);

  useEffect(() => { setRetryUpload(null); setErrors({}); setBusyId(null); setSelectedRequirementId(null); selectedUploadSource.current = null; if (inputRef.current) inputRef.current.value = ""; }, [packageValue, registry]);

  useEffect(() => {
    const revision = ++scope.current;
    const capturedPackage = packageValue;
    const current = () => scope.current === revision && packageValueRef.current === capturedPackage;
    setErrors(errors => { const next = { ...errors }; delete next.__registry; return next; });
    void (async () => {
      const available = (await registry?.listManagedFonts()) ?? [];
      if (!current()) return;
      setFonts(available);
      const ready = areExactFontRequirementsResolved(capturedPackage) && (capturedPackage.fontRequirements ?? []).every(requirement => !requirement.resolution?.managedFontId || managedFontExactlyMatchesRequirement(requirement, available.find(font => font.id === requirement.resolution?.managedFontId)));
      if (ready || !registry || !capturedPackage.fontRequirements?.length) return;
      const linkedPackage = await autoLinkManagedFonts(capturedPackage, registry);
      if (!current()) return;
      const linkedFonts = await registry.listManagedFonts();
      if (!current()) return;
      setFonts(linkedFonts);
      if (resolutionSignature(linkedPackage) !== resolutionSignature(capturedPackage)) onPackageChange(linkedPackage);
    })().catch(cause => { if (current()) setErrors(errors => ({ ...errors, __registry: cause })); });
    return () => { scope.current++; uploadRevision.current++; };
  }, [packageValue, registry, registryRetry]);

  const requirementStates = useMemo(
    () => (packageValue.fontRequirements ?? []).map((requirement) => {
      const linked = fonts.find(
        (font) => font.id === requirement.resolution?.managedFontId,
      );
      const ready =
        isExactFontRequirementResolved(packageValue, requirement) &&
        (
          !requirement.resolution?.managedFontId ||
          managedFontExactlyMatchesRequirement(requirement, linked)
        );
      return {
        requirement,
        linked,
        ready,
        fileName: linkedFileName(packageValue, requirement, linked),
      };
    }),
    [fonts, packageValue],
  );
  const allReady =
    requirementStates.every((item) => item.ready) &&
    areExactFontRequirementsResolved(packageValue);

  useEffect(() => {
    onReadinessChange?.(allReady);
  }, [allReady, onReadinessChange]);

  const diagnostics = useMemo<ManagedFontDiagnostic[]>(
    () => requirementStates.flatMap(({ requirement, ready }) => {
      if (ready) return [];
      return [{
        code: blockedStorageCause(errors[requirement.id])
          ? "managed-font-registry-failed" as const
          : errors[requirement.id]
          ? "managed-font-upload-failed" as const
          : "managed-font-missing" as const,
        severity: errors[requirement.id] ? "error" as const : "warning" as const,
        requirementId: requirement.id,
        message:
          errors[requirement.id] ? studioFailureMessage(errors[requirement.id]) :
          `${formatRequiredFontFace(requirement)} requires its exact font file.`,
      }];
    }),
    [errors, requirementStates],
  );

  useEffect(() => {
    onDiagnosticsChange?.(diagnostics);
  }, [diagnostics, onDiagnosticsChange]);

  const handleUpload = async (file: File | undefined, requirementId = selectedRequirementId, selectedSource = selectedUploadSource.current) => {
    if (selectedSource !== packageValueRef.current) return;
    if (!file || !requirementId) return;
    const requirement = packageValue.fontRequirements?.find(
      (item) => item.id === requirementId,
    );
    if (!requirement) return;
    const capturedPackage = packageValue;
    const revision = ++uploadRevision.current;
    const capturedScope = scope.current;
    const current = () => capturedScope === scope.current && uploadRevision.current === revision && packageValueRef.current === capturedPackage;
    setRetryUpload(null);
    setBusyId(requirement.id);
    setErrors((current) => {
      const next = { ...current };
      delete next[requirement.id];
      return next;
    });
    try {
      const result = await uploadExactManagedFontForRequirement(
        capturedPackage,
        requirement.id,
        await file.arrayBuffer(),
        {
          mimeType: file.type,
          fileName: file.name,
          provider: "user-upload",
          registry,
          reason: "Uploaded in the Studio exact-font setup flow.",
        },
      );
      if (!current()) {
        return;
      }
      const available = (await registry?.listManagedFonts()) ?? [];
      if (!current()) return;
      setFonts(available);
      onPackageChange(result.packageValue);
    } catch (error) {
      if (!current()) {
        return;
      }
      if (blockedStorageCause(error)) setRetryUpload({ file, requirementId: requirement.id, packageValue: capturedPackage });
      setErrors((errors) => ({ ...errors, [requirement.id]: error }));
    } finally {
      if (current()) {
        setBusyId(null);
        setSelectedRequirementId(null);
        if (inputRef.current) inputRef.current.value = "";
      }
    }
  };

  if (!packageValue.fontRequirements?.length) {
    return (
      <div
        data-testid="font-preparation-step"
        className="font-requirement-empty"
      >
        <p className="font-semibold">No font files required</p>
        <p className="mt-1">No font files need to be uploaded.</p>
      </div>
    );
  }

  return (
    <>
    <ConnectedList label="Required fonts" data-testid="font-preparation-step" className="font-requirement-list">
      <input
        data-testid="package-font-upload-input"
        ref={inputRef}
        className="hidden"
        type="file"
        accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf"
        onChange={(event) => void handleUpload(event.target.files?.[0])}
      />
      {[...requirementStates].sort((a, b) => Number(a.ready) - Number(b.ready)).map(({ requirement, linked, ready, fileName }) => {
        const error = errors[requirement.id];
        const status = busyId === requirement.id
          ? { label: "Checking file…", tone: "neutral" as const }
          : ready
            ? { label: "Ready", tone: "repaired" as const }
            : error
              ? { label: blockedStorageCause(error) ? "Storage blocked" : "File doesn’t match", tone: "blocked" as const }
              : { label: "Font required", tone: "blocked" as const };
        const exceptionalDetails = [
          requirement.stretch && requirement.stretch !== "normal"
            ? `Width: ${requirement.stretch}`
            : null,
          ...(requirement.axes ?? []).map(
            (axis) => `${axis.tag}: ${axis.value}`,
          ),
        ].filter(Boolean);
        return (
          <ConnectedListItem
            key={requirement.id}
            className="font-requirement-row"
            tone={!ready ? "attention" : "neutral"}
            data-testid={`font-requirement-${requirement.id}`}
            data-font-requirement-id={requirement.id}
            data-font-family={requirement.family}
            data-font-weight={requirement.weight}
            data-font-style={requirement.cssStyle}
            data-font-resolution-classification={
              ready ? "exact" : "missing"
            }
            data-font-linked-binary-hash={
              ready ? requirement.resolution?.binaryHash : undefined
            }
            data-font-linked-face-index={
              ready ? requirement.resolution?.faceIndex : undefined
            }
            data-font-runtime-family={
              ready ? requirement.resolution?.runtimeFamily : undefined
            }
            data-font-ui-status={status.label}
          >
            <div className="font-requirement-row__heading">
              <div>
                <h3 className="ui-subsection-title">
                  {formatRequiredFontFace(requirement)}
                </h3>
                {exceptionalDetails.length ? (
                  <p className="mt-1 text-sm text-content-muted">
                    {exceptionalDetails.join(" · ")}
                  </p>
                ) : null}
                {ready ? <span className="ui-metadata">Available</span> : null}
              </div>
              {!ready || busyId === requirement.id ? <Status tone={status.tone}>{status.label}</Status> : null}
            </div>

            <div className="font-requirement-row__actions">
              <div>
                {ready ? (
                  <>
                    <span className="ui-visually-hidden">Exact font verified</span>
                    <p
                      className="ui-visually-hidden"
                      data-testid="linked-font-face"
                      data-linked-font-family={
                        linked?.typographicFamily ?? linked?.family
                      }
                      data-linked-font-legacy-family={linked?.legacyFamily}
                      data-linked-font-full-name={linked?.fullName}
                      data-linked-font-postscript-name={linked?.postScriptName}
                      data-linked-font-binary-hash={
                        requirement.resolution?.binaryHash
                      }
                      data-linked-font-face-index={
                        requirement.resolution?.faceIndex ?? 0
                      }
                    >
                      {fileName ?? "Stored exact font"}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-content-secondary">
                    Upload the exact font file specified above.
                  </p>
                )}
              </div>
              <Button
                variant={ready ? "quiet" : "secondary"}
                size="small"
                disabled={busyId !== null}
                onClick={() => {
                  setRetryUpload(null);
                  selectedUploadSource.current = packageValue;
                  setSelectedRequirementId(requirement.id);
                  inputRef.current?.click();
                }}
                loading={busyId === requirement.id}
                loadingLabel="Checking font"
                leadingIcon={<FileUp size={16} />}
              >
                {ready ? "Replace file" : "Upload font file"}
              </Button>
            </div>
            {error ? (
              <p
                className="mt-3 text-sm text-[var(--color-status-blocked-fg)]"
                role="alert"
              >
                {studioFailureMessage(error)}
                {retryUpload?.requirementId === requirement.id && retryUpload.packageValue === packageValue && <><Button size="small" variant="secondary" disabled={busyId !== null} onClick={() => void handleUpload(retryUpload.file, retryUpload.requirementId, retryUpload.packageValue)}>Retry upload</Button><Button size="small" variant="quiet" onClick={() => setRetryUpload(null)}>Cancel</Button></>}
              </p>
            ) : null}
          </ConnectedListItem>
        );
      })}
    </ConnectedList>
      {Boolean(errors.__registry) ? (
        <p
          className="text-sm text-[var(--color-status-blocked-fg)]"
          role="alert"
        >
          {blockedStorageCause(errors.__registry) && <strong>Storage blocked. </strong>}{studioFailureMessage(errors.__registry)}
          <Button size="small" variant="secondary" disabled={busyId !== null} onClick={() => setRegistryRetry(value => value + 1)}>Retry font check</Button>
        </p>
      ) : null}
    </>
  );
}
