import { resolvePackageAssetSource } from "@sleinity/template-core/assets";
import type { TemplatePackageV1, TemplatePackageV2 } from "@sleinity/template-core";
import { TemplateThumbnailStage } from "../components/ui";

/** Source preview only; inspection continues to use the accepted session renderer. */
export function DesignThumbnail({ packageValue }: { packageValue: TemplatePackageV1 | TemplatePackageV2 }) {
  const preview = packageValue.referencePreview;
  const source = (preview?.assetId ? resolvePackageAssetSource(packageValue.assets[preview.assetId]) : undefined) ?? preview?.url;
  return <TemplateThumbnailStage name={packageValue.name} src={source ?? undefined} className="studio-design-thumbnail" />;
}
