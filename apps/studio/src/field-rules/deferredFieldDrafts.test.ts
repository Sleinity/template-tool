import { DeferredFieldDraftCoordinator, type DeferredDraftClock } from "./deferredFieldDrafts";
const assert = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };
const tick = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
class Clock implements DeferredDraftClock {
  time = 0; next = 0; tasks = new Map<number, { at: number; run: () => void }>();
  now = () => this.time;
  setTimeout = (run: () => void, delay: number) => { const id = ++this.next; this.tasks.set(id, { at: this.time + delay, run }); return id as unknown as ReturnType<typeof setTimeout>; };
  clearTimeout = (id: ReturnType<typeof setTimeout>) => { this.tasks.delete(id as unknown as number); };
  async advance(ms: number) {
    const end = this.time + ms;
    for (;;) { const job = [...this.tasks].filter(([, task]) => task.at <= end).sort((a,b) => a[1].at-b[1].at)[0]; if (!job) break; this.time = job[1].at; this.tasks.delete(job[0]); job[1].run(); await tick(); }
    this.time = end; await tick();
  }
}
const make = () => { const clock = new Clock(); return { clock, coordinator: new DeferredFieldDraftCoordinator(100, 325, clock) }; };
{
  const { coordinator } = make(); let focused = 0, commits = 0, notifications = 0;
  coordinator.schedule("number", { valid: false, focus: () => focused++, commit: () => { commits++; return { accepted: true }; } });
  const summary = coordinator.getSummarySnapshot(); const stop = coordinator.subscribe(() => notifications++);
  assert(coordinator.focusFirstInvalid() && focused === 1, "Correction links locate the invalid field");
  assert(commits === 0 && notifications === 0 && summary === coordinator.getSummarySnapshot(), "Inspection never accepts input or publishes draft changes");
  coordinator.cancel("number"); assert(!coordinator.focusFirstInvalid(), "Abandoned drafts cannot receive correction focus");
  stop(); coordinator.dispose();
}
{
  const { clock, coordinator } = make(), commits: string[] = [];
  const edit = (value: string) => coordinator.schedule("title", { valid: true, commit: () => { commits.push(value); return { accepted: true }; } });
  edit("a"); await clock.advance(75); edit("ab"); await clock.advance(99);
  assert(!commits.length, "A short burst waits for its trailing deadline."); await clock.advance(1);
  assert(commits.join() === "ab" && !coordinator.dirty, "Only the latest burst value commits.");
  coordinator.dispose();
}
{
  const { clock, coordinator } = make(), commits: number[] = [];
  for (let i=0;i<9;i++) { coordinator.schedule("title", { valid:true, commit:()=>{commits.push(clock.time);return {accepted:true};} }); await clock.advance(50); }
  assert(commits[0] === 325, "Continuous valid typing must not extend the maximum wait.");
  await coordinator.flush(); assert(commits.length === 2 && !coordinator.dirty, "Flush accepts the latest remaining value.");
  coordinator.dispose();
}
{
  const { coordinator } = make(); let focused=0;
  coordinator.schedule("number", {valid:false,focus:()=>focused++,commit:()=>{throw new Error("Invalid must not commit");}});
  const result=await coordinator.flush(); assert(!result.accepted && result.invalidKeys[0]==="number" && focused===1, "Invalid literals stay visible and block flush.");
  coordinator.dispose();
}
{
  const { coordinator,clock } = make(); let release!:()=>void; const commits:string[]=[],settled:string[]=[];
  coordinator.schedule("title",{valid:true,commit:async()=>{commits.push("first");await new Promise<void>(r=>release=r);return {accepted:true};},onSettled:()=>settled.push("first")});
  const first=coordinator.flush(); await tick();
  coordinator.schedule("title",{valid:true,commit:()=>{commits.push("second");return {accepted:true};},onSettled:()=>settled.push("second")});
  const second=coordinator.flush(); await clock.advance(325); assert(commits.join()==="first", "Automatic and explicit work cannot overlap an active commit.");
  release(); assert((await first).accepted && (await second).accepted,"Both flushes drain latest generations.");
  assert(commits.join()==="first,second" && settled.join()==="second","Old results must not clear or report against newer local input."); coordinator.dispose();
}
{
  const { coordinator,clock }=make(); let release!:()=>void; const commits:string[]=[];
  coordinator.schedule("a",{valid:true,commit:async()=>{commits.push("a");await new Promise<void>(r=>release=r);return {accepted:true};}});
  await clock.advance(100);
  coordinator.schedule("b",{valid:true,commit:()=>{commits.push("b");return {accepted:true};}});
  coordinator.schedule("c",{valid:true,commit:()=>{commits.push("c");return {accepted:true};}});
  await clock.advance(100); assert(commits.join()==="a","One automatic commit is active globally."); release(); await tick(); await clock.advance(0);
  assert(commits.join()==="a,b,c","Pending fields commit fairly in deadline order."); coordinator.dispose();
}
{
  const { coordinator,clock }=make(); let commits=0;
  coordinator.schedule("title",{valid:true,commit:()=>{commits++;return {accepted:true};}});
  const [a,b]=await Promise.all([coordinator.flush(),coordinator.flush()]);await clock.advance(500);
  assert(a.accepted&&b.accepted&&commits===1,"Timers and overlapping flushes are idempotent.");coordinator.dispose();
}
{
  const { coordinator,clock }=make(); let message="";
  coordinator.schedule("title",{valid:true,commit:()=>{throw new Error("Storage is unavailable");},onFailure:value=>message=value});
  await clock.advance(100);assert(message==="Storage is unavailable"&&coordinator.invalidCount===1,"Commit failures retain a useful message and block navigation.");
  coordinator.schedule("title",{valid:true,commit:()=>({accepted:true})});await coordinator.flush(); assert(!coordinator.dirty,"Corrected input retries successfully.");coordinator.dispose();
}
{
  const { coordinator }=make(); let release!:()=>void,settled=0,commits=0;
  coordinator.schedule("title",{valid:true,commit:async()=>{await new Promise<void>(r=>release=r);return {accepted:true};},onSettled:()=>settled++});
  const old=coordinator.flush();await tick();coordinator.cancel("title");coordinator.schedule("title",{valid:true,commit:()=>{commits++;return {accepted:true};}});
  release();await old;assert(!settled&&commits===1,"Cancelled generations cannot settle against a reused key.");
  coordinator.schedule("title",{valid:true,commit:()=>{commits++;return {accepted:true};}});const late=coordinator.flush();coordinator.dispose();await late;
  assert(commits===1,"Disposal before a queued callback prevents mutation.");
}
{
  const { coordinator }=make();const initial=coordinator.getSummarySnapshot();
  coordinator.schedule("a",{valid:true,commit:()=>({accepted:true})});const pending=coordinator.getSummarySnapshot();
  coordinator.schedule("a",{valid:true,commit:()=>({accepted:true})});assert(pending===coordinator.getSummarySnapshot()&&initial!==pending,"Unchanged pending summaries retain identity while generations change.");
  coordinator.schedule("a",{valid:false,commit:()=>({accepted:true})});assert(pending!==coordinator.getSummarySnapshot(),"Validity changes notify summary subscribers.");coordinator.dispose();
}

