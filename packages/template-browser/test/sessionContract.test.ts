import { createTemplateSessionV2 } from "../src/session/templateSessionV2";
import { createTemplateFieldFamilySessionV2 } from "../src/session/templateFieldFamilySessionV2";
import { createTemplateFieldFamilyFromSourcesV2 } from "../src/import/templateSourceAssemblyV2";
import { InMemoryTemplateSessionRepositoryV2 } from "../src/persistence/v2SessionRepositories";
import { adaptSingleSession, adaptFamilySession } from "../src/internal/sessionContract/adapt";
import type { InternalSessionAdapter } from "../src/internal/sessionContract/types";
import { assert, equal, deferred, v2Package } from "./sessionContract.fixtures";

function familyFixture() {
  const source = v2Package(), absent = structuredClone(source);
  absent.packageId = "absent-source";
  absent.editableFields = absent.editableFields.filter(field => field.id !== "text:title");
  absent.editableFieldOrder = absent.editableFieldOrder.filter(id => id !== "text:title");
  const family = createTemplateFieldFamilyFromSourcesV2([source, absent], "Contract Family");
  family.variantGroups = [{ id: "design", title: "Design", options: [{ id: "present", title: "Present" }, { id: "absent", title: "Absent" }] }];
  family.variants.forEach((variant, index) => { variant.groupAssignments = { design: index ? "absent" : "present" }; });
  family.editorControlOrder = [{ kind: "selection-property", groupId: "design" }, ...family.editableFieldOrder.map(fieldId => ({ kind: "field" as const, fieldId }))];
  return family;
}

