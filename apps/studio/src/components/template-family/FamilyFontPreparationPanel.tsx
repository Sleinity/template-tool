import { FileUp } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  TemplatePackageFontRequirement,
} from "@sleinity/template-core";
import type { TemplateFamilyV1 } from "@sleinity/template-core/family";
import {
  autoLinkManagedFonts,
  createFontRequirementKey,
  formatRequiredFontFace,
  getManagedFontRegistry,
  isExactFontRequirementResolved,
  uploadExactManagedFontForRequirement,
} from "@sleinity/template-browser/fonts";
import {
  Disclosure,
  FilePickerButton,
  Status,
  Surface,
} from "../ui";

interface FamilyFontUsage {
  variantId: string;
  variantTitle: string;
  requirement: TemplatePackageFontRequirement;
}

interface FamilyFontGroup {
  key: string;
  label: string;
  usages: FamilyFontUsage[];
}

function requirementKey(requirement: TemplatePackageFontRequirement): string {
  return JSON.stringify(createFontRequirementKey(requirement));
}

function familyFontSignature(family: TemplateFamilyV1): string {
  return family.variants.flatMap((variant) =>
    (variant.packageValue.fontRequirements ?? []).map((requirement) => [
      variant.id,
      requirement.id,
      requirement.assetId ?? "",
      requirement.resolution?.match ?? "",
      requirement.resolution?.binaryHash ?? "",
    ].join(":")),
  ).join("|");
}

