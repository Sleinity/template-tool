import { StrictMode, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  createResolvedRenderTree,
  getEffectiveEditableFields,
  updateTemplatePackageField,
  type ResolvedRenderTreeV1,
  type TemplatePackageV1,
} from "@sleinity/template-core";
import {
  exportTemplatePackagePng,
  runTemplatePackageImportPipeline,
} from "@sleinity/template-browser";
import {
  TemplatePackageRenderer,
  type ResolvedProductRenderIdentityV1,
} from "@sleinity/template-react";
import "./styles.css";

function App() {
  const [packageValue, setPackageValue] = useState<TemplatePackageV1 | null>(null);
  const [identity, setIdentity] = useState<ResolvedProductRenderIdentityV1 | null>(null);
  const [message, setMessage] = useState("Choose a TemplatePackage ZIP.");
  const canvasRef = useRef<HTMLDivElement>(null);
  const resolvedTree: ResolvedRenderTreeV1 | null = useMemo(
    () => packageValue ? createResolvedRenderTree(packageValue) : null,
    [packageValue],
  );
  const firstTextField = packageValue
    ? getEffectiveEditableFields(packageValue).find((field) => field.type === "text")
    : undefined;

  const openZip = async (file: File) => {
    setMessage("Importing…");
    const result = await runTemplatePackageImportPipeline({
      format: "zip",
      buffer: await file.arrayBuffer(),
      sourceName: file.name,
    });
    if (!result.package || !result.validation?.valid) {
      setMessage("The package could not be imported. Inspect its diagnostics in Template Studio.");
      return;
    }
    setPackageValue(result.package);
    setMessage("Imported from ZIP. Rendering uses persisted package data only.");
  };

  const editFirstText = () => {
    if (!packageValue || !firstTextField) return;
    const current = packageValue.nodes[firstTextField.nodeId];
    const currentText = current?.type === "TEXT" && "characters" in current.text
      ? current.text.characters
      : "";
    const result = updateTemplatePackageField(
      packageValue,
      firstTextField,
      `${currentText} · edited`,
    );
    if (result.applied !== false) setPackageValue(result.packageValue);
  };

  const exportPng = async () => {
    if (!packageValue || !canvasRef.current || identity?.readiness !== "ready") return;
    setMessage("Waiting for the current render revision and exporting…");
    await exportTemplatePackagePng({
      packageValue,
      node: canvasRef.current,
      renderMode: "editor",
      templateName: packageValue.name,
    });
    setMessage("PNG exported from the same package revision shown above.");
  };

  return (
    <main>
      <header>
        <h1>Template Renderer SDK</h1>
        <p>No Template Studio navigation, validator, Fields, or editor UI is included.</p>
      </header>
      <nav>
        <label className="button">
          Choose ZIP
          <input
            hidden
            type="file"
            accept=".zip,application/zip"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void openZip(file);
            }}
          />
        </label>
        <button disabled={!firstTextField} onClick={editFirstText}>Edit first text field</button>
        <button disabled={identity?.readiness !== "ready"} onClick={() => void exportPng()}>
          Export PNG
        </button>
      </nav>
      <p className="status">{message}</p>
      <p className="identity">Render identity: {identity?.identityId ?? "not ready"}</p>
      <section className="stage">
        {packageValue && resolvedTree ? (
          <div ref={canvasRef}>
            <TemplatePackageRenderer
              packageValue={packageValue}
              resolvedTree={resolvedTree}
              mode="editor"
              onRenderIdentity={setIdentity}
            />
          </div>
        ) : null}
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode><App /></StrictMode>,
);
