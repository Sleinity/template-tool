import {
  createContext,
  useContext,
  useMemo,
  type PropsWithChildren,
} from "react";
import type {
  ResolvedRenderTreeV1,
  TemplatePackageV1,
} from "@sleinity/template-core";

export interface TemplateRuntimeValue {
  packageValue: TemplatePackageV1;
  resolvedTree: ResolvedRenderTreeV1;
}

const TemplateRuntimeContext = createContext<TemplateRuntimeValue | null>(null);

export function TemplateRuntimeProvider({
  packageValue,
  resolvedTree,
  children,
}: PropsWithChildren<TemplateRuntimeValue>) {
  const value = useMemo(
    () => ({ packageValue, resolvedTree }),
    [packageValue, resolvedTree],
  );
  return (
    <TemplateRuntimeContext.Provider value={value}>
      {children}
    </TemplateRuntimeContext.Provider>
  );
}

export function useTemplateRuntime(): TemplateRuntimeValue {
  const value = useContext(TemplateRuntimeContext);
  if (!value) {
    throw new Error("useTemplateRuntime must be used inside TemplateRuntimeProvider.");
  }
  return value;
}
