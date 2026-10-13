/** Lossless test-packet encoding. Repeated opaque revision strings can be large. */
export function encodePacket(record) {
 const pool=[],ids=new Map(),objectPool=[],objectIds=new Map();
 const internString=(_key,value)=>{
  if(typeof value!=='string'||value.length<256)return value;
  let id=ids.get(value);if(id===undefined){id=pool.length;ids.set(value,id);pool.push(value);}
  return {$longString:id};
 };
 // Full snapshots repeat across animation frames. Retain every frame and every
 // property, but encode identical observational subtrees once per packet row.
 // This keeps both writing and reading below V8's single-string size limit.
 const body=JSON.stringify(record,(key,value)=>{
  if(['nodeEvidence','nodes','readiness'].includes(key)&&value&&typeof value==='object') {
   const identity=JSON.stringify(value);
   let id=objectIds.get(identity);
   if(id===undefined){id=objectPool.length;objectIds.set(identity,id);objectPool.push(value);}
   return {$packetObject:id};
  }
  return internString(key,value);
 },2);
 const objects=JSON.stringify(objectPool,internString);
 return body.slice(0,-2)+',\n  "packetObjectPool": '+objects+',\n  "longStringPool": '+JSON.stringify(pool)+'\n}\n';
}
export function decodePacket(record) {
 if (record.packetEncoding === 'row-local-strings-v1') {
  record.rows = record.rows.map(decodePacket);
  delete record.packetEncoding;
 }
 if(!record.longStringPool)return record;
 const pool=record.longStringPool;
 const visit=value=>{
  if(value&&typeof value==='object') {
   if(Object.keys(value).length===1&&Number.isInteger(value.$longString)) {
    if(typeof pool[value.$longString]!=='string')throw new Error('Invalid packet string reference');
    return pool[value.$longString];
   }
   for(const key of Object.keys(value))value[key]=visit(value[key]);
  }
  return value;
 };
 delete record.longStringPool;
 const expanded=visit(record),objects=expanded.packetObjectPool??[];
 delete expanded.packetObjectPool;
 const expand=value=>{
  if(value&&typeof value==='object') {
   if(Object.keys(value).length===1&&Number.isInteger(value.$packetObject)) {
    if(!objects[value.$packetObject]||typeof objects[value.$packetObject]!=='object')throw new Error('Invalid packet object reference');
    return expand(structuredClone(objects[value.$packetObject]));
   }
   for(const key of Object.keys(value))value[key]=expand(value[key]);
  }
  return value;
 };
 return expand(expanded);
}

/** Stream row-local dictionaries instead of constructing one >512 MiB string. */
export async function writePacket(path, record) {
 const { open, rename } = await import('node:fs/promises');
 const { rows, ...metadata } = record;
 if (!Array.isArray(rows)) throw new Error('Evidence rows are required');
 const temporary = path + '.partial', handle = await open(temporary, 'w');
 try {
  const header = encodePacket({ ...metadata, packetEncoding: 'row-local-strings-v1' }).trimEnd();
  await handle.writeFile(header.slice(0, -1) + ',\n"rows": [\n');
  for (let index = 0; index < rows.length; index++) {
   if (index) await handle.writeFile(',\n');
   await handle.writeFile(encodePacket(rows[index]).trimEnd());
  }
  await handle.writeFile('\n]}\n');
 } finally { await handle.close(); }
 await rename(temporary, path);
}
