import { createSerializedSaveQueue } from "../src/session/serializedSaveQueue";
import { assert, deferred, equal } from "./sessionContract.fixtures";

// An independent copy of the pre-extraction scheduling expression checks
// callback/finalizer/caller ordering, including ordinary Promise microtasks.
function originalQueue() {
  let tail: Promise<unknown> = Promise.resolve();
  return { enqueue<T>(write: () => Promise<T>, finalize: () => void) {
    const pending = tail.then(() => write()).finally(finalize);
    tail = pending.then(() => undefined, () => undefined);
    return pending;
  } };
}
async function transcript(queue: ReturnType<typeof createSerializedSaveQueue>) {
  const events: string[] = [], firstStarted = deferred<void>(), firstGate = deferred<void>();
  const error = new Error("original write error"), value = { accepted: true };
  const first = queue.enqueue(async () => { events.push("first start"); firstStarted.resolve(); await firstGate.promise; throw error; }, () => events.push("first finalize"));
  const caught = first.catch(actual => { assert(actual === error); events.push("first caller rejected"); });
  const second = queue.enqueue(() => { events.push("second start"); throw error; }, () => events.push("second finalize"));
  const caughtSecond = second.catch(actual => { assert(actual === error); events.push("second caller rejected"); });
  const third = queue.enqueue(async () => { events.push("third start"); return value; }, () => events.push("third finalize"));
  const completed = third.then(actual => { assert(actual === value); events.push("third caller resolved"); });
  events.push("enqueued"); await firstStarted.promise;
  assert(events.join(",") === "enqueued,first start", "Enqueue does not call the write synchronously.");
  firstGate.resolve(); queueMicrotask(() => events.push("ordinary microtask"));
  await Promise.all([caught, caughtSecond, completed]);
  return events;
}
equal(await transcript(createSerializedSaveQueue()), await transcript(originalQueue()), "Promise/finalizer ordering is unchanged");

// Finalizer failure follows the existing finally semantics and cannot poison tail.
const queue = createSerializedSaveQueue(), error = new Error("finalizer failure");
let finalizations = 0;
const failed = queue.enqueue(async () => 1, () => { finalizations++; throw error; });
assert(await failed.then(() => false, actual => actual === error));
assert(await queue.enqueue(async () => 2, () => { finalizations++; }) === 2);
assert(finalizations === 2);
console.log("Private save queue preserves FIFO, Promise ordering, results, original errors and one finalization per job.");