export function FamilyFontPreparationPanel({
  family,
  onFamilyChange,
}: {
  family: TemplateFamilyV1;
  onFamilyChange: (family: TemplateFamilyV1) => void;
}) {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const attemptedAutoLink = useRef<string | null>(null);
  const currentFamily = useRef(family);
  currentFamily.current = family;

  const groups = useMemo<FamilyFontGroup[]>(() => {
    const grouped = new Map<string, FamilyFontUsage[]>();
    for (const variant of family.variants) {
      for (const requirement of variant.packageValue.fontRequirements ?? []) {
        const key = requirementKey(requirement);
        const usages = grouped.get(key) ?? [];
        usages.push({
          variantId: variant.id,
          variantTitle: variant.title,
          requirement,
        });
        grouped.set(key, usages);
      }
    }
    return Array.from(grouped, ([key, usages]) => ({
      key,
      label: formatRequiredFontFace(usages[0].requirement),
      usages,
    }));
  }, [family]);

  useEffect(() => {
    const registry = getManagedFontRegistry();
    if (!registry || groups.length === 0) return;
    const signature = familyFontSignature(family);
    if (attemptedAutoLink.current === signature) return;
    attemptedAutoLink.current = signature;
    const captured = family;
    void Promise.all(family.variants.map(async (variant) => ({
      id: variant.id,
      packageValue: await autoLinkManagedFonts(variant.packageValue, registry),
    }))).then((linked) => {
      if (currentFamily.current !== captured) return;
      const next = structuredClone(captured);
      for (const item of linked) {
        const variant = next.variants.find((candidate) => candidate.id === item.id);
        if (!variant) continue;
        variant.packageValue = item.packageValue;
      }
      if (familyFontSignature(next) !== familyFontSignature(captured)) onFamilyChange(next);
    }).catch((error) => {
      setErrors((current) => ({
        ...current,
        __registry: error instanceof Error
          ? error.message
          : "Previously uploaded fonts could not be checked.",
      }));
    });
  }, [family, groups.length, onFamilyChange]);

  const upload = async (group: FamilyFontGroup, file: File | undefined) => {
    if (!file || busyKey) return;
    const representative = group.usages[0];
    const variant = family.variants.find((candidate) => candidate.id === representative.variantId);
    if (!variant) return;
    const captured = family;
    setBusyKey(group.key);
    setErrors((current) => {
      const next = { ...current };
      delete next[group.key];
      return next;
    });
    try {
      const uploaded = await uploadExactManagedFontForRequirement(
        variant.packageValue,
        representative.requirement.id,
        await file.arrayBuffer(),
        {
          mimeType: file.type,
          fileName: file.name,
          provider: "user-upload",
          registry: getManagedFontRegistry(),
          reason: "Uploaded in the Studio family font setup flow.",
        },
      );
      if (currentFamily.current !== captured) return;
      const registry = getManagedFontRegistry();
      const linked = await Promise.all(captured.variants.map(async (candidate) => ({
        id: candidate.id,
        packageValue: await autoLinkManagedFonts(
          candidate.id === variant.id ? uploaded.packageValue : candidate.packageValue,
          registry,
        ),
      })));
      if (currentFamily.current !== captured) return;
      const next = structuredClone(captured);
      for (const item of linked) {
        const candidate = next.variants.find((value) => value.id === item.id);
        if (candidate) candidate.packageValue = item.packageValue;
      }
      onFamilyChange(next);
    } catch (error) {
      if (currentFamily.current !== captured) return;
      setErrors((current) => ({
        ...current,
        [group.key]: error instanceof Error ? error.message : "The font upload failed.",
      }));
    } finally {
      setBusyKey((current) => current === group.key ? null : current);
    }
  };

  if (groups.length === 0) {
    return (
      <Surface className="family-font-empty family-font-empty--compact" tone="secondary">
        <Status tone="repaired">Ready</Status>
        <div>
          <h2 className="ui-subsection-title">No font files required</h2>
        </div>
      </Surface>
    );
  }

  return (
    <div className="family-font-list" data-testid="family-font-preparation">
      {groups.map((group) => {
        const usageStates = group.usages.map((usage) => {
          const variant = family.variants.find((candidate) => candidate.id === usage.variantId)!;
          return {
            ...usage,
            ready: isExactFontRequirementResolved(variant.packageValue, usage.requirement),
          };
        });
        const ready = usageStates.every((usage) => usage.ready);
        const error = errors[group.key];
        const checking = busyKey === group.key;
        return (
          <Surface as="section" className="family-font-row" data-ready={ready || undefined} key={group.key}>
            <div className="family-font-row__heading">
              <div>
                <h2 className="ui-subsection-title">{group.label}</h2>
                <div className="family-font-row__variants" aria-label="Used by variants">
                  {usageStates.map((usage) => (
                    <span key={`${usage.variantId}:${usage.requirement.id}`}>
                      {usage.variantTitle}
                    </span>
                  ))}
                </div>
              </div>
              <Status tone={checking ? "neutral" : ready ? "repaired" : error ? "blocked" : "attention"}>
                {checking ? "Checking" : ready ? "Ready" : error ? "Mismatched" : "Missing"}
              </Status>
            </div>
            <div className="family-font-row__actions">
              {!ready ? (
                <p className="ui-supporting-copy">Upload this face once to use it in every compatible variant.</p>
              ) : <span />}
              <FilePickerButton
                accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf"
                disabled={busyKey !== null}
                variant={ready ? "quiet" : "secondary"}
                size="small"
                leadingIcon={<FileUp size={16} />}
                onSelect={(file) => void upload(group, file)}
              >
                {ready ? "Replace font" : "Upload font"}
              </FilePickerButton>
            </div>
            {error ? <p className="ui-field__error" role="alert">{error}</p> : null}
            <Disclosure summary="Technical details">
              <div className="family-font-technical-list">
                {usageStates.map((usage) => (
                  <div key={`${usage.variantId}:${usage.requirement.id}`}>
                    <strong>{usage.variantTitle}</strong>
                    <span>{usage.ready ? "Exact binary verified" : "Exact binary required"}</span>
                    <code>{usage.requirement.id}</code>
                  </div>
                ))}
              </div>
            </Disclosure>
          </Surface>
        );
      })}
      {errors.__registry ? <p className="ui-field__error" role="alert">{errors.__registry}</p> : null}
    </div>
  );
}
