export async function applyCompatibilityFontFallbacks(page) {
  try {
    await page.waitForFunction(
      () => Boolean(window.__templatePackageFontSetupHarness),
    );
  } catch (error) {
    throw new Error(
      `The development-only font setup harness did not become available: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
  const fallbacks = await page.evaluate(() => {
    const harness = window.__templatePackageFontSetupHarness;
    if (!harness) {
      throw new Error("The development-only font setup harness is unavailable.");
    }
    return harness.applyCompatibilityFallbacks();
  });
  try {
    await page.waitForFunction(() => {
      const button = [...document.querySelectorAll("button")].find(
        (candidate) => candidate.textContent?.trim() === "Check template",
      );
      return button instanceof HTMLButtonElement && !button.disabled;
    });
  } catch (error) {
    throw new Error(
      `The development-only font fallback mutation did not settle: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  return fallbacks;
}
