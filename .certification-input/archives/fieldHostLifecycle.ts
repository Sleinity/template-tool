import { parseTemplatePackageV2, type TemplatePackageV2, type TemplatePackageV1 } from "@sleinity/template-core";
import { runTemplatePackageImportPipelineV2, type TemplatePackageImportResultV2 } from "@sleinity/template-browser/importer";
import { createTemplateSessionV2, type TemplateSessionV2 } from "@sleinity/template-browser/session";
import {
  getManagedFontRegistry, autoLinkManagedFonts, uploadExactManagedFontForRequirement,
  prepareTemplatePackageFonts, areExactFontRequirementsResolved, isExactFontRequirementResolved,
  formatRequiredFontFace, type ManagedFontRegistry,
} from "@sleinity/template-browser/fonts";

/** Private example state. This is not an SDK UI or persistence contract. */
export interface AcceptedSource {
  id: string;
  sourceName: string;
  session: TemplateSessionV2;
  fontRegistry: ManagedFontRegistry | null;
}
export interface PendingSource {
  id: string;
  sourceName: string;
  phase: "reading" | "preparing" | "fonts" | "ready";
  busy: boolean;
  canOpen: boolean;
  requirements: readonly { id: string; label: string; exact: boolean }[];
  error: unknown | null;
  retryAvailable: boolean;
}
export interface FieldHostView {
  accepted: AcceptedSource | null;
  pending: PendingSource | null;
  importError: unknown | null;
}
export function hostErrorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : typeof cause === "string" ? cause : "The operation could not complete.";
}
function retryableStorage(cause: unknown): boolean {
  return typeof cause === "object" && cause !== null && "code" in cause &&
    cause.code === "template-storage-blocked" && "retryable" in cause && cause.retryable === true;
}

/** Font helpers' V1 output has authority over fonts only, never V2 fields/nodes. */
export function mergeFontAuthority(base: TemplatePackageV2, fonts: TemplatePackageV1): TemplatePackageV2 {
  const next = structuredClone(base);
  if (Object.prototype.hasOwnProperty.call(fonts, "fontRequirements")) next.fontRequirements = structuredClone(fonts.fontRequirements);
  for (const [id, asset] of Object.entries(fonts.assets)) if (asset.type === "font") next.assets[id] = structuredClone(asset);
  const parsed = parseTemplatePackageV2(next);
  if (!parsed.package || !parsed.validation?.valid) throw new Error(parsed.diagnostics.map(issue => issue.message).join("\n") || "Font configuration is invalid.");
  return parsed.package;
}
const defaultOperations = {
  importZip: runTemplatePackageImportPipelineV2,
  parse: parseTemplatePackageV2,
  createSession: createTemplateSessionV2,
  defaultRegistry: getManagedFontRegistry,
  autoLink: autoLinkManagedFonts,
  upload: uploadExactManagedFontForRequirement,
  prepare: prepareTemplatePackageFonts,
  fontSet: () => typeof document === "undefined" ? null : document.fonts,
};
// Injectable only inside this private example: tests use observable checkpoints.
export type FieldHostOperations = typeof defaultOperations;
type Scope = {
  id: string; lifetime: number; generation: number; registry: ManagedFontRegistry | null;
  candidate?: TemplatePackageImportResultV2; session?: TemplateSessionV2; package?: TemplatePackageV2;
  closed: boolean; busy: boolean; fontReady: boolean; preparationReady: boolean;
  error: unknown | null; retry?: { file: File; requirementId: string }; phase: PendingSource["phase"];
};

/** Owns candidates and sessions; construction itself allocates no SDK resources. */
export class FieldHostLifecycle {
  private readonly operations: FieldHostOperations;
  private view: FieldHostView = { accepted: null, pending: null, importError: null };
  private readonly listeners = new Set<() => void>();
  private readonly sessions = new Set<TemplateSessionV2>();
  private pending: Scope | null = null;
  private live = false;
  private lifetime = 0;
  private generation = 0;
  private registry: ManagedFontRegistry | null = null;
  private defaultRegistryResolved = false;
  private defaultRegistry: ManagedFontRegistry | null = null;

