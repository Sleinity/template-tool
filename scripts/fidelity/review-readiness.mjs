// Test-only observation of the supported Review workflow. Never supplies readiness.
export async function reviewEvidence(page) {
  return page.evaluate(() => {
    const visible = element => Boolean(element.getClientRects().length);
    const text = selector => [...document.querySelectorAll(selector)].filter(visible).map(element => element.textContent?.trim());
    return {
      url: location.href,
      headings: text('h1, h2, h3'),
      review: text('.studio-review-page'),
      validation: [...document.querySelectorAll('[aria-label="Validation workbench"]')].map(element => ({
        visible: visible(element), exportReady: element.getAttribute('data-sdk-export-ready'), text: element.textContent?.trim(),
      })),
      sessionRevisions: [...document.querySelectorAll('[data-template-field-session-v2-revision]')].map(element => element.getAttribute('data-template-field-session-v2-revision')),
      feedback: text('[role="alert"], [role="status"], .setup-notice, .setup-outcome'),
      actions: [...document.querySelectorAll('button')].filter(visible).map(element => ({ label: element.textContent?.trim(), disabled: element.matches(':disabled') })),
      // Existing renderer evidence only; hidden measurable previews are identified explicitly.
      renderers: [...document.querySelectorAll('[data-template-package-canvas]')].map(element => ({
        visible: visible(element),
        attributes: Object.fromEntries([...element.attributes].filter(attribute => attribute.name.startsWith('data-')).map(attribute => [attribute.name, attribute.value])),
      })),
    };
  });
}

export async function awaitReviewSaveReady(page, { timeout = 35000, evidence = [] } = {}) {
  const save = page.getByRole('button', { name: 'Save template', exact: true });
  evidence.push({ phase: 'review-entered', state: await reviewEvidence(page) });
  try {
    // Review can perform automatic checks. Wait for either an actionable recheck
    // or accepted save readiness; do not rely on a click timeout as a diagnosis.
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button =>
      button.getClientRects().length && !button.matches(':disabled') && ['Save template', 'Check again'].includes(button.textContent.trim())), null, { timeout });
    if (await save.isDisabled()) {
      await page.getByRole('button', { name: 'Check again', exact: true }).click();
      evidence.push({ phase: 'review-recheck-requested', state: await reviewEvidence(page) });
    }
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button =>
      button.getClientRects().length && !button.matches(':disabled') && button.textContent.trim() === 'Save template'), null, { timeout });
    evidence.push({ phase: 'review-save-ready', state: await reviewEvidence(page) });
  } catch (cause) {
    const state = await reviewEvidence(page);
    evidence.push({ phase: 'review-blocked', state });
    throw new Error(`Review did not permit saving: ${JSON.stringify(state.feedback)}. See review-readiness.json for checks and renderer identities.`, { cause });
  }
}
