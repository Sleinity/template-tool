import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { TemplateFieldSessionRendererV2, useTemplateFieldSessionV2Snapshot, type TemplateFieldSessionRendererV2Handle } from "@sleinity/template-react/editor";
import type { TemplateFieldControllerV2 } from "@sleinity/template-browser/session";
import type { ManagedFontRegistry } from "@sleinity/template-browser/fonts";
import { FieldHostLifecycle, hostErrorMessage } from "./fieldHostLifecycle";
import { StarterOutput, defaultStarterAdapters, listStarterRecords, type StarterAdapters, type StarterRecord } from "./starterPersistence";

class Preparation {
  readonly sources: FieldHostLifecycle[];
  private listeners = new Set<() => void>();
  private version = 0;
  private stops: (() => void)[] = [];
  constructor(files: File[], registry?: ManagedFontRegistry | null) {
    this.sources = files.map(file => {
      const host = new FieldHostLifecycle(); host.attach(registry);
      this.stops.push(host.subscribe(() => { this.version++; for (const listener of this.listeners) listener(); }));
      void host.importFile(file); return host;
    });
  }
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => this.listeners.delete(listener); };
  getSnapshot = () => this.version;
  dispose() { for (const stop of this.stops) stop(); for (const host of this.sources) host.detach(); this.listeners.clear(); }
}