{
  const { coordinator, clock } = make();
  coordinator.schedule("title", { valid: false, composing: true, commit: () => { throw new Error("Composition must remain local"); } });
  await clock.advance(1000);
  assert(coordinator.dirty && coordinator.invalidCount === 0 && coordinator.getSummarySnapshot().composingCount === 1, "Composition is pending, not invalid input.");
  assert(!(await coordinator.flush()).accepted, "Navigation awaits composition completion.");
  coordinator.schedule("title", { valid: true, commit: () => ({ accepted: true }) });
  await coordinator.flush(); assert(!coordinator.dirty, "Composition end restores normal scheduling."); coordinator.dispose();
}

{
  const { coordinator } = make(); let rejectedCallbacks = 0, selected = 0;
  coordinator.schedule("text", { valid: false, commit: () => ({ accepted: false }), onSettled: () => rejectedCallbacks++ });
  coordinator.schedule("unrelated", { valid: false, commit: () => ({ accepted: false }) });
  coordinator.schedule("text", { valid: true, commit: () => { selected++; return { accepted: true }; } });
  assert(await coordinator.flushKey("text"), "A choice supersedes its own invalid draft");
  assert(selected === 1 && rejectedCallbacks === 0 && coordinator.invalidCount === 1, "Choice recovery leaves unrelated drafts untouched");
  coordinator.dispose();
}
{
  const { coordinator } = make(); let finish!: () => void; const events: string[] = [];
  coordinator.schedule("text", { valid: true, commit: async () => { events.push("old-start"); await new Promise<void>(resolve => finish = resolve); events.push("old-end"); return { accepted: false }; }, onSettled: () => events.push("old-callback") });
  const first = coordinator.flushKey("text"); await tick();
  coordinator.schedule("text", { valid: true, commit: () => { events.push("choice"); return { accepted: true }; } });
  const choice = coordinator.flushKey("text"); finish(); await Promise.all([first, choice]);
  assert(events.join() === "old-start,old-end,choice", "Choice waits for an active commit and suppresses its abandoned callback");
  coordinator.dispose();
}

{
  const { coordinator } = make(); let release!: () => void; const order: string[] = [];
  coordinator.schedule("hidden-text", { valid: true, commit: () => coordinator.withProvisional(async () => {
    order.push("candidate"); await new Promise<void>(resolve => release = resolve); order.push("restored"); return { accepted: true };
  }) });
  coordinator.schedule("incomplete-number", { valid: false, commit: () => ({ accepted: false }) });
  const visibility = coordinator.runMutation(() => { order.push("visibility"); });
  await tick();
  assert(coordinator.getSummarySnapshot().provisionalCount === 1 && order.join() === "candidate", "Mutation barrier drains earlier drafts and exposes provisional state");
  release(); await visibility;
  assert(order.join() === "candidate,restored,visibility" && coordinator.provisionalCount === 0 && coordinator.invalidCount === 1, "Other mutations wait for validation without flushing unrelated invalid input");
  coordinator.dispose();
}
