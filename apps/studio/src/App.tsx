import { lazy, Suspense, useEffect, useState } from "react";
import { recordSemanticRendererMvpMigration } from "@sleinity/template-browser/persistence";
import { StudioFieldRulesV2 } from "./field-rules/StudioFieldRulesV2";

// This former surface is test-only. Production never imports the legacy catalogue.
const SingleTemplateFidelityApp = import.meta.env.DEV
  ? lazy(() => import("../../../scripts/fidelity/legacy/SingleTemplateFidelityApp"))
  : null;
const FamilyFidelityApp = import.meta.env.DEV
  ? lazy(() => import("../../../scripts/fidelity/legacy/TemplateFamilyApp").then(module => ({ default: module.TemplateFamilyApp })))
  : null;

const WayfindingFoundationPreview = import.meta.env.DEV
  ? lazy(async () => {
      const module = await import("./components/ui/DesignSystemShowcase");
      return { default: module.DesignSystemShowcase };
    })
  : null;

export default function App() {
  const [rendererFidelityMode] = useState(() =>
    import.meta.env.DEV && typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("studio-mode") === "single-template-fidelity",
  );
  const [wayfindingFoundationPreview] = useState(() =>
    import.meta.env.DEV &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("studio-design-system") ===
      "wayfinding",
  );
  useEffect(() => {
    void recordSemanticRendererMvpMigration();
  }, []);
  if (wayfindingFoundationPreview && WayfindingFoundationPreview) {
    return (
      <Suspense fallback={<div className="app-route-loading">Loading showcase…</div>}>
        <WayfindingFoundationPreview />
      </Suspense>
    );
  }
  if (import.meta.env.DEV && FamilyFidelityApp && new URLSearchParams(window.location.search).get("studio-mode") === "family-template-fidelity") {
    return <Suspense fallback={<div>Loading fidelity surface…</div>}><FamilyFidelityApp /></Suspense>;
  }
  return rendererFidelityMode && SingleTemplateFidelityApp ? <Suspense fallback={<div>Loading fidelity surface…</div>}><SingleTemplateFidelityApp /></Suspense> : <StudioFieldRulesV2 />;
}
