import {
  createContext,
  useContext,
  type PropsWithChildren,
} from "react";
import type { TemplateSessionV1 } from "@sleinity/template-browser/session";

const TemplateSessionContext = createContext<TemplateSessionV1 | null>(null);

export interface TemplateSessionProviderProps {
  session: TemplateSessionV1;
}

export function TemplateSessionProvider({
  session,
  children,
}: PropsWithChildren<TemplateSessionProviderProps>) {
  return (
    <TemplateSessionContext.Provider value={session}>
      {children}
    </TemplateSessionContext.Provider>
  );
}

export function useResolvedTemplateSession(
  override?: TemplateSessionV1,
): TemplateSessionV1 {
  const context = useContext(TemplateSessionContext);
  const session = override ?? context;
  if (!session) {
    throw new Error(
      "A TemplateSession is required. Pass session or use TemplateSessionProvider.",
    );
  }
  return session;
}
