import { Download, FileUp, LoaderCircle } from "lucide-react";
import { useRef, useState } from "react";
import {
  createIndexedDbAssetStore,
  ingestTemplatePackageAssets,
} from "../assets";
import type { FontReadinessReport } from "../resolved";
import type {
  TemplatePackageFontRequirement,
  TemplatePackageV1,
} from "../types";
import {
  attachFontBinary,
  attachUploadedFont,
  dataUrlToArrayBuffer,
  requestTrustedOpenFont,
} from "./fontResolution";

interface FontResolutionPanelProps {
  packageValue: TemplatePackageV1;
  readiness: FontReadinessReport;
  onPackageChange: (packageValue: TemplatePackageV1) => void;
}

function faceKey(font: TemplatePackageFontRequirement): string {
  return `${font.family}:${font.weight}:${font.cssStyle}`;
}

export function FontResolutionPanel({
  packageValue,
  readiness,
  onPackageChange,
}: FontResolutionPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedRequirement, setSelectedRequirement] =
    useState<TemplatePackageFontRequirement | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  const applyPackage = async (nextPackage: TemplatePackageV1) => {
    const ingestion = await ingestTemplatePackageAssets(
      nextPackage,
      createIndexedDbAssetStore(),
    );
    onPackageChange(ingestion.packageValue);
  };

  const uploadFor = (requirement: TemplatePackageFontRequirement) => {
    setSelectedRequirement(requirement);
    setMessage(null);
    inputRef.current?.click();
  };

  const handleUpload = async (file: File | undefined) => {
    if (!file || !selectedRequirement) return;
    setBusyId(selectedRequirement.id);
    try {
      const result = await attachUploadedFont(
        packageValue,
        selectedRequirement,
        file,
      );
      await applyPackage(result.packageValue);
      setMessage({
        tone: "success",
        text: `${selectedRequirement.family} was matched, stored, and attached to the package.`,
      });
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "The font could not be loaded.",
      });
    } finally {
      setBusyId(null);
      setSelectedRequirement(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const fetchOpenFace = async (
    requirement: TemplatePackageFontRequirement,
  ) => {
    setBusyId(requirement.id);
    setMessage(null);
    try {
      const response = await requestTrustedOpenFont(requirement);
      if (!response.ok || !response.dataUrl || !response.mimeType) {
        throw new Error(
          response.message ??
            "This face is not available from the trusted open-font catalog.",
        );
      }
      const attached = await attachFontBinary(
        packageValue,
        requirement.id,
        dataUrlToArrayBuffer(response.dataUrl),
        {
          mimeType: response.mimeType,
          fileName: response.fileName,
          provider: response.provider,
          license: response.license,
        },
      );
      await applyPackage(attached.packageValue);
      setMessage({
        tone: "success",
        text: `${requirement.family} was fetched from the trusted open-font catalog and attached.`,
      });
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "The font could not be fetched.",
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-3" data-testid="font-resolution-panel">
      <input
        ref={inputRef}
        className="hidden"
        type="file"
        accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf"
        onChange={(event) => void handleUpload(event.target.files?.[0])}
      />
      {packageValue.fontRequirements?.map((requirement) => {
        const status =
          readiness.required.find(
            (item) =>
              item.id === requirement.id ||
              faceKey(requirement) ===
                `${item.family}:${item.weight}:${item.style}`,
          )?.status ?? "unknown";
        const readinessEntry = readiness.required.find(
          (item) =>
            item.id === requirement.id ||
            faceKey(requirement) ===
              `${item.family}:${item.weight}:${item.style}`,
        );
        const resolved = status === "loaded";
        return (
          <div
            key={requirement.id}
            className="rounded-lg border border-line-subtle bg-surface-interactive px-4 py-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-content-primary">
                  {requirement.family}
                </p>
                <p className="mt-1 text-xs text-content-muted">
                  {requirement.weight} {requirement.cssStyle}
                  {requirement.postScriptName
                    ? ` · ${requirement.postScriptName}`
                    : ""}
                </p>
              </div>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] capitalize ${
                  resolved
                    ? "border-[var(--color-status-repaired-border)] bg-[var(--color-status-repaired-bg)] text-[var(--color-status-repaired-fg)]"
                    : "border-[var(--color-status-attention-border)] bg-[var(--color-status-attention-bg)] text-[var(--color-status-attention-fg)]"
                }`}
              >
                {resolved ? "Exact face ready" : status}
              </span>
            </div>
            <p className="mt-2 text-[11px] text-content-muted">
              Used by {requirement.usedBy.length} node
              {requirement.usedBy.length === 1 ? "" : "s"}
              {requirement.editable ? " · editable text" : " · static text"}
              {readinessEntry?.glyphCoverage === "fallback-likely"
                ? " · glyph fallback likely"
                : ""}
            </p>
            {!resolved ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => void fetchOpenFace(requirement)}
                  className="inline-flex items-center gap-2 rounded-lg border border-line-subtle bg-surface-interactive px-3 py-2 text-[11px] text-content-primary transition hover:bg-surface-hovered disabled:opacity-40"
                >
                  {busyId === requirement.id ? (
                    <LoaderCircle className="animate-spin" size={13} />
                  ) : (
                    <Download size={13} />
                  )}
                  Fetch open font
                </button>
                <button
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => uploadFor(requirement)}
                  className="inline-flex items-center gap-2 rounded-lg border border-line-subtle bg-surface-interactive px-3 py-2 text-[11px] text-content-primary transition hover:bg-surface-hovered disabled:opacity-40"
                >
                  <FileUp size={13} />
                  Upload licensed font
                </button>
              </div>
            ) : null}
          </div>
        );
      })}
      {message ? (
        <p
          className={`rounded-lg border px-3 py-2 text-xs leading-5 ${
            message.tone === "success"
              ? "border-[var(--color-status-repaired-border)] bg-[var(--color-status-repaired-bg)] text-[var(--color-status-repaired-fg)]"
              : "border-[var(--color-status-blocked-border)] bg-[var(--color-status-blocked-bg)] text-[var(--color-status-blocked-fg)]"
          }`}
        >
          {message.text}
        </p>
      ) : null}
      <p className="text-[11px] leading-5 text-content-muted">
        Automatic retrieval is limited to exact faces in the trusted,
        redistributable catalog. Other fonts must be uploaded with an
        appropriate license.
      </p>
    </div>
  );
}
