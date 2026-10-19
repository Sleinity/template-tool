import { countTemplateFieldGraphemesV1 } from "@sleinity/template-core";
import type { ReactTemplateFieldSessionV2 } from "@sleinity/template-react";
import type { TemplateSessionV2MutationResult } from "@sleinity/template-browser/session";
import type { DeferredFieldCommitResult } from "./deferredFieldDrafts";

export type RenderedTextareaOutcome = DeferredFieldCommitResult & {
  disposition: "accepted" | "restored" | "canceled";
  notice?: string;
};
type Options = {
  session: ReactTemplateFieldSessionV2;
  fieldId: string;
  value?: string;
  choiceId?: string;
  beforeComposition?: string;
  signal: AbortSignal;
  isCurrent(): boolean;
  timeoutMs?: number;
};
class CanceledDraft extends Error {}

/** Studio transaction only. The ordinary native session/renderer owns every
 * candidate and its evidence. No inferred line count becomes an authority. */
export async function commitRenderedTextareaDraft(options: Options): Promise<RenderedTextareaOutcome> {
  const { session, fieldId } = options;
  const initial = session.getSnapshot();
  const source = "family" in initial ? initial.family : initial.basePackage;
  const variant = "selectedVariantId" in initial ? initial.selectedVariantId : null;
  const deadline = Date.now() + (options.timeoutMs ?? 10000);
  const controller = () => session.getFieldControllers().find(field => field.id === fieldId);
  const fieldState = () => session.getSnapshot().fields.find(field => field.descriptor.id === fieldId);
  let revision = initial.contentState?.revision;
  let operation = initial.operationRevision;
  const current = () => {
    const now = session.getSnapshot();
    return !options.signal.aborted && options.isCurrent() && now.status !== "disposed" &&
      ("family" in now ? now.family : now.basePackage) === source &&
      ("selectedVariantId" in now ? now.selectedVariantId : null) === variant &&
      now.contentState?.revision === revision && now.operationRevision === operation;
  };
  const assertCurrent = () => { if (!current()) throw new CanceledDraft(); };
  const track = (result: TemplateSessionV2MutationResult) => {
    revision = result.contentRevision; operation = session.getSnapshot().operationRevision;
    return result;
  };
  const waitForLines = () => new Promise<NonNullable<ReturnType<typeof fieldState>>["renderValidation"]>((resolve, reject) => {
    let stop = () => {};
    let timer: ReturnType<typeof setTimeout>;
    const finish = (error?: Error) => {
      clearTimeout(timer); stop(); options.signal.removeEventListener("abort", abort);
      if (error) reject(error); else resolve(fieldState()!.renderValidation);
    };
    const abort = () => finish(new CanceledDraft());
    const inspect = () => {
      if (!current()) { finish(new CanceledDraft()); return; }
      const state = fieldState()?.renderValidation;
      if (state && state.state !== "not-required" && state.contentRevision === revision &&
        ["valid", "invalid", "inactive"].includes(state.state)) finish();
    };
    timer = setTimeout(() => finish(new Error("The preview could not validate this edit. The previous value was restored.")), Math.max(0, deadline - Date.now()));
    stop = session.subscribe(inspect);
    options.signal.addEventListener("abort", abort, { once: true });
    inspect();
  });
  const apply = async (value: string | undefined, choiceId?: string): Promise<RenderedTextareaOutcome> => {
    assertCurrent();
    const before = fieldState();
    const control = controller();
    if (!before || control?.type !== "textarea") throw new CanceledDraft();
    const entry = session.getSnapshot().contentState?.values[fieldId];
    const canRestore = before.blockingErrors.length === 0;
    const restore = (): RenderedTextareaOutcome => {
      assertCurrent();
      const latest = controller();
      if (latest?.type !== "textarea") throw new CanceledDraft();
      const result = track(!entry ? latest.reset() : entry.selectedChoiceId ? latest.selectChoice(entry.selectedChoiceId) : latest.setValue(before.value as string));
      if (!result.accepted || result.stale) throw new Error("The previous text could not be restored. Reset the field to continue.");
      return { accepted: true, disposition: "restored" };
    };
    const result = track(choiceId ? control.selectChoice(choiceId) : control.setValue(value ?? ""));
    if (!result.accepted || result.stale) return { ...result, disposition: "canceled" };
    // A stricter design can already have deterministic errors. Allow correction
    // through the normal reducer without waiting on an unavailable renderer.
    if (session.getSnapshot().readiness.deterministic === "blocked" && initial.readiness.deterministic === "blocked") {
      if ((fieldState()?.blockingErrors.length ?? 0) < before.blockingErrors.length) return { accepted: true, disposition: "accepted" };
      return { ...restore(), notice: "Correct the other field errors before the preview can validate this edit." };
    }
    try {
      const evidence = await waitForLines();
      if (evidence.state !== "invalid") return { accepted: true, disposition: "accepted" };
      const previous = before.renderValidation;
      const nextValue = fieldState()?.value as string;
      const repairing = previous.state === "invalid" && (evidence.visualLines < previous.visualLines ||
        evidence.visualLines === previous.visualLines && countTemplateFieldGraphemesV1(nextValue) < countTemplateFieldGraphemesV1(before.value as string));
      if (repairing || !canRestore) return { accepted: true, disposition: "accepted" };
      return { ...restore(), notice: `Maximum of ${control.configuration.maxLines} rendered lines reached.` };
    } catch (error) {
      if (error instanceof CanceledDraft) throw error;
      if (!canRestore) return { accepted: true, disposition: "accepted", notice: "Preview validation is pending. Correct the remaining errors before exporting." };
      return { ...restore(), notice: error instanceof Error ? error.message : String(error) };
    }
  };
  try {
    if (options.beforeComposition !== undefined && controller()?.value !== options.beforeComposition) await apply(options.beforeComposition);
    return await apply(options.value, options.choiceId);
  } catch (error) {
    if (error instanceof CanceledDraft) return { accepted: true, disposition: "canceled" };
    throw error;
  }
}