  constructor(operations: Partial<FieldHostOperations> = {}) { this.operations = { ...defaultOperations, ...operations }; }
  getSnapshot = (): FieldHostView => this.view;
  subscribe = (listener: () => void): (() => void) => { this.listeners.add(listener); return () => this.listeners.delete(listener); };
  private publish(view: FieldHostView): void {
    this.view = view;
    if (this.live) for (const listener of this.listeners) listener();
  }
  attach(registryInput: ManagedFontRegistry | null | undefined): void {
    this.live = true;
    this.lifetime++;
    if (registryInput === undefined && !this.defaultRegistryResolved) {
      this.defaultRegistry = this.operations.defaultRegistry(); this.defaultRegistryResolved = true;
    }
    this.registry = registryInput === undefined ? this.defaultRegistry : registryInput;
    if (this.view.accepted) this.publish({ ...this.view, accepted: { ...this.view.accepted, fontRegistry: this.registry } });
  }
  detach(): void {
    this.live = false;
    const lifetime = ++this.lifetime;
    this.cancelImport();
    // React StrictMode may replay setup synchronously. Only a genuine final
    // teardown ends accepted ownership, after child subscriptions clean up.
    queueMicrotask(() => {
      if (this.live || this.lifetime !== lifetime) return;
      for (const session of [...this.sessions]) this.releaseSession(session);
      this.view = { accepted: null, pending: null, importError: null };
    });
  }
  isAccepted(source: AcceptedSource): boolean {
    const accepted = this.view.accepted;
    return this.live && accepted?.id === source.id && accepted.session === source.session && accepted.fontRegistry === source.fontRegistry;
  }
  /** Called after the accepted editor commits and the old editor cleans up. */
  committed(session: TemplateSessionV2): void {
    if (!this.live || this.view.accepted?.session !== session) return;
    for (const owned of [...this.sessions]) if (owned !== session && owned !== this.pending?.session) this.releaseSession(owned);
  }
  private current(scope: Scope): boolean {
    return this.live && !scope.closed && this.pending === scope && scope.lifetime === this.lifetime &&
      scope.generation === this.generation && scope.registry === this.registry;
  }
  private releaseSession(session: TemplateSessionV2): void {
    if (this.sessions.delete(session)) session.dispose();
  }
  private releaseScope(scope: Scope, keepSession = false): void {
    if (scope.closed) return;
    scope.closed = true;
    try { if (scope.session && !keepSession) this.releaseSession(scope.session); }
    finally {
      const candidate = scope.candidate; scope.candidate = undefined; scope.retry = undefined;
      candidate?.dispose();
    }
  }
  cancelImport(): void {
    this.generation++;
    const pending = this.pending; this.pending = null;
    if (pending) this.releaseScope(pending);
    this.publish({ ...this.view, pending: null, importError: null });
  }
  private update(scope: Scope): void {
    if (!this.current(scope)) return;
    const packageValue = scope.session?.getSnapshot().rendererPackage;
    const requirements = packageValue?.fontRequirements?.map(requirement => ({
      id: requirement.id, label: formatRequiredFontFace(requirement), exact: isExactFontRequirementResolved(packageValue, requirement),
    })) ?? [];
    this.publish({ ...this.view, pending: { id: scope.id, sourceName: this.view.pending?.sourceName ?? "Source",
      phase: scope.phase, busy: scope.busy, canOpen: scope.fontReady && scope.preparationReady && !scope.busy,
      requirements, error: scope.error, retryAvailable: Boolean(scope.retry) } });
  }
  private load(scope: Scope, packageValue: TemplatePackageV2): void {
    const loaded = scope.session!.load(packageValue);
    if (loaded.status !== "ready") throw new Error(loaded.error?.message ?? "Source could not load.");
    scope.package = packageValue;
  }
  async importFile(file: File): Promise<void> {
    if (!this.live) return;
    this.cancelImport();
    const scope: Scope = { id: `host-source:${crypto.randomUUID()}`, lifetime: this.lifetime, generation: this.generation,
      registry: this.registry, closed: false, busy: true, fontReady: false, preparationReady: false, error: null, phase: "reading" };
    this.pending = scope;
    this.publish({ ...this.view, importError: null, pending: { id: scope.id, sourceName: file.name, phase: "reading", busy: true, canOpen: false, requirements: [], error: null, retryAvailable: false } });
    try {
      let packageValue: TemplatePackageV2;
      const format = file.name.toLowerCase().endsWith(".zip") ? "zip" : file.name.toLowerCase().endsWith(".json") ? "json" : null;
      if (!format) throw new Error("Choose a V2 JSON file or exporter ZIP.");
      if (format === "zip") {
        const buffer = await file.arrayBuffer(); if (!this.current(scope)) return;
        const candidate = await this.operations.importZip({ format, buffer, sourceName: file.name, sourceId: scope.id, fontRegistry: scope.registry });
        if (!this.current(scope)) { candidate.dispose(); return; }
        scope.candidate = candidate;
        if (candidate.status !== "ready" || !candidate.package) throw candidate.failure?.cause ?? new Error(candidate.parseResult?.diagnostics[0]?.message ?? candidate.importEvidence?.diagnostics[0]?.message ?? "Source import is blocked.");
        packageValue = candidate.package;
      } else {
        const text = await file.text(); if (!this.current(scope)) return;
        const parsed = this.operations.parse(JSON.parse(text));
        if (!parsed.package || !parsed.validation?.valid) throw new Error(parsed.diagnostics[0]?.message ?? "V2 JSON is invalid.");
        packageValue = parsed.package;
      }
      if (!this.current(scope)) return;
      scope.session = this.operations.createSession(); this.sessions.add(scope.session);
      this.load(scope, packageValue);
      scope.phase = "preparing"; this.update(scope);
      await this.prepare(scope, format === "json");
    } catch (cause) {
      if (!this.current(scope)) return;
      this.pending = null;
      try { this.releaseScope(scope); }
      finally { this.publish({ ...this.view, pending: null, importError: cause }); }
    }
  }
  private async prepare(scope: Scope, autoLink = false, finishOperation = true): Promise<void> {
    try {
      if (autoLink) {
        const source = scope.session!.getSnapshot().rendererPackage!;
        const linked = await this.operations.autoLink(source, scope.registry);
        if (!this.current(scope)) return;
        const patched = mergeFontAuthority(scope.package!, linked);
        if (JSON.stringify(patched) !== JSON.stringify(scope.package)) this.load(scope, patched);
      }
      const snapshot = scope.session!.getSnapshot();
      scope.fontReady = areExactFontRequirementsResolved(snapshot.rendererPackage);
      if (!snapshot.rendererPackage?.fontRequirements?.length) scope.preparationReady = true;
      else {
        const report = await this.operations.prepare(snapshot.rendererPackage, snapshot.resolvedTree!, this.operations.fontSet(), scope.registry);
        if (!this.current(scope)) return;
        scope.preparationReady = report.exportReady;
        if (scope.fontReady && !report.exportReady) {
          scope.error = new Error("Exact fonts are linked but could not be prepared. Check their binary sources and retry.");
        }
      }
      if (!this.current(scope)) return;
      scope.phase = scope.fontReady && scope.preparationReady ? "ready" : "fonts";
    } catch (cause) {
      if (!this.current(scope)) return;
      scope.error = cause; scope.phase = "fonts"; scope.preparationReady = false;
    } finally {
      if (finishOperation && this.current(scope)) { scope.busy = false; this.update(scope); }
    }
  }
  async uploadFont(requirementId: string, file: File): Promise<void> {
    const scope = this.pending;
    if (!scope || !this.current(scope) || scope.busy || !scope.session) return;
    scope.busy = true; scope.error = null; scope.retry = undefined; scope.preparationReady = false; this.update(scope);
    try {
      const bytes = await file.arrayBuffer(); if (!this.current(scope)) return;
      const linked = await this.operations.upload(scope.session.getSnapshot().rendererPackage!, requirementId, bytes,
        { registry: scope.registry, fileName: file.name, mimeType: file.type });
      if (!this.current(scope)) return;
      this.load(scope, mergeFontAuthority(scope.package!, linked.packageValue));
      await this.prepare(scope, false, false);
    } catch (cause) {
      if (!this.current(scope)) return;
      scope.error = cause;
      if (retryableStorage(cause)) scope.retry = { file, requirementId };
      scope.phase = "fonts";
    } finally {
      if (this.current(scope)) { scope.busy = false; this.update(scope); }
    }
  }
  retryFonts(): void {
    const scope = this.pending; if (!scope || !this.current(scope) || scope.busy) return;
    const retry = scope.retry;
    if (retry) void this.uploadFont(retry.requirementId, retry.file);
    else { scope.busy = true; scope.error = null; this.update(scope); void this.prepare(scope, true); }
  }
  open(): void {
    const scope = this.pending;
    if (!scope || !this.current(scope) || scope.busy || !scope.fontReady || !scope.preparationReady || !scope.session || !scope.package) return;
    const validated = this.operations.parse(scope.package);
    if (!validated.package || !validated.validation?.valid || scope.session.getSnapshot().status !== "ready") {
      scope.error = new Error("Correct the source before opening."); scope.preparationReady = false; this.update(scope); return;
    }
    const accepted = { id: scope.id, sourceName: this.view.pending!.sourceName, session: scope.session, fontRegistry: scope.registry };
    this.pending = null;
    try { this.releaseScope(scope, true); } // Session acquired independent leases during load.
    catch (cause) {
      this.releaseSession(accepted.session);
      this.publish({ ...this.view, pending: null, importError: cause });
      return;
    }
    this.publish({ accepted, pending: null, importError: null });
  }
}
