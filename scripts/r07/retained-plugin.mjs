/** Hash-gated Studio-only source ablations. Never overrides SDK source. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
export function r07RetainedPlugin(variant){
 const baseline=JSON.parse(readFileSync('docs/architecture/evidence/r07-raster-20261013/baseline/identity.json'));
 const previous=JSON.parse(readFileSync('docs/studio/evidence/product-experience-20261012/identity.json'));
 const css='apps/studio/src/styles.css',preview='apps/studio/src/setup/SetupPreview.tsx';
 const replacements=new Map();
 if(variant==='initial-fit'||variant==='no-session-reset'){
  const bytes=readFileSync(`docs/architecture/evidence/r07-raster-20261013/baseline/${preview}`);assert.equal(createHash('sha256').update(bytes).digest('hex'),baseline.sources[preview]);
  let content=bytes.toString();
  if(variant==='initial-fit')content=content.replace('  const stage = useRef<HTMLDivElement>(null);','  initialZoom = undefined;\n  const stage = useRef<HTMLDivElement>(null);');
  else content=content.replace(/  useLayoutEffect\(\(\) => \{ setFocus\(initialZoom[^\n]+\n/, '');
  replacements.set(resolve(preview),content);
 }else if(variant==='global-zero-before-mount'){
  const bytes=readFileSync(`docs/architecture/evidence/r07-raster-20261013/baseline/${css}`);assert.equal(createHash('sha256').update(bytes).digest('hex'),baseline.sources[css]);
  replacements.set(resolve(css),bytes.toString().replace('transition-duration: 0.01ms !important;','transition-duration: 0s !important;'));
 }else if(variant==='global-styles-reviewed'||variant==='preview-reviewed'||variant==='preview-reviewed-40'){
  const isPreview=variant.startsWith('preview-reviewed');
  const file=isPreview?preview:css,record=previous.files[file];
  const bytes=readFileSync(record.path);assert.equal(createHash('sha256').update(bytes).digest('hex'),record.sha256);
  // Test adapters preserve the camera driver's existing accessible action/trace marker.
  let content=isPreview?bytes.toString().replace('label="Fit template"','label={mode === "editor" ? "Fit design" : "Fit template"}').replace('<div style={{ width, height, position:', '<div data-studio-preview-transform style={{ width, height, position:'):bytes.toString();
  if(variant==='preview-reviewed-40'){
    assert(content.includes('useState<"template" | "target" | "manual">("template")'));
    assert(content.includes('useState(1)'));
    content=content.replace('useState<"template" | "target" | "manual">("template")','useState<"template" | "target" | "manual">("manual")').replace('useState(1)','useState(.4)');
  }
  if(isPreview){
    const current=readFileSync(`docs/architecture/evidence/r07-raster-20261013/baseline/${preview}`,'utf8');
    const helper=current.slice(current.indexOf('/** A view-location'),current.indexOf('/** Studio viewport'));
    content='import type { ResolvedRenderTreeV1 } from "@sleinity/template-core";\n'+content+'\n'+helper;
  }
  replacements.set(resolve(file),content);
 }else throw new Error(`Unknown R07 retained variant ${variant}`);
 return {name:'r07-hash-verified-studio-ablation',enforce:'pre',transform(code,id){const replacement=replacements.get(id.split('?')[0]);return replacement===undefined?null:{code:replacement,map:null};}};
}
