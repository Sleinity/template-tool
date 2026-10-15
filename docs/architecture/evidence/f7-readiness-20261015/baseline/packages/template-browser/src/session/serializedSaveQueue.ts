/** Session-local scheduling only. Callers retain capture, cancellation,
 * resource ownership and publication policy. Keep this queue across loads/reset.
 */
export function createSerializedSaveQueue() {
  let tail: Promise<unknown> = Promise.resolve();
  return {
    enqueue<T>(write: () => Promise<T>, finalize: () => void): Promise<T> {
      const pending = tail.then(write).finally(finalize);
      tail = pending.then(() => undefined, () => undefined);
      return pending;
    },
  };
}
