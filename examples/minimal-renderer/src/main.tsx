import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { FieldRulesV2Host } from "../../template-editor-integration/src/FieldRulesV2Host";
import "../../template-editor-integration/src/styles.css";
// Minimal single-source lifecycle/renderer example; use the complete starter for Families and recovery.
createRoot(document.getElementById("root")!).render(<StrictMode><FieldRulesV2Host /></StrictMode>);
