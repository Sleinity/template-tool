import { createTemplateSessionV2 } from "../src/session/templateSessionV2";
import { createTemplateFieldFamilySessionV2 } from "../src/session/templateFieldFamilySessionV2";
import { createTemplateFieldFamilyFromSourcesV2 } from "../src/import/templateSourceAssemblyV2";
import { InMemoryTemplateSessionRepositoryV2 } from "../src/persistence/v2SessionRepositories";
import { adaptSingleSession, adaptFamilySession } from "../src/internal/sessionContract/adapt";
import type { InternalSessionAdapter } from "../src/internal/sessionContract/types";
import { assert, equal, deferred, v2Package } from "./sessionContract.fixtures";

for (const kind of ["single", "family"] as const) {
  const source = v2Package(), family = createTemplateFieldFamilyFromSourcesV2([source], "Ordered saves");
  const starts = [0, 1].map(() => Array.from({ length: 8 }, () => deferred<void>()));
  const gates = [0, 1].map(() => Array.from({ length: 8 }, () => deferred<void>()));
  const writes: Array<Array<{ id: string; contentRevision: number }>> = [[], []];
  const pairs: InternalSessionAdapter[] = [0, 1].map(index => {
    const repository = new InMemoryTemplateSessionRepositoryV2();
    const write = async <T extends { id: string; contentState: { revision: number } }>(record: T): Promise<T> => {
      const current = writes[index].length;
      writes[index].push({ id: record.id, contentRevision: record.contentState.revision }); starts[index][current].resolve();
      await gates[index][current].promise; return record;
    };
    repository.saveTemplateSessionV2 = write; repository.saveTemplateFieldFamilyV3 = write;
    return kind === "single" ? adaptSingleSession(createTemplateSessionV2({ repository })) : adaptFamilySession(createTemplateFieldFamilySessionV2({ repository }));
  });
  const load = () => pairs.forEach(pair => { if (pair.kind === "single") pair.authority.load(source); else pair.authority.load(family); });
  const save = () => pairs.map(pair => pair.kind === "single" ? pair.authority.save({ id: "ordered-single" }) : pair.authority.save());
  const start = (index: number) => Promise.all(starts.map(item => item[index].promise));
  const finish = (index: number) => gates.forEach(item => item[index].resolve());
  const check = (label: string) => { equal(writes[0], writes[1], `${kind}/${label}/writes`); equal(pairs[0].authority.getSnapshot(), pairs[1].getSnapshot().nativeSnapshot, `${kind}/${label}/snapshot`); };
  load();
  const first = save(); await start(0);
  pairs.forEach((pair, index) => {
    const field = (index ? pair.getFieldControllers() : pair.authority.getFieldControllers()).find(field => field.type === "text")!;
    assert(field.type === "text" && field.setValue("Latest").accepted, "Pending saves do not block immediate canonical edits.");
  });
  const second = save(); assert(writes.every(list => list.length === 1), "Queued saves cannot begin before earlier writes complete.");
  finish(0); await Promise.all(first); await start(1); check("second captured revision");
  assert(writes[0][0].id === writes[0][1].id && writes[0][1].contentRevision > writes[0][0].contentRevision, "Invocation captures preserve record identity and newer accepted content.");
  finish(1); await Promise.all(second); check("ordered completion");
  const failed = save().map(promise => promise.then(() => false, error => error.message === "write failed")); await start(2);
  gates.forEach(item => item[2].reject(new Error("write failed")));
  assert((await Promise.all(failed)).every(Boolean), "Each failed write rejects its own caller."); check("failure");
  const retry = save(); await start(3); finish(3); await Promise.all(retry); check("retry heals queue");
  const active = save(); await start(4);
  const cancelled = save().map(promise => promise.then(() => false, () => true));
  pairs.forEach(pair => pair.authority.reset()); load(); finish(4); await Promise.all(active);
  assert((await Promise.all(cancelled)).every(Boolean), "Reset cancels queued writes even after a new load."); check("reset generation");
  const inFlight = save(); await start(5);
  const disposed = save().map(promise => promise.then(() => false, () => true));
  pairs.forEach(pair => pair.authority.dispose()); finish(5); await Promise.all(inFlight);
  assert((await Promise.all(disposed)).every(Boolean), "Disposal cancels queued writes, not already started storage operations."); check("disposed completion");
}
console.log("Differential save capture, ordering, failure/retry, reset and disposal passed.");
