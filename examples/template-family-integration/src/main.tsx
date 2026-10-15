import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { CompleteHost } from "../../template-editor-integration/src/CompleteHost";
import "../../template-editor-integration/src/styles.css";
// Complete public-entry starter: choose multiple ZIPs for a real native Family.
createRoot(document.getElementById("root")!).render(<StrictMode><CompleteHost /></StrictMode>);
