/** Read-only review evidence; never writes approved references. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
import {pixelEvidence} from './pixels.mjs';
const out='docs/architecture/evidence/r07-raster-20261013/review';mkdirSync(out,{recursive:true});
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const runs=['r07-baseline-a-20261013','r07-baseline-b-20261013','r07-trace-20261013','r07-stage-square-20261013','r07-media-duration-20261013','r07-canvas-duration-20261013','r07-all-duration-20261013','r07-view-duration-20261013','r07-outer-clip-20261013','r07-zero-before-mount-20261013','r07-styles-reviewed-20261013','r07-touch-auto-20261013','r07-stage-fixed-20261013','r07-preview-reviewed-b-20261013','r07-initial-fit-20261013','r07-no-session-reset-20261013','r07-reviewed-40-20261013'];
const approved=readFileSync('fidelity/references/approved/exporter-061-carrousel/editor/reference.png'),matrix=[];
for(const run of runs){const dir=`fidelity/candidates/${run}/exporter-061-carrousel/editor`;const captures=readdirSync(dir).filter(p=>/^capture-\d+\.png$/.test(p));const hashes=captures.map(p=>hash(readFileSync(`${dir}/${p}`)));assert(hashes.every(h=>h===hashes[0]));const{points,diff,...metrics}=pixelEvidence(approved,readFileSync(`${dir}/${captures[0]}`));matrix.push({run,repeats:captures.length,stable:true,sha256:hashes[0],...metrics});if(run.includes('baseline-')){const dest=`${out}/${run}`;mkdirSync(dest,{recursive:true});for(const p of captures)copyFileSync(`${dir}/${p}`,`${dest}/${p}`);copyFileSync(`fidelity/candidates/${run}/environment.json`,`${dest}/environment.json`);}}
writeFileSync(`${out}/experiments.json`,JSON.stringify(matrix,null,2)+'\n');
const surfaces=[];for(const run of['r07-four-reduce-20261013','r07-four-motion-20261013'])for(const surface of['validate','fields','editor','png-export']){
 const dir=`fidelity/candidates/${run}/exporter-061-carrousel/${surface}`,before=readFileSync(`fidelity/references/approved/exporter-061-carrousel/${surface}/reference.png`),after=readFileSync(`${dir}/capture-1.png`);const{points,diff,...metrics}=pixelEvidence(before,after);const structure=JSON.parse(readFileSync(`${dir}/structure-1.json`));
 const scale=metrics.width/1920,owners={};for(const p of points){const matches=structure.nodes.filter(n=>{const b=n.bounds;return p.x+.5>=b.x*scale-1&&p.x+.5<=(b.x+b.width)*scale+1&&p.y+.5>=b.y*scale-1&&p.y+.5<=(b.y+b.height)*scale+1;}).sort((a,b)=>a.bounds.width*a.bounds.height-b.bounds.width*b.bounds.height);const id=matches[0]?.id??'unassigned';owners[id]=(owners[id]??0)+1;}
 const dest=`${out}/${run}/${surface}`;mkdirSync(dest,{recursive:true});writeFileSync(`${dest}/approved.png`,before);writeFileSync(`${dest}/current.png`,after);writeFileSync(`${dest}/thresholded-diff.png`,PNG.sync.write(diff));copyFileSync(`${dir}/structure-1.json`,`${dest}/structure.json`);
 surfaces.push({run,surface,beforeSha256:hash(before),afterSha256:hash(after),...metrics,owners});
}
writeFileSync(`${out}/four-surfaces.json`,JSON.stringify(surfaces,null,2)+'\n');
// Aligned, nearest-neighbour magnification for human review only.
const before=PNG.sync.read(approved),after=PNG.sync.read(readFileSync('fidelity/candidates/r07-trace-20261013/exporter-061-carrousel/editor/capture-1.png'));
for(const [name,crop]of Object.entries({top:{x:180,y:0,width:132,height:48},bottom:{x:180,y:442,width:132,height:50}})){
 const factor=4,gap=12,w=crop.width*factor,h=crop.height*factor,output=new PNG({width:w*3+gap*2,height:h});output.data.fill(255);
 for(let y=0;y<crop.height;y++)for(let x=0;x<crop.width;x++)for(let panel=0;panel<3;panel++){
  const source=((crop.y+y)*before.width+crop.x+x)*4;const a=before.data.subarray(source,source+4),b=after.data.subarray(source,source+4);const different=a.some((v,i)=>v!==b[i]);const rgba=panel===0?a:panel===1?b:different?[220,40,40,255]:[245,245,245,255];
  for(let dy=0;dy<factor;dy++)for(let dx=0;dx<factor;dx++){const target=((y*factor+dy)*output.width+panel*(w+gap)+x*factor+dx)*4;output.data.set(rgba,target);}
 }
 writeFileSync(`${out}/${name}-approved-current-raw-diff-4x.png`,PNG.sync.write(output));
}
// The whole raster delta must be inside the two thumbnail footprints, including edge coverage.
const trace=JSON.parse(readFileSync('fidelity/candidates/r07-trace-20261013/exporter-061-carrousel/editor/raster-trace-1.json')),origin=trace.ancestors[0].bounds;
const thumbs=['987:6816','987:6823'].map(id=>trace.nodes.find(n=>n.id===id));const metrics=pixelEvidence(approved,PNG.sync.write(after));assert(metrics.points.every(p=>thumbs.some(n=>{const r=n.bounds;return p.x+origin.x>=r.x-1&&p.x+origin.x<=r.x+r.width+1&&p.y+origin.y>=r.y-1&&p.y+origin.y<=r.y+r.height+1;})));
copyFileSync('fidelity/candidates/r07-trace-20261013/exporter-061-carrousel/editor/raster-trace-1.json',`${out}/current-trace.json`);copyFileSync('fidelity/candidates/r07-initial-fit-20261013/exporter-061-carrousel/editor/raster-trace-1.json',`${out}/initial-fit-trace.json`);
console.log(`${matrix.length} causal experiments and ${surfaces.length} surface reviews retained; all editor deltas inside two source image footprints.`);
