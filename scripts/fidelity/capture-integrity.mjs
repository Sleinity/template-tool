// Completion is independent of reference approval and repeat stability.
export function captureCompleteness(selectedSurfaces, surfaces, expectedRepeat) {
  const missing = selectedSurfaces.flatMap(surface => {
    const count = surfaces[surface]?.length ?? 0;
    return count === expectedRepeat ? [] : [{ surface, expected: expectedRepeat, actual: count }];
  });
  return { complete: missing.length === 0, missing };
}

export function comparisonCaptureStatus(captures, expectedRepeat, candidateExists) {
  if (!candidateExists || !captures?.length) return 'capture-missing';
  if (captures.length !== expectedRepeat) return 'capture-incomplete';
  return null;
}

export function captureRunIssues(run, fixtureIds, surfaces) {
  const issues = [];
  const repeats = run.expectedRepeat ?? 2;
  if (!Number.isInteger(repeats) || repeats < 2) issues.push('Run does not establish repeated capture evidence.');
  for (const fixtureId of fixtureIds) {
    const summary = run.summaries?.find(item => item.fixtureId === fixtureId);
    if (!summary) { issues.push(`${fixtureId}: missing capture summary`); continue; }
    if (summary.error) issues.push(`${fixtureId}: ${summary.error}`);
    for (const surface of surfaces) {
      const report = summary.repeatability?.[surface];
      if (!report || report.repeatCount !== repeats) issues.push(`${fixtureId}/${surface}: incomplete repeats`);
      else if (!report.stable) issues.push(`${fixtureId}/${surface}: unstable repeats`);
    }
  }
  return issues;
}
