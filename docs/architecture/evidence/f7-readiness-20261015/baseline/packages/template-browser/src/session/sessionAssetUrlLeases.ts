/** Internal URL lifetime shared by V2 sessions and their candidate successors.
 * Persisted hashes and canonical asset identities remain the ownership authority.
 * This registry only prevents disposing a predecessor from revoking live URLs.
 */
type UrlLeaseRegistry = Map<string, { count: number; revoke(): void }>;
// Curated entry points can be bundled independently. A realm-local registry
// keeps an asset-store lease visible to a session from another entry point.
const registryKey = Symbol.for("@sleinity/template-browser/asset-url-leases/v1");
const realm = globalThis as typeof globalThis & { [registryKey]?: UrlLeaseRegistry };
export const sessionAssetUrlLeases = realm[registryKey] ??= new Map();

/** Pin managed URLs while an asynchronous repository consumes a captured record. */
export function retainSessionAssetUrls(urls: Iterable<string>): () => void {
  const retained = [...new Set(urls)].filter(url => sessionAssetUrlLeases.has(url));
  for (const url of retained) sessionAssetUrlLeases.get(url)!.count += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    for (const url of retained) {
      const lease = sessionAssetUrlLeases.get(url)!;
      if (--lease.count === 0) { sessionAssetUrlLeases.delete(url); lease.revoke(); }
    }
  };
}