for (const kind of ["single", "family"] as const) {
  const source = v2Package(), family = familyFixture();
  const repositories = [new InMemoryTemplateSessionRepositoryV2(), new InMemoryTemplateSessionRepositoryV2()];
  const repositoryEvents: unknown[][] = [[], []];
  repositories.forEach((repository, index) => {
    const singleWrite = repository.saveTemplateSessionV2.bind(repository), familyWrite = repository.saveTemplateFieldFamilyV3.bind(repository);
    repository.saveTemplateSessionV2 = record => {
      assert(Number.isFinite(Date.parse(record.createdAt)) && record.createdAt <= record.updatedAt, "Single record retains ordered ISO timestamps.");
      const { createdAt: _created, updatedAt: _updated, ...payload } = record;
      repositoryEvents[index].push({ operation: "single-write", payload }); return singleWrite(record);
    };
    repository.saveTemplateFieldFamilyV3 = record => {
      assert(Number.isFinite(Date.parse(record.createdAt)) && record.createdAt <= record.updatedAt, "Family record retains ordered ISO timestamps.");
      const { createdAt: _created, updatedAt: _updated, ...payload } = record;
      repositoryEvents[index].push({ operation: "family-write", payload }); return familyWrite(record);
    };
    const singleRead = repository.getTemplateSessionV2.bind(repository), familyRead = repository.getTemplateFieldFamilyV3.bind(repository);
    repository.getTemplateSessionV2 = id => { repositoryEvents[index].push({ operation: "single-read", id }); return singleRead(id); };
    repository.getTemplateFieldFamilyV3 = id => { repositoryEvents[index].push({ operation: "family-read", id }); return familyRead(id); };
  });
  const pairs: InternalSessionAdapter[] = repositories.map(repository => kind === "single"
    ? adaptSingleSession(createTemplateSessionV2({ repository }))
    : adaptFamilySession(createTemplateFieldFamilySessionV2({ repository })));
  const [direct, adapted] = pairs;
  const publications = [0, 0];
  const stops = pairs.map((pair, index) => index === 0
    ? pair.authority.subscribe(() => publications[index]++) : pair.subscribe(() => publications[index]++));
  const check = (label: string) => {
    const a = direct.authority.getSnapshot(), b = adapted.getSnapshot();
    equal(a, b.nativeSnapshot, `${kind}/${label}/complete snapshot`);
    equal(publications[0], publications[1], `${kind}/${label}/notifications`);
    equal(repositoryEvents[0], repositoryEvents[1], `${kind}/${label}/repository transcript excluding independently sampled clock strings`);
    assert(b === adapted.getSnapshot(), "Unchanged snapshots return the identical cached view.");
    assert(b.nativeSnapshot === adapted.authority.getSnapshot(), "Native snapshot is borrowed, not cloned.");
    for (const key of ["fields", "sessionAssets", "readiness", "contentState", "workingPackage", "rendererPackage", "resolvedTree", "error"] as const)
      assert(b[key] === b.nativeSnapshot[key], `${key} retains native authority identity.`);
    assert(Object.isFrozen(b), "Only the view wrapper is frozen by the adapter.");
    assert(b.contentRevision === a.contentState?.revision || b.contentRevision === null && a.contentState === null, "Existing content revision passes through.");
  };
  check("idle");
  const load = (pair: InternalSessionAdapter) => pair.kind === "single" ? pair.authority.load(source) : pair.authority.load(family);
  pairs.forEach(load); check("load");
  const beforeReads = adapted.authority.getSnapshot(), beforeNotifications = publications[1];
  for (let i = 0; i < 1000; i++) adapted.getSnapshot();
  assert(adapted.authority.getSnapshot() === beforeReads && publications[1] === beforeNotifications, "Reads publish no transactions.");
  const field = (pair: InternalSessionAdapter, id: string, native = false) => {
    const result = (native ? pair.authority.getFieldControllers() : pair.getFieldControllers()).find(field => field.id === id);
    assert(result, `Controller ${id} exists.`); return result;
  };
  const mutate = (label: string, invoke: (pair: InternalSessionAdapter, native: boolean) => unknown) => {
    equal(invoke(direct, true), invoke(adapted, false), `${kind}/${label}/result`); check(label);
  };
  mutate("text", (pair, native) => { const f = field(pair, "text:title", native); assert(f.type === "text", "Text"); return f.setValue("Edited"); });
  mutate("choice", (pair, native) => { const f = field(pair, "text:title", native); assert(f.type === "text", "Text"); return f.selectChoice("primary"); });
  mutate("invalid number", (pair, native) => { const f = field(pair, "number:amount", native); assert(f.type === "number", "Number"); return f.setValue(-1); });
  mutate("number", (pair, native) => { const f = field(pair, "number:amount", native); assert(f.type === "number", "Number"); return f.setValue(42); });
  mutate("date", (pair, native) => { const f = field(pair, "date:date", native); assert(f.type === "date", "Date"); return f.setValue("2027-02-03"); });
  mutate("textarea", (pair, native) => { const f = field(pair, "textarea:body", native); assert(f.type === "textarea", "Textarea"); return f.setValue("Two\nlines"); });
  mutate("color", (pair, native) => { const f = field(pair, "color:color", native); assert(f.type === "color", "Color"); return f.setValue("#123456"); });
  mutate("boolean exclude", (pair, native) => { const f = field(pair, "boolean:visible", native); assert(f.type === "boolean", "Boolean"); return f.setValue(false); });
  mutate("boolean include", (pair, native) => { const f = field(pair, "boolean:visible", native); assert(f.type === "boolean", "Boolean"); return f.setValue(true); });
  const imageResults = await Promise.all(pairs.map((pair, index) => {
    const f = field(pair, "image:hero", index === 0); assert(f.type === "image", "Image");
    return f.replaceImage({ assetId: "contract-image", dataUrl: "data:image/png;base64,AQID", width: 2, height: 2 });
  }));
  equal(imageResults[0], imageResults[1]); check("image replacement");
  for (const mode of ["fill", "fit"] as const) mutate(mode, (pair, native) => { const f = field(pair, "image:hero", native); assert(f.type === "image", "Image"); return f.setPlacement({ mode }); });
  mutate("crop", (pair, native) => {
    const f = field(pair, "image:hero", native); assert(f.type === "image", "Image");
    return f.setPlacement({ mode: "crop", crop: { schemaVersion: "normalized-image-crop-v1", coordinateSpace: "normalized-slot-to-normalized-source", transform: [[0.8, 0, 0.1], [0, 0.8, 0.1]] } });
  });
  mutate("image reset", (pair, native) => field(pair, "image:hero", native).reset());
  const leases = [direct.authority.beginRuntimeEvidencePublication(), adapted.beginRuntimeEvidencePublication()];
  equal(leases[0], leases[1]); check("publisher lease");
  const view = adapted.getSnapshot();
  assert(view.configuredPackage && view.materializationRevision && view.contentRevision !== null, "Loaded evidence context.");
  const evidence = { contentRevision: view.contentRevision, materializationRevision: view.materializationRevision, settlementRevision: "settlement", fontRevision: "fonts", publicationGeneration: leases[0] + 1, fonts: "ready" as const, renderer: "ready" as const };
  equal(direct.authority.publishRuntimeReadiness(evidence), adapted.publishRuntimeReadiness(evidence)); check("runtime evidence");
  const lines = { ...evidence, schemaVersion: "field-layout-evidence-v1" as const, packageIdentity: view.configuredPackage.packageId, fieldId: "textarea:body", participation: "active" as const, measuredVisualLines: 2, reliability: "reliable" as const };
  equal(direct.authority.publishFieldLayoutEvidence(lines), adapted.publishFieldLayoutEvidence(lines)); check("line evidence");
  assert(!adapted.publishRuntimeReadiness({ ...evidence, contentRevision: -1 }), "Stale content is rejected.");
  assert(!adapted.publishFieldLayoutEvidence({ ...lines, fontRevision: "old-font" }), "Stale font evidence is rejected.");
  assert(!adapted.publishFieldLayoutEvidence({ ...lines, settlementRevision: "old-settlement" }), "Stale settlement evidence is rejected.");
  const stale = pairs.map(pair => field(pair, "text:title"));
  for (const pair of pairs) {
    const original = pair.kind === "single" ? source.editableFields[0] : family.fields.find(f => f.id === "text:title")!;
    pair.authority.configure({ fields: [{ ...original, label: "Changed" }] });
    pair.authority.configure({ fields: [original] });
  }
  check("configuration return");
  assert(!direct.authority.publishRuntimeReadiness(evidence) && !adapted.publishRuntimeReadiness(evidence), "Both kinds reject old configuration-return evidence.");
  equal(stale[0].reset(), stale[1].reset()); assert(stale[1].reset().stale, "Configuration invalidates captured controllers."); check("stale controller");
  for (const pair of pairs) {
    const snapshot = pair.authority.getSnapshot();
    let rejected = false; try { pair.authority.configure({ editableFieldOrder: ["text:title", "text:title"] }); } catch { rejected = true; }
    assert(rejected && snapshot === pair.authority.getSnapshot(), "Rejected configuration leaves authority unchanged.");
  }
  check("rejected transaction");
  for (const pair of pairs) {
    const original = pair.kind === "single" ? source.editableFields[0] : family.fields.find(f => f.id === "text:title")!;
    assert(original.type === "text", "Choice text configuration.");
    pair.authority.configure({ fields: [{ ...original, configuration: { ...original.configuration,
      choices: { mode: "suggested", options: [{ id: "primary", value: "Changed" }, { id: "secondary", value: "Other" }] },
    } }] });
  }
  check("Choice reconciliation");
  assert(adapted.getSnapshot().contentState!.values["text:title"].selectedChoiceId === "primary" &&
    adapted.getSnapshot().contentState!.values["text:title"].value === "Changed", "Choice identity selects the changed option.");
  for (const pair of pairs) {
    const original = pair.kind === "single" ? source.editableFields[0] : family.fields.find(f => f.id === "text:title")!;
    assert(original.type === "text", "Duplicate Choice rejection.");
    const before = pair.authority.getSnapshot(); let rejected = false;
    try { pair.authority.configure({ fields: [{ ...original, configuration: { ...original.configuration,
      choices: { mode: "suggested", options: [{ id: "primary", value: "Same" }, { id: "duplicate", value: "Same" }] },
    } }] }); } catch { rejected = true; }
    assert(rejected && pair.authority.getSnapshot() === before, "Duplicate normalized Choice values reject atomically.");
  }
  check("duplicate Choice rejection");
  if (direct.kind === "family" && adapted.kind === "family") {
    const shared = adapted.getSnapshot().contentState;
    direct.authority.selectOption("design", "absent"); adapted.authority.selectOption("design", "absent"); check("selector switch");
    assert(adapted.getSnapshot().contentState === shared && shared!.values["text:title"], "Absent selected fields retain shared content.");
    const common = family.fields.find(field => field.id === "text:title")!;
    assert(common.type === "text", "Absent common Choice field.");
    for (const pair of [direct, adapted]) pair.authority.configure({ fields: [{ ...common,
      configuration: { ...common.configuration, choices: { mode: "suggested", options: [{ id: "primary", value: "Hidden" }] } },
    }] });
    check("absent Choice reconciliation");
    assert(adapted.getSnapshot().contentState!.values["text:title"].value === "Hidden", "Absent shared Choice reconciles through its existing authority.");
    const selected = adapted.authority.getSnapshot(); adapted.authority.selectOption("design", "absent");
    assert(adapted.authority.getSnapshot() === selected, "Already resolved selector selection is a native no-op.");
    direct.authority.selectVariant(family.variants[0].id); adapted.authority.selectVariant(family.variants[0].id); check("direct variant switch");
    const images = [direct.authority.getFieldControllers().find(f => f.type === "image")!, adapted.getFieldControllers().find(f => f.type === "image")!];
    assert("setVariantPlacement" in images[1], "Family image capability is retained.");
    for (const image of images) await image.replaceImage({ assetId: "contract-image", dataUrl: "data:image/png;base64,AQID", width: 2, height: 2 });
    for (const image of images) { assert("setVariantPlacement" in image, "Family placement"); image.setVariantPlacement({ mode: "fit" }); }
    check("variant placement");
  }
  const saved = await Promise.all(pairs.map(pair => pair.kind === "single" ? pair.authority.save({ id: "contract-save" }) : pair.authority.save()));
  equal(saved[0].contentState, saved[1].contentState); equal(saved[0].sessionAssets, saved[1].sessionAssets); check("save");
  await Promise.all(pairs.map((pair, index) => pair.authority.loadSaved(saved[index].id))); check("reload");
  for (const pair of pairs) {
    if (pair.kind === "single") pair.authority.applyReimport(pair.authority.planReimport(source));
    else pair.authority.applyVariantReimport(pair.authority.planVariantReimport(source));
  }
  check("reimport");
  pairs.forEach(pair => pair.authority.reset()); check("unloaded reset");
  pairs.forEach(load); check("new load");
  stops.forEach(stop => stop()); pairs.forEach(pair => pair.authority.dispose()); check("disposed");
  assert(!("dispose" in adapted) && !('save' in adapted), "Adapter owns neither lifecycle nor persistence.");
}

