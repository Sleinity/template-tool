import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Button, SideDrawer } from "../components/ui";

type Edit = { valid: boolean; focusError(): void; apply(): boolean; discard(): void };
const Context = createContext<{ register(edit: Edit | null): void; request(): Promise<boolean>; dirty: boolean; prompting: boolean } | null>(null);
export const useSetupEditGuard = () => useContext(Context);

/** Protects Studio-local configuration drafts; never persists or validates content. */
export function SetupEditGuard({ children }: { children: ReactNode }) {
  const edit = useRef<Edit | null>(null);
  const resolve = useRef<((allowed: boolean) => void) | null>(null);
  const [valid, setValid] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const register = useCallback((next: Edit | null) => { edit.current = next; setDirty(Boolean(next)); setValid(next?.valid ?? true); }, []);
  const request = useCallback(() => {
    if (!edit.current) return Promise.resolve(true);
    resolve.current?.(false);
    setOpen(true);
    setFailed(false);
    return new Promise<boolean>((done) => { resolve.current = done; });
  }, []);
  const finish = (allowed: boolean) => { setOpen(false); resolve.current?.(allowed); resolve.current = null; };
  useEffect(() => {
    const unload = (event: BeforeUnloadEvent) => { if (edit.current) event.preventDefault(); };
    window.addEventListener("beforeunload", unload);
    return () => { window.removeEventListener("beforeunload", unload); resolve.current?.(false); };
  }, []);
  return <Context.Provider value={{ register, request, dirty, prompting: open }}>{children}
    <SideDrawer open={open} title="Unapplied field changes" onClose={() => finish(false)}>
      <p>Apply or discard these changes before continuing.</p>
      {failed && <p role="alert">These changes could not be applied. Choose Keep editing to correct the highlighted settings.</p>}
      {valid && <Button onClick={() => { if (edit.current?.apply()) finish(true); else setFailed(true); }}>Apply and continue</Button>}
      <Button variant="secondary" onClick={() => { edit.current?.discard(); register(null); finish(true); }}>Discard changes</Button>
      <Button variant="quiet" onClick={() => { finish(false); if (!valid || failed) edit.current?.focusError(); }}>Keep editing</Button>
    </SideDrawer>
  </Context.Provider>;
}
