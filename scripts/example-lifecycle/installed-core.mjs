/** Resolve through the supplied installation's ESM public entry, never workspace or dist paths. */
import{writeFile}from'node:fs/promises';import{join}from'node:path';import{pathToFileURL}from'node:url';
export async function loadInstalledCoreNormalizer(directory){const entry=join(directory,'sdk-normalizer.mjs');await writeFile(entry,'export { normalizeTemplatePackageV1ToV2 } from "@sleinity/template-core";\n',{flag:'wx'});return(await import(pathToFileURL(entry).href)).normalizeTemplatePackageV1ToV2;}
