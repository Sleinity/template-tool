import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { CompleteHost } from "./CompleteHost";
import "./styles.css";
createRoot(document.getElementById("root")!).render(<StrictMode><CompleteHost /></StrictMode>);
