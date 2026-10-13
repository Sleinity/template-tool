// Real Chromium contract probes; separate from the DOM-free portable suite.
import assert from 'node:assert/strict';
import { launchBrowser, prepareSourceAuthoritativeFonts } from './browser.mjs';
import { awaitReviewSaveReady } from './review-readiness.mjs';
const browser = await launchBrowser(false);
try {
  const page = await browser.newPage();
  await page.setContent('<button>Save template</button>');
  const ready = [];
  await awaitReviewSaveReady(page, { evidence: ready, timeout: 1000 });
  assert.equal(ready.at(-1).phase, 'review-save-ready');

  await page.setContent(`<p role="status">Checks pending</p><button disabled>Save template</button><button id="check">Check again</button>
    <script>window.checks = 0; document.querySelector('#check').onclick = () => {
      window.checks++; document.querySelector('#check').disabled = true;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        document.querySelector('button').disabled = false;
        document.querySelector('[role=status]').textContent = 'Ready to save';
      }));
    };</script>`);
  const delayed = [];
  await awaitReviewSaveReady(page, { evidence: delayed, timeout: 1000 });
  assert.equal(await page.evaluate(() => window.checks), 1);
  assert.deepEqual(delayed.map(item => item.phase), ['review-entered', 'review-recheck-requested', 'review-save-ready']);

  await page.setContent('<p role="status">Unsupported settlement prevents saving</p><button disabled>Save template</button><button>Check again</button><div data-template-package-canvas data-package-settlement-readiness="unsupported"></div>');
  const blocked = [];
  await assert.rejects(awaitReviewSaveReady(page, { evidence: blocked, timeout: 100 }), /Unsupported settlement prevents saving/);
  assert.equal(blocked.at(-1).phase, 'review-blocked');
  assert.equal(blocked.at(-1).state.renderers[0].attributes['data-package-settlement-readiness'], 'unsupported');
  assert.equal(await page.getByRole('button', { name: 'Save template' }).isDisabled(), true);
  await page.setContent('<fieldset disabled><button>Save template</button></fieldset>');
  await assert.rejects(awaitReviewSaveReady(page, { timeout: 100 }), /Review did not permit saving/);

  // The real font panel moves ready rows after unresolved rows on each upload.
  await page.setContent(`<div id="fonts">
    <div data-font-requirement-id="first" data-font-family="First" data-font-weight="400" data-font-style="normal"><button>Upload font file</button></div>
    <div data-font-requirement-id="second" data-font-family="Second" data-font-weight="400" data-font-style="normal"><button>Upload font file</button></div>
    </div><input type="file" data-testid="package-font-upload-input">
    <script>
      let selected;
      document.querySelectorAll('#fonts button').forEach(button => button.onclick = () => { selected = button.parentElement; });
      document.querySelector('input').onchange = () => {
        selected.setAttribute('data-font-resolution-classification', 'exact');
        selected.setAttribute('data-font-linked-binary-hash', selected.getAttribute('data-font-requirement-id'));
        selected.setAttribute('data-font-ui-status', 'Ready');
        document.querySelector('#fonts').append(selected);
        document.querySelector('input').value = '';
      };
    </script>`);
  const fontDecisions = [];
  const manifest = { fonts: ['first', 'second'].map(id => ({ id, family: id === 'first' ? 'First' : 'Second', weight: 400, style: 'normal', verifiedSha256: id, path: 'apps/studio/src/assets/fonts/rethink-sans-600.ttf' })) };
  await prepareSourceAuthoritativeFonts(page, manifest, { fontDecisions });
  assert.deepEqual(fontDecisions.map(value => value.requirementId), ['first', 'second']);
  assert.equal(await page.locator('[data-font-ui-status="Ready"]').count(), 2);
  console.log('Review readiness and reordered font-row browser probes passed.');
} finally { await browser.close(); }
