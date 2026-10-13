import { blockedStorageCause, studioFailureMessage } from "../../workspace/storageFailure";
import { FileUp } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  TemplatePackageFontRequirement,
} from "@sleinity/template-core";
import { createResolvedRenderTree } from "@sleinity/template-core";
import type { TemplateFamilyV1 } from "@sleinity/template-core/family";
import {
  autoLinkManagedFonts,
  createFontRequirementKey,
  formatRequiredFontFace,
  getManagedFontRegistry,
  isExactFontRequirementResolved,
  prepareTemplatePackageFonts,
  uploadExactManagedFontForRequirement,
} from "@sleinity/template-browser/fonts";
import {
  Button,
  ConnectedList,
  ConnectedListItem,
  FilePickerButton,
  Status,
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
  compact = false,
}: {
  compact?: boolean;
  family: TemplateFamilyV1;
  onFamilyChange: (family: TemplateFamilyV1) => void;
}) {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, unknown>>({});
  const [registryRetry, setRegistryRetry] = useState(0);
  const [retryUpload, setRetryUpload] = useState<{ group: FamilyFontGroup; file: File; family: TemplateFamilyV1 } | null>(null);
  const scope = useRef(0);
  useEffect(() => { scope.current++; setRetryUpload(null); setErrors({}); setBusyKey(null); return () => { scope.current++; }; }, [family]);
  const pickFamily = useRef<TemplateFamilyV1 | null>(null);
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
    let cancelled = false;
    const revision = scope.current;
    const current = () => !cancelled && revision === scope.current && currentFamily.current === family;
    setErrors(errors => { const next = { ...errors }; delete next.__registry; return next; });
    const captured = family;
    void Promise.all(family.variants.map(async (variant) => ({
      id: variant.id,
      packageValue: await autoLinkManagedFonts(variant.packageValue, registry),
    }))).then((linked) => {
      if (!current()) return;
      const next = structuredClone(captured);
      for (const item of linked) {
        const variant = next.variants.find((candidate) => candidate.id === item.id);
        if (!variant) continue;
        variant.packageValue = item.packageValue;
      }
      if (familyFontSignature(next) !== familyFontSignature(captured)) onFamilyChange(next);
    }).catch((error) => {
      if (current()) setErrors(errors => ({ ...errors, __registry: error }));
    });
    return () => { cancelled = true; };
  }, [family, groups.length, registryRetry]);

  const upload = async (group: FamilyFontGroup, file: File | undefined) => {
    if (!file || busyKey) return;
    const representative = group.usages[0];
    const variant = family.variants.find((candidate) => candidate.id === representative.variantId);
    if (!variant) return;
    const captured = family;
    const revision = scope.current;
    const current = () => revision === scope.current && currentFamily.current === captured;
    setRetryUpload(null);
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
      if (!current()) return;
      const registry = getManagedFontRegistry();
      const linked = await Promise.all(captured.variants.map(async (candidate) => ({
        id: candidate.id,
        packageValue: await autoLinkManagedFonts(
          candidate.id === variant.id ? uploaded.packageValue : candidate.packageValue,
          registry,
        ),
      })));
      for (const item of linked) {
        const exactRequirementIds = new Set(
          (item.packageValue.fontRequirements ?? [])
            .filter((requirement) => requirement.resolution?.classification === "exact")
            .map((requirement) => requirement.id),
        );
        if (exactRequirementIds.size === 0) continue;
        const readiness = await prepareTemplatePackageFonts(
          item.packageValue,
          createResolvedRenderTree(item.packageValue),
          document.fonts,
          registry,
        );
        if (readiness.required.some((entry) =>
          exactRequirementIds.has(entry.id ?? "") &&
          (entry.status !== "loaded" || !entry.verified)
        )) {
          throw new Error("The exact font was linked but could not be activated in this preview.");
        }
      }
      if (!current()) return;
      const next = structuredClone(captured);
      for (const item of linked) {
        const candidate = next.variants.find((value) => value.id === item.id);
        if (candidate) candidate.packageValue = item.packageValue;
      }
      onFamilyChange(next);
    } catch (error) {
      if (!current()) return;
      if (blockedStorageCause(error)) setRetryUpload({ group, file, family: captured });
      setErrors(errors => ({ ...errors, [group.key]: error }));
    } finally {
      if (current()) setBusyKey(key => key === group.key ? null : key);
    }
  };

  if (groups.length === 0) {
    return (
      <div className="family-font-empty family-font-empty--compact">
        <div>
          <h2 className="ui-subsection-title">No font files required</h2>
        </div>
      </div>
    );
  }

  return (
    <ConnectedList label="Required fonts" className="family-font-list" data-testid="family-font-preparation">
      {[...groups].sort((a, b) => Number(a.usages.every(usage => isExactFontRequirementResolved(family.variants.find(variant => variant.id === usage.variantId)!.packageValue, usage.requirement))) - Number(b.usages.every(usage => isExactFontRequirementResolved(family.variants.find(variant => variant.id === usage.variantId)!.packageValue, usage.requirement)))).map((group) => {
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
          <ConnectedListItem className="family-font-row" data-ready={ready || undefined} tone={!ready ? "attention" : "neutral"} key={group.key}>
            <div className="family-font-row__heading">
              <div>
                <h2 className="ui-subsection-title">{group.label}</h2>
                {ready ? <span className="ui-metadata">Available</span> : null}
              </div>
              {!ready || checking ? <Status tone={checking ? "neutral" : error ? "blocked" : "attention"}>
                {checking ? "Checking" : error ? blockedStorageCause(error) ? "Storage blocked" : "Mismatched" : "Missing"}
              </Status> : null}
            </div>
            <div className="family-font-row__actions">
              {!ready ? (
                <p className="ui-supporting-copy">Upload this face once to use it in every compatible design.</p>
              ) : <span />}
              <FilePickerButton
                key={family.id + ":" + group.key}
                onClick={() => { pickFamily.current = family; setRetryUpload(null); }}
                accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf"
                disabled={busyKey !== null}
                variant={ready ? "quiet" : "secondary"}
                size="small"
                leadingIcon={<FileUp size={16} />}
                onSelect={(file) => { if (pickFamily.current === family) void upload(group, file); }}
              >
                {ready ? "Replace font" : "Upload font"}
              </FilePickerButton>
            </div>
            {error ? <p className="ui-field__error" role="alert">{studioFailureMessage(error)}{retryUpload?.group.key === group.key && retryUpload.family === family && <><Button size="small" variant="secondary" disabled={busyKey !== null} onClick={() => void upload(retryUpload.group, retryUpload.file)}>Retry upload</Button><Button size="small" variant="quiet" onClick={() => { pickFamily.current = family; setRetryUpload(null); }}>Cancel</Button></>}</p> : null}

          </ConnectedListItem>
        );
      })}
      {Boolean(errors.__registry) ? <p className="ui-field__error" role="alert">{blockedStorageCause(errors.__registry) && <strong>Storage blocked. </strong>}{studioFailureMessage(errors.__registry)}<Button size="small" variant="secondary" disabled={busyKey !== null} onClick={() => setRegistryRetry(value => value + 1)}>Retry font check</Button></p> : null}
    </ConnectedList>
  );
}
