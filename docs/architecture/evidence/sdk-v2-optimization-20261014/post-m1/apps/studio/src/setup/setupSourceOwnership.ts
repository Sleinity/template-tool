import type { SetupSource } from "./setupSources";

/** Per-editor import leases. Canonical sessions retain their own managed URLs. */
export class SetupSourceOwnership {
  private releases = new Set<() => void>();
  track(source: SetupSource): SetupSource {
    if (source.dispose) this.releases.add(source.dispose);
    return source;
  }
  release(sources: readonly Pick<SetupSource, "dispose">[]): void {
    let failure: unknown;
    let failed = false;
    for (const source of sources) {
      if (!source.dispose || !this.releases.delete(source.dispose)) continue;
      try { source.dispose(); } catch (cause) { if (!failed) failure = cause; failed = true; }
    }
    if (failed) throw failure;
  }
  releaseRemoved(previous: readonly SetupSource[], next: readonly SetupSource[]): void {
    const retained = new Set(next.map(source => source.dispose));
    this.release(previous.filter(source => !retained.has(source.dispose)));
  }
  dispose(): void {
    this.release([...this.releases].map(dispose => ({ dispose })));
  }
}

/** Wait for late peers before deciding an atomic import batch. */
export async function readSetupSourceBatch(
  files: readonly File[],
  read: (file: File, sourceId: string) => Promise<SetupSource>,
  owners: SetupSourceOwnership,
  isCurrent: () => boolean,
): Promise<SetupSource[]> {
  const results = await Promise.allSettled(files.map(file => read(file, `source-${crypto.randomUUID()}`)));
  const sources = results.flatMap(result => result.status === "fulfilled" ? [result.value] : []);
  const failed = results.find(result => result.status === "rejected");
  if (failed || !isCurrent()) {
    owners.release(sources);
    if (failed?.status === "rejected") throw failed.reason;
    throw new Error("Import was cancelled.");
  }
  return sources;
}