// Native error policies remain visible; the common view must not normalize them.
for (const kind of ["single", "family"] as const) {
  const repository = new InMemoryTemplateSessionRepositoryV2();
  repository.getTemplateSessionV2 = repository.getTemplateFieldFamilyV3 = async () => { throw new Error("lookup failure"); };
  const pair = kind === "single" ? adaptSingleSession(createTemplateSessionV2({ repository })) : adaptFamilySession(createTemplateFieldFamilySessionV2({ repository }));
  let rejected = false; try { await pair.authority.loadSaved("missing"); } catch { rejected = true; }
  assert(rejected === (kind === "family"), "Family lookup rejects; single returns its blocked native snapshot.");
  assert(pair.getSnapshot().nativeSnapshot === pair.authority.getSnapshot(), "Error snapshot remains native."); pair.authority.dispose();
}

// Resolve storage in controlled order, never with sleeps.
for (const kind of ["single", "family"] as const) {
  const source = v2Package(), family = familyFixture();
  const repository = new InMemoryTemplateSessionRepositoryV2();
  const pair = kind === "single" ? adaptSingleSession(createTemplateSessionV2({ repository })) : adaptFamilySession(createTemplateFieldFamilySessionV2({ repository }));
  if (pair.kind === "single") pair.authority.load(source); else pair.authority.load(family);
  const saved = await pair.authority.save();
  const older = deferred<typeof saved | null>(), newer = deferred<typeof saved | null>(); let reads = 0;
  const lookup = () => (++reads === 1 ? older.promise : newer.promise);
  if (pair.kind === "single") repository.getTemplateSessionV2 = lookup as typeof repository.getTemplateSessionV2;
  else repository.getTemplateFieldFamilyV3 = lookup as typeof repository.getTemplateFieldFamilyV3;
  const first = pair.authority.loadSaved(saved.id), second = pair.authority.loadSaved(saved.id);
  newer.resolve(saved); await second; const accepted = pair.getSnapshot();
  older.resolve(null); await first;
  assert(pair.getSnapshot() === accepted, "Late failed lookup cannot replace a newer accepted restore.");
  pair.authority.dispose();
}

console.log("Internal single/Family session views and differential canonical lifecycles passed.");
