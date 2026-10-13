/** Capture evidence while its editor is alive; export completion disposes it. */
export async function captureCompletedOutput({ captureEditor, exportOutput, awaitLibrary, captureCompletion }) {
  const editor = await captureEditor();
  const output = await exportOutput();
  await awaitLibrary();
  const completion = await captureCompletion();
  return { editor, output, completion };
}
