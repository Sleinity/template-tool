import { Clipboard, RefreshCw, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type {
  EditableFieldBinding,
  TemplatePackageV1,
} from "../types";
import {
  buildPackageLayoutDebugReport,
  collectPackageLayoutDebugNodeIds,
  measurePackageLayoutChain,
  type PackageLayoutDebugReport,
} from "./packageLayoutDebug";

interface TemplatePackageLayoutDebuggerProps {
  packageValue: TemplatePackageV1;
  selectedField: EditableFieldBinding | null;
  renderMode: "static" | "editor";
  previewSelector?: string;
}

function valueLabel(value: unknown): string {
  if (value === null || value === undefined || value === "") return "none";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

async function copyJson(value: unknown): Promise<void> {
  await navigator.clipboard.writeText(JSON.stringify(value, null, 2));
}

export function TemplatePackageLayoutDebugger({
  packageValue,
  selectedField,
  renderMode,
  previewSelector = '[data-testid="package-working-preview"]',
}: TemplatePackageLayoutDebuggerProps) {
  const [report, setReport] = useState<PackageLayoutDebugReport>(() =>
    buildPackageLayoutDebugReport(
      packageValue,
      selectedField,
      {},
      renderMode,
    ),
  );
  const [copyStatus, setCopyStatus] = useState("");
  const debugNodeIds = useMemo(
    () =>
      selectedField
        ? collectPackageLayoutDebugNodeIds(
            packageValue,
            selectedField.nodeId,
          )
        : [],
    [packageValue, selectedField],
  );

  const refresh = () => {
    const scope =
      typeof document === "undefined"
        ? null
        : document.querySelector(previewSelector);
    const measurements = measurePackageLayoutChain(debugNodeIds, scope);
    setReport(
      buildPackageLayoutDebugReport(
        packageValue,
        selectedField,
        measurements,
        renderMode,
      ),
    );
  };

  useEffect(() => {
    const frame = requestAnimationFrame(refresh);
    const scope =
      typeof document === "undefined"
        ? null
        : document.querySelector(previewSelector);
    const observer =
      scope && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(refresh)
        : null;
    if (scope && observer) observer.observe(scope);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [packageValue, selectedField, renderMode, previewSelector]);

  const handleCopy = async (
    kind: "chain" | "measurements",
  ) => {
    const value =
      kind === "chain"
        ? report
        : {
            field: report.field,
            renderMode: report.renderMode,
            nodes: report.entries.map((entry) => ({
              nodeId: entry.identity.id,
              name: entry.identity.name,
              measurement: entry.measurement,
              absoluteConstraint: entry.absoluteConstraint,
              flags: entry.flags,
              siblings: entry.siblings.map((sibling) => ({
                nodeId: sibling.identity.id,
                name: sibling.identity.name,
                measurement: sibling.measurement,
                renderer: sibling.renderer,
                absoluteConstraint: sibling.absoluteConstraint,
                flags: sibling.flags,
              })),
              parentSummary: entry.parentSummary,
            })),
          };
    try {
      await copyJson(value);
      setCopyStatus(
        kind === "chain" ? "Layout chain copied" : "Measurements copied",
      );
    } catch {
      setCopyStatus("Copy failed");
    }
  };

  if (!selectedField) {
    return (
      <p className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-white/40">
        Edit a field to inspect its layout chain.
      </p>
    );
  }

  return (
    <section
      data-testid="package-layout-debugger"
      className="rounded-xl border border-sky-300/15 bg-sky-400/[0.04] p-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-sky-100">Layout chain</h3>
          <p className="mt-1 text-[11px] text-white/40">
            {selectedField.id} · {selectedField.nodeId} · {renderMode}
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          title="Refresh measurements"
          className="rounded-lg border border-white/10 p-2 text-white/50 transition hover:bg-white/[0.06] hover:text-white"
        >
          <RefreshCw aria-hidden="true" size={13} />
        </button>
      </div>

      {report.flags.length > 0 ? (
        <div className="mt-3 rounded-lg border border-amber-300/15 bg-amber-400/[0.06] p-2.5">
          <p className="flex items-center gap-2 text-xs font-medium text-amber-100">
            <TriangleAlert aria-hidden="true" size={13} />
            {report.flags.length} suspicious signal
            {report.flags.length === 1 ? "" : "s"}
          </p>
        </div>
      ) : (
        <p className="mt-3 text-xs text-emerald-200/70">
          No suspicious signals detected in the measured chain.
        </p>
      )}

      <div className="mt-3 space-y-2">
        {report.entries.map((entry, index) => (
          <details
            key={entry.identity.id}
            open={index === 0 || entry.flags.length > 0}
            className="rounded-lg border border-white/10 bg-black/20 p-2.5"
          >
            <summary className="cursor-pointer list-none">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-white/70">
                    {index === 0 ? "Target" : `Ancestor ${index}`} ·{" "}
                    {entry.identity.name}
                  </p>
                  <p className="mt-0.5 truncate font-mono text-[10px] text-white/30">
                    {entry.identity.id} · {entry.identity.type}
                  </p>
                </div>
                {entry.flags.length > 0 ? (
                  <span className="rounded-full bg-amber-300/10 px-2 py-1 text-[10px] text-amber-100">
                    {entry.flags.length} flag
                  </span>
                ) : null}
              </div>
            </summary>

            <div className="mt-3 space-y-3 text-[11px]">
              {entry.flags.map((item) => (
                <div
                  key={item.code}
                  className="rounded-md border border-amber-300/10 bg-amber-400/[0.05] p-2 text-amber-50/75"
                >
                  <p className="font-medium">{item.code}</p>
                  <p className="mt-1 leading-4 text-white/40">{item.message}</p>
                </div>
              ))}

              {entry.parentSummary ? (
                <div className="rounded-md border border-sky-300/10 bg-sky-400/[0.04] p-2">
                  <p className="font-medium text-sky-100/70">
                    Parent space budget · {entry.parentSummary.parent.name}
                  </p>
                  <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-white/35">
                    <dt>layout / main axis</dt>
                    <dd>
                      {entry.parentSummary.parent.layoutMode} /{" "}
                      {entry.parentSummary.parent.mainAxis}
                    </dd>
                    <dt>parent sizing</dt>
                    <dd>{entry.parentSummary.parent.mainAxisSizing}</dd>
                    <dt>parent measured</dt>
                    <dd>
                      {valueLabel(entry.parentSummary.parentMeasuredMainSize)}
                    </dd>
                    <dt>FLOW children</dt>
                    <dd>
                      {valueLabel(
                        entry.parentSummary
                          .totalMeasuredFlowChildrenMainSize,
                      )}{" "}
                      ({entry.parentSummary.measuredFlowChildCount}/
                      {entry.parentSummary.flowChildCount} measured)
                    </dd>
                    <dt>padding / gaps</dt>
                    <dd>
                      {entry.parentSummary.mainAxisPadding} /{" "}
                      {entry.parentSummary.measuredGapTotal}
                    </dd>
                    <dt>remaining space</dt>
                    <dd>{valueLabel(entry.parentSummary.remainingSpace)}</dd>
                    <dt>FILL candidates</dt>
                    <dd>
                      {entry.parentSummary.fillCandidates.join(", ") || "none"}
                    </dd>
                    <dt>HUG / FIXED</dt>
                    <dd>
                      {entry.parentSummary.nonShrinkingCandidates.join(", ") ||
                        "none"}
                    </dd>
                  </dl>
                  {entry.parentSummary.flags.map((item) => (
                    <p
                      key={item.code}
                      className="mt-2 rounded-md bg-amber-400/[0.06] p-2 text-amber-50/70"
                    >
                      <span className="font-medium">{item.code}</span>
                      <span className="mt-1 block leading-4 text-white/40">
                        {item.message}
                      </span>
                    </p>
                  ))}
                </div>
              ) : null}

              <div>
                <p className="font-medium text-white/55">Package</p>
                <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-white/35">
                  <dt>positioning</dt>
                  <dd>{entry.identity.positioning}</dd>
                  <dt>layout</dt>
                  <dd>{entry.normalized.layoutMode}</dd>
                  <dt>gap</dt>
                  <dd>{entry.normalized.gap}</dd>
                  <dt>row / column gap</dt>
                  <dd>
                    {valueLabel(entry.normalized.rowGap)} /{" "}
                    {valueLabel(entry.normalized.columnGap)}
                  </dd>
                  <dt>horizontal</dt>
                  <dd>
                    {entry.normalized.sizing.horizontal.mode} ·{" "}
                    {valueLabel(entry.normalized.sizing.horizontal.value)}
                  </dd>
                  <dt>h min / max</dt>
                  <dd>
                    {valueLabel(entry.normalized.sizing.horizontal.min)} /{" "}
                    {valueLabel(entry.normalized.sizing.horizontal.max)}
                  </dd>
                  <dt>vertical</dt>
                  <dd>
                    {entry.normalized.sizing.vertical.mode} ·{" "}
                    {valueLabel(entry.normalized.sizing.vertical.value)}
                  </dd>
                  <dt>v min / max</dt>
                  <dd>
                    {valueLabel(entry.normalized.sizing.vertical.min)} /{" "}
                    {valueLabel(entry.normalized.sizing.vertical.max)}
                  </dd>
                  <dt>bounds x / y</dt>
                  <dd>
                    {entry.normalized.bounds.x} / {entry.normalized.bounds.y}
                  </dd>
                  <dt>bounds w / h</dt>
                  <dd>
                    {entry.normalized.bounds.width} /{" "}
                    {entry.normalized.bounds.height}
                  </dd>
                </dl>
              </div>

              <div>
                <p className="font-medium text-white/55">
                  Siblings · {entry.siblings.length}
                </p>
                {entry.siblings.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {entry.siblings.map((sibling) => (
                      <details
                        key={sibling.identity.id}
                        open={sibling.flags.length > 0}
                        className="rounded-md border border-white/10 bg-white/[0.025] p-2"
                      >
                        <summary className="cursor-pointer list-none">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-white/60">
                                {sibling.identity.name}
                              </p>
                              <p className="mt-0.5 truncate font-mono text-[10px] text-white/25">
                                {sibling.identity.id} ·{" "}
                                {sibling.renderer.isAbsolute
                                  ? "ABSOLUTE"
                                  : sibling.identity.positioning}{" "}
                                · {valueLabel(sibling.renderer.mainAxisSizing)}
                              </p>
                            </div>
                            <span
                              className={
                                sibling.shouldYieldSpace
                                  ? "rounded-full bg-emerald-300/10 px-2 py-1 text-[10px] text-emerald-100/75"
                                  : "rounded-full bg-white/[0.05] px-2 py-1 text-[10px] text-white/35"
                              }
                            >
                              {sibling.shouldYieldSpace
                                ? "Should yield"
                                : "Non-shrinking"}
                            </span>
                          </div>
                        </summary>

                        <div className="mt-2 space-y-2">
                          {sibling.flags.map((item) => (
                            <div
                              key={item.code}
                              className="rounded-md border border-amber-300/10 bg-amber-400/[0.05] p-2"
                            >
                              <p className="font-medium text-amber-50/75">
                                {item.code}
                              </p>
                              <p className="mt-1 leading-4 text-white/40">
                                {item.message}
                              </p>
                            </div>
                          ))}
                          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-white/35">
                            <dt>type / positioning</dt>
                            <dd>
                              {sibling.identity.type} /{" "}
                              {sibling.identity.positioning}
                            </dd>
                            <dt>layout</dt>
                            <dd>{sibling.normalized.layoutMode}</dd>
                            <dt>horizontal</dt>
                            <dd>
                              {sibling.normalized.sizing.horizontal.mode} ·{" "}
                              {valueLabel(
                                sibling.normalized.sizing.horizontal.value,
                              )}{" "}
                              · {valueLabel(
                                sibling.normalized.sizing.horizontal.min,
                              )}{" "}
                              /{" "}
                              {valueLabel(
                                sibling.normalized.sizing.horizontal.max,
                              )}
                            </dd>
                            <dt>vertical</dt>
                            <dd>
                              {sibling.normalized.sizing.vertical.mode} ·{" "}
                              {valueLabel(
                                sibling.normalized.sizing.vertical.value,
                              )}{" "}
                              ·{" "}
                              {valueLabel(sibling.normalized.sizing.vertical.min)}{" "}
                              /{" "}
                              {valueLabel(sibling.normalized.sizing.vertical.max)}
                            </dd>
                            <dt>bounds</dt>
                            <dd>
                              {sibling.normalized.bounds.x},{" "}
                              {sibling.normalized.bounds.y} ·{" "}
                              {sibling.normalized.bounds.width} ×{" "}
                              {sibling.normalized.bounds.height}
                            </dd>
                            <dt>main / counter</dt>
                            <dd>
                              {valueLabel(sibling.renderer.mainAxisSizing)} /{" "}
                              {valueLabel(sibling.renderer.counterAxisSizing)}
                            </dd>
                            <dt>expected flex</dt>
                            <dd>
                              {valueLabel(
                                sibling.renderer.expected.flexGrow,
                              )}{" "}
                              /{" "}
                              {valueLabel(
                                sibling.renderer.expected.flexShrink,
                              )}{" "}
                              /{" "}
                              {valueLabel(
                                sibling.renderer.expected.flexBasis,
                              )}
                            </dd>
                            <dt>computed flex</dt>
                            <dd>
                              {valueLabel(
                                sibling.measurement?.computed?.flexGrow,
                              )}{" "}
                              /{" "}
                              {valueLabel(
                                sibling.measurement?.computed?.flexShrink,
                              )}{" "}
                              /{" "}
                              {valueLabel(
                                sibling.measurement?.computed?.flexBasis,
                              )}
                            </dd>
                            <dt>display / position</dt>
                            <dd>
                              {valueLabel(
                                sibling.measurement?.computed?.display,
                              )}{" "}
                              /{" "}
                              {valueLabel(
                                sibling.measurement?.computed?.position,
                              )}
                            </dd>
                            <dt>measured w / h</dt>
                            <dd>
                              {valueLabel(sibling.measurement?.offsetWidth)} /{" "}
                              {valueLabel(sibling.measurement?.offsetHeight)}
                            </dd>
                            <dt>min w / h</dt>
                            <dd>
                              {valueLabel(
                                sibling.measurement?.computed?.minWidth,
                              )}{" "}
                              /{" "}
                              {valueLabel(
                                sibling.measurement?.computed?.minHeight,
                              )}
                            </dd>
                            <dt>max w / h</dt>
                            <dd>
                              {valueLabel(
                                sibling.measurement?.computed?.maxWidth,
                              )}{" "}
                              /{" "}
                              {valueLabel(
                                sibling.measurement?.computed?.maxHeight,
                              )}
                            </dd>
                            <dt>rect x / y</dt>
                            <dd>
                              {valueLabel(sibling.measurement?.rect?.left)} /{" "}
                              {valueLabel(sibling.measurement?.rect?.top)}
                            </dd>
                            <dt>overflow</dt>
                            <dd>
                              {valueLabel(
                                sibling.measurement?.computed?.overflow,
                              )}
                            </dd>
                          </dl>
                          <details>
                            <summary className="cursor-pointer text-white/45">
                              Raw sibling JSON
                            </summary>
                            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-md bg-black/30 p-2 font-mono text-[10px] leading-4 text-white/30">
                              {JSON.stringify(sibling, null, 2)}
                            </pre>
                          </details>
                        </div>
                      </details>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-white/30">No direct siblings.</p>
                )}
              </div>

              <div>
                <p className="font-medium text-white/55">Renderer role</p>
                <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-white/35">
                  <dt>parent Auto Layout</dt>
                  <dd>{entry.renderer.parentIsAutoLayout ? "yes" : "no"}</dd>
                  <dt>child role</dt>
                  <dd>
                    {entry.renderer.isAbsolute
                      ? "ABSOLUTE"
                      : entry.renderer.positioning}
                  </dd>
                  <dt>main / counter</dt>
                  <dd>
                    {valueLabel(entry.renderer.mainAxisSizing)} /{" "}
                    {valueLabel(entry.renderer.counterAxisSizing)}
                  </dd>
                  <dt>flex</dt>
                  <dd>
                    {valueLabel(entry.renderer.expected.flexGrow)} /{" "}
                    {valueLabel(entry.renderer.expected.flexShrink)} /{" "}
                    {valueLabel(entry.renderer.expected.flexBasis)}
                  </dd>
                  <dt>min w / h</dt>
                  <dd>
                    {valueLabel(entry.renderer.expected.minWidth)} /{" "}
                    {valueLabel(entry.renderer.expected.minHeight)}
                  </dd>
                  <dt>position</dt>
                  <dd>{entry.renderer.expected.position}</dd>
                </dl>
              </div>

              {entry.absoluteConstraint ? (
                <div className="rounded-md border border-cyan-300/10 bg-cyan-400/[0.04] p-2">
                  <p className="font-medium text-cyan-100/70">
                    Absolute constraint math
                  </p>
                  <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-white/35">
                    <dt>renderer mode / active</dt>
                    <dd>
                      {entry.absoluteConstraint.renderMode} /{" "}
                      {entry.absoluteConstraint.active ? "yes" : "no"}
                    </dd>
                    <dt>parent snapshot</dt>
                    <dd>
                      {entry.absoluteConstraint.parentSnapshotSize.width} ×{" "}
                      {entry.absoluteConstraint.parentSnapshotSize.height}
                    </dd>
                    <dt>parent live</dt>
                    <dd>
                      {valueLabel(
                        entry.absoluteConstraint.parentLiveSize.width,
                      )}{" "}
                      ×{" "}
                      {valueLabel(
                        entry.absoluteConstraint.parentLiveSize.height,
                      )}
                    </dd>
                    <dt>child snapshot x / y</dt>
                    <dd>
                      {entry.absoluteConstraint.childSnapshotBounds.x} /{" "}
                      {entry.absoluteConstraint.childSnapshotBounds.y}
                    </dd>
                    <dt>child snapshot w / h</dt>
                    <dd>
                      {entry.absoluteConstraint.childSnapshotBounds.width} /{" "}
                      {entry.absoluteConstraint.childSnapshotBounds.height}
                    </dd>
                    <dt>child live x / y</dt>
                    <dd>
                      {valueLabel(entry.absoluteConstraint.childLive.x)} /{" "}
                      {valueLabel(entry.absoluteConstraint.childLive.y)}
                    </dd>
                    <dt>child live w / h</dt>
                    <dd>
                      {valueLabel(entry.absoluteConstraint.childLive.width)} /{" "}
                      {valueLabel(entry.absoluteConstraint.childLive.height)}
                    </dd>
                    <dt>constraints raw</dt>
                    <dd>
                      {valueLabel(
                        entry.absoluteConstraint.constraints.horizontal.raw,
                      )}{" "}
                      /{" "}
                      {valueLabel(
                        entry.absoluteConstraint.constraints.vertical.raw,
                      )}
                    </dd>
                    <dt>constraints normalized</dt>
                    <dd>
                      {valueLabel(
                        entry.absoluteConstraint.constraints.horizontal
                          .normalized,
                      )}{" "}
                      /{" "}
                      {valueLabel(
                        entry.absoluteConstraint.constraints.vertical
                          .normalized,
                      )}
                    </dd>
                    <dt>constraints effective</dt>
                    <dd>
                      {valueLabel(
                        entry.absoluteConstraint.constraints.horizontal
                          .effective,
                      )}{" "}
                      /{" "}
                      {valueLabel(
                        entry.absoluteConstraint.constraints.vertical
                          .effective,
                      )}
                    </dd>
                    <dt>edge offsets l / r</dt>
                    <dd>
                      {valueLabel(
                        entry.absoluteConstraint.exportedOffsets.left,
                      )}{" "}
                      /{" "}
                      {valueLabel(
                        entry.absoluteConstraint.exportedOffsets.right,
                      )}
                    </dd>
                    <dt>edge offsets t / b</dt>
                    <dd>
                      {valueLabel(
                        entry.absoluteConstraint.exportedOffsets.top,
                      )}{" "}
                      /{" "}
                      {valueLabel(
                        entry.absoluteConstraint.exportedOffsets.bottom,
                      )}
                    </dd>
                    <dt>CENTER translate h / v</dt>
                    <dd>
                      {entry.absoluteConstraint.centerUsesTranslate.horizontal
                        ? "yes"
                        : "no"}{" "}
                      /{" "}
                      {entry.absoluteConstraint.centerUsesTranslate.vertical
                        ? "yes"
                        : "no"}
                    </dd>
                    <dt>live HUG h / v</dt>
                    <dd>
                      {entry.absoluteConstraint.usesLiveHugSize.horizontal
                        ? "yes"
                        : "no"}{" "}
                      /{" "}
                      {entry.absoluteConstraint.usesLiveHugSize.vertical
                        ? "yes"
                        : "no"}
                    </dd>
                    <dt>FILL stretch h / v</dt>
                    <dd>
                      {entry.absoluteConstraint.usesFillStretchSizing.horizontal
                        ? "yes"
                        : "no"}{" "}
                      /{" "}
                      {entry.absoluteConstraint.usesFillStretchSizing.vertical
                        ? "yes"
                        : "no"}
                    </dd>
                    <dt>constraint stretch h / v</dt>
                    <dd>
                      {entry.absoluteConstraint.usesConstraintDrivenStretch
                        .horizontal
                        ? "yes"
                        : "no"}{" "}
                      /{" "}
                      {entry.absoluteConstraint.usesConstraintDrivenStretch
                        .vertical
                        ? "yes"
                        : "no"}
                    </dd>
                    <dt>STRETCH active h / v</dt>
                    <dd>
                      {entry.absoluteConstraint.stretchActive.horizontal
                        ? "yes"
                        : "no"}{" "}
                      /{" "}
                      {entry.absoluteConstraint.stretchActive.vertical
                        ? "yes"
                        : "no"}
                    </dd>
                    <dt>STRETCH suppressed by HUG</dt>
                    <dd>
                      {entry.absoluteConstraint.stretchSuppressedByHug
                        .horizontal
                        ? "horizontal"
                        : ""}
                      {entry.absoluteConstraint.stretchSuppressedByHug
                        .horizontal &&
                      entry.absoluteConstraint.stretchSuppressedByHug.vertical
                        ? " / "
                        : ""}
                      {entry.absoluteConstraint.stretchSuppressedByHug.vertical
                        ? "vertical"
                        : ""}
                      {!entry.absoluteConstraint.stretchSuppressedByHug
                        .horizontal &&
                      !entry.absoluteConstraint.stretchSuppressedByHug.vertical
                        ? "none"
                        : ""}
                    </dd>
                  </dl>
                </div>
              ) : null}

              <details>
                <summary className="cursor-pointer font-medium text-white/55">
                  Raw Figma layout
                </summary>
                <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-md bg-black/30 p-2 font-mono text-[10px] leading-4 text-white/35">
                  {JSON.stringify(entry.figma ?? {}, null, 2)}
                </pre>
              </details>

              <details>
                <summary className="cursor-pointer font-medium text-white/55">
                  DOM measurement
                </summary>
                <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-md bg-black/30 p-2 font-mono text-[10px] leading-4 text-white/35">
                  {JSON.stringify(entry.measurement, null, 2)}
                </pre>
              </details>
            </div>
          </details>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => void handleCopy("chain")}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-2 text-[11px] text-white/55 transition hover:bg-white/[0.08] hover:text-white"
        >
          <Clipboard aria-hidden="true" size={12} />
          Copy chain
        </button>
        <button
          type="button"
          onClick={() => void handleCopy("measurements")}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-2 text-[11px] text-white/55 transition hover:bg-white/[0.08] hover:text-white"
        >
          <Clipboard aria-hidden="true" size={12} />
          Copy measured
        </button>
      </div>
      {copyStatus ? (
        <p className="mt-2 text-center text-[10px] text-white/35">
          {copyStatus}
        </p>
      ) : null}
    </section>
  );
}
