import assert from "node:assert/strict";
import { readSetupSourceBatch, SetupSourceOwnership } from "./setupSourceOwnership";
import type { SetupSource } from "./setupSources";

const file = (name: string) => ({ name }) as File;
const source = (id: string, dispose: () => void) => ({ id, name: `${id}.zip`, packageValue: {} as SetupSource["packageValue"], dispose });
{
  const owners = new SetupSourceOwnership();
  let released = 0;
  const accepted = owners.track(source("accepted", () => { released++; }));
  let resolveLate!: (value: SetupSource) => void;
  let lateReleased = 0;
  const cause = new Error("One ZIP is invalid");
  const pending = readSetupSourceBatch([file("bad"), file("late")], async (item, id) => {
    assert(id.startsWith("source-"), "Identity exists before loading starts");
    if (item.name === "bad") throw cause;
    return new Promise<SetupSource>(resolve => { resolveLate = value => resolve(owners.track(value)); });
  }, owners, () => true);
  let completed = false;
  pending.catch(() => { completed = true; });
  await Promise.resolve(); await Promise.resolve();
  assert.equal(completed, false, "A rejected batch awaits late successful peers");
  resolveLate(source("late", () => { lateReleased++; }));
  await assert.rejects(pending, error => error === cause);
  assert.deepEqual([released, lateReleased], [0, 1]);
  owners.release([accepted]); owners.dispose(); assert.equal(released, 1);
}
{
  const owners = new SetupSourceOwnership(); let releases = 0;
  const candidate = source("stale", () => { releases++; });
  await assert.rejects(readSetupSourceBatch([file("stale")], async () => owners.track(candidate), owners, () => false), /cancelled/);
  owners.dispose(); assert.equal(releases, 1);
}
{
  const owners = new SetupSourceOwnership(); let releases = 0;
  const candidate = owners.track(source("review", () => { releases++; }));
  const changed = { ...candidate, name: "accepted.zip" };
  owners.releaseRemoved([candidate], [changed]); assert.equal(releases, 0, "Acceptance retains the same import lease");
  owners.releaseRemoved([changed], []); owners.release([candidate]); assert.equal(releases, 1);
}
{
  const owners = new SetupSourceOwnership(); let peerReleased = 0;
  const cause = new Error("Cleanup failed");
  owners.track(source("first", () => { throw cause; }));
  owners.track(source("peer", () => { peerReleased++; }));
  assert.throws(() => owners.dispose(), error => error === cause);
  assert.equal(peerReleased, 1); owners.dispose();
  // React StrictMode can replay effects; ownership remains reusable after cleanup.
  owners.track(source("replay", () => { peerReleased++; })); owners.dispose();
  assert.equal(peerReleased, 2);
}
console.log("Studio import candidates: atomic late batches, cancellation, handoff and final cleanup passed.");
