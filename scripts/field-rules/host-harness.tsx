import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { FieldRulesV2Host } from "../../examples/template-editor-integration/src/FieldRulesV2Host";

createRoot(document.getElementById("root")!).render(<StrictMode><FieldRulesV2Host /></StrictMode>);
