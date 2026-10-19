import { createTemplateSessionV2 } from "@sleinity/template-browser/session";
import { v2Package, assert } from "../../../../packages/template-browser/test/sessionContract.fixtures";
import { commitRenderedTextareaDraft } from "./renderedTextareaDrafts";

// Controlled evidence tests transaction ownership, not browser line measurement.
function fixture(publish = true) {
  const session = createTemplateSessionV2(); session.load(v2Package());
  const lease = session.beginRuntimeEvidencePublication();
  let generation = lease, revision = -1;
  const observe = () => {
    const s = session.getSnapshot();
    if (!publish || !s.contentState || !s.materialization?.materializationRevision || s.contentState.revision === revision) return;
    revision = s.contentState.revision; generation++;
    const evidence = { contentRevision: revision, materializationRevision: s.materialization.materializationRevision, publicationGeneration: generation, settlementRevision: `s${generation}`, fontRevision: "f", fonts: "ready" as const, renderer: "ready" as const };
    session.publishRuntimeReadiness(evidence);
    const text = s.fields.find(f => f.descriptor.id === "textarea:body")!.value as string;
    session.publishFieldLayoutEvidence({ ...evidence, schemaVersion: "field-layout-evidence-v1", packageIdentity: s.basePackage!.packageId, fieldId: "textarea:body", participation: "active", reliability: "reliable", measuredVisualLines: text.split("\n").length });
  };
  const stop = session.subscribe(observe); observe();
  const write = (value: string, beforeComposition?: string, signal = new AbortController().signal, timeoutMs = 100) => commitRenderedTextareaDraft({ session, fieldId: "textarea:body", value, beforeComposition, signal, isCurrent: () => true, timeoutMs });
  return { session, write, stop, pause() { publish = false; } };
}
{
  const f = fixture();
  assert((await f.write("One\nTwo")).disposition === "accepted");
  assert((await f.write("One\nTwo\nThree")).disposition === "restored");
  assert(f.session.getSnapshot().contentState!.values["textarea:body"].value === "One\nTwo", "Overflow restores custom value");
  f.session.dispose();
}
{
  const f = fixture();
  assert((await f.write("One\nTwo\nThree")).disposition === "restored");
  assert(!f.session.getSnapshot().contentState!.values["textarea:body"], "Rollback restores sparse imported-default provenance");
  const body = f.session.getSnapshot().basePackage!.editableFields.find(f => f.id === "textarea:body")!;
  if (body.type !== "textarea") throw new Error("Textarea required");
  f.session.configure({ fields: [{ ...body, configuration: { ...body.configuration, choices: { mode: "suggested", options: [{ id: "chosen", value: "Choice" }] } } }] });
  const control = f.session.getFieldControllers().find(f => f.type === "textarea")!;
  if (control.type !== "textarea") throw new Error("Textarea required");
  control.selectChoice("chosen");
  assert((await f.write("One\nTwo\nThree")).disposition === "restored");
  assert(f.session.getSnapshot().contentState!.values["textarea:body"].selectedChoiceId === "chosen", "Rollback preserves selected choice identity");
  assert((await f.write("Alpha\nBeta\nGamma", "Alpha\nBeta")).disposition === "restored");
  assert(f.session.getSnapshot().contentState!.values["textarea:body"].value === "Alpha\nBeta", "Rejected composition preserves and validates the pre-composition local draft");
  f.session.dispose();
}
{
  const f = fixture(); f.pause();
  assert((await f.write("Pending", undefined, undefined, 5)).disposition === "restored", "Timeout restores instead of accepting unavailable evidence");
  assert(!f.session.getSnapshot().contentState!.values["textarea:body"]);
  const pending = f.write("Canceled");
  const source = v2Package(); source.packageId += "-replacement"; f.session.load(source);
  assert((await pending).disposition === "canceled" && !f.session.getSnapshot().contentState!.values["textarea:body"], "Canceled work cannot roll back against a replacement source");
  const abort = new AbortController(); const abandoned = f.write("Abandoned", undefined, abort.signal); abort.abort();
  assert((await abandoned).disposition === "canceled");
  f.session.dispose();
}

{
  const f = fixture();
  const body = f.session.getFieldControllers().find(field => field.type === "textarea")!;
  if (body.type !== "textarea") throw new Error("Textarea required");
  body.setValue("One\nTwo\nThree\nFour");
  assert((await f.write("One\nTwo\nThree")).disposition === "accepted", "Known saved overflow can be reduced progressively");
  assert((await f.write("One\nTwo\nThree\nFour")).disposition === "restored", "Repair mode does not permit worsening known line overflow");
  const title = f.session.getSnapshot().basePackage!.editableFields.find(field => field.type === "text")!;
  if (title.type !== "text") throw new Error("Text required");
    const titleControl = f.session.getFieldControllers().find(field => field.type === "text")!;
  if (titleControl.type !== "text") throw new Error("Text required");
  titleControl.setValue("abc");
  f.session.configure({ fields: [{ ...title, configuration: { maxCharacters: 2 } }] });
  assert((await f.write("Unmeasurable")).disposition === "restored", "Unrelated deterministic errors do not admit unvalidated growth");
  f.session.dispose();
}

console.log("Renderer-validated draft acceptance, provenance, IME, timeout, cancellation and repair boundaries passed.");
