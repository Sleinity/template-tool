import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { FieldRulesV2Host } from "../../template-editor-integration/src/FieldRulesV2Host";
import "../../template-editor-integration/src/styles.css";
// Unified V2 example supports both single imports and multi-source Families.
createRoot(document.getElementById("root")!).render(<StrictMode><FieldRulesV2Host /></StrictMode>);
