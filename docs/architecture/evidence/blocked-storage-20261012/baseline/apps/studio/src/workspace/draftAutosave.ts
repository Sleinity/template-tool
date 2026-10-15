/** Studio content coordinator. Pending values are immutable canonical record snapshots. */
export function createStudioAutosave<T>(write: (value: T) => Promise<unknown>, notify: (status: string) => void, delay = 650) {
  let disposed = false;
  let pending: { value: T; revision: number } | null = null;
  let revision = 0;
  let saved = 0;
  let running: Promise<void> | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const flush = async (): Promise<void> => {
    clearTimeout(timer);
    if (running) { await running; return flush(); }
    if (disposed || !pending) return;
    const job = pending; pending = null;
    notify("Saving…");
    running = (async () => {
      try { await Promise.resolve().then(() => write(job.value)); saved = job.revision; notify(saved === revision ? "Saved" : "Unsaved changes"); }
      catch (cause) { if (!disposed) pending ??= job; notify(`Save failed: ${cause instanceof Error ? cause.message : String(cause)}`); throw cause; }
      finally { running = null; }
    })();
    await running;
    if (pending) await flush();
  };
  return {
    schedule(value: T) { if (disposed) return; pending = { value: structuredClone(value), revision: ++revision }; notify("Unsaved changes"); clearTimeout(timer); timer = setTimeout(() => { void flush().catch(() => {}); }, delay); },
    flush,
    activate() { disposed = false; },
    dirty: () => !disposed && saved !== revision,
    dispose() { disposed = true; pending = null; clearTimeout(timer); },
  };
}
