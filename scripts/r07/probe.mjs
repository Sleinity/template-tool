/** Test-only raster experiments. Never imported by Studio or SDK entries. */
import assert from 'node:assert/strict';
export async function applyRasterProbe(page, selector, variant) {
 const variants = {
  trace: '',
  'view-duration-zero': '[data-studio-preview-transform] { transition-duration: 0s !important; }',
  'all-duration-zero': '* { transition-duration: 0s !important; }',
  'outer-clip-visible': '.studio-draft-preview, .studio-draft-preview .preview-workspace__stage { overflow: visible !important; }',
  'stage-fixed': '.studio-draft-preview .studio-setup-canvas { position: fixed !important; left: 485px !important; top: 107px !important; }',
  'stage-touch-auto': '.studio-draft-preview .studio-setup-canvas { touch-action: auto !important; cursor: auto !important; }',
  'stage-square': '.studio-draft-preview .studio-setup-canvas { border-radius: 0 !important; }',
  'media-duration-zero': `${selector} [data-package-image-asset], ${selector} [data-package-image-asset] * { transition-duration: 0s !important; }`,
  'canvas-duration-zero': `${selector}, ${selector} * { transition-duration: 0s !important; }`,
 };
 assert(Object.hasOwn(variants,variant),`Unknown R07 experiment: ${variant}`);
 if(variants[variant]) await page.addStyleTag({content:variants[variant]});
}
export async function rasterTrace(page, selector) {
 return page.evaluate(selector=>{
  const canvas=document.querySelector(selector);if(!canvas)throw new Error('Missing trace canvas');
  const properties=['position','transform','transformOrigin','translate','scale','zoom','opacity','filter','backdropFilter','clipPath','overflow','overflowX','overflowY','borderRadius','contain','isolation','willChange','transitionProperty','transitionDuration','animationName','animationDuration','backgroundSize','backgroundPosition','backgroundImage','imageRendering','fontFamily','fontWeight','fontStyle'];
  const describe=element=>{const rect=element.getBoundingClientRect(),style=getComputedStyle(element);return {tag:element.tagName,id:element.dataset?.packageNodeId??null,class:element.className?.baseVal??element.className,bounds:{x:rect.x,y:rect.y,width:rect.width,height:rect.height},offset:{left:element.offsetLeft,top:element.offsetTop,width:element.offsetWidth,height:element.offsetHeight},scroll:{left:element.scrollLeft,top:element.scrollTop},styles:Object.fromEntries(properties.map(key=>[key,style[key]])),attributes:Object.fromEntries([...element.attributes].filter(attribute=>attribute.name.startsWith('data-package')||attribute.name==='style').map(attribute=>[attribute.name,attribute.value]))};};
  const ancestors=[];for(let node=canvas;node;node=node.parentElement)ancestors.push(describe(node));
  return {reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,dpr:devicePixelRatio,viewport:{width:innerWidth,height:innerHeight},scroll:{x:scrollX,y:scrollY},ancestors,nodes:[...canvas.querySelectorAll('[data-package-node-id]')].map(describe),images:[...canvas.querySelectorAll('img')].map(image=>({src:image.currentSrc,complete:image.complete,width:image.naturalWidth,height:image.naturalHeight})),fonts:[...document.fonts].map(font=>({family:font.family,weight:font.weight,style:font.style,status:font.status})),animations:document.getAnimations().map(animation=>({playState:animation.playState,currentTime:animation.currentTime,timing:animation.effect?.getComputedTiming()}))};
 },selector);
}
