/** Temporary stored-binary ownership only; native sessions own accepted leases. */
export function createStoredAssetHydration(options: {
  getManagedAsset(hash: string): Promise<{ blob: Blob } | null>;
  objectUrls: { create(blob: Blob): string; revoke(url: string): void };
  isStale(): boolean;
}) {
  const byHash = new Map<string, string>();
  let state: "active" | "released" | "transferred" = "active";
  const release = () => {
    if (state !== "active") return;
    state = "released";
    const urls = [...new Set(byHash.values())];
    byHash.clear();
    let failure: unknown;
    let failed = false;
    for (const url of urls) {
      try { options.objectUrls.revoke(url); }
      catch (cause) { if (!failed) { failure = cause; failed = true; } }
    }
    if (failed) throw failure;
  };
  return {
    getCachedUrl: (hash: string) => state === "active" ? byHash.get(hash) : undefined,
    async readUrl(hash: string): Promise<
      | { status: "available"; url: string }
      | { status: "missing" }
      | { status: "stale" }
    > {
      if (state !== "active") return { status: "stale" };
      const cached = byHash.get(hash);
      if (cached) return { status: "available", url: cached };
      try {
        const stored = await options.getManagedAsset(hash);
        if (state !== "active" || options.isStale()) { release(); return { status: "stale" }; }
        if (!stored) return { status: "missing" };
        const url = options.objectUrls.create(stored.blob);
        byHash.set(hash, url);
        return { status: "available", url };
      } catch (cause) {
        // Cleanup failures must not replace the original read/allocation exception.
        try { release(); } catch { /* Native callers still receive the original failure. */ }
        throw cause;
      }
    },
    getCreatedUrls: (): readonly string[] => [...new Set(byHash.values())],
    release,
    transfer() {
      if (state !== "active") return;
      state = "transferred";
      byHash.clear();
    },
  };
}
