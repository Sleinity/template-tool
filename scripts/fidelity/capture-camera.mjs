/** Test-only presentation camera; no renderer/package/evidence mutation. */
import assert from 'node:assert/strict';

// Hash-verified retained Studio at 1440×1600 measured this identical stage for
// all three exports and Family. This is a capture environment, not fixture logic.
export const studioReferenceCamera = Object.freeze({
  id: 'studio-reference-20261012', viewport: { width: 1440, height: 1600 },
  stage: { x: 485, y: 107, width: 906, height: 1444 },
  provenance: 'fidelity/evidence/product-experience/camera-before/record.json',
});

export function selectCaptureCamera(id) {
  if (!id) return null;
  assert.equal(id, studioReferenceCamera.id, `Unknown capture camera ${id}`);
  return studioReferenceCamera;
}

export async function applyCaptureCamera(page, profile) {
  if (!profile) return null;
  assert.deepEqual(page.viewportSize(), profile.viewport, 'Capture camera viewport');
  const selector='[data-testid="studio-draft-editor"] .studio-setup-canvas';
  // Final pose alone is not a complete raster environment: R07 demonstrates
  // that the preceding native viewport path can affect browser image samples.
  const nativeBefore = await page.evaluate(selector => {
    const stage=document.querySelector(selector),view=stage?.querySelector('[data-studio-preview-transform]');
    if(!stage || !view)throw new Error('Mounted native viewport missing');
    return {mode:stage.getAttribute('data-view-mode'),transform:view.style.transform,
      zoomLabel:stage.parentElement?.querySelector('.inspection-preview-toolbar__scale')?.textContent,
      scroll:{x:scrollX,y:scrollY},dpr:devicePixelRatio,
      reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches};
  },selector);
  // Invoke the visible product action before the test camera moves the stage;
  // the retained pose may overlap the current toolbar.
  await page.getByRole('button',{name:'Fit design',exact:true}).click();
  const before=await page.locator(selector).boundingBox();
  const {x,y,width,height}=profile.stage;
  // Match the established view transform inputs. The current mounted renderer,
  // native readiness and intrinsic template dimensions remain unchanged.
  assert(before,'Mounted capture stage');
  await page.addStyleTag({content:`${selector} { position: relative !important; inset: auto !important; left: ${x-before.x}px !important; top: ${y-before.y}px !important; width: ${width}px !important; height: ${height}px !important; min-width: 0 !important; min-height: 0 !important; max-width: none !important; max-height: none !important; flex: none !important; }`});
  await page.waitForFunction(({selector,width,height})=>{const stage=document.querySelector(selector);if(!stage)return false;const box=stage.getBoundingClientRect();const view=stage.querySelector('[data-studio-preview-transform]');return box.width===width&&box.height===height&&view?.style.transform.includes('translate(16px,');},{selector,width,height});
  return {profile:profile.id,nativeBefore,before,after:await page.locator(selector).boundingBox(),nativeMutation:false};
}
