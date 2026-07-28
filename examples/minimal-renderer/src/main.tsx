import { StrictMode, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import type { TemplateSessionV1 } from "@sleinity/template-browser";
import {
  TemplateSessionProvider,
  TemplateSessionRenderer,
  useTemplateSession,
  useTemplateSessionSnapshot,
  type TemplateSessionRendererHandle,
  type ResolvedProductRenderIdentityV1,
} from "@sleinity/template-react";
import "./styles.css";

function TemplateConsumer({ session }: { session: TemplateSessionV1 }) {
  const snapshot = useTemplateSessionSnapshot();
  const [identity, setIdentity] = useState<ResolvedProductRenderIdentityV1 | null>(null);
  const [message, setMessage] = useState("Choose a TemplatePackage ZIP.");
  const rendererRef = useRef<TemplateSessionRendererHandle>(null);
  const restoreStarted = useRef(false);
  const firstTextField = snapshot.editableFields.find(
    (field) => field.type === "text" || field.type === "textarea",
  );

  useEffect(() => {
    if (restoreStarted.current) return;
    restoreStarted.current = true;
    const savedId = localStorage.getItem("template-sdk-example-saved-id");
    if (!savedId) return;
    void session.loadSavedTemplate(savedId).then((result) => {
      if (result.status === "ready") {
        setMessage("Restored saved session offline.");
      }
    });
  }, [session]);

  const openZip = async (file: File) => {
    setMessage("Importing…");
    const result = await session.loadZip({
      bytes: await file.arrayBuffer(),
      sourceName: file.name,
    });
    if (result.status !== "ready") {
      setMessage("The package could not be imported. Inspect its diagnostics in Template Studio.");
      return;
    }
    setMessage("Imported from ZIP. Rendering uses persisted package data only.");
  };

  const editFirstText = () => {
    if (!snapshot.workingPackage || !firstTextField) return;
    const current = snapshot.workingPackage.nodes[firstTextField.nodeId];
    const currentText = current?.type === "TEXT" && "characters" in current.text
      ? current.text.characters
      : "";
    session.setField(firstTextField.id, `${currentText} · edited`);
  };

  const exportPng = async () => {
    if (identity?.readiness !== "ready") return;
    setMessage("Waiting for the current render revision and exporting…");
    await rendererRef.current?.exportPng({ download: false });
    setMessage("PNG captured from the same package revision shown above.");
  };

  const saveSession = async () => {
    const saved = await session.save();
    localStorage.setItem("template-sdk-example-saved-id", saved.id);
    setMessage("Session saved for offline reload.");
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
        <button disabled={snapshot.status !== "ready"} onClick={() => void saveSession()}>
          Save session
        </button>
        <button disabled={identity?.readiness !== "ready"} onClick={() => void exportPng()}>
          Export PNG
        </button>
      </nav>
      <p className="status">{message}</p>
      <p className="identity">Render identity: {identity?.identityId ?? "not ready"}</p>
      <section className="stage">
        <TemplateSessionRenderer
          ref={rendererRef}
          mode="editor"
          fallback={<p>Choose a ZIP to start.</p>}
          onRenderIdentity={setIdentity}
        />
      </section>
    </main>
  );
}

function App() {
  const session = useTemplateSession();
  return (
    <TemplateSessionProvider session={session}>
      <TemplateConsumer session={session} />
    </TemplateSessionProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode><App /></StrictMode>,
);
