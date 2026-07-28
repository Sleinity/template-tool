import { Download, FileUp, Link2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Select, Status, type StatusTone } from "../../ui";
import type {
  TemplatePackageFontRequirement,
  TemplatePackageV1,
} from "../../../../../../src/template-package/types";
import {
  inspectOpenTypeFontBinary,
} from "../../../../../../src/template-package/fonts/fontBinaryMetadata";
import { createCanonicalFontRequest } from "../../../../../../src/template-package/fonts/fontIdentity";
import {
  dataUrlToArrayBuffer,
  requestTrustedOpenFont,
} from "../../../../../../src/template-package/fonts/fontResolution";
import {
  autoLinkManagedFonts,
  getManagedFontRegistry,
  linkRequirementToManagedFont,
  unlinkManagedFontRequirement,
  useFallbackForRequirement,
} from "../../../../../../src/template-package/fonts/fontRegistry";
import {
  findManagedFontCandidates,
  matchCanonicalFontFace,
  matchManagedFont,
} from "../../../../../../src/template-package/fonts/fontMatching";
import type {
  ManagedFontDiagnostic,
  ManagedFontRecord,
} from "../../../../../../src/template-package/fonts/fontRegistryTypes";

interface FontPreparationStepProps {
  packageValue: TemplatePackageV1;
  onPackageChange: (packageValue: TemplatePackageV1) => void;
  onDiagnosticsChange?: (diagnostics: ManagedFontDiagnostic[]) => void;
}

function mimeTypeForFile(file: File): string {
  if (file.type) return file.type;
  if (/\.woff2$/i.test(file.name)) return "font/woff2";
  if (/\.woff$/i.test(file.name)) return "font/woff";
  if (/\.otf$/i.test(file.name)) return "font/otf";
  return "font/ttf";
}

function requirementLabel(requirement: TemplatePackageFontRequirement): string {
  return `${requirement.family} ${requirement.weight} ${requirement.cssStyle}`;
}

function fontOptionLabel(font: ManagedFontRecord): string {
  const family = font.typographicFamily ?? font.family;
  const subfamily = font.typographicSubfamily ?? font.subfamily ?? "Regular";
  const axes = font.variableAxes?.length
    ? ` · ${font.variableAxes.map((axis) => `${axis.tag} ${axis.min}-${axis.max}`).join(", ")}`
    : "";
  return `${family} — ${subfamily} (${font.weight}, ${font.style})${axes}`;
}

