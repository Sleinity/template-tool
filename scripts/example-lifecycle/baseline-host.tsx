/** Test-only wrapper around the retained example. */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { FieldRulesV2Host } from '../../examples/template-editor-integration/src/FieldRulesV2Host';
const sessions = new WeakSet<object>();
const state = { created: [] as Array<{url:string;type:string}>, revoked: [] as string[], disposals:0, completions:0, current:null as any,
 capture(session:any) { if(!sessions.has(session)){sessions.add(session);const dispose=session.dispose.bind(session);session.dispose=()=>{state.disposals++;return dispose();};}state.current=session; },
 unmount() { root.unmount(); },
};
(globalThis as any).__baseline=state;
const create=URL.createObjectURL,revoke=URL.revokeObjectURL;
URL.createObjectURL=function(blob){const url=create.call(this,blob);state.created.push({url,type:blob.type});return url;};
URL.revokeObjectURL=function(url){state.revoked.push(url);return revoke.call(this,url);};
const root=createRoot(document.getElementById('root')!);
root.render(<StrictMode><FieldRulesV2Host /></StrictMode>);
