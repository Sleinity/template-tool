import type { CompilerResourceHandle } from "./types";

/** Counts owners of one existing import release callback, not binary/URL owners. */
export function importResourceOwner(releaseImport?: () => void): {
  handle: CompilerResourceHandle;
  retain(): () => void;
} {
  let owners = 1;
  let closed = false;
  const release = () => {
    if (--owners === 0) { closed = true; releaseImport?.(); }
  };
  return {
    handle: resourceHandle([release]),
    retain() {
      if (closed) throw new Error("Compiler import resources have been released.");
      owners++;
      let retained = true;
      return () => { if (retained) { retained = false; release(); } };
    },
  };
}

export function resourceHandle(releases: readonly (() => void)[]): CompilerResourceHandle {
  let released = false;
  return Object.freeze({
    get released() { return released; },
    release() {
      if (released) return;
      released = true;
      let failed = false;
      let firstFailure: unknown;
      for (const callback of releases) {
        try { callback(); } catch (cause) { if (!failed) firstFailure = cause; failed = true; }
      }
      if (failed) throw firstFailure;
    },
  });
}