export function FontPreparationStep({
  packageValue,
  onPackageChange,
  onDiagnosticsChange,
}: FontPreparationStepProps) {
  const registry = getManagedFontRegistry();
  const inputRef = useRef<HTMLInputElement>(null);
  const autoLinkAttempted = useRef(false);
  const [fonts, setFonts] = useState<ManagedFontRecord[]>([]);
  const [selectedRequirementId, setSelectedRequirementId] =
    useState<string | null>(null);
  const [selectedByRequirement, setSelectedByRequirement] = useState<
    Record<string, string>
  >({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<StatusTone>("repaired");
  const [invalidRequirementId, setInvalidRequirementId] = useState<string | null>(null);

  const refreshFonts = async () => {
    setFonts((await registry?.listManagedFonts()) ?? []);
  };

  useEffect(() => {
    void refreshFonts();
  }, [registry]);

  const diagnostics = useMemo<ManagedFontDiagnostic[]>(() => {
    return (packageValue.fontRequirements ?? []).flatMap(
      (requirement): ManagedFontDiagnostic[] => {
        if (requirement.resolution?.managedFontId) return [];
        if (requirement.resolution?.match === "fallback") {
          return [
            {
              code: "managed-font-fallback",
              severity: "warning",
              requirementId: requirement.id,
              message: `${requirementLabel(requirement)} intentionally uses ${requirement.resolution.fallbackFamily ?? "a fallback font"}.`,
            },
          ];
        }
        const candidates = findManagedFontCandidates(
          requirement,
          fonts,
        );
        const viableCandidates = candidates.filter(
          (candidate) => candidate.classification !== "replacement" &&
            candidate.classification !== "missing",
        );
        return [
          {
            code: viableCandidates.length
              ? "managed-font-ambiguous"
              : "managed-font-missing",
            severity: "warning",
            requirementId: requirement.id,
            message: viableCandidates.length
              ? `${requirementLabel(requirement)} has a candidate that requires confirmation.`
              : `${requirementLabel(requirement)} is not available in the managed registry.`,
          },
        ];
      },
    );
  }, [fonts, packageValue.fontRequirements]);

  useEffect(() => {
    onDiagnosticsChange?.(diagnostics);
  }, [diagnostics, onDiagnosticsChange]);

  const applyAutoLinks = async () => {
    setBusyId("auto");
    try {
      const linked = await autoLinkManagedFonts(packageValue);
      onPackageChange(linked);
      await refreshFonts();
    } finally {
      setBusyId(null);
    }
  };

  useEffect(() => {
    if (!registry || !packageValue.fontRequirements?.length) return;
    if (autoLinkAttempted.current) return;
    autoLinkAttempted.current = true;
    if (
      packageValue.fontRequirements.some(
        (requirement) => !requirement.resolution,
      )
    ) {
      void applyAutoLinks();
    }
  }, [registry]);

  const linkSelected = async (
    requirement: TemplatePackageFontRequirement,
    fontId?: string,
  ) => {
    const selectedId =
      fontId ?? selectedByRequirement[requirement.id];
    const font = fonts.find((item) => item.id === selectedId);
    if (!font) return;
    const semanticMatch = matchManagedFont(requirement, font);
    setBusyId(requirement.id);
    try {
      onPackageChange(
        await linkRequirementToManagedFont(
          packageValue,
          requirement.id,
          font,
          {
            confirmed: true,
            allowReplacement: semanticMatch.classification === "replacement",
            reason: `${semanticMatch.classification} face selected in Fonts setup.`,
          },
        ),
      );
      setMessageTone("repaired");
      setMessage(`${requirementLabel(requirement)} is ready.`);
    } finally {
      setBusyId(null);
    }
  };

  const handleUpload = async (file: File | undefined) => {
    if (!file || !selectedRequirementId || !registry) return;
    const requirement = packageValue.fontRequirements?.find(
      (item) => item.id === selectedRequirementId,
    );
    if (!requirement) return;
    setBusyId(requirement.id);
    setMessage(null);
    setInvalidRequirementId(null);
    try {
      const bytes = await file.arrayBuffer();
      const inspection = await inspectOpenTypeFontBinary(bytes);
      if (!inspection.faces.length) throw new Error("The selected font file is unreadable.");
      const request = createCanonicalFontRequest(requirement);
      const matches = inspection.faces
        .map((face) => ({ face, match: matchCanonicalFontFace(request, face) }))
        .filter(({ match }) => match.classification === "exact" || match.classification === "compatible")
        .sort((left, right) => right.match.score - left.match.score);
      const selected = matches[0];
      if (!selected) {
        const first = matchCanonicalFontFace(request, inspection.faces[0]);
        throw new Error(first.reasons.join(" ") || "The uploaded face does not match the request.");
      }
      if (matches[1]?.match.score === selected.match.score) {
        throw new Error("The font file contains several equally compatible faces. Choose an unambiguous face file.");
      }
      const metadata = selected.face;
      const font = await registry.registerUploadedFont({
        bytes,
        family: metadata.family ?? requirement.family,
        typographicFamily: metadata.typographicFamily ?? undefined,
        legacyFamily: metadata.legacyFamily ?? undefined,
        subfamily: metadata.subfamily ?? undefined,
        typographicSubfamily: metadata.typographicSubfamily ?? undefined,
        legacySubfamily: metadata.legacySubfamily ?? undefined,
        style: metadata.style,
        weight: metadata.weight ?? requirement.weight,
        stretch: metadata.stretch,
        postScriptName: metadata.postScriptName ?? undefined,
        fullName: metadata.fullName ?? undefined,
        faceIndex: metadata.collectionFaceIndex,
        variableAxes: metadata.variableAxes,
        unicodeCoverage: metadata.unicodeCoverage,
        rawNameRecords: metadata.rawNameRecords,
        license: metadata.license,
        source: "uploaded",
        mimeType: mimeTypeForFile(file),
        fileName: file.name,
      });
      await refreshFonts();
      onPackageChange(
        await linkRequirementToManagedFont(
          packageValue,
          requirement.id,
          font,
          {
            confirmed: true,
            reason: "Uploaded face passed shared semantic matching.",
          },
        ),
      );
      setMessage(
        `${requirementLabel(requirement)} was added and is ready to use.`,
      );
      setMessageTone("repaired");
    } catch (error) {
      setMessageTone("blocked");
      setInvalidRequirementId(requirement.id);
      setMessage(
        error instanceof Error ? error.message : "The font upload failed.",
      );
    } finally {
      setBusyId(null);
      setSelectedRequirementId(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const fetchTrustedFont = async (
    requirement: TemplatePackageFontRequirement,
  ) => {
    if (!registry) return;
    setBusyId(requirement.id);
    setMessage(null);
    try {
      const response = await requestTrustedOpenFont(requirement);
      if (!response.ok || !response.dataUrl || !response.mimeType) {
        throw new Error(
          response.message ?? "No trusted open-font match was found.",
        );
      }
      const bytes = dataUrlToArrayBuffer(response.dataUrl);
      const inspection = await inspectOpenTypeFontBinary(bytes);
      const request = createCanonicalFontRequest(requirement);
      const selected = inspection.faces
        .map((face) => ({ face, match: matchCanonicalFontFace(request, face) }))
        .filter(({ match }) => match.classification === "exact" || match.classification === "compatible")
        .sort((left, right) => right.match.score - left.match.score)[0];
      if (!selected) throw new Error("The fetched face does not match the requested semantic identity.");
      const metadata = selected.face;
      const font = await registry.registerUploadedFont({
        bytes,
        family: metadata.family ?? requirement.family,
        typographicFamily: metadata.typographicFamily ?? undefined,
        legacyFamily: metadata.legacyFamily ?? undefined,
        subfamily: metadata.subfamily ?? undefined,
        typographicSubfamily: metadata.typographicSubfamily ?? undefined,
        legacySubfamily: metadata.legacySubfamily ?? undefined,
        style: metadata.style,
        weight: metadata.weight ?? requirement.weight,
        stretch: metadata.stretch,
        postScriptName: metadata.postScriptName ?? undefined,
        fullName: metadata.fullName ?? undefined,
        faceIndex: metadata.collectionFaceIndex,
        variableAxes: metadata.variableAxes,
        unicodeCoverage: metadata.unicodeCoverage,
        rawNameRecords: metadata.rawNameRecords,
        license: {
          ...metadata.license,
          name: response.license?.name ?? metadata.license.name,
          url: response.license?.url ?? metadata.license.url,
          redistributionStatus: response.license ? "allowed" : metadata.license.redistributionStatus,
        },
        source: "trustedFetched",
        mimeType: response.mimeType,
        fileName:
          response.fileName ??
          `${requirement.family}-${requirement.weight}.${response.mimeType.includes("woff2") ? "woff2" : "ttf"}`,
        notes: response.license
          ? `${response.license.name}: ${response.license.url}`
          : undefined,
      });
      await refreshFonts();
      onPackageChange(
        await linkRequirementToManagedFont(
          packageValue,
          requirement.id,
          font,
          {
            confirmed: true,
            reason: "Trusted fetched face passed shared semantic matching.",
          },
        ),
      );
      setMessage(
        `${requirementLabel(requirement)} was fetched, verified, and added to the registry.`,
      );
      setMessageTone("repaired");
    } catch (error) {
      setMessageTone("blocked");
      setMessage(
        error instanceof Error
          ? error.message
          : "The trusted font fetch failed.",
      );
    } finally {
      setBusyId(null);
    }
  };

  if (!packageValue.fontRequirements?.length) {
    return (
      <div
        data-testid="font-preparation-step"
        className="rounded-lg border border-[var(--color-status-repaired-border)] bg-[var(--color-status-repaired-bg)] p-4 text-sm text-[var(--color-status-repaired-fg)]"
      >
        <p className="font-semibold">Fonts are ready</p>
        <p className="mt-1">No font files or replacements are needed.</p>
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
      {packageValue.fontRequirements.map((requirement) => {
        const linked = fonts.find(
          (font) => font.id === requirement.resolution?.managedFontId,
        );
        const candidates = findManagedFontCandidates(
          requirement,
          fonts,
        );
        const bestCandidate = candidates.find(
          (candidate) => candidate.classification !== "replacement" &&
            candidate.classification !== "missing",
        );
        const fallback = requirement.resolution?.match === "fallback";
        const linkedMatch = linked ? matchManagedFont(requirement, linked) : null;
        const selectedFont = fonts.find(
          (font) => font.id === (selectedByRequirement[requirement.id] ?? bestCandidate?.font.id),
        );
        const selectedMatch = selectedFont ? matchManagedFont(requirement, selectedFont) : null;
        const selectedGlyphGap = selectedMatch?.glyphCoverage === "incomplete";
        const status = busyId === requirement.id
          ? { label: "Loading", tone: "neutral" as const }
          : invalidRequirementId === requirement.id
            ? { label: "Invalid file", tone: "blocked" as const }
            : linked
              ? linkedMatch?.classification === "exact"
                ? { label: "Ready", tone: "repaired" as const }
                : linkedMatch?.classification === "compatible"
                  ? { label: "Compatible", tone: "attention" as const }
                  : { label: "Replacement", tone: "neutral" as const }
              : fallback
                ? { label: "Replacement", tone: "neutral" as const }
                : selectedGlyphGap
                  ? { label: "Glyph coverage incomplete", tone: "blocked" as const }
                  : selectedMatch?.classification === "replacement"
                    ? { label: "Replacement", tone: "attention" as const }
                    : bestCandidate?.ambiguous
                      ? { label: "Ambiguous", tone: "attention" as const }
                      : bestCandidate?.classification === "compatible"
                        ? { label: "Compatible", tone: "attention" as const }
                        : bestCandidate
                          ? { label: "Ready", tone: "repaired" as const }
                          : { label: "Missing", tone: "blocked" as const };
        return (
          <div
            key={requirement.id}
            className="font-requirement-row"
            data-testid={`font-requirement-${requirement.id}`}
            data-font-requirement-id={requirement.id}
            data-font-family={requirement.family}
            data-font-weight={requirement.weight}
            data-font-style={requirement.cssStyle}
            data-font-resolution-classification={
              requirement.resolution?.classification ??
              requirement.resolution?.match ??
              "missing"
            }
            data-font-linked-binary-hash={requirement.resolution?.binaryHash}
            data-font-linked-face-index={requirement.resolution?.faceIndex}
            data-font-runtime-family={requirement.resolution?.runtimeFamily}
            data-font-ui-status={status.label}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="ui-subsection-title">
                  {requirement.family}
                </p>
                <p className="mt-1 text-sm text-content-muted">
                  {requirement.weight} {requirement.cssStyle}
                  {requirement.stretch ? ` · ${requirement.stretch}` : ""}
                  {requirement.style ? ` · source style ${requirement.style}` : ""}
                </p>
                <p className="mt-1 text-xs text-content-muted">
                  Used by {requirement.usedBy.length} node{requirement.usedBy.length === 1 ? "" : "s"}
                </p>
              </div>
              <Status tone={status.tone}>
                {status.label}
              </Status>
            </div>

            {linked ? (
              <div
                className="mt-3 flex items-center justify-between gap-3"
                data-testid="linked-font-face"
                data-linked-font-family={linked.typographicFamily ?? linked.family}
                data-linked-font-legacy-family={linked.legacyFamily}
                data-linked-font-full-name={linked.fullName}
                data-linked-font-postscript-name={linked.postScriptName}
                data-linked-font-binary-hash={linked.assetHash}
                data-linked-font-face-index={linked.faceIndex ?? 0}
              >
                <div>
                  <p className="text-sm text-content-secondary">{fontOptionLabel(linked)}</p>
                  <p className="mt-1 text-xs text-content-muted">
                    {linked.fullName ?? linked.fileName}
                    {linked.postScriptName ? ` · ${linked.postScriptName}` : ""}
                    {` · ${linked.source}`}
                    {` · ${linked.assetHash.slice(0, 12)}`}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  onClick={() =>
                    void unlinkManagedFontRequirement(
                      packageValue,
                      requirement.id,
                    ).then(onPackageChange)
                  }
                >
                  {linkedMatch?.classification === "replacement"
                    ? "Remove replacement"
                    : "Remove link"}
                </Button>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {fonts.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                    <Select
                      label="Available fonts"
                      value={
                        selectedByRequirement[requirement.id] ??
                        bestCandidate?.font.id ??
                        ""
                      }
                      onChange={(event) =>
                        setSelectedByRequirement((current) => ({
                          ...current,
                          [requirement.id]: event.target.value,
                        }))
                      }
                    >
                      <option value="">Choose a font</option>
                      {fonts.map((font) => (
                        <option key={font.id} value={font.id}>
                          {fontOptionLabel(font)}
                        </option>
                      ))}
                    </Select>
                    <Button
                      variant="secondary"
                      disabled={
                        busyId !== null ||
                        !(
                          selectedByRequirement[requirement.id] ??
                          bestCandidate?.font.id
                        )
                      }
                      onClick={() =>
                        void linkSelected(
                          requirement,
                          selectedByRequirement[requirement.id] ??
                            bestCandidate?.font.id,
                        )
                      }
                      leadingIcon={<Link2 size={16} />}
                    >
                      {selectedMatch?.classification === "replacement"
                        ? "Use replacement"
                        : fallback && selectedMatch?.classification === "exact"
                          ? "Replace with exact font"
                          : "Link font"}
                    </Button>
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    disabled={busyId !== null}
                    onClick={() => void fetchTrustedFont(requirement)}
                    leadingIcon={<Download size={16} />}
                  >
                    Add open font
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={busyId !== null}
                    onClick={() => {
                      setInvalidRequirementId(null);
                      setSelectedRequirementId(requirement.id);
                      inputRef.current?.click();
                    }}
                    loading={busyId === requirement.id}
                    loadingLabel="Adding font"
                    leadingIcon={<FileUp size={16} />}
                  >
                    Upload font
                  </Button>
                  <Button
                    variant="quiet"
                    disabled={busyId !== null}
                    onClick={() => {
                      if (fallback) {
                        void unlinkManagedFontRequirement(
                          packageValue,
                          requirement.id,
                        ).then(onPackageChange);
                        return;
                      }
                      onPackageChange(
                        useFallbackForRequirement(
                          packageValue,
                          requirement.id,
                        ),
                      );
                    }}
                  >
                    {fallback ? "Remove replacement" : "Use replacement"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
      {message ? (
        <Alert tone={messageTone} title={messageTone === "blocked" ? "Font could not be added" : "Font updated"}>
          {message}
        </Alert>
      ) : null}
    </div>
  );
}
