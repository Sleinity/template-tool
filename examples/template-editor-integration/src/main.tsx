import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { FieldRulesV2Host } from "./FieldRulesV2Host";
import "./styles.css";
createRoot(document.getElementById("root")!).render(<StrictMode><FieldRulesV2Host /></StrictMode>);
