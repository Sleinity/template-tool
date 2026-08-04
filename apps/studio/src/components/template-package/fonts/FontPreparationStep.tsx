import { FileUp } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Status } from "../../ui";
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
}: FontPreparationStepProps) {
  const registry = getManagedFontRegistry();
  const inputRef = useRef<HTMLInputElement>(null);
  const packageValueRef = useRef(packageValue);
  packageValueRef.current = packageValue;
  const attemptedAutoLinkKey = useRef<string | null>(null);
  const uploadRevision = useRef(0);
  const [fonts, setFonts] = useState<ManagedFontRecord[]>([]);
  const [selectedRequirementId, setSelectedRequirementId] =
    useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const refreshFonts = async () => {
    setFonts((await registry?.listManagedFonts()) ?? []);
  };

  useEffect(() => {
    void refreshFonts();
  }, [registry]);

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
        code: errors[requirement.id]
          ? "managed-font-upload-failed" as const
          : "managed-font-missing" as const,
        severity: errors[requirement.id] ? "error" as const : "warning" as const,
        requirementId: requirement.id,
        message:
          errors[requirement.id] ??
          `${formatRequiredFontFace(requirement)} requires its exact font file.`,
      }];
    }),
    [errors, requirementStates],
  );

  useEffect(() => {
    onDiagnosticsChange?.(diagnostics);
  }, [diagnostics, onDiagnosticsChange]);

  useEffect(() => {
    if (!registry || !(packageValue.fontRequirements?.length)) return;
    if (allReady) return;
    const key = `${packageValue.packageId}:${resolutionSignature(packageValue)}`;
    if (attemptedAutoLinkKey.current === key) return;
    attemptedAutoLinkKey.current = key;
    const capturedPackage = packageValue;
    let cancelled = false;
    void autoLinkManagedFonts(packageValue, registry)
      .then(async (linkedPackage) => {
        if (cancelled || packageValueRef.current !== capturedPackage) return;
        await refreshFonts();
        if (
          resolutionSignature(linkedPackage) !==
          resolutionSignature(capturedPackage)
        ) {
          onPackageChange(linkedPackage);
        }
      })
      .catch((error) => {
        if (cancelled) return;
        const message =
          error instanceof Error
            ? error.message
            : "Previously uploaded fonts could not be checked.";
        setErrors((current) => ({
          ...current,
          __registry: message,
        }));
      });
    return () => {
      cancelled = true;
    };
  }, [allReady, packageValue, registry]);

  const handleUpload = async (file: File | undefined) => {
    const requirementId = selectedRequirementId;
    if (!file || !requirementId) return;
    const requirement = packageValue.fontRequirements?.find(
      (item) => item.id === requirementId,
    );
    if (!requirement) return;
    const capturedPackage = packageValue;
    const revision = ++uploadRevision.current;
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
      if (
        uploadRevision.current !== revision ||
        packageValueRef.current !== capturedPackage
      ) {
        return;
      }
      await refreshFonts();
      onPackageChange(result.packageValue);
    } catch (error) {
      if (
        uploadRevision.current !== revision ||
        packageValueRef.current !== capturedPackage
      ) {
        return;
      }
      setErrors((current) => ({
        ...current,
        [requirement.id]:
          error instanceof Error ? error.message : "The font upload failed.",
      }));
    } finally {
      if (uploadRevision.current === revision) {
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
        className="rounded-lg border border-[var(--color-status-repaired-border)] bg-[var(--color-status-repaired-bg)] p-4 text-sm text-[var(--color-status-repaired-fg)]"
      >
        <p className="font-semibold">Fonts are ready</p>
        <p className="mt-1">No font files need to be uploaded.</p>
      </div>
    );
  }

  return (
    <div data-testid="font-preparation-step" className="font-requirement-list">
      <input
        data-testid="package-font-upload-input"
        ref={inputRef}
        className="hidden"
        type="file"
        accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf"
        onChange={(event) => void handleUpload(event.target.files?.[0])}
      />
      {requirementStates.map(({ requirement, linked, ready, fileName }) => {
        const error = errors[requirement.id];
        const status = busyId === requirement.id
          ? { label: "Checking file…", tone: "neutral" as const }
          : ready
            ? { label: "Ready", tone: "repaired" as const }
            : error
              ? { label: "File doesn’t match", tone: "blocked" as const }
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
          <section
            key={requirement.id}
            className="font-requirement-row"
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
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="ui-subsection-title">
                  {formatRequiredFontFace(requirement)}
                </h3>
                {exceptionalDetails.length ? (
                  <p className="mt-1 text-sm text-content-muted">
                    {exceptionalDetails.join(" · ")}
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-content-muted">
                  Used by {requirement.usedBy.length} node
                  {requirement.usedBy.length === 1 ? "" : "s"}
                </p>
              </div>
              <Status tone={status.tone}>{status.label}</Status>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                {ready ? (
                  <>
                    <p className="text-sm font-medium text-content-primary">
                      Exact font verified
                    </p>
                    <p
                      className="mt-1 text-xs text-content-muted"
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
                variant="secondary"
                disabled={busyId !== null}
                onClick={() => {
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
                {error}
              </p>
            ) : null}
          </section>
        );
      })}
      {errors.__registry ? (
        <p
          className="text-sm text-[var(--color-status-blocked-fg)]"
          role="alert"
        >
          {errors.__registry}
        </p>
      ) : null}
    </div>
  );
}
