import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {PNG} from 'pngjs';
import pixelmatch from 'pixelmatch';
export function pixelEvidence(beforeBytes,afterBytes){
 const a=PNG.sync.read(beforeBytes),b=PNG.sync.read(afterBytes);if(a.width!==b.width||a.height!==b.height)throw new Error('Different capture dimensions');
 const diff=new PNG({width:a.width,height:a.height});const thresholded=pixelmatch(a.data,b.data,diff.data,a.width,a.height,{threshold:0.1,includeAA:false,diffMask:true});
 const histogram={},points=[];let minX=a.width,minY=a.height,maxX=-1,maxY=-1,maxDelta=0;
 for(let i=0;i<a.data.length;i+=4){let delta=0;for(let c=0;c<4;c++)delta=Math.max(delta,Math.abs(a.data[i+c]-b.data[i+c]));if(!delta)continue;const x=(i/4)%a.width,y=Math.floor(i/4/a.width);points.push({x,y,delta});histogram[delta]=(histogram[delta]??0)+1;minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);maxDelta=Math.max(maxDelta,delta);}
 return {width:a.width,height:a.height,rawCount:points.length,thresholded,maxDelta,histogram,bounds:points.length?{x:minX,y:minY,width:maxX-minX+1,height:maxY-minY+1}:null,points,diff};
}
if(process.argv[1]?.endsWith('/pixels.mjs')){
 const runs=process.argv.slice(2),approved=readFileSync('fidelity/references/approved/exporter-061-carrousel/editor/reference.png'),rows=[];
 for(const run of runs){const dir=`fidelity/candidates/${run}/exporter-061-carrousel/editor`;const bytes=readFileSync(`${dir}/capture-1.png`);const {points,diff,...metrics}=pixelEvidence(approved,bytes);const regions={};
 let trace;try{trace=JSON.parse(readFileSync(`${dir}/raster-trace-1.json`));}catch{}
 if(trace){const origin=trace.ancestors[0].bounds;const media=trace.nodes.filter(node=>node.attributes['data-package-image-asset']);for(const point of points){const owners=media.filter(node=>{const r=node.bounds;return point.x+origin.x>=r.x&&point.x+origin.x<r.x+r.width&&point.y+origin.y>=r.y&&point.y+origin.y<r.y+r.height;});for(const owner of owners)regions[owner.id]=(regions[owner.id]??0)+1;}}
 rows.push({run,sha256:createHash('sha256').update(bytes).digest('hex'),...metrics,mediaRegions:regions});writeFileSync(`${dir}/raw-diff.png`,PNG.sync.write(diff));
 }
 mkdirSync('fidelity/evidence/r07',{recursive:true});writeFileSync('fidelity/evidence/r07/pixels.json',JSON.stringify(rows,null,2)+'\n');console.log(JSON.stringify(rows,null,2));
}