/** Copyable application example; no Studio or internal SDK imports. */
export function CompleteHost({ adapters, fontRegistry }: { adapters?: StarterAdapters; fontRegistry?: ManagedFontRegistry | null }) {
  const [storage] = useState(() => adapters ?? defaultStarterAdapters());
  const [active, setActive] = useState<StarterOutput | null>(null);
  const [pending, setPending] = useState<Preparation | null>(null);
  const [records, setRecords] = useState<StarterRecord[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const current = useRef({ active, pending }); current.current = { active, pending };
  const lifetime = useRef(0), generation = useRef(0);
  const allowLeave = useRef<() => boolean>(() => true);
  const refresh = async () => { const rows = await listStarterRecords(storage); setRecords(rows); };
  useEffect(() => { let live = true; void listStarterRecords(storage).then(rows => { if(live)setRecords(rows); }).catch(cause => { if(live)setError(cause); }); return () => { live = false; }; }, [storage]);
  useLayoutEffect(() => {
    lifetime.current++;
    return () => { const ended = ++lifetime.current; queueMicrotask(() => { if(lifetime.current===ended){ generation.current++; current.current.active?.dispose(); current.current.pending?.dispose(); } }); };
  }, []);
  useEffect(() => () => { queueMicrotask(() => { if(current.current.active!==active)active?.dispose(); }); }, [active]);
  const canLeave = () => {
    if (!allowLeave.current()) { setError(new Error("Correct or Reset incomplete input before changing templates.")); return false; }
    return !active || active.record || window.confirm("Replace this unsaved template? Save it first to enable recovery.");
  };
  const accept = async (preparation: Preparation) => {
    if (busy || !canLeave()) return;
    const request = ++generation.current; setBusy(true); setError(null);
    let next: StarterOutput | null = null;
    try {
      await active?.flushRecovery();
      const sources = preparation.sources.map(host => {
        host.open(); const accepted = host.getSnapshot().accepted;
        if(!accepted)throw new Error(hostErrorMessage(host.getSnapshot().importError ?? "Prepare every source and exact font before opening."));
        const pkg = accepted.session.getSnapshot().basePackage;
        if(!pkg)throw new Error("Prepared package is unavailable.");
        return { id: accepted.id, name: accepted.sourceName, packageValue: pkg };
      });
      next = StarterOutput.fromSources(storage, sources);
      if (request !== generation.current) { next.dispose(); return; }
      setActive(next); setPending(null); preparation.dispose();
    } catch(cause) { next?.dispose(); if(request===generation.current){setError(cause);setPending(null);preparation.dispose();} }
    finally { if(request===generation.current)setBusy(false); }
  };
  const reopen = async (record: StarterRecord, mode: "fresh" | "resume") => {
    if(busy || !canLeave())return;
    const request=++generation.current;setBusy(true);setError(null);
    try {
      await active?.flushRecovery();
      const next=await StarterOutput.reopen(storage,record,mode);
      if(request!==generation.current){next.dispose();return;}
      setActive(next);
    }catch(cause){if(request===generation.current)setError(cause);}
    finally{if(request===generation.current)setBusy(false);}
  };
  return <main className="starter-host">
    <h1>Template SDK · editing host</h1>
    <p>One source opens a single template. Multiple sources open a Family. SDK 2.0.0 · exporter 0.6.1 · canonical schema 2.2.</p>
    <label>Load V2 JSON or exporter ZIPs <input aria-label="Load V2 JSON or exporter ZIPs" type="file" multiple accept=".zip,.json" disabled={busy} onChange={event=>{
      const files=Array.from(event.target.files??[]);event.target.value="";if(!files.length)return;
      pending?.dispose();setError(null);setPending(new Preparation(files,fontRegistry));
    }}/></label>
    {error!==null&&<p role="alert">{hostErrorMessage(error)}</p>}
    {pending&&<PreparationPanel pending={pending} disabled={busy} onOpen={()=>void accept(pending)} onCancel={()=>{pending.dispose();setPending(null);}}/>}
    <section aria-label="Saved templates"><h2>Saved templates</h2>
      <button disabled={busy} onClick={()=>void refresh().catch(setError)}>Refresh saved templates</button>
      {!records.length&&<p>No saved templates yet. Import, edit and Save template.</p>}
      {records.map(record=><div key={`${"family"in record?"family":"single"}:${record.id}`}>
        <span>{record.name} · {"family"in record?"Family":"Single"}</span>{" "}
        <button disabled={busy} onClick={()=>void reopen(record,"fresh")}>Fresh {record.name}</button>{" "}
        <button disabled={busy} onClick={()=>void reopen(record,"resume")}>Resume {record.name}</button>
      </div>)}
    </section>
    {active&&<CompleteEditor key={active.id} output={active} fontRegistry={fontRegistry} allowLeave={allowLeave} onSaved={refresh} onDiscard={()=>setActive(null)}/>}
  </main>;
}

function PreparationPanel({pending,disabled,onOpen,onCancel}:{pending:Preparation;disabled:boolean;onOpen():void;onCancel():void}){
  useSyncExternalStore(pending.subscribe,pending.getSnapshot,pending.getSnapshot);
  const views=pending.sources.map(host=>host.getSnapshot());
  const ready=views.every(v=>v.pending?.canOpen);
  return <section aria-label="Pending sources"><h2>Prepare sources</h2>
    {views.map((view,index)=><section key={index}>
      <h3>{view.pending?.sourceName??`Source ${index+1}`}</h3>
      {view.importError!==null&&<p role="alert">{hostErrorMessage(view.importError)}</p>}
      <p role="status">{view.pending?.busy?"Preparing source…":view.pending?.canOpen?"Ready to open":"Exact fonts required"}</p>
      {view.pending?.requirements.map(req=><label key={req.id}>{req.label} · {req.exact?"Exact font linked":"Upload exact font"}
        <input aria-label={`Source ${index+1} font ${req.label}`} type="file" accept=".ttf,.otf,.woff,.woff2,.ttc" disabled={disabled||view.pending?.busy} onChange={e=>{const f=e.target.files?.[0];e.target.value="";if(f)void pending.sources[index].uploadFont(req.id,f);}}/>
      </label>)}
      {view.pending?.error!==null&&view.pending?.error!==undefined&&<p role="alert">{hostErrorMessage(view.pending.error)}</p>}
      <button disabled={disabled||view.pending?.busy} onClick={()=>pending.sources[index].retryFonts()}>Retry source {index+1} fonts</button>
    </section>)}
    <button disabled={disabled||!ready} onClick={onOpen}>Open prepared sources</button>{" "}<button disabled={disabled} onClick={onCancel}>Cancel import</button>
  </section>;
}

function CompleteEditor({output,fontRegistry,allowLeave,onSaved,onDiscard}:{output:StarterOutput;fontRegistry?:ManagedFontRegistry|null;allowLeave:React.MutableRefObject<()=>boolean>;onSaved():Promise<void>;onDiscard():void}){
  const snapshot=useTemplateFieldSessionV2Snapshot(output.session);
  const saved=useSyncExternalStore(output.subscribe,output.getSnapshot,output.getSnapshot);
  const renderer=useRef<TemplateFieldSessionRendererV2Handle>(null);
  const [name,setName]=useState(output.record?.name??"My template"),[busy,setBusy]=useState(false),[error,setError]=useState<unknown>(null);
  const invalid=useRef(new Set<string>());const [invalidCount,setInvalidCount]=useState(0);
  const current=useRef(true);
  useLayoutEffect(()=>{current.current=true;allowLeave.current=()=>invalid.current.size===0&&!busy;return()=>{current.current=false;};},[busy,allowLeave]);
  const perform=async(action:()=>Promise<unknown>)=>{if(busy)return;setBusy(true);setError(null);try{await action();}catch(cause){if(current.current)setError(cause);}finally{if(current.current)setBusy(false);}};
  const native=output.session.getSnapshot();const family="family"in native?native.family:null;
  return <section aria-label="Accepted editor"><h2>Editor</h2>
    <p role="status">{saved.finished?"Output exported":!output.record?"Not saved · Save template to enable recovery":saved.error?"Save failed":saved.dirty?"Unsaved changes":"Saved"} · {snapshot.readiness.exportReady?"Ready to export":snapshot.readiness.state}</p>
    {(error??saved.error)!==null&&<p role="alert">{hostErrorMessage(error??saved.error)}</p>}
    {saved.cleanupRequired&&<button disabled={busy} onClick={()=>void perform(()=>output.retryCleanup())}>Retry cleanup only</button>}
    <fieldset disabled={busy||saved.finished}>
      <label>Template name <input aria-label="Template name" value={name} onChange={e=>setName(e.target.value)}/></label>
      {family&&<label>Design <select aria-label="Design" value={"selectedVariantId"in native?native.selectedVariantId??"":""} onChange={e=>{
        if(invalid.current.size){setError(new Error("Correct or Reset incomplete input before switching designs."));return;}
        try{if("selectVariant"in output.session)output.session.selectVariant(e.target.value);}catch(cause){setError(cause);}
      }}>{family.variants.map(v=><option key={v.id} value={v.id}>{v.packageValue.name}</option>)}</select></label>}
      {output.session.getFieldControllers().map(field=><StarterField key={`${"selectedVariantId"in native?native.selectedVariantId:"single"}:${field.id}`} field={field} canChangeVisibility={()=>{if(invalid.current.size){setError(new Error("Correct or Reset incomplete input before changing visibility."));return false;}return true;}} onInvalid={bad=>{if(bad)invalid.current.add(field.id);else invalid.current.delete(field.id);setInvalidCount(invalid.current.size);}}/>)}
      <button disabled={invalidCount>0} onClick={()=>void perform(async()=>{await output.saveTemplate(name);await onSaved();})}>Save template</button>{" "}
      <button disabled={invalidCount>0||!output.record} onClick={()=>void perform(()=>output.flushRecovery())}>Retry save / flush recovery</button>{" "}
      <button disabled={invalidCount>0||!snapshot.readiness.exportReady} onClick={()=>void perform(()=>output.exportPng(()=>{
        if(!renderer.current)throw new Error("Preview is unavailable.");return renderer.current.exportPng();
      }))}>Export PNG</button>
    </fieldset>
    {output.lease&&!saved.finished&&<button disabled={busy} onClick={()=>void perform(async()=>{await output.discard();onDiscard();})}>Discard recovery</button>}
    {snapshot.readiness.reasons.map((reason,index)=><p key={index}>{reason}</p>)}
    <TemplateFieldSessionRendererV2 ref={renderer} session={output.session} fontRegistry={fontRegistry} mode="editor"/>
  </section>;
}

function StarterField({field,onInvalid,canChangeVisibility}:{field:TemplateFieldControllerV2;onInvalid(bad:boolean):void;canChangeVisibility():boolean}){
  const [draft,setDraft]=useState(String(field.value)),[issue,setIssue]=useState<string|null>(null);
  const focused=useRef(false),live=useRef(true),operation=useRef(0);
  useLayoutEffect(()=>{live.current=true;return()=>{live.current=false;operation.current++;};},[]);
  useEffect(()=>{if(!issue&&!focused.current)setDraft(String(field.value));},[field.value,issue]);
  const accept=(result:{accepted:boolean;blockingErrors:readonly {message:string}[]})=>{operation.current++;const text=result.accepted?null:result.blockingErrors.map(i=>i.message).join("; ")||"Value was rejected.";setIssue(text);onInvalid(!result.accepted);return result.accepted;};
  const change=(value:string)=>{operation.current++;setDraft(value);try{
    if(field.type==="number"){if(value.trim()===""||!Number.isFinite(Number(value))){setIssue("Enter a complete finite number.");onInvalid(true);return;}accept(field.setValue(Number(value)));}
    else if(field.type==="text"||field.type==="textarea"||field.type==="date"||field.type==="color")accept(field.setValue(value));
  }catch(cause){setIssue(hostErrorMessage(cause));onInvalid(true);}};
  const replace=async(blob:File)=>{const ticket=++operation.current;onInvalid(true);try{if(field.type==="image"){const result=await field.replaceImage({blob});if(live.current&&ticket===operation.current)accept(result);}}catch(cause){if(live.current&&ticket===operation.current){setIssue(hostErrorMessage(cause));onInvalid(true);}}};
  return <section className="starter-field"><h3>{field.label}</h3>
    {field.type==="boolean"?<input aria-label={field.label} type="checkbox" checked={field.value} onChange={e=>{if(canChangeVisibility())accept(field.setValue(e.target.checked));}}/>:field.type==="image"?<>
      <input aria-label={`Replace ${field.label}`} type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0];e.target.value="";if(f)void replace(f);}}/>
      {field.configuration.replacementPlacement==="crop"&&<button onClick={()=>accept(field.setPlacement({mode:"crop",crop:{schemaVersion:"normalized-image-crop-v1",coordinateSpace:"normalized-slot-to-normalized-source",transform:[[0.5,0,0.25],[0,0.5,0.25]]}}))}>Demonstrate center Crop {field.label}</button>}
    </>:field.type==="textarea"?<textarea aria-label={field.label} value={draft} onFocus={()=>{focused.current=true;}} onBlur={()=>{focused.current=false;}} onChange={e=>change(e.target.value)}/>:<input aria-label={field.label} type={field.type==="date"?"date":"text"} inputMode={field.type==="number"?"decimal":undefined} value={draft} onFocus={()=>{focused.current=true;}} onBlur={()=>{focused.current=false;}} onChange={e=>change(e.target.value)}/>}
    {"choices"in field.configuration&&field.configuration.choices&&"selectChoice"in field&&<select aria-label={`${field.label} choices`} value={field.selectedChoiceId??""} onChange={e=>{if(e.target.value)accept(field.selectChoice(e.target.value));}}>
      <option value="">Choose an option</option>{field.configuration.choices.options.map(o=><option key={o.id} value={o.id}>{o.label??String(o.value)}</option>)}
    </select>}
    {issue&&<p role="alert">{issue}</p>}
    {[...field.warnings,...field.blockingErrors].map((i,n)=><p key={n}>{i.message}</p>)}
    <p>Rendered validation: {field.renderValidation.state}</p>
    <button onClick={()=>{if(field.type==="boolean"&&!canChangeVisibility())return;if(accept(field.reset())){setDraft(String(field.importedDefaultValue));}}}>Reset {field.label}</button>
  </section>;
}
